import { useState } from 'react';
import { History, FileSpreadsheet, CheckCircle2, XCircle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { AdminHeader } from '@/components/admin/layout/AdminHeader';
import { ImportStatusBadge } from '@/components/admin/shared/StatusBadge';
import { PageHeader } from '@/components/admin/shared/PageHeader';
import { EmptyState } from '@/components/admin/shared/EmptyState';
import { Pagination } from '@/components/admin/shared/Pagination';
import { useImportJobs } from '@/hooks/admin/useImportJobs';
import { usePagination } from '@/hooks/admin/usePagination';
import { IMPORT_STATUS_LABELS } from '@/types/admin';
import type { ImportJobStatus } from '@/types/admin';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const LIMIT = 15;

const STATUS_OPTIONS: ImportJobStatus[] = ['PENDING', 'PROCESSING', 'SUCCESS', 'PARTIAL', 'FAILED'];

const formatDate = (iso: string) =>
  format(new Date(iso), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

const formatSize = (bytes?: number) => {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(0)} KB`;
};

export default function AdminImportHistory() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedId,   setExpandedId]   = useState<string | null>(null);

  const { page, goToPage, resetPage } = usePagination();

  const { jobs, total, totalPages, loading } = useImportJobs({
    page,
    limit:  LIMIT,
    status: statusFilter !== 'all' ? statusFilter : undefined,
  });

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    resetPage();
  };

  const toggleExpand = (id: string) =>
    setExpandedId((prev) => (prev === id ? null : id));

  return (
    <AdminLayout>
      <AdminHeader
        title="Histórico de Importações"
        subtitle="Registro de todas as planilhas importadas"
      />

      <main className="flex-1 overflow-auto p-6">
        <PageHeader
          title="Histórico de Importações"
          description={`${total} importaç${total !== 1 ? 'ões' : 'ão'} no histórico`}
        />

        {/* Filter */}
        <div className="flex gap-3 mb-5">
          <Select value={statusFilter} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-44 bg-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>{IMPORT_STATUS_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="border-0 shadow-sm">
                <CardContent className="p-4 h-16 animate-pulse bg-slate-100 rounded-xl" />
              </Card>
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <EmptyState
            icon={<History className="w-12 h-12" />}
            title="Nenhuma importação encontrada"
            description="As planilhas importadas aparecerão aqui."
          />
        ) : (
          <>
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Arquivo</TableHead>
                    <TableHead>Importado por</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-center">Linhas</TableHead>
                    <TableHead className="text-center">Erros</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((job) => (
                    <>
                      <TableRow
                        key={job.id}
                        className="hover:bg-slate-50/60 cursor-pointer"
                        onClick={() => toggleExpand(job.id)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
                              {job.status === 'SUCCESS' ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              ) : job.status === 'FAILED' ? (
                                <XCircle className="w-4 h-4 text-red-500" />
                              ) : (
                                <FileSpreadsheet className="w-4 h-4 text-slate-400" />
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-700">{job.fileName}</p>
                              <p className="text-xs text-slate-400">{formatSize(job.fileSize)}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">{job.createdByName ?? '—'}</TableCell>
                        <TableCell className="text-sm text-slate-600 whitespace-nowrap">
                          {formatDate(job.createdAt)}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-sm font-medium text-slate-700">{job.successRows}</span>
                          <span className="text-xs text-slate-400">/{job.totalRows}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          {job.errorRows > 0 ? (
                            <div className="flex items-center justify-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                              <span className="text-sm text-red-600 font-medium">{job.errorRows}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-slate-400">0</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <ImportStatusBadge status={job.status} />
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="w-7 h-7">
                            {expandedId === job.id
                              ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                              : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                            }
                          </Button>
                        </TableCell>
                      </TableRow>

                      {expandedId === job.id && (
                        <TableRow key={`${job.id}-details`}>
                          <TableCell colSpan={7} className="bg-slate-50 border-t border-slate-100 px-6 py-4">
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <p className="text-xs font-medium text-slate-500 mb-1">Início do processamento</p>
                                <p className="text-slate-700">{job.startedAt ? formatDate(job.startedAt) : '—'}</p>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-slate-500 mb-1">Conclusão</p>
                                <p className="text-slate-700">{job.completedAt ? formatDate(job.completedAt) : '—'}</p>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-slate-500 mb-1">Versão gerada</p>
                                <p className="text-slate-700">
                                  {job.pricingTableVersionId ? 'Nova versão criada' : '—'}
                                </p>
                              </div>
                            </div>
                            {job.errorSummary && (
                              <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-100">
                                <p className="text-xs font-medium text-red-600 mb-1">Resumo de erros</p>
                                <p className="text-sm text-red-700">{job.errorSummary}</p>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))}
                </TableBody>
              </Table>
            </div>

            <Pagination
              page={page}
              totalPages={totalPages}
              total={total}
              limit={LIMIT}
              onPage={goToPage}
            />
          </>
        )}
      </main>
    </AdminLayout>
  );
}
