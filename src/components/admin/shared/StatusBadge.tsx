import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ImportJobStatus, AuditAction } from '@/types/admin';
import { IMPORT_STATUS_LABELS, AUDIT_ACTION_LABELS } from '@/types/admin';

// ---------------------------------------------------------------------------
// Vehicle active/inactive badge
// ---------------------------------------------------------------------------

interface ActiveBadgeProps {
  isActive: boolean;
  className?: string;
}

export function ActiveBadge({ isActive, className }: ActiveBadgeProps) {
  return (
    <Badge
      className={cn(
        'text-xs font-medium',
        isActive
          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-100',
        className
      )}
    >
      {isActive ? 'Ativo' : 'Inativo'}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Import job status badge
// ---------------------------------------------------------------------------

interface ImportStatusBadgeProps {
  status: ImportJobStatus;
  className?: string;
}

const IMPORT_STATUS_STYLES: Record<ImportJobStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-800 hover:bg-amber-100',
  PROCESSING: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
  SUCCESS: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100',
  FAILED: 'bg-red-100 text-red-800 hover:bg-red-100',
  CANCELLED: 'bg-slate-100 text-slate-600 hover:bg-slate-100',
};

export function ImportStatusBadge({ status, className }: ImportStatusBadgeProps) {
  return (
    <Badge className={cn('text-xs font-medium', IMPORT_STATUS_STYLES[status], className)}>
      {IMPORT_STATUS_LABELS[status]}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Audit action badge
// ---------------------------------------------------------------------------

interface AuditActionBadgeProps {
  action: AuditAction;
  className?: string;
}

const AUDIT_ACTION_STYLES: Record<AuditAction, string> = {
  CREATE: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100',
  UPDATE: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
  DELETE: 'bg-red-100 text-red-800 hover:bg-red-100',
  ACTIVATE: 'bg-violet-100 text-violet-800 hover:bg-violet-100',
  DEACTIVATE: 'bg-orange-100 text-orange-800 hover:bg-orange-100',
  IMPORT: 'bg-cyan-100 text-cyan-800 hover:bg-cyan-100',
  LOGIN: 'bg-slate-100 text-slate-600 hover:bg-slate-100',
  LOGOUT: 'bg-slate-100 text-slate-600 hover:bg-slate-100',
  PASSWORD_CHANGE: 'bg-amber-100 text-amber-800 hover:bg-amber-100',
};

export function AuditActionBadge({ action, className }: AuditActionBadgeProps) {
  return (
    <Badge className={cn('text-xs font-medium', AUDIT_ACTION_STYLES[action], className)}>
      {AUDIT_ACTION_LABELS[action]}
    </Badge>
  );
}
