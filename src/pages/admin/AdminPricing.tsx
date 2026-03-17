import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, CheckCircle2, History, Tag, TrendingUp, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { AdminHeader } from '@/components/admin/layout/AdminHeader';
import { PageHeader } from '@/components/admin/shared/PageHeader';
import { EmptyState } from '@/components/admin/shared/EmptyState';
import { ConfirmationModal } from '@/components/admin/shared/ConfirmationModal';
import { usePricing, useVersionRules, useActivateVersion } from '@/hooks/admin/usePricing';
import type { PricingTableVersion } from '@/types/admin';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const formatBRL = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatDate = (iso: string) =>
  format(new Date(iso), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

export default function AdminPricing() {
  const navigate = useNavigate();
  const { pricingTable, activeVersion, loading } = usePricing();
  const { data: rules = [], isLoading: loadingRules } = useVersionRules(activeVersion?.id);
  const activateMutation = useActivateVersion();

  const [activateTarget, setActivateTarget] = useState<PricingTableVersion | null>(null);

  const handleActivate = async () => {
    if (!activateTarget) return;
    await activateMutation.mutateAsync(activateTarget.id);
    setActivateTarget(null);
  };

  return (
    <AdminLayout>
      <AdminHeader
        title="Tabela de Preços"
        subtitle="Visualize e gerencie as regras comerciais vigentes"
      />

      <main className="flex-1 overflow-auto p-6">
        <PageHeader
          title="Tabela de Preços"
          description="Os preços abaixo são os valores atualmente exibidos no site para os clientes."
          action={
            <Button onClick={() => navigate('/admin/importar')} className="gap-2">
              <Upload className="w-4 h-4" />
              Importar nova tabela
            </Button>
          }
        />

        {/* Active table info */}
        {loading ? (
          <Skeleton className="h-28 w-full rounded-xl mb-6" />
        ) : pricingTable ? (
          <Card className="border-0 shadow-sm mb-6 bg-emerald-50 border-emerald-200">
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-slate-800">{pricingTable.name}</h3>
                    <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 text-xs">
                      Em vigor
                    </Badge>
                  </div>
                  {activeVersion && (
                    <p className="text-sm text-slate-600">
                      {activeVersion.label ?? `Versão ${activeVersion.versionNumber}`}
                      {activeVersion.activatedAt && (
                        <span className="text-slate-400">
                          {' '}· ativada em {formatDate(activeVersion.activatedAt)}
                        </span>
                      )}
                    </p>
                  )}
                  {pricingTable.description && (
                    <p className="text-xs text-slate-400 mt-1">{pricingTable.description}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Pricing rules table */}
        {loadingRules ? (
          <div className="space-y-4">
            {[1, 2].map((i) => <Skeleton key={i} className="h-40 w-full rounded-xl" />)}
          </div>
        ) : rules.length > 0 ? (
          <div className="space-y-6">
            {rules.map((rule) => (
              <Card key={rule.id} className="border-0 shadow-sm overflow-hidden">
                <CardHeader className="pb-3 bg-slate-50 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">{rule.vehicleName}</CardTitle>
                      <p className="text-sm text-slate-500 mt-0.5">
                        Contrato de {rule.contractDurationMonths} meses
                      </p>
                    </div>
                    <div className="text-right text-sm text-slate-500 space-y-0.5">
                      <p>KM excedente: <span className="font-medium text-slate-700">{formatBRL(rule.excessKmValue)}/km</span></p>
                      <p>Monitoramento: <span className="font-medium text-slate-700">{formatBRL(rule.monitoringValue)}/mês</span></p>
                      <p>Carro reserva: <span className="font-medium text-slate-700">{formatBRL(rule.reserveCarValue)}/mês</span></p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/50">
                        <TableHead>KM Anual</TableHead>
                        <TableHead>Mensalidade base</TableHead>
                        <TableHead>+ Monitoramento</TableHead>
                        <TableHead>+ Carro reserva</TableHead>
                        <TableHead className="font-semibold">Total estimado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rule.kmOptions.map((opt) => {
                        const total = opt.monthlyPrice + rule.monitoringValue + rule.reserveCarValue;
                        return (
                          <TableRow key={opt.id}>
                            <TableCell className="font-medium">
                              {(opt.annualKm / 1000).toFixed(0)}k km/ano
                            </TableCell>
                            <TableCell className="text-slate-600">{formatBRL(opt.monthlyPrice)}</TableCell>
                            <TableCell className="text-slate-400 text-sm">+{formatBRL(rule.monitoringValue)}</TableCell>
                            <TableCell className="text-slate-400 text-sm">+{formatBRL(rule.reserveCarValue)}</TableCell>
                            <TableCell className="font-semibold text-slate-800">{formatBRL(total)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !loading ? (
          <EmptyState
            icon={<Tag className="w-12 h-12" />}
            title="Nenhuma regra de preço cadastrada"
            description="Importe uma planilha Excel para criar as regras de preço."
            action={
              <Button onClick={() => navigate('/admin/importar')} className="gap-2">
                <Upload className="w-4 h-4" />
                Importar planilha
              </Button>
            }
          />
        ) : null}

        {/* Version history */}
        {pricingTable && pricingTable.versions.length > 1 && (
          <div className="mt-8">
            <Separator className="mb-6" />
            <div className="flex items-center gap-2 mb-4">
              <History className="w-4 h-4 text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-700">Histórico de versões</h3>
            </div>
            <div className="space-y-2">
              {[...pricingTable.versions].reverse().map((version) => (
                <div
                  key={version.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-white border border-slate-200"
                >
                  <div className="flex items-center gap-3">
                    {version.isActive ? (
                      <div className="w-2 h-2 bg-emerald-400 rounded-full" />
                    ) : (
                      <div className="w-2 h-2 bg-slate-300 rounded-full" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-slate-700">
                        {version.label ?? `Versão ${version.versionNumber}`}
                        {version.isActive && (
                          <span className="ml-2 text-xs text-emerald-600 font-normal">· atual</span>
                        )}
                      </p>
                      <p className="text-xs text-slate-400">
                        Criada por {version.createdByName} em {formatDate(version.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-slate-300" />
                      <span className="text-xs text-slate-400">v{version.versionNumber}</span>
                    </div>
                    {!version.isActive && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs h-7"
                        onClick={() => setActivateTarget(version)}
                      >
                        <Zap className="w-3 h-3" />
                        Ativar
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <ConfirmationModal
        open={!!activateTarget}
        onClose={() => setActivateTarget(null)}
        onConfirm={handleActivate}
        title="Ativar versão de preços"
        description={
          activateTarget
            ? `Tem certeza que deseja ativar "${activateTarget.label ?? `Versão ${activateTarget.versionNumber}`}"? A versão atual será desativada e os preços do site serão atualizados imediatamente.`
            : ''
        }
        confirmLabel="Sim, ativar agora"
        variant="default"
        loading={activateMutation.isPending}
      />
    </AdminLayout>
  );
}
