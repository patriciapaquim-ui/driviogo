import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { AdminHeader } from '@/components/admin/layout/AdminHeader';
import { VigenciaModal } from '@/components/admin/shared/VigenciaModal';
import { useVehicles, useVehicle } from '@/hooks/admin/useVehicles';
import {
  CATEGORY_LABELS,
  FUEL_LABELS,
  TRANSMISSION_LABELS,
} from '@/types/admin';
import type { VehicleCategory, VehicleTransmission, VehicleFuel, VehicleFormData } from '@/types/admin';

const vehicleSchema = z.object({
  brand:        z.string().min(1, 'Informe a marca.'),
  model:        z.string().min(1, 'Informe o modelo.'),
  year:         z.coerce.number().min(2010, 'Ano inválido.').max(2030, 'Ano inválido.'),
  version:      z.string(),
  category:     z.enum(['HATCH', 'SEDAN', 'SUV', 'PICKUP', 'MINIVAN', 'ESPORTIVO', 'ELETRICO'] as const),
  transmission: z.enum(['MANUAL', 'AUTOMATICO', 'CVT'] as const),
  fuel:         z.enum(['FLEX', 'GASOLINA', 'DIESEL', 'ELETRICO', 'HIBRIDO'] as const),
  color:        z.string(),
  seats:        z.coerce.number().min(1).max(9),
  doors:        z.coerce.number().min(2).max(5),
  description:  z.string(),
  features:     z.array(z.string()),
  isActive:     z.boolean(),
  isFeatured:   z.boolean(),
});

const CATEGORIES    = Object.keys(CATEGORY_LABELS)    as VehicleCategory[];
const TRANSMISSIONS = Object.keys(TRANSMISSION_LABELS) as VehicleTransmission[];
const FUELS         = Object.keys(FUEL_LABELS)         as VehicleFuel[];

