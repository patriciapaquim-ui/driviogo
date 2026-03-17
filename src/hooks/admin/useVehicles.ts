import { useState, useCallback } from 'react';
import { MOCK_VEHICLES } from '@/lib/admin/mockData';
import type { Vehicle, VehicleFormData } from '@/types/admin';
import { toast } from 'sonner';

// ---------------------------------------------------------------------------
// In development, operations run against mock data in memory.
// Replace with real Supabase calls after running the admin migration.
// ---------------------------------------------------------------------------

let vehiclesStore = [...MOCK_VEHICLES];

export function useVehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>(vehiclesStore);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(() => {
    setLoading(true);
    setTimeout(() => {
      setVehicles([...vehiclesStore]);
      setLoading(false);
    }, 300);
  }, []);

  const createVehicle = useCallback(async (data: VehicleFormData): Promise<Vehicle | null> => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 500));
    const newVehicle: Vehicle = {
      ...data,
      id: `v${Date.now()}`,
      images: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    vehiclesStore = [newVehicle, ...vehiclesStore];
    setVehicles([...vehiclesStore]);
    setLoading(false);
    toast.success('Veículo cadastrado com sucesso!');
    return newVehicle;
  }, []);

  const updateVehicle = useCallback(async (id: string, data: Partial<VehicleFormData>): Promise<boolean> => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 400));
    vehiclesStore = vehiclesStore.map((v) =>
      v.id === id ? { ...v, ...data, updatedAt: new Date().toISOString() } : v
    );
    setVehicles([...vehiclesStore]);
    setLoading(false);
    toast.success('Veículo atualizado com sucesso!');
    return true;
  }, []);

  const deleteVehicle = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 400));
    vehiclesStore = vehiclesStore.filter((v) => v.id !== id);
    setVehicles([...vehiclesStore]);
    setLoading(false);
    toast.success('Veículo excluído com sucesso!');
    return true;
  }, []);

  const toggleActive = useCallback(async (id: string, isActive: boolean): Promise<boolean> => {
    vehiclesStore = vehiclesStore.map((v) =>
      v.id === id ? { ...v, isActive, updatedAt: new Date().toISOString() } : v
    );
    setVehicles([...vehiclesStore]);
    toast.success(isActive ? 'Veículo ativado!' : 'Veículo desativado!');
    return true;
  }, []);

  const getById = useCallback((id: string): Vehicle | undefined => {
    return vehiclesStore.find((v) => v.id === id);
  }, []);

  return { vehicles, loading, refresh, createVehicle, updateVehicle, deleteVehicle, toggleActive, getById };
}
