import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, CheckCircle2, History, Tag, TrendingUp, Zap, Pencil, CalendarClock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { AdminHeader } from '@/components/admin/layout/AdminHeader';
import { PageHeader } from '@/components/admin/shared/PageHeader';
import { EmptyState } from '@/components/admin/shared/EmptyState';
import { VigenciaModal } from '@/components/admin/shared/VigenciaModal';
import {
  usePricing,
  useVersionRules,
  useActivateVersion,
  useCloneVersionWithOverrides,
} from '@/hooks/admin/usePricing';
import type { PricingTableVersion, VehiclePricingRule, AnnualKmOption } from '@/types/admin';
import type { PriceOverride } from '@/services/admin/pricingService';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';

const formatBRL = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatDate = (iso: string) =>
  format(new Date(iso), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

// ---------------------------------------------------------------------------
// EditPricesModal: lets admin change monthly prices for one rule
// ---------------------------------------------------------------------------
interface EditPricesModalProps {
  open: boolean;
  rule: VehiclePricingRule | null;
  onClose: () => void;
  onSave: (overrides: PriceOverride[]) => void;
}

function EditPricesModal({ open, rule, onClose, onSave }: EditPricesModalProps) {
  const [prices, setPrices] = useState<Record<string, string>>({});

  // Reset when rule changes
  const handleOpenChange = (v: boolean) => {
    if (!v) { setPrices({}); onClose(); }
  };

  const initialPrice = (opt: AnnualKmOption) =>
    prices[opt.id] !== undefined ? prices[opt.id] : String(opt.monthlyPrice);

  const handleSave = () => {
    if (!rule) return;
    const overrides: PriceOverride[] = rule.kmOptions
      .filter((opt) => prices[opt.id] !== undefined)
      .map((opt) => ({
        kmOptionId:   opt.id,
        monthlyPrice: Number(prices[opt.id]),
      }))
      .filter((o) => !isNaN(o.monthlyPrice) && o.monthlyPrice > 0);
    onSave(overrides);
  };

  if (!rule) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar preços — {rule.vehicleName}</DialogTitle>
          <DialogDescription>
            Contrato de {rule.contractDurationMonths} meses. Altere apenas os valores desejados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-72 overflow-y-auto py-2">
          {rule.kmOptions.map((opt) => (
            <div key={opt.id} className="flex items-center justify-between gap-4 rounded-lg border border-slate-100 px-4 py-3">
              <span className="text-sm font-medium text-slate-700">
                {(opt.annualKm / 1000).toFixed(0)}k km/ano
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">R$</span>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={initialPrice(opt)}
                  onChange={(e) => setPrices((prev) => ({ ...prev, [opt.id]: e.target.value }))}
                  className="w-32 text-right h-8"
                />
              </div>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave}>Definir vigência →</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function AdminPricing() {
  const navigate  = useNavigate();
  const { user }  = useAuth();
  const { pricingTable, activeVersion, scheduledVersions, loading } = usePricing();
  const { data: rules = [], isLoading: loadingRules } = useVersionRules(activeVersion?.id);
  const activateMutation = useActivateVersion();
  const cloneMutation    = useCloneVersionWithOverrides();

  // Vigência for version activation
  const [activateTarget, setActivateTarget]         = useState<PricingTableVersion | null>(null);
  // Price editing
  const [editingRule,    setEditingRule]             = useState<VehiclePricingRule | null>(null);
  const [pendingOverrides, setPendingOverrides]      = useState<PriceOverride[] | null>(null);

  const handleActivateVigencia = async (effectiveFrom: Date | null) => {
    if (!activateTarget) return;
    await activateMutation.mutateAsync({ versionId: activateTarget.id, effectiveFrom });
    setActivateTarget(null);
  };

  const handleEditSave = (overrides: PriceOverride[]) => {
    if (overrides.length === 0) { setEditingRule(null); return; }
    setPendingOverrides(overrides);
    setEditingRule(null);
  };

  const handlePriceVigencia = async (effectiveFrom: Date | null) => {
    if (!pendingOverrides || !activeVersion || !user) return;
    const now  = new Date();
    const when = effectiveFrom ?? now;
    await cloneMutation.mutateAsync({
      sourceVersionId: activeVersion.id,
      label:  `Ajuste de preços — ${format(when, 'dd/MM/yyyy', { locale: ptBR })}`,
      notes:  `Atualização manual com vigência ${format(when, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
      effectiveFrom,
      createdBy: user.id,
      overrides: pendingOverrides,
    });
    setPendingOverrides(null);
  };

  const allScheduled = [...(scheduledVersions ?? [])];

  return (
    <AdminLayout>
      <AdminHeader title="Tabela de Preços" subtitle="Visualize e gerencie as regras comerciais vigentes" />

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

        {/* Active table banner */}
        {loading ? (
          <Skeleton className="h-28 w-full rounded-xl mb-6" />
        ) : pricingTable ? (
          <Card className="border-0 shadow-sm mb-6 bg-emerald-50">
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-slate-800">{pricingTable.name}</h3>
                    <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 text-xs">Em vigor</Badge>
                  </div>
                  {activeVersion && (
                    <p className="text-sm text-slate-600">
                      {activeVersion.label ?? `Versão ${activeVersion.versionNumber}`}
                      {activeVersion.activatedAt && (
                        <span className="text-slate-400"> · ativada em {formatDate(activeVersion.activatedAt)}</span>
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

        {/* Scheduled versions banner */}
        {allScheduled.length > 0 && (
          <div className="mb-6 space-y-2">
            {allScheduled.map((v) => (
              <Card key={v.id} className="border-0 shadow-sm bg-amber-50">
                <CardContent className="p-4 flex items-center gap-3">
                  <CalendarClock className="w-5 h-5 text-amber-600 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-700">
                      {v.label ?? `Versão ${v.versionNumber}`}
                      <Badge variant="outline" className="ml-2 text-xs border-amber-300 text-amber-700 bg-white">
                        Agendada
                      </Badge>
                    </p>
                    {v.effectiveFrom && (
                      <p className="text-xs text-slate-500">
                        Entrará em vigor em {formatDate(v.effectiveFrom)}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Pricing rules */}
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
                      <p className="text-sm text-slate-500 mt-0.5">Contrato de {rule.contractDurationMonths} meses</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right text-sm text-slate-500 space-y-0.5">
                        <p>KM excedente: <span className="font-medium text-slate-700">{formatBRL(rule.excessKmValue)}/km</span></p>
                        <p>Monitoramento: <span className="font-medium text-slate-700">{formatBRL(rule.monitoringValue)}/mês</span></p>
                        <p>Carro reserva: <span className="font-medium text-slate-700">{formatBRL(rule.reserveCarValue)}/mês</span></p>
                      </div>
                      <Button
                        variant="outline" size="sm"
                        className="gap-1.5 text-xs h-8"
                        onClick={() => setEditingRule(rule)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Editar preços
                      </Button>
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
                    {version.isScheduled ? (
                      <div className="w-2 h-2 bg-amber-400 rounded-full" />
                    ) : version.isActive ? (
                      <div className="w-2 h-2 bg-emerald-400 rounded-full" />
                    ) : (
                      <div className="w-2 h-2 bg-slate-300 rounded-full" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-slate-700">
                        {version.label ?? `Versão ${version.versionNumber}`}
                        {version.isActive && !version.isScheduled && (
                          <span className="ml-2 text-xs text-emerald-600 font-normal">· atual</span>
                        )}
                        {version.isScheduled && (
                          <span className="ml-2 text-xs text-amber-600 font-normal">· agendada</span>
                        )}
                      </p>
                      <p className="text-xs text-slate-400">
                        Criada por {version.createdByName ?? '—'} em {formatDate(version.createdAt)}
                        {version.effectiveFrom && (
                          <span> · vigência: {formatDate(version.effectiveFrom)}</span>
                        )}
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
                        variant="outline" size="sm"
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

      {/* Vigência for version activation */}
      <VigenciaModal
        open={!!activateTarget}
        title={`Ativar versão — ${activateTarget?.label ?? `Versão ${activateTarget?.versionNumber}`}`}
        description="Escolha quando esta versão de preços deve entrar em vigor no site."
        confirmLabel="Ativar versão"
        loading={activateMutation.isPending}
        onClose={() => setActivateTarget(null)}
        onConfirm={handleActivateVigencia}
      />

      {/* Edit prices modal */}
      <EditPricesModal
        open={!!editingRule}
        rule={editingRule}
        onClose={() => setEditingRule(null)}
        onSave={handleEditSave}
      />

      {/* Vigência for price changes */}
      <VigenciaModal
        open={!!pendingOverrides}
        title="Vigência da alteração de preços"
        description="Quando os novos preços devem entrar em vigor? Uma nova versão da tabela será criada automaticamente."
        confirmLabel="Aplicar alterações"
        loading={cloneMutation.isPending}
        onClose={() => setPendingOverrides(null)}
        onConfirm={handlePriceVigencia}
      />
    </AdminLayout>
  );
}
