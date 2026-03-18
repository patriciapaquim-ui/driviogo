// =============================================================================
// DrivioGo — Edge Function: process-excel-import
// Deno runtime (Supabase Edge Functions)
//
// Receives an Excel file via multipart/form-data, validates it, saves all
// pricing data to the database, and returns a full ImportJob summary.
//
// POST /functions/v1/process-excel-import
//   Body: FormData
//     file          File     — The .xlsx file
//     tableName     string   — Name for the PricingTable
//     versionLabel  string?  — Optional label for this version
// =============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as XLSX from 'https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ---------------------------------------------------------------------------
// Types (mirrors src/lib/admin/excelParser.ts)
// ---------------------------------------------------------------------------

interface KmOption {
  annualKm: number;
  monthlyPrice: number;
}

interface ParsedRow {
  rowNumber: number;
  vehicleName: string;
  contractDurationMonths: number;
  kmOptions: KmOption[];
  excessKmValue: number;
  monitoringValue: number;
  reserveCarValue: number;
  isValid: boolean;
  errors: string[];
}

// ---------------------------------------------------------------------------
// Parsing helpers (same logic as the frontend parser)
// ---------------------------------------------------------------------------

const COL = {
  contract:   /prazo|contrato|dura/i,
  vehicle:    /ve[íi]culo|modelo|carro/i,
  excessKm:   /excedente|km[\s_-]*exc|valor[\s_-]*km/i,
  monitoring: /monitoramento/i,
  reserveCar: /reserva|carro[\s_-]*reserva/i,
};

function detectKmColumns(headers: string[]): { idx: number; km: number }[] {
  const results: { idx: number; km: number }[] = [];
  for (let i = 0; i < headers.length; i++) {
    const raw = String(headers[i] ?? '')
      .replace(/\./g, '').replace(/,/g, '').replace(/\s/g, '').replace(/km$/i, '');
    const num = parseInt(raw, 10);
    if (!isNaN(num) && num >= 5_000 && num <= 200_000) {
      results.push({ idx: i, km: num });
    }
  }
  return results.sort((a, b) => a.km - b.km);
}

function parseMoney(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return isFinite(value) ? value : null;
  const str = String(value).trim().replace(/R\$\s*/g, '').replace(/\s/g, '');
  let normalized: string;
  if (str.includes(',') && str.includes('.')) {
    const lastComma = str.lastIndexOf(',');
    const lastDot   = str.lastIndexOf('.');
    normalized = lastComma > lastDot
      ? str.replace(/\./g, '').replace(',', '.')
      : str.replace(/,/g, '');
  } else if (str.includes(',')) {
    normalized = str.replace(/\./g, '').replace(',', '.');
  } else {
    normalized = str;
  }
  const num = parseFloat(normalized);
  return isNaN(num) ? null : num;
}

