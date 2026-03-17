import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Pencil, Trash2, ToggleLeft, ToggleRight, Car } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { AdminHeader } from '@/components/admin/layout/AdminHeader';
import { ActiveBadge } from '@/components/admin/shared/StatusBadge';
import { ConfirmationModal } from '@/components/admin/shared/ConfirmationModal';
import { PageHeader } from '@/components/admin/shared/PageHeader';
import { EmptyState } from '@/components/admin/shared/EmptyState';
import { Pagination } from '@/components/admin/shared/Pagination';
import { useVehicles } from '@/hooks/admin/useVehicles';
import { usePagination } from '@/hooks/admin/usePagination';
import { CATEGORY_LABELS, FUEL_LABELS } from '@/types/admin';
import type { Vehicle, VehicleCategory } from '@/types/admin';

const CATEGORIES: VehicleCategory[] = ['HATCH', 'SEDAN', 'SUV', 'PICKUP', 'MINIVAN', 'ESPORTIVO', 'ELETRICO'];
const LIMIT = 15;

export default function AdminVehicles() {
  const navigate = useNavigate();

  const [search,         setSearch]         = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter,   setStatusFilter]   = useState<string>('all');
  const [deleteTarget,   setDeleteTarget]   = useState<Vehicle | null>(null);
  const [deleting,       setDeleting]       = useState(false);

  const { page, goToPage, resetPage } = usePagination();

  const { vehicles, total, totalPages, loading, deleteVehicle, toggleActive } = useVehicles({
    page,
    limit:    LIMIT,
    search:   search || undefined,
    category: categoryFilter !== 'all' ? categoryFilter : undefined,
    isActive: statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : undefined,
  });

  const handleSearchChange = (value: string) => {
    setSearch(value);
    resetPage();
  };

  const handleCategoryChange = (value: string) => {
    setCategoryFilter(value);
    resetPage();
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    resetPage();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await deleteVehicle(deleteTarget.id);
    setDeleting(false);
    setDeleteTarget(null);
  };

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
                <TableHead>Status</TableHead>
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
                    <TableCell><Skeleton className="h-5 w-14 rounded-full" /></TableCell>
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
                  return (
                    <TableRow key={vehicle.id} className="hover:bg-slate-50/60">
                      <TableCell>
                        <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden">
                          {mainImage ? (
                            <img
                              src={mainImage.url}
                              alt={mainImage.altText ?? vehicle.model}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Car className="w-4 h-4 text-slate-300" />
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-slate-800">
                          {vehicle.brand} {vehicle.model}
                        </p>
                        <p className="text-xs text-slate-400">
                          {vehicle.year} · {vehicle.version ?? '—'}
                        </p>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {CATEGORY_LABELS[vehicle.category]}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {FUEL_LABELS[vehicle.fuel]}
                      </TableCell>
                      <TableCell>
                        <ActiveBadge isActive={vehicle.isActive} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-8 h-8 text-slate-400 hover:text-slate-700"
                            title={vehicle.isActive ? 'Desativar' : 'Ativar'}
                            onClick={() => toggleActive(vehicle.id, !vehicle.isActive)}
                          >
                            {vehicle.isActive
                              ? <ToggleRight className="w-4 h-4 text-emerald-500" />
                              : <ToggleLeft className="w-4 h-4" />
                            }
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-8 h-8 text-slate-400 hover:text-slate-700"
                            title="Editar"
                            onClick={() => navigate(`/admin/veiculos/${vehicle.id}/editar`)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-8 h-8 text-slate-400 hover:text-red-600"
                            title="Excluir"
                            onClick={() => setDeleteTarget(vehicle)}
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

        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          limit={LIMIT}
          onPage={goToPage}
        />
      </main>

      <ConfirmationModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Excluir veículo"
        description={
          deleteTarget
            ? `Tem certeza que deseja excluir "${deleteTarget.brand} ${deleteTarget.model}"? Essa ação não pode ser desfeita.`
            : ''
        }
        confirmLabel="Sim, excluir"
        variant="destructive"
        loading={deleting}
      />
    </AdminLayout>
  );
}
