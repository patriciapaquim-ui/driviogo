// =============================================================================
// DrivioGo — Audit Service
// =============================================================================

import { supabase } from '@/integrations/supabase/client';
import type { AuditLog, AuditAction } from '@/types/admin';

const db = supabase as any;

export interface AuditFilters {
  page?:       number;
  limit?:      number;
  search?:     string;
  action?:     string;
  entityType?: string;
}

export interface AuditListResult {
  logs:       AuditLog[];
  total:      number;
  page:       number;
  totalPages: number;
}

function mapLog(r: Record<string, unknown>): AuditLog {
  const adminUser = r.admin_user as Record<string, unknown> | undefined;
  return {
    id:            r.id           as string,
    adminUserId:   r.admin_user_id as string,
    adminUserName: adminUser?.name as string | undefined,
    action:        r.action       as AuditAction,
    entityType:    r.entity_type  as string,
    entityId:      r.entity_id    as string | undefined,
    entityLabel:   r.entity_label as string | undefined,
    changes:       r.changes      as AuditLog['changes'],
    ipAddress:     r.ip_address   as string | undefined,
    createdAt:     r.created_at   as string,
  };
}

export async function listAuditLogs(filters: AuditFilters = {}): Promise<AuditListResult> {
  const { page = 1, limit = 20, search, action, entityType } = filters;
  const from = (page - 1) * limit;
  const to   = from + limit - 1;

  let query = db
    .from('audit_logs')
    .select('*, admin_user:admin_users(name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (search?.trim()) {
    query = query.or(`entity_label.ilike.%${search.trim()}%`);
  }
  if (action && action !== 'all') {
    query = query.eq('action', action);
  }
  if (entityType && entityType !== 'all') {
    query = query.eq('entity_type', entityType);
  }

  const { data, count, error } = await query;
  if (error) throw new Error(error.message);

  return {
    logs:       (data ?? []).map(mapLog),
    total:      count ?? 0,
    page,
    totalPages: Math.ceil((count ?? 0) / limit),
  };
}

export async function getRecentAuditLogs(limit = 5): Promise<AuditLog[]> {
  const { data, error } = await db
    .from('audit_logs')
    .select('*, admin_user:admin_users(name)')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return [];
  return (data ?? []).map(mapLog);
}

/** Write an audit log entry from the frontend (used when Edge Functions are unavailable). */
export async function writeAuditLog(entry: {
  adminUserId: string;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  entityLabel?: string;
  changes?: Record<string, unknown>;
}): Promise<void> {
  const { error } = await db.from('audit_logs').insert({
    admin_user_id: entry.adminUserId,
    action:        entry.action,
    entity_type:   entry.entityType,
    entity_id:     entry.entityId    ?? null,
    entity_label:  entry.entityLabel ?? null,
    changes:       entry.changes     ?? null,
  });
  if (error) console.warn('AuditLog write failed:', error.message);
}