function parseExcelBuffer(buffer: ArrayBuffer): { rows: ParsedRow[]; columnErrors: string[] } {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: false });
  const sheet    = workbook.Sheets[workbook.SheetNames[0]];
  const rawRows  = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '', blankrows: false });

  if (rawRows.length < 2) {
    return { rows: [], columnErrors: ['Planilha vazia ou sem dados.'] };
  }

  const headers  = (rawRows[0] as unknown[]).map(h => String(h ?? '').trim());
  const contractIdx   = headers.findIndex(h => COL.contract.test(h));
  const vehicleIdx    = headers.findIndex(h => COL.vehicle.test(h));
  const excessKmIdx   = headers.findIndex(h => COL.excessKm.test(h));
  const monitoringIdx = headers.findIndex(h => COL.monitoring.test(h));
  const reserveCarIdx = headers.findIndex(h => COL.reserveCar.test(h));
  const kmDetected    = detectKmColumns(headers);

  const columnErrors: string[] = [];
  if (contractIdx   === -1) columnErrors.push('Coluna "Prazo do Contrato" não encontrada.');
  if (vehicleIdx    === -1) columnErrors.push('Coluna "Veículos" não encontrada.');
  if (excessKmIdx   === -1) columnErrors.push('Coluna "Valor KM Excedente" não encontrada.');
  if (monitoringIdx === -1) columnErrors.push('Coluna "Valor Monitoramento" não encontrada.');
  if (reserveCarIdx === -1) columnErrors.push('Coluna "Valor Carro Reserva" não encontrada.');
  if (kmDetected.length < 2) columnErrors.push('Pelo menos 2 colunas de KM anual são necessárias.');
  if (columnErrors.length > 0) return { rows: [], columnErrors };

  const rows: ParsedRow[] = [];
  const seen = new Set<string>();

  for (let i = 1; i < rawRows.length; i++) {
    const row = rawRows[i] as unknown[];
    if (!row || row.every(c => String(c ?? '').trim() === '')) continue;

    const errors: string[] = [];
    const vehicleName  = String(row[vehicleIdx] ?? '').trim();
    const contractRaw  = parseInt(String(row[contractIdx] ?? '').replace(/\D/g, ''), 10);
    const excessKm     = parseMoney(row[excessKmIdx]);
    const monitoring   = parseMoney(row[monitoringIdx]);
    const reserveCar   = parseMoney(row[reserveCarIdx]);

    if (!vehicleName)                          errors.push('Nome do veículo vazio.');
    if (isNaN(contractRaw) || contractRaw < 1) errors.push('Prazo inválido.');
    if (excessKm   === null || excessKm < 0)   errors.push('Valor KM excedente inválido.');
    if (monitoring === null || monitoring < 0) errors.push('Valor monitoramento inválido.');
    if (reserveCar === null || reserveCar < 0) errors.push('Valor carro reserva inválido.');

    const kmOptions: KmOption[] = [];
    for (const { idx, km } of kmDetected) {
      const price = parseMoney(row[idx]);
      if (price === null || price <= 0) {
        errors.push(`Valor para ${km.toLocaleString('pt-BR')} km inválido.`);
      } else {
        kmOptions.push({ annualKm: km, monthlyPrice: price });
      }
    }

    const key = `${vehicleName.toLowerCase()}|${contractRaw}`;
    if (errors.length === 0 && seen.has(key)) {
      errors.push('Linha duplicada na planilha.');
    } else if (errors.length === 0) {
      seen.add(key);
    }

    rows.push({
      rowNumber: i + 1,
      vehicleName,
      contractDurationMonths: isNaN(contractRaw) ? 0 : contractRaw,
      kmOptions,
      excessKmValue:   excessKm   ?? 0,
      monitoringValue: monitoring ?? 0,
      reserveCarValue: reserveCar ?? 0,
      isValid: errors.length === 0,
      errors,
    });
  }

  return { rows, columnErrors: [] };
}

// ---------------------------------------------------------------------------
// Vehicle resolution helper
// ---------------------------------------------------------------------------

