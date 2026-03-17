// =============================================================================
// DrivioGo — Admin Module Types
// Matching the Prisma schema entities
// =============================================================================

export type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'VIEWER';

export type VehicleCategory =
  | 'HATCH'
  | 'SEDAN'
  | 'SUV'
  | 'PICKUP'
  | 'MINIVAN'
  | 'ESPORTIVO'
  | 'ELETRICO';

export type VehicleTransmission = 'MANUAL' | 'AUTOMATICO' | 'CVT';

export type VehicleFuel = 'FLEX' | 'GASOLINA' | 'DIESEL' | 'ELETRICO' | 'HIBRIDO';

export type ImportJobStatus = 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'ACTIVATE'
  | 'DEACTIVATE'
  | 'IMPORT'
  | 'LOGIN'
  | 'LOGOUT'
  | 'PASSWORD_CHANGE';

// -----------------------------------------------------------------------------

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

export interface VehicleImage {
  id: string;
  vehicleId: string;
  url: string;
  altText?: string;
  displayOrder: number;
  isMain: boolean;
}

export interface Vehicle {
  id: string;
  brand: string;
  model: string;
  year: number;
  version?: string;
  category: VehicleCategory;
  transmission: VehicleTransmission;
  fuel: VehicleFuel;
  color?: string;
  seats: number;
  doors: number;
  description?: string;
  features: string[];
  isActive: boolean;
  isFeatured: boolean;
  featuredOrder?: number;
  images: VehicleImage[];
  createdAt: string;
  updatedAt: string;
}

export interface AnnualKmOption {
  id: string;
  vehiclePricingRuleId: string;
  annualKm: number;
  monthlyPrice: number;
}

export interface VehiclePricingRule {
  id: string;
  pricingTableVersionId: string;
  vehicleId: string;
  vehicleName?: string;
  contractDurationMonths: number;
  excessKmValue: number;
  monitoringValue: number;
  reserveCarValue: number;
  kmOptions: AnnualKmOption[];
}

export interface PricingTableVersion {
  id: string;
  pricingTableId: string;
  versionNumber: number;
  label?: string;
  notes?: string;
  isActive: boolean;
  activatedAt?: string;
  deactivatedAt?: string;
  createdAt: string;
  createdById: string;
  createdByName?: string;
  importJobId?: string;
  rules: VehiclePricingRule[];
}

export interface PricingTable {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  versions: PricingTableVersion[];
}

export interface ImportJobRow {
  id: string;
  importJobId: string;
  rowNumber: number;
  vehicleName: string;
  contractDurationMonths: number;
  annualKmOptions: { annualKm: number; monthlyPrice: number }[];
  excessKmValue?: number;
  monitoringValue?: number;
  reserveCarValue?: number;
  status: 'PENDING' | 'SUCCESS' | 'ERROR' | 'SKIPPED';
  errorMessage?: string;
}

export interface ImportJob {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  status: ImportJobStatus;
  totalRows: number;
  processedRows: number;
  successRows: number;
  errorRows: number;
  errorSummary?: string;
  createdById: string;
  createdByName?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  pricingTableVersionId?: string;
}

export interface AuditLog {
  id: string;
  adminUserId: string;
  adminUserName?: string;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  entityLabel?: string;
  changes?: { before?: Record<string, unknown>; after?: Record<string, unknown>; data?: Record<string, unknown> };
  ipAddress?: string;
  createdAt: string;
}

export interface AdminDashboardStats {
  totalVehicles: number;
  activeVehicles: number;
  inactiveVehicles: number;
  activePricingTable?: string;
  activePricingVersion?: number;
  lastImport?: ImportJob;
  recentAuditLogs: AuditLog[];
}

// -----------------------------------------------------------------------------
// Form types

export interface VehicleFormData {
  brand: string;
  model: string;
  year: number;
  version: string;
  category: VehicleCategory;
  transmission: VehicleTransmission;
  fuel: VehicleFuel;
  color: string;
  seats: number;
  doors: number;
  description: string;
  features: string[];
  isActive: boolean;
  isFeatured: boolean;
}

// -----------------------------------------------------------------------------
// Label maps (Portuguese)

export const CATEGORY_LABELS: Record<VehicleCategory, string> = {
  HATCH: 'Hatch',
  SEDAN: 'Sedã',
  SUV: 'SUV',
  PICKUP: 'Picape',
  MINIVAN: 'Minivan',
  ESPORTIVO: 'Esportivo',
  ELETRICO: 'Elétrico',
};

export const TRANSMISSION_LABELS: Record<VehicleTransmission, string> = {
  MANUAL: 'Manual',
  AUTOMATICO: 'Automático',
  CVT: 'CVT',
};

export const FUEL_LABELS: Record<VehicleFuel, string> = {
  FLEX: 'Flex',
  GASOLINA: 'Gasolina',
  DIESEL: 'Diesel',
  ELETRICO: 'Elétrico',
  HIBRIDO: 'Híbrido',
};

export const IMPORT_STATUS_LABELS: Record<ImportJobStatus, string> = {
  PENDING: 'Aguardando',
  PROCESSING: 'Processando',
  SUCCESS: 'Concluído',
  FAILED: 'Falhou',
  CANCELLED: 'Cancelado',
};

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  CREATE: 'Criou',
  UPDATE: 'Editou',
  DELETE: 'Excluiu',
  ACTIVATE: 'Ativou',
  DEACTIVATE: 'Desativou',
  IMPORT: 'Importou',
  LOGIN: 'Entrou',
  LOGOUT: 'Saiu',
  PASSWORD_CHANGE: 'Alterou senha',
};

export const ENTITY_TYPE_LABELS: Record<string, string> = {
  Vehicle: 'Veículo',
  PricingTable: 'Tabela de Preço',
  PricingTableVersion: 'Versão da Tabela',
  ImportJob: 'Importação',
  AdminUser: 'Usuário Admin',
};
