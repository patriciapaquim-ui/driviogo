// =============================================================================
// DrivioGo — Admin: Descontos
// Seller/admin can create discounts applied to:
//   ALL vehicles / a specific pricing TABLE / specific VEHICLES
// Each discount has a highlight flag to show a prominent banner on the site.
// Every change goes through VigenciaModal (immediate or future date).
// No data is ever deleted.
// =============================================================================

import { useState } from 'react';
import { Plus, Percent, Tag, ToggleLeft, ToggleRight, Pencil, Trash2, Star, StarOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useDiscounts } from '@/hooks/admin/useDiscounts';
import { usePricing } from '@/hooks/admin/usePricing';
import { useVehicles } from '@/hooks/admin/useVehicles';
import { useAuth } from '@/hooks/useAuth';
import type { Discount, DiscountFormData, DiscountScope } from '@/types/admin';
import { DISCOUNT_SCOPE_LABELS } from '@/types/admin';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const formatDate = (iso: string) =>
  format(new Date(iso), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

const formatPct = (v: number) => `${v.toFixed(2).replace('.', ',')}%`;

// ---------------------------------------------------------------------------
// Discount form modal
// ---------------------------------------------------------------------------

interface DiscountFormModalProps {
  open:     boolean;
  initial?: Partial<DiscountFormData>;
  onClose:  () => void;
  onSave:   (form: DiscountFormData) => void;
}

function DiscountFormModal({ open, initial, onClose, onSave }: DiscountFormModalProps) {
  const { pricingTable } = usePricing();
  const { vehicles }     = useVehicles({ limit: 100, isActive: true });

  const [name,           setName]           = useState(initial?.name           ?? '');
  const [description,    setDescription]    = useState(initial?.description    ?? '');
  const [percentage,     setPercentage]     = useState(String(initial?.percentage ?? ''));
  const [scope,          setScope]          = useState<DiscountScope>(initial?.scope ?? 'ALL');
  const [pricingTableId, setPricingTableId] = useState(initial?.pricingTableId ?? '');
  const [vehicleIds,     setVehicleIds]     = useState<string[]>(initial?.vehicleIds ?? []);
  const [isHighlighted,  setIsHighlighted]  = useState(initial?.isHighlighted  ?? false);
  const [isActive,       setIsActive]       = useState(initial?.isActive       ?? true);
  const [errors,         setErrors]         = useState<Record<string, string>>({});

  const toggleVehicle = (id: string) =>
    setVehicleIds((prev) => prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Informe um nome.';
    const pct = Number(percentage);
    if (isNaN(pct) || pct <= 0 || pct > 100) errs.percentage = 'Informe uma % entre 0.01 e 100.';
    if (scope === 'TABLE' && !pricingTableId) errs.pricingTableId = 'Selecione a tabela.';
    if (scope === 'VEHICLE' && vehicleIds.length === 0) errs.vehicleIds = 'Selecione ao menos um veículo.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({ name, description, percentage: Number(percentage), scope, pricingTableId, vehicleIds, isHighlighted, isActive });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? 'Editar desconto' : 'Novo desconto'}</DialogTitle>
          <DialogDescription>
            Configure a porcentagem, o escopo e a visibilidade do desconto.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Name */}
          <div className="space-y-1.5">
            <Label>Nome <span className="text-red-500">*</span></Label>
            <Input placeholder="ex: Black Friday 2026" value={name} onChange={(e) => setName(e.target.value)} />
            {errors.name && <p className="text-xs text-red-600">{errors.name}</p>}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label>Descrição (exibida para o cliente quando destacado)</Label>
            <Textarea placeholder="ex: Oferta especial por tempo limitado!" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          {/* Percentage */}
          <div className="space-y-1.5">
            <Label>Desconto (%) <span className="text-red-500">*</span></Label>
            <div className="relative">
              <Input
                type="number" min={0.01} max={100} step={0.01}
                placeholder="10.00"
                value={percentage}
                onChange={(e) => setPercentage(e.target.value)}
                className="pr-8"
              />
              <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            </div>
            {errors.percentage && <p className="text-xs text-red-600">{errors.percentage}</p>}
          </div>

          <Separator />

          {/* Scope */}
          <div className="space-y-1.5">
            <Label>Abrangência <span className="text-red-500">*</span></Label>
            <Select value={scope} onValueChange={(v) => setScope(v as DiscountScope)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(DISCOUNT_SCOPE_LABELS) as DiscountScope[]).map((s) => (
                  <SelectItem key={s} value={s}>{DISCOUNT_SCOPE_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* TABLE selector */}
          {scope === 'TABLE' && pricingTable && (
            <div className="space-y-1.5 ml-4">
              <Label>Tabela de preços</Label>
              <Select value={pricingTableId} onValueChange={setPricingTableId}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={pricingTable.id}>{pricingTable.name}</SelectItem>
                </SelectContent>
              </Select>
              {errors.pricingTableId && <p className="text-xs text-red-600">{errors.pricingTableId}</p>}
            </div>
          )}

          {/* VEHICLE selector */}
          {scope === 'VEHICLE' && (
            <div className="space-y-2 ml-4">
              <Label>Veículos</Label>
              <div className="max-h-44 overflow-y-auto space-y-1 rounded-lg border border-slate-200 p-2">
                {vehicles.map((v) => (
                  <label key={v.id} className="flex items-center gap-2 cursor-pointer rounded px-2 py-1 hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={vehicleIds.includes(v.id)}
                      onChange={() => toggleVehicle(v.id)}
                      className="accent-primary"
                    />
                    <span className="text-sm">{v.brand} {v.model} {v.year}</span>
                  </label>
                ))}
              </div>
              {errors.vehicleIds && <p className="text-xs text-red-600">{errors.vehicleIds}</p>}
            </div>
          )}

          <Separator />

          {/* Highlight toggle */}
          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-sm font-medium text-slate-700">Destacar no site</p>
              <p className="text-xs text-slate-400">Mostra um banner de desconto em destaque para o cliente</p>
            </div>
            <Switch checked={isHighlighted} onCheckedChange={setIsHighlighted} />
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-sm font-medium text-slate-700">Ativo</p>
              <p className="text-xs text-slate-400">Desative para pausar sem excluir</p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave}>Definir vigência →</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

type PendingDiscount =
  | { mode: 'create'; form: DiscountFormData }
  | { mode: 'edit';   id: string; form: DiscountFormData }
  | { mode: 'deactivate'; discount: Discount };

export default function AdminDiscounts() {
  const { user } = useAuth();
  const { discounts, loading, createDiscount, updateDiscount, deactivateDiscount, toggleHighlight, isDeactivating } = useDiscounts();

  const [formOpen,   setFormOpen]   = useState(false);
  const [editTarget, setEditTarget] = useState<Discount | null>(null);
  const [pending,    setPending]    = useState<PendingDiscount | null>(null);

  const handleFormSave = (form: DiscountFormData) => {
    if (editTarget) {
      setPending({ mode: 'edit', id: editTarget.id, form });
    } else {
      setPending({ mode: 'create', form });
    }
    setFormOpen(false);
    setEditTarget(null);
  };

  const handleVigencia = async (effectiveFrom: Date | null) => {
    if (!pending) return;
    if (pending.mode === 'create') {
      await createDiscount(pending.form, effectiveFrom, user?.id);
    } else if (pending.mode === 'edit') {
      await updateDiscount(pending.id, pending.form, effectiveFrom, user?.id);
    } else if (pending.mode === 'deactivate') {
      await deactivateDiscount(pending.discount.id, effectiveFrom, user?.id);
    }
    setPending(null);
  };

  const now = new Date();
  const activeDiscounts   = discounts.filter((d) => d.isActive && new Date(d.effectiveFrom) <= now && (!d.effectiveUntil || new Date(d.effectiveUntil) > now));
  const scheduledDiscounts= discounts.filter((d) => d.isActive && new Date(d.effectiveFrom) > now);
  const inactiveDiscounts = discounts.filter((d) => !d.isActive || (d.effectiveUntil && new Date(d.effectiveUntil) <= now));

  const renderCard = (d: Discount) => (
    <Card key={d.id} className="border-0 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Percentage badge */}
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <span className="text-sm font-bold text-primary">{formatPct(d.percentage)}</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-slate-800">{d.name}</p>
                {d.isHighlighted && (
                  <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 text-xs gap-1">
                    <Star className="w-3 h-3 fill-current" /> Destacado
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs">
                  {DISCOUNT_SCOPE_LABELS[d.scope]}
                </Badge>
              </div>
              {d.description && <p className="text-xs text-slate-500 mt-1 truncate">{d.description}</p>}
              <p className="text-xs text-slate-400 mt-1">
                Vigência: {formatDate(d.effectiveFrom)}
                {d.effectiveUntil && ` até ${formatDate(d.effectiveUntil)}`}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost" size="icon"
              className="w-8 h-8"
              title={d.isHighlighted ? 'Remover destaque' : 'Destacar no site'}
              onClick={() => toggleHighlight(d.id, !d.isHighlighted)}
            >
              {d.isHighlighted
                ? <StarOff className="w-4 h-4 text-amber-500" />
                : <Star    className="w-4 h-4 text-slate-400" />}
            </Button>
            <Button
              variant="ghost" size="icon"
              className="w-8 h-8 text-slate-400 hover:text-slate-700"
              title="Editar"
              onClick={() => { setEditTarget(d); setFormOpen(true); }}
            >
              <Pencil className="w-4 h-4" />
            </Button>
            {d.isActive && (
              <Button
                variant="ghost" size="icon"
                className="w-8 h-8 text-slate-400 hover:text-red-600"
                title="Desativar"
                onClick={() => setPending({ mode: 'deactivate', discount: d })}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <AdminLayout>
      <AdminHeader title="Descontos" subtitle="Gerencie descontos aplicados aos veículos e tabelas de preço" />

      <main className="flex-1 overflow-auto p-6">
        <PageHeader
          title="Descontos"
          description="Crie descontos para tabelas inteiras, todas as tabelas ou veículos específicos."
          action={
            <Button className="gap-2" onClick={() => { setEditTarget(null); setFormOpen(true); }}>
              <Plus className="w-4 h-4" />
              Novo desconto
            </Button>
          }
        />

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
          </div>
        ) : discounts.length === 0 ? (
          <EmptyState
            icon={<Percent className="w-12 h-12" />}
            title="Nenhum desconto cadastrado"
            description="Crie descontos para oferecer promoções aos clientes."
            action={
              <Button className="gap-2" onClick={() => { setEditTarget(null); setFormOpen(true); }}>
                <Plus className="w-4 h-4" />
                Criar desconto
              </Button>
            }
          />
        ) : (
          <div className="space-y-8">
            {/* Active */}
            {activeDiscounts.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <ToggleRight className="w-4 h-4 text-emerald-500" />
                  <h3 className="text-sm font-semibold text-slate-700">Em vigor ({activeDiscounts.length})</h3>
                </div>
                <div className="space-y-3">{activeDiscounts.map(renderCard)}</div>
              </section>
            )}

            {/* Scheduled */}
            {scheduledDiscounts.length > 0 && (
              <section>
                <Separator className="mb-6" />
                <div className="flex items-center gap-2 mb-3">
                  <Tag className="w-4 h-4 text-amber-500" />
                  <h3 className="text-sm font-semibold text-slate-700">Agendados ({scheduledDiscounts.length})</h3>
                </div>
                <div className="space-y-3">{scheduledDiscounts.map(renderCard)}</div>
              </section>
            )}

            {/* Inactive */}
            {inactiveDiscounts.length > 0 && (
              <section>
                <Separator className="mb-6" />
                <div className="flex items-center gap-2 mb-3">
                  <ToggleLeft className="w-4 h-4 text-slate-400" />
                  <h3 className="text-sm font-semibold text-slate-700">Inativos / Expirados ({inactiveDiscounts.length})</h3>
                </div>
                <div className="space-y-3 opacity-60">{inactiveDiscounts.map(renderCard)}</div>
              </section>
            )}
          </div>
        )}
      </main>

      {/* Form modal */}
      <DiscountFormModal
        open={formOpen}
        initial={editTarget ?? undefined}
        onClose={() => { setFormOpen(false); setEditTarget(null); }}
        onSave={handleFormSave}
      />

      {/* Vigência modal */}
      <VigenciaModal
        open={!!pending}
        title={
          pending?.mode === 'create'     ? 'Vigência do novo desconto' :
          pending?.mode === 'edit'       ? 'Vigência da alteração' :
          `Desativar — ${(pending as any)?.discount?.name ?? ''}`
        }
        description={
          pending?.mode === 'deactivate'
            ? 'Quando este desconto deve parar de aparecer no site?'
            : 'Quando este desconto deve começar a valer no site?'
        }
        confirmLabel={pending?.mode === 'deactivate' ? 'Desativar' : 'Confirmar'}
        loading={isDeactivating}
        onClose={() => setPending(null)}
        onConfirm={handleVigencia}
      />
    </AdminLayout>
  );
}
