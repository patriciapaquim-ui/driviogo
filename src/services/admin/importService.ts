// =============================================================================
// DrivioGo — Import Service
// Orchestrates saving a validated Excel import to the Supabase database.
//
// Flow:
//   1. Upload file to Supabase Storage (import-files bucket)
//   2. Create ImportJob record (status: PROCESSING)
//   3. Resolve or create PricingTable
//   4. Create new PricingTableVersion (inactive)
//   5. For each valid row:
//        a. Resolve or create Vehicle by name
//        b. Create VehiclePricingRule
//        c. Create AnnualKmOptions (batch insert)
//        d. Create ImportJobRow (SUCCESS)
//   6. For each invalid row: create ImportJobRow (ERROR)
//   7. Update ImportJob with final counts + status
//   8. Create AuditLog entry
// =============================================================================

import { supabase } from '@/integrations/supabase/client';
import type { RowValidationResult } from '@/lib/admin/excelParser';
import type { ImportJob } from '@/types/admin';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ImportOptions {
  file: File;
  validRows: RowValidationResult[];
  invalidRows: RowValidationResult[];
  pricingTableName: string;     // e.g. "Tabela Março 2026"
  versionLabel?: string;        // e.g. "Importado em 17/03/2026"
  adminUserId: string;
}

export interface ImportResult {
  importJob: ImportJob;
  pricingTableVersionId: string;
  successRows: number;
  errorRows: number;
}

