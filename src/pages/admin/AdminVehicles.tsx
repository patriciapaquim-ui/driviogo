import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Pencil, ToggleLeft, ToggleRight, Car, CalendarClock, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { AdminHeader } from '@/components/admin/layout/AdminHeader';
import { ActiveBadge } from '@/components/admin/shared/StatusBadge';
import { PageHeader } from '@/components/admin/shared/PageHeader';
import { EmptyState } from '@/components/admin/shared/EmptyState';
import { Pagination } from '@/components/admin/shared/Pagination';
import { VigenciaModal } from '@/components/admin/shared/VigenciaModal';
import { useVehicles } from '@/hooks/admin/useVehicles';
import { usePagination } from '@/hooks/admin/usePagination';
import { CATEGORY_LABELS, FUEL_LABELS } from '@/types/admin';
import type { Vehicle, VehicleCategory } from '@/types/admin';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const CATEGORIES: VehicleCategory[] = ['HATCH', 'SEDAN', 'SUV', 'PICKUP', 'MINIVAN', 'ESPORTIVO', 'ELETRICO'];
const LIMIT = 15;

const formatDate = (iso: string) =>
  format(new Date(iso), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

type PendingAction =
  | { type: 'toggle'; vehicle: Vehicle; targetActive: boolean }
  | { type: 'deactivate'; vehicle: Vehicle };

export default function AdminVehicles() {
  const navigate = useNavigate();

  const [search,         setSearch]         = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter,   setStatusFilter]   = useState<string>('all');
  const [pendingAction,  setPendingAction]  = useState<PendingAction | null>(null);

  const { page, goToPage, resetPage } = usePagination();

  const { vehicles, total, totalPages, loading, deactivateVehicle, toggleActive, isDeactivating } = useVehicles({
    page,
    limit:    LIMIT,
    search:   search || undefined,
    category: categoryFilter !== 'all' ? categoryFilter : undefined,
    isActive: statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : undefined,
  });

  const handleSearchChange = (value: string) => { setSearch(value); resetPage(); };
  const handleCategoryChange = (value: string) => { setCategoryFilter(value); resetPage(); };
  const handleStatusChange = (value: string) => { setStatusFilter(value); resetPage(); };

  const handleVigenciaConfirm = async (effectiveFrom: Date | null) => {
    if (!pendingAction) return;

    if (pendingAction.type === 'toggle') {
      await toggleActive(pendingAction.vehicle.id, pendingAction.targetActive, effectiveFrom);
    } else {
      await deactivateVehicle(pendingAction.vehicle.id, effectiveFrom);
    }

    setPendingAction(null);
  };

  const vigenciaTitle = pendingAction?.type === 'deactivate'
    ? `Desativar — ${pendingAction.vehicle.brand} ${pendingAction.vehicle.model}`
    : pendingAction?.type === 'toggle'
      ? `${pendingAction.targetActive ? 'Ativar' : 'Desativar'} — ${pendingAction.vehicle.brand} ${pendingAction.vehicle.model}`
      : '';

  const vigenciaDescription = pendingAction?.type === 'deactivate'
    ? 'O veículo será removido do catálogo. Nenhum dado é excluído — a vigência controla a visibilidade.'
    : 'Selecione quando essa alteração de status deve refletir no site.';

  const now = new Date();
  const isScheduled = (v: Vehicle) =>
    v.effectiveFrom && new Date(v.effectiveFrom) > now;
  const isExpired = (v: Vehicle) =>
    v.effectiveUntil && new Date(v.effectiveUntil) <= now;

  return (
    <AdminLayout>
      <AdminHeader title="Veículos" subtitle="Gerencie o catálogo de veículos disponíveis" />

      <main className="flex-1 overflow-auto p-6">
        <PageHeader
          title="Catálogo de Veículos"
          description={`${total} veículo${total !== 1 ? 's' : ''} cadastrado${total !== 1 ? 's' : ''}`}
          action={
            <Button onClick={() => navigate('/admin/veiculos/novo')} className="gap-2">
              <Plus className="w-4 h-4" />
              Novo veículo
            </Button>
          }
        />

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-5">
          <div className="relative flex-1 min-w-52">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar por marca, modelo..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 bg-white"
            />
          </div>
          <Select value={categoryFilter} onValueChange={handleCategoryChange}>
            <SelectTrigger className="w-44 bg-white">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-36 bg-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="inactive">Inativos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="w-12"></TableHead>
                <TableHead>Veículo</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Combustível</TableHead>
                <TableHead>Status / Vigência</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="w-10 h-10 rounded-lg" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : vehicles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <EmptyState
                      icon={<Car className="w-12 h-12" />}
                      title="Nenhum veículo encontrado"
                      description={search ? 'Tente outros termos de busca.' : 'Cadastre o primeiro veículo usando o botão acima.'}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                vehicles.map((vehicle) => {
                  const mainImage = vehicle.images.find((i) => i.isMain) ?? vehicle.images[0];
                  const scheduled = isScheduled(vehicle);
                  const expired   = isExpired(vehicle);

                  return (
                    <TableRow key={vehicle.id} className="hover:bg-slate-50/60">
                      <TableCell>
                        <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden">
                          {mainImage ? (
                            <img src={mainImage.url} alt={mainImage.altText ?? vehicle.model} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Car className="w-4 h-4 text-slate-300" />
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-slate-800">{vehicle.brand} {vehicle.model}</p>
                        <p className="text-xs text-slate-400">{vehicle.year} · {vehicle.version ?? '—'}</p>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">{CATEGORY_LABELS[vehicle.category]}</TableCell>
                      <TableCell className="text-sm text-slate-600">{FUEL_LABELS[vehicle.fuel]}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <ActiveBadge isActive={vehicle.isActive && !expired} />
                          {scheduled && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="outline" className="gap-1 text-xs border-amber-300 text-amber-700 bg-amber-50">
                                    <CalendarClock className="w-3 h-3" />
                                    Agendado
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  Entra em vigor em {formatDate(vehicle.effectiveFrom)}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          {expired && (
                            <Badge variant="outline" className="text-xs border-red-300 text-red-600 bg-red-50">
                              Expirado em {formatDate(vehicle.effectiveUntil!)}
                            </Badge>
                          )}
                          {vehicle.effectiveUntil && !expired && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="outline" className="gap-1 text-xs border-orange-300 text-orange-700 bg-orange-50">
                                    <CalendarClock className="w-3 h-3" />
                                    Saída agendada
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  Sai do catálogo em {formatDate(vehicle.effectiveUntil!)}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost" size="icon"
                            className="w-8 h-8 text-slate-400 hover:text-slate-700"
                            title={vehicle.isActive ? 'Desativar' : 'Ativar'}
                            onClick={() => setPendingAction({ type: 'toggle', vehicle, targetActive: !vehicle.isActive })}
                          >
                            {vehicle.isActive && !expired
                              ? <ToggleRight className="w-4 h-4 text-emerald-500" />
                              : <ToggleLeft className="w-4 h-4" />
                            }
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            className="w-8 h-8 text-slate-400 hover:text-slate-700"
                            title="Editar"
                            onClick={() => navigate(`/admin/veiculos/${vehicle.id}/editar`)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            className="w-8 h-8 text-slate-400 hover:text-red-600"
                            title="Remover do catálogo"
                            onClick={() => setPendingAction({ type: 'deactivate', vehicle })}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <Pagination page={page} totalPages={totalPages} total={total} limit={LIMIT} onPage={goToPage} />
      </main>

      {/* Vigência modal for toggle/deactivate */}
      <VigenciaModal
        open={!!pendingAction}
        title={vigenciaTitle}
        description={vigenciaDescription}
        confirmLabel={pendingAction?.type === 'deactivate' ? 'Confirmar remoção' : 'Confirmar'}
        loading={isDeactivating}
        onClose={() => setPendingAction(null)}
        onConfirm={handleVigenciaConfirm}
      />
    </AdminLayout>
  );
}
