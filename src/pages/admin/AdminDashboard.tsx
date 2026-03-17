import { useNavigate } from 'react-router-dom';
import { Car, Tag, Upload, TrendingUp, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { AdminHeader } from '@/components/admin/layout/AdminHeader';
import { ImportStatusBadge, AuditActionBadge } from '@/components/admin/shared/StatusBadge';
import { MOCK_DASHBOARD_STATS } from '@/lib/admin/mockData';
import { ENTITY_TYPE_LABELS } from '@/types/admin';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const stats = MOCK_DASHBOARD_STATS;

  const formatDate = (iso: string) =>
    formatDistanceToNow(new Date(iso), { addSuffix: true, locale: ptBR });

  return (
    <AdminLayout>
      <AdminHeader title="Painel" subtitle="Bem-vindo ao painel administrativo da DrivioGo" />

      <main className="flex-1 overflow-auto p-6">

        {/* Stats cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-slate-500">Veículos ativos</p>
                <div className="w-9 h-9 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <Car className="w-4 h-4 text-emerald-600" />
                </div>
              </div>
              <p className="text-3xl font-bold text-slate-900">{stats.activeVehicles}</p>
              <p className="text-xs text-slate-400 mt-1">
                {stats.inactiveVehicles} inativo{stats.inactiveVehicles !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-slate-500">Total de veículos</p>
                <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                </div>
              </div>
              <p className="text-3xl font-bold text-slate-900">{stats.totalVehicles}</p>
              <p className="text-xs text-slate-400 mt-1">no catálogo</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-slate-500">Tabela ativa</p>
                <div className="w-9 h-9 bg-violet-100 rounded-lg flex items-center justify-center">
                  <Tag className="w-4 h-4 text-violet-600" />
                </div>
              </div>
              <p className="text-lg font-bold text-slate-900 leading-tight">
                {stats.activePricingTable ?? '—'}
              </p>
              {stats.activePricingVersion && (
                <p className="text-xs text-slate-400 mt-1">versão {stats.activePricingVersion}</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-slate-500">Última importação</p>
                <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center">
                  <Upload className="w-4 h-4 text-amber-600" />
                </div>
              </div>
              {stats.lastImport ? (
                <>
                  <ImportStatusBadge status={stats.lastImport.status} />
                  <p className="text-xs text-slate-400 mt-2">
                    {formatDate(stats.lastImport.createdAt)}
                  </p>
                </>
              ) : (
                <p className="text-sm text-slate-400">Nenhuma importação</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick actions */}
        <Card className="border-0 shadow-sm mb-8">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Ações rápidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => navigate('/admin/veiculos/novo')} className="gap-2">
                <Car className="w-4 h-4" />
                Cadastrar veículo
              </Button>
              <Button variant="outline" onClick={() => navigate('/admin/importar')} className="gap-2">
                <Upload className="w-4 h-4" />
                Importar tabela de preços
              </Button>
              <Button variant="outline" onClick={() => navigate('/admin/precos')} className="gap-2">
                <Tag className="w-4 h-4" />
                Ver tabela de preços
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent imports */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Importações recentes</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate('/admin/importacoes')}>
                Ver todas
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {MOCK_DASHBOARD_STATS.lastImport ? (
                  [{...MOCK_DASHBOARD_STATS.lastImport}].map((job) => (
                    <div key={job.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                      <div className="flex items-center gap-3 min-w-0">
                        {job.status === 'SUCCESS' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        ) : job.status === 'FAILED' ? (
                          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                        ) : (
                          <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-700 truncate">{job.fileName}</p>
                          <p className="text-xs text-slate-400">por {job.createdByName}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <ImportStatusBadge status={job.status} />
                        <p className="text-xs text-slate-400 mt-1">{formatDate(job.createdAt)}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-400 py-4 text-center">Nenhuma importação ainda.</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent audit logs */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Atividade recente</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate('/admin/logs')}>
                Ver tudo
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {stats.recentAuditLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 py-2 border-b border-slate-100 last:border-0">
                    <AuditActionBadge action={log.action} className="mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-700">
                        <span className="font-medium">{log.adminUserName}</span>{' '}
                        {log.entityLabel && (
                          <span className="text-slate-500">— {log.entityLabel}</span>
                        )}
                      </p>
                      <p className="text-xs text-slate-400">
                        {ENTITY_TYPE_LABELS[log.entityType] ?? log.entityType} · {formatDate(log.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </AdminLayout>
  );
}
