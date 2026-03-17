import { useState, useMemo } from 'react';
import { ClipboardList, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { AdminHeader } from '@/components/admin/layout/AdminHeader';
import { AuditActionBadge } from '@/components/admin/shared/StatusBadge';
import { PageHeader } from '@/components/admin/shared/PageHeader';
import { EmptyState } from '@/components/admin/shared/EmptyState';
import { useAuditLogs } from '@/hooks/admin/useAuditLogs';
import { ENTITY_TYPE_LABELS, AUDIT_ACTION_LABELS } from '@/types/admin';
import type { AuditAction } from '@/types/admin';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ACTIONS: AuditAction[] = [
  'CREATE', 'UPDATE', 'DELETE', 'ACTIVATE', 'DEACTIVATE', 'IMPORT', 'LOGIN', 'LOGOUT',
];

const formatDate = (iso: string) =>
  format(new Date(iso), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

export default function AdminLogs() {
  const { logs, loading } = useAuditLogs();
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [entityFilter, setEntityFilter] = useState<string>('all');

  const entityTypes = useMemo(
    () => [...new Set(logs.map((l) => l.entityType))],
    [logs]
  );

  const filtered = useMemo(() => {
    return logs.filter((log) => {
      const matchSearch =
        !search ||
        log.adminUserName?.toLowerCase().includes(search.toLowerCase()) ||
        log.entityLabel?.toLowerCase().includes(search.toLowerCase());
      const matchAction = actionFilter === 'all' || log.action === actionFilter;
      const matchEntity = entityFilter === 'all' || log.entityType === entityFilter;
      return matchSearch && matchAction && matchEntity;
    });
  }, [logs, search, actionFilter, entityFilter]);

  return (
    <AdminLayout>
      <AdminHeader
        title="Logs do Sistema"
        subtitle="Registro de todas as ações realizadas no painel"
      />

      <main className="flex-1 overflow-auto p-6">
        <PageHeader
          title="Logs do Sistema"
          description="Histórico completo de ações administrativas. Registros não podem ser alterados."
        />

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-5">
          <div className="relative flex-1 min-w-52">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar por usuário ou item..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-white"
            />
          </div>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-44 bg-white">
              <SelectValue placeholder="Tipo de ação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as ações</SelectItem>
              {ACTIONS.map((a) => (
                <SelectItem key={a} value={a}>{AUDIT_ACTION_LABELS[a]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={entityFilter} onValueChange={setEntityFilter}>
            <SelectTrigger className="w-44 bg-white">
              <SelectValue placeholder="Área do sistema" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as áreas</SelectItem>
              {entityTypes.map((e) => (
                <SelectItem key={e} value={e}>{ENTITY_TYPE_LABELS[e] ?? e}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Usuário</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Área</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Data e hora</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5}>
                    <EmptyState
                      icon={<ClipboardList className="w-12 h-12" />}
                      title="Nenhum registro encontrado"
                      description="Tente ajustar os filtros de busca."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((log) => (
                  <TableRow key={log.id} className="hover:bg-slate-50/60">
                    <TableCell>
                      <p className="text-sm font-medium text-slate-700">{log.adminUserName ?? '—'}</p>
                    </TableCell>
                    <TableCell>
                      <AuditActionBadge action={log.action} />
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {ENTITY_TYPE_LABELS[log.entityType] ?? log.entityType}
                    </TableCell>
                    <TableCell>
                      {log.entityLabel ? (
                        <p className="text-sm text-slate-700">{log.entityLabel}</p>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                      {log.changes?.before && log.changes?.after && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          {Object.keys(log.changes.after).map((k) => {
                            const before = String(log.changes!.before![k] ?? '');
                            const after = String(log.changes!.after![k] ?? '');
                            return before !== after ? `${k}: ${before} → ${after}` : null;
                          }).filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-slate-500 whitespace-nowrap">
                      {formatDate(log.createdAt)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {filtered.length > 0 && (
          <p className="text-xs text-slate-400 mt-3">
            {filtered.length} registro{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
          </p>
        )}
      </main>
    </AdminLayout>
  );
}
