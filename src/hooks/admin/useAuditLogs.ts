import { useState } from 'react';
import { MOCK_AUDIT_LOGS } from '@/lib/admin/mockData';
import type { AuditLog } from '@/types/admin';

export function useAuditLogs() {
  const [logs] = useState<AuditLog[]>(MOCK_AUDIT_LOGS);
  const [loading] = useState(false);

  return { logs, loading };
}