export default function AdminVehicleForm() {
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;
  const navigate  = useNavigate();
  const { createVehicle, updateVehicle, isCreating, isUpdating } = useVehicles();
  const { data: vehicle, isLoading: loadingVehicle } = useVehicle(id);

  // Hold validated form data until vigência is confirmed
  const [pendingFormData, setPendingFormData] = useState<VehicleFormData | null>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isDirty },
  } = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      brand: '', model: '', year: new Date().getFullYear(),
      version: '', category: 'SUV', transmission: 'AUTOMATICO', fuel: 'FLEX',
      color: '', seats: 5, doors: 4, description: '', features: [],
      isActive: true, isFeatured: false,
    },
  });

  useEffect(() => {
    if (vehicle) reset(vehicle);
  }, [vehicle, reset]);

  const isSubmitting = isCreating || isUpdating;

  // Step 1: validate → open vigência modal
  const onSubmit = (data: VehicleFormData) => {
    setPendingFormData(data);
  };

  // Step 2: vigência confirmed → call service
  const handleVigenciaConfirm = async (effectiveFrom: Date | null) => {
    if (!pendingFormData) return;
    if (isEditing && id) {
      await updateVehicle(id, pendingFormData, effectiveFrom);
    } else {
      await createVehicle(pendingFormData, effectiveFrom);
    }
    setPendingFormData(null);
    navigate('/admin/veiculos');
  };

  const pageTitle = isEditing
    ? `Editar — ${vehicle?.brand ?? ''} ${vehicle?.model ?? ''}`
    : 'Novo Veículo';

  return (
    <AdminLayout>
      <AdminHeader
        title={pageTitle}
        subtitle={isEditing ? 'Altere as informações do veículo' : 'Preencha os dados do novo veículo'}
      />

      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl mx-auto">
          <Button
            variant="ghost" size="sm"
            className="gap-1.5 text-slate-500 mb-5 -ml-2"
            onClick={() => navigate('/admin/veiculos')}
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para veículos
          </Button>

          {isEditing && loadingVehicle ? (
            <div className="space-y-4">
              <Skeleton className="h-40 w-full rounded-xl" />
              <Skeleton className="h-48 w-full rounded-xl" />
              <Skeleton className="h-28 w-full rounded-xl" />
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

              {/* Identificação */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2"><CardTitle className="text-base">Identificação</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Marca <span className="text-red-500">*</span></Label>
                      <Input placeholder="ex: Toyota" {...register('brand')} />
                      {errors.brand && <p className="text-xs text-red-600">{errors.brand.message}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label>Modelo <span className="text-red-500">*</span></Label>
                      <Input placeholder="ex: Corolla Cross" {...register('model')} />
                      {errors.model && <p className="text-xs text-red-600">{errors.model.message}</p>}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Versão</Label>
                      <Input placeholder="ex: 2.0 GR-S CVT" {...register('version')} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Ano <span className="text-red-500">*</span></Label>
                      <Input type="number" placeholder="2024" {...register('year')} />
                      {errors.year && <p className="text-xs text-red-600">{errors.year.message}</p>}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Cor</Label>
                    <Input placeholder="ex: Branco Lunar" {...register('color')} />
                  </div>
                </CardContent>
              </Card>

              {/* Especificações */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2"><CardTitle className="text-base">Especificações</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label>Categoria <span className="text-red-500">*</span></Label>
                      <Controller control={control} name="category" render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {CATEGORIES.map((c) => (
                              <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Câmbio <span className="text-red-500">*</span></Label>
                      <Controller control={control} name="transmission" render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {TRANSMISSIONS.map((t) => (
                              <SelectItem key={t} value={t}>{TRANSMISSION_LABELS[t]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Combustível <span className="text-red-500">*</span></Label>
                      <Controller control={control} name="fuel" render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {FUELS.map((f) => (
                              <SelectItem key={f} value={f}>{FUEL_LABELS[f]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Lugares</Label>
                      <Input type="number" min={1} max={9} {...register('seats')} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Portas</Label>
                      <Input type="number" min={2} max={5} {...register('doors')} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Descrição */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2"><CardTitle className="text-base">Descrição</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-1.5">
                    <Label>Descrição do veículo</Label>
                    <Textarea
                      placeholder="Descreva o veículo de forma atraente para o cliente..."
                      rows={4}
                      {...register('description')}
                    />
                    <p className="text-xs text-slate-400">Essa descrição aparece na página do veículo no site.</p>
                  </div>
                </CardContent>
              </Card>

              {/* Visibilidade */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2"><CardTitle className="text-base">Visibilidade</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between py-1">
                    <div>
                      <p className="text-sm font-medium text-slate-700">Veículo ativo</p>
                      <p className="text-xs text-slate-400">Veículos ativos aparecem no catálogo do site</p>
                    </div>
                    <Controller control={control} name="isActive" render={({ field }) => (
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    )} />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between py-1">
                    <div>
                      <p className="text-sm font-medium text-slate-700">Destaque na página inicial</p>
                      <p className="text-xs text-slate-400">Aparece na seção de veículos em destaque</p>
                    </div>
                    <Controller control={control} name="isFeatured" render={({ field }) => (
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    )} />
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2 pb-8">
                <Button type="button" variant="outline" onClick={() => navigate('/admin/veiculos')} disabled={isSubmitting}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting || (!isDirty && isEditing)} className="gap-2 min-w-32">
                  <Save className="w-4 h-4" />
                  {isSubmitting ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Cadastrar veículo'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </main>

      {/* Vigência modal — opened after form validation */}
      <VigenciaModal
        open={!!pendingFormData}
        title={isEditing ? 'Vigência da alteração' : 'Vigência do novo veículo'}
        description={
          isEditing
            ? 'Quando as alterações deste veículo devem refletir no site?'
            : 'Quando este veículo deve aparecer no catálogo do site?'
        }
        confirmLabel={isEditing ? 'Salvar com vigência' : 'Cadastrar com vigência'}
        loading={isSubmitting}
        onClose={() => setPendingFormData(null)}
        onConfirm={handleVigenciaConfirm}
      />
    </AdminLayout>
  );
}
