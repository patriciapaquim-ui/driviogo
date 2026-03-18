// =============================================================================
// DrivioGo — Import History Service
// =============================================================================

import { supabase } from '@/integrations/supabase/client';
import type { ImportJob, ImportJobRow, ImportJobStatus } from '@/types/admin';

const db = supabase as any;

export interface ImportFilters {
  page?:   number;
  limit?:  number;
  status?: string;
}

export interface ImportListResult {
  jobs:       ImportJob[];
  total:      number;
  page:       number;
  totalPages: number;
}

function mapJob(r: Record<string, unknown>): ImportJob {
  const admin = r.admin_user as Record<string, unknown> | undefined;
  return {
    id:                    r.id                      as string,
    fileName:              r.file_name               as string,
    fileUrl:               r.file_url                as string,
    fileSize:              r.file_size               as number | undefined,
    status:                r.status                  as ImportJobStatus,
    totalRows:             r.total_rows              as number,
    processedRows:         r.processed_rows          as number,
    successRows:           r.success_rows            as number,
    errorRows:             r.error_rows              as number,
    errorSummary:          r.error_summary           as string | undefined,
    createdById:           r.created_by              as string,
    createdByName:         admin?.name               as string | undefined,
    startedAt:             r.started_at              as string | undefined,
    completedAt:           r.completed_at            as string | undefined,
    createdAt:             r.created_at              as string,
    pricingTableVersionId: r.pricing_table_version_id as string | undefined,
  };
}

function mapRow(r: Record<string, unknown>): ImportJobRow {
  return {
    id:                     r.id                       as string,
    importJobId:            r.import_job_id            as string,
    rowNumber:              r.row_number               as number,
    vehicleName:            r.vehicle_name             as string,
    contractDurationMonths: r.contract_duration_months as number,
    annualKmOptions:        (r.annual_km_options as ImportJobRow['annualKmOptions']) ?? [],
    excessKmValue:          r.excess_km_value          as number | undefined,
    monitoringValue:        r.monitoring_value         as number | undefined,
    reserveCarValue:        r.reserve_car_value        as number | undefined,
    status:                 r.status                   as ImportJobRow['status'],
    errorMessage:           r.error_message            as string | undefined,
  };
}

export async function listImportJobs(filters: ImportFilters = {}): Promise<ImportListResult> {
  const { page = 1, limit = 15, status } = filters;
  const from = (page - 1) * limit;
  const to   = from + limit - 1;

  let query = db
    .from('import_jobs')
    .select('*, admin_user:admin_users(name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  const { data, count, error } = await query;
  if (error) throw new Error(error.message);

  return {
    jobs:       (data ?? []).map(mapJob),
    total:      count ?? 0,
    page,
    totalPages: Math.ceil((count ?? 0) / limit),
  };
}

export async function getImportJobRows(jobId: string): Promise<ImportJobRow[]> {
  const { data, error } = await db
    .from('import_job_rows')
    .select('*')
    .eq('import_job_id', jobId)
    .order('row_number', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapRow);
}

export async function getLastImportJob(): Promise<ImportJob | null> {
  const { data, error } = await db
    .from('import_jobs')
    .select('*, admin_user:admin_users(name)')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;
  return mapJob(data);
}