async function resolveVehicle(supabase: ReturnType<typeof createClient>, name: string): Promise<string> {
  const { data: exact } = await supabase
    .from('vehicles').select('id').ilike('model', name).limit(1).single();
  if (exact) return exact.id;

  const parts = name.trim().split(/\s+/);
  const brand = parts[0];
  const model = parts.slice(1).join(' ') || name;

  const { data: created } = await supabase
    .from('vehicles')
    .insert({ brand, model, year: new Date().getFullYear(), category: 'SUV', transmission: 'AUTOMATICO', fuel: 'FLEX', seats: 5, doors: 4, features: [], is_active: false })
    .select('id').single();

  if (!created) throw new Error(`Falha ao criar veículo: ${name}`);
  return created.id;
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'Não autorizado.' }), { status: 401, headers: corsHeaders });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Sessão inválida.' }), { status: 401, headers: corsHeaders });
    }

    // Check admin role
    const role = user.app_metadata?.role as string | undefined;
    if (!['admin', 'super_admin'].includes(role ?? '')) {
      return new Response(JSON.stringify({ error: 'Permissão negada.' }), { status: 403, headers: corsHeaders });
    }

    // Parse multipart form
    const form      = await req.formData();
    const file      = form.get('file') as File | null;
    const tableName = (form.get('tableName') as string | null) ?? 'Tabela sem nome';
    const versionLabel = form.get('versionLabel') as string | null;

    if (!file) {
      return new Response(JSON.stringify({ error: 'Arquivo não enviado.' }), { status: 400, headers: corsHeaders });
    }

    // Parse Excel
    const buffer = await file.arrayBuffer();
    const { rows, columnErrors } = parseExcelBuffer(buffer);

    if (columnErrors.length > 0) {
      return new Response(JSON.stringify({ error: 'Planilha inválida.', columnErrors }), {
        status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const validRows   = rows.filter(r => r.isValid);
    const invalidRows = rows.filter(r => !r.isValid);

    // Upload file to storage
    const path = `${Date.now()}_${file.name}`;
    await supabase.storage.from('import-files').upload(path, file);

    // Create ImportJob
    const { data: job } = await supabase.from('import_jobs')
      .insert({ file_name: file.name, file_url: path, file_size: file.size, status: 'PROCESSING', total_rows: rows.length, created_by: user.id, started_at: new Date().toISOString() })
      .select('id').single();

    const importJobId = job!.id;

    // Resolve PricingTable
    let tableId: string;
    const { data: existingTable } = await supabase.from('pricing_tables').select('id').eq('name', tableName).limit(1).single();
    if (existingTable) {
      tableId = existingTable.id;
    } else {
      const { data: newTable } = await supabase.from('pricing_tables').insert({ name: tableName, is_active: false }).select('id').single();
      tableId = newTable!.id;
    }

    // Get next version number
    const { data: lastVersion } = await supabase.from('pricing_table_versions')
      .select('version_number').eq('pricing_table_id', tableId).order('version_number', { ascending: false }).limit(1).single();
    const nextVersion = lastVersion ? lastVersion.version_number + 1 : 1;

    const label = versionLabel ?? `v${nextVersion} — ${new Date().toLocaleDateString('pt-BR')}`;
    const { data: version } = await supabase.from('pricing_table_versions')
      .insert({ pricing_table_id: tableId, version_number: nextVersion, label, is_active: false, created_by: user.id, import_job_id: importJobId })
      .select('id').single();

    const versionId = version!.id;

    // Process rows
    let successCount = 0;
    let errorCount   = 0;

    for (const row of validRows) {
      try {
        const vehicleId = await resolveVehicle(supabase, row.vehicleName);
        const { data: rule } = await supabase.from('vehicle_pricing_rules')
          .insert({ pricing_table_version_id: versionId, vehicle_id: vehicleId, contract_duration_months: row.contractDurationMonths, excess_km_value: row.excessKmValue, monitoring_value: row.monitoringValue, reserve_car_value: row.reserveCarValue })
          .select('id').single();

        await supabase.from('annual_km_options')
          .insert(row.kmOptions.map(o => ({ vehicle_pricing_rule_id: rule!.id, annual_km: o.annualKm, monthly_price: o.monthlyPrice })));

        await supabase.from('import_job_rows').insert({ import_job_id: importJobId, row_number: row.rowNumber, vehicle_name: row.vehicleName, contract_duration_months: row.contractDurationMonths, annual_km_options: row.kmOptions, excess_km_value: row.excessKmValue, monitoring_value: row.monitoringValue, reserve_car_value: row.reserveCarValue, status: 'SUCCESS' });
        successCount++;
      } catch (e) {
        errorCount++;
        await supabase.from('import_job_rows').insert({ import_job_id: importJobId, row_number: row.rowNumber, vehicle_name: row.vehicleName, contract_duration_months: row.contractDurationMonths, annual_km_options: row.kmOptions, status: 'ERROR', error_message: String(e) });
      }
    }

    for (const row of invalidRows) {
      await supabase.from('import_job_rows').insert({ import_job_id: importJobId, row_number: row.rowNumber, vehicle_name: row.vehicleName, contract_duration_months: row.contractDurationMonths, annual_km_options: row.kmOptions, status: 'ERROR', error_message: row.errors.join(' | ') });
      errorCount++;
    }

    // Finalize ImportJob
    const finalStatus = successCount > 0 ? 'SUCCESS' : 'FAILED';
    await supabase.from('import_jobs').update({ status: finalStatus, processed_rows: rows.length, success_rows: successCount, error_rows: errorCount, completed_at: new Date().toISOString(), pricing_table_version_id: versionId }).eq('id', importJobId);

    // AuditLog
    await supabase.from('audit_logs').insert({ admin_user_id: user.id, action: 'IMPORT', entity_type: 'ImportJob', entity_id: importJobId, entity_label: file.name, changes: { data: { tableName, totalRows: rows.length, successRows: successCount, errorRows: errorCount, versionId } } });

    return new Response(
      JSON.stringify({ importJobId, versionId, successRows: successCount, errorRows: errorCount, status: finalStatus }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('process-excel-import error:', err);
    return new Response(
      JSON.stringify({ error: 'Erro interno. Tente novamente.', detail: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