export interface ImportProgress {
  phase: 'uploading' | 'creating_job' | 'creating_version' | 'processing_rows' | 'finalizing' | 'done';
  current: number;
  total: number;
  message: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function uploadFile(file: File): Promise<string> {
  const timestamp = Date.now();
  const safeName  = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path      = `${timestamp}_${safeName}`;

  const { data, error } = await supabase.storage
    .from('import-files')
    .upload(path, file, { contentType: file.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

  if (error) throw new Error(`Falha no upload do arquivo: ${error.message}`);
  return data.path;
}

async function getOrCreatePricingTable(name: string): Promise<string> {
  // Look for an existing active pricing table with the same name
  const { data: existing } = await supabase
    .from('pricing_tables')
    .select('id')
    .eq('name', name)
    .limit(1)
    .single();

  if (existing) return existing.id;

  // Create a new one (not active yet — version activation does that)
  const { data, error } = await supabase
    .from('pricing_tables')
    .insert({ name, is_active: false })
    .select('id')
    .single();

  if (error || !data) throw new Error(`Falha ao criar tabela de preços: ${error?.message}`);
  return data.id;
}

async function getNextVersionNumber(pricingTableId: string): Promise<number> {
  const { data } = await supabase
    .from('pricing_table_versions')
    .select('version_number')
    .eq('pricing_table_id', pricingTableId)
    .order('version_number', { ascending: false })
    .limit(1)
    .single();

  return data ? data.version_number + 1 : 1;
}

/** Resolves a vehicle by name. If not found, creates a placeholder record. */
async function resolveVehicle(vehicleName: string): Promise<string> {
  // Try exact match first (case-insensitive)
  const { data: exact } = await supabase
    .from('vehicles')
    .select('id')
    .ilike('model', vehicleName)
    .limit(1)
    .single();

  if (exact) return exact.id;

  // Try partial match on "brand model"
  const parts = vehicleName.trim().split(/\s+/);
  if (parts.length >= 2) {
    const brand = parts[0];
    const model = parts.slice(1).join(' ');

    const { data: partial } = await supabase
      .from('vehicles')
      .select('id')
      .ilike('brand', brand)
      .ilike('model', `%${model}%`)
      .limit(1)
      .single();

    if (partial) return partial.id;
  }

  // Create placeholder vehicle — admin will need to fill in details
  const brand = parts.length > 1 ? parts[0] : vehicleName;
  const model = parts.length > 1 ? parts.slice(1).join(' ') : vehicleName;

  const { data: created, error } = await supabase
    .from('vehicles')
    .insert({
      brand,
      model,
      year: new Date().getFullYear(),
      category: 'SUV',
      transmission: 'AUTOMATICO',
      fuel: 'FLEX',
      seats: 5,
      doors: 4,
      features: [],
      is_active: false, // admin must review and activate
    })
    .select('id')
    .single();

  if (error || !created) throw new Error(`Falha ao criar veículo "${vehicleName}": ${error?.message}`);
  return created.id;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export async function executeImport(
  options: ImportOptions,
  onProgress?: (p: ImportProgress) => void
): Promise<ImportResult> {
  const { file, validRows, invalidRows, pricingTableName, versionLabel, adminUserId } = options;
  const totalRows = validRows.length + invalidRows.length;

  const report = (phase: ImportProgress['phase'], current: number, total: number, message: string) => {
    onProgress?.({ phase, current, total, message });
  };

  // ── 1. Upload file ────────────────────────────────────────────────────────
  report('uploading', 0, 1, 'Enviando arquivo...');
  const fileUrl = await uploadFile(file);
  report('uploading', 1, 1, 'Arquivo enviado.');

  // ── 2. Create ImportJob ───────────────────────────────────────────────────
  report('creating_job', 0, 1, 'Criando registro de importação...');
  const { data: importJobData, error: jobError } = await supabase
    .from('import_jobs')
    .insert({
      file_name:      file.name,
      file_url:       fileUrl,
      file_size:      file.size,
      status:         'PROCESSING',
      total_rows:     totalRows,
      processed_rows: 0,
      success_rows:   0,
      error_rows:     0,
      created_by:     adminUserId,
      started_at:     new Date().toISOString(),
    })
    .select()
    .single();

  if (jobError || !importJobData) {
    throw new Error(`Falha ao criar ImportJob: ${jobError?.message}`);
  }
  const importJobId = importJobData.id;
  report('creating_job', 1, 1, 'Registro criado.');

  // ── 3. Resolve PricingTable + create new Version ──────────────────────────
  report('creating_version', 0, 1, 'Criando nova versão da tabela de preços...');
  const pricingTableId   = await getOrCreatePricingTable(pricingTableName);
  const nextVersionNum   = await getNextVersionNumber(pricingTableId);
  const label = versionLabel ?? `v${nextVersionNum} — Importada em ${new Date().toLocaleDateString('pt-BR')}`;

  const { data: versionData, error: versionError } = await supabase
    .from('pricing_table_versions')
    .insert({
      pricing_table_id: pricingTableId,
      version_number:   nextVersionNum,
      label,
      is_active:        false,
      created_by:       adminUserId,
      import_job_id:    importJobId,
    })
    .select('id')
    .single();

  if (versionError || !versionData) {
    throw new Error(`Falha ao criar versão da tabela: ${versionError?.message}`);
  }
  const versionId = versionData.id;
  report('creating_version', 1, 1, 'Versão criada.');

  // ── 4. Process valid rows ─────────────────────────────────────────────────
  let successCount = 0;
  let errorCount   = 0;

  for (let i = 0; i < validRows.length; i++) {
    const row = validRows[i];
    report('processing_rows', i + 1, validRows.length, `Processando linha ${row.rowNumber}: ${row.vehicleName}`);

    try {
      const vehicleId = await resolveVehicle(row.vehicleName);

      // Create VehiclePricingRule
      const { data: rule, error: ruleError } = await supabase
        .from('vehicle_pricing_rules')
        .insert({
          pricing_table_version_id: versionId,
          vehicle_id:               vehicleId,
          contract_duration_months: row.contractDurationMonths,
          excess_km_value:          row.excessKmValue,
          monitoring_value:         row.monitoringValue,
          reserve_car_value:        row.reserveCarValue,
        })
        .select('id')
        .single();

      if (ruleError || !rule) throw new Error(ruleError?.message ?? 'rule insert failed');

      // Batch-insert all KM options for this rule
      const { error: kmError } = await supabase
        .from('annual_km_options')
        .insert(
          row.kmOptions.map((opt) => ({
            vehicle_pricing_rule_id: rule.id,
            annual_km:               opt.annualKm,
            monthly_price:           opt.monthlyPrice,
          }))
        );

      if (kmError) throw new Error(kmError.message);

      // Log successful ImportJobRow
      await supabase.from('import_job_rows').insert({
        import_job_id:            importJobId,
        row_number:               row.rowNumber,
        vehicle_name:             row.vehicleName,
        contract_duration_months: row.contractDurationMonths,
        annual_km_options:        row.kmOptions,
        excess_km_value:          row.excessKmValue,
        monitoring_value:         row.monitoringValue,
        reserve_car_value:        row.reserveCarValue,
        status: 'SUCCESS',
      });

      successCount++;

    } catch (err) {
      errorCount++;
      await supabase.from('import_job_rows').insert({
        import_job_id:            importJobId,
        row_number:               row.rowNumber,
        vehicle_name:             row.vehicleName,
        contract_duration_months: row.contractDurationMonths,
        annual_km_options:        row.kmOptions,
        status:        'ERROR',
        error_message: String(err),
      });
    }
  }

  // ── 5. Persist invalid rows (for reporting) ───────────────────────────────
  for (const row of invalidRows) {
    await supabase.from('import_job_rows').insert({
      import_job_id:            importJobId,
      row_number:               row.rowNumber,
      vehicle_name:             row.vehicleName,
      contract_duration_months: row.contractDurationMonths,
      annual_km_options:        row.kmOptions,
      status:        'ERROR',
      error_message: row.errors.join(' | '),
    });
    errorCount++;
  }

  // ── 6. Finalize ImportJob ─────────────────────────────────────────────────
  report('finalizing', 0, 1, 'Finalizando importação...');
  const finalStatus = successCount > 0 ? 'SUCCESS' : 'FAILED';
  const errorSummary = errorCount > 0
    ? `${errorCount} linha${errorCount !== 1 ? 's' : ''} com erro${errorCount !== 1 ? 's' : ''}.`
    : undefined;

  await supabase
    .from('import_jobs')
    .update({
      status:                   finalStatus,
      processed_rows:           totalRows,
      success_rows:             successCount,
      error_rows:               errorCount,
      error_summary:            errorSummary ?? null,
      completed_at:             new Date().toISOString(),
      pricing_table_version_id: versionId,
    })
    .eq('id', importJobId);

  // ── 7. Update version with import job reference ───────────────────────────
  // (already set above, but ensure FK is in place)

  // ── 8. AuditLog ───────────────────────────────────────────────────────────
  await supabase.from('audit_logs').insert({
    admin_user_id: adminUserId,
    action:        'IMPORT',
    entity_type:   'ImportJob',
    entity_id:     importJobId,
    entity_label:  file.name,
    changes: {
      data: {
        pricingTableName,
        versionLabel: label,
        totalRows,
        successRows: successCount,
        errorRows:   errorCount,
        newVersionId: versionId,
      },
    },
  });

  report('done', totalRows, totalRows, 'Importação concluída!');

  // Return a typed ImportJob
  const importJob: ImportJob = {
    id:                      importJobId,
    fileName:                file.name,
    fileUrl,
    fileSize:                file.size,
    status:                  finalStatus,
    totalRows,
    processedRows:           totalRows,
    successRows:             successCount,
    errorRows:               errorCount,
    errorSummary,
    createdById:             adminUserId,
    createdAt:               new Date().toISOString(),
    completedAt:             new Date().toISOString(),
    pricingTableVersionId:   versionId,
  };

  return { importJob, pricingTableVersionId: versionId, successRows: successCount, errorRows: errorCount };
}

// ---------------------------------------------------------------------------
// Activate a pricing table version (calls the Supabase DB function)
// ---------------------------------------------------------------------------
export async function activatePricingVersion(versionId: string): Promise<void> {
  const { error } = await supabase.rpc('activate_pricing_version', {
    p_version_id: versionId,
  });
  if (error) throw new Error(`Falha ao ativar versão: ${error.message}`);
}
