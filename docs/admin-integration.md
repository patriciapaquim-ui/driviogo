# DrivioGo — Admin Module Integration

## Overview

The admin module integrates React Query v5 with Supabase for all data operations. Every screen uses server-side pagination, real-time invalidation, and optimistic error handling via `sonner` toasts.

---

## Project Structure

```
src/
├── services/admin/
│   ├── vehicleService.ts       # Vehicle CRUD + stats
│   ├── pricingService.ts       # Pricing tables, versions, rules
│   ├── importHistoryService.ts # Import job history
│   └── auditService.ts         # Audit log read/write
│
├── hooks/admin/
│   ├── useVehicles.ts          # useVehicles() + useVehicle(id) + useVehicleStats()
│   ├── usePricing.ts           # usePricing() + useVersionRules() + useActivateVersion()
│   ├── useImportJobs.ts        # useImportJobs() + useImportJobRows() + useLastImportJob()
│   ├── useAuditLogs.ts         # useAuditLogs() + useRecentAuditLogs()
│   ├── useDashboard.ts         # Combined stats for dashboard
│   └── usePagination.ts        # Page state management
│
├── components/admin/shared/
│   └── Pagination.tsx          # Reusable pagination component with ellipsis
│
└── pages/admin/
    ├── AdminDashboard.tsx      # Real-time stats + recent activity
    ├── AdminVehicles.tsx       # Server-side paginated list + filters
    ├── AdminVehicleForm.tsx    # Create/edit with Supabase fetch on edit
    ├── AdminPricing.tsx        # Active table + version history + activate button
    ├── AdminImportHistory.tsx  # Paginated list with status filter
    └── AdminLogs.tsx           # Paginated with search debounce + filters
```

---

## Data Flow

```
User action
  → React page (useState for filters)
  → Hook (useQuery / useMutation)
  → Service (Supabase query)
  → Supabase PostgreSQL (RLS enforced)
  → Response mapped to TypeScript types
  → React Query cache
  → UI re-render
```

---

## React Query Key Conventions

```
['admin', 'vehicles', filters]         // vehicle list
['admin', 'vehicle', id]               // single vehicle
['admin', 'vehicleStats']              // vehicle counts
['admin', 'activePricingTable']        // active table + versions
['admin', 'pricingTables']             // all tables
['admin', 'versionRules', versionId]   // rules for a version
['admin', 'importJobs', filters]       // import history list
['admin', 'lastImportJob']             // most recent import
['admin', 'importJobRows', jobId]      // rows for a job
['admin', 'auditLogs', filters]        // audit log list
['admin', 'recentAuditLogs', limit]    // recent activity
```

Mutations invalidate by prefix (e.g. `['admin', 'vehicles']`) to refresh all vehicle queries.

---

## Pagination Pattern

All list views use server-side pagination:

```tsx
const { page, goToPage, resetPage } = usePagination();

const { vehicles, total, totalPages } = useVehicles({
  page,
  limit: 15,
  search: search || undefined,
});

// Reset to page 1 when filters change
const handleSearchChange = (value: string) => {
  setSearch(value);
  resetPage();
};
```

The `<Pagination>` component renders page numbers with ellipsis and hides itself when `totalPages <= 1`.

---

## API Examples

### List vehicles with pagination + filters

```typescript
import { listVehicles } from '@/services/admin/vehicleService';

const result = await listVehicles({
  page: 1,
  limit: 15,
  search: 'toyota',
  category: 'SUV',
  isActive: true,
});
// { vehicles: Vehicle[], total: 42, page: 1, totalPages: 3 }
```

### Create a vehicle

```typescript
import { createVehicle } from '@/services/admin/vehicleService';

const vehicle = await createVehicle({
  brand: 'Toyota',
  model: 'Corolla Cross',
  year: 2024,
  category: 'SUV',
  transmission: 'CVT',
  fuel: 'FLEX',
  seats: 5,
  doors: 4,
  isActive: true,
  isFeatured: false,
  features: [],
});
```

### Activate a pricing version (atomic DB swap)

```typescript
import { activateVersion } from '@/services/admin/pricingService';

// Calls the `activate_pricing_version(p_version_id)` SQL RPC.
// Atomically deactivates all other versions and activates the target.
await activateVersion('uuid-of-version');
```

### Write an audit log

```typescript
import { writeAuditLog } from '@/services/admin/auditService';

await writeAuditLog({
  adminUserId: user.id,
  action: 'UPDATE',
  entityType: 'vehicle',
  entityId: vehicle.id,
  entityLabel: `${vehicle.brand} ${vehicle.model}`,
  changes: { before: { isActive: false }, after: { isActive: true } },
});
```

### List audit logs with filters

```typescript
import { listAuditLogs } from '@/services/admin/auditService';

const result = await listAuditLogs({
  page: 1,
  limit: 20,
  search: 'Toyota',
  action: 'UPDATE',
  entityType: 'vehicle',
});
// { logs: AuditLog[], total: 87, page: 1, totalPages: 5 }
```

---

## Authentication Flow

```
1. User visits /admin/dashboard
2. AdminGuard checks useAdminAuth() session
3. If no session → redirect to /admin/login
4. AdminLogin calls signIn(email, password) via Supabase Auth
5. On success → session stored in localStorage by Supabase
6. Supabase JWT contains app_metadata.role (admin | super_admin | viewer)
7. extractAdminRole() maps to AdminRole enum
8. hasPermission(role, requiredRole) enforces RBAC
```

**Role hierarchy:** `SUPER_ADMIN > ADMIN > VIEWER`

| Route                   | Required Role |
|-------------------------|---------------|
| /admin/dashboard        | VIEWER        |
| /admin/veiculos         | VIEWER        |
| /admin/veiculos/novo    | ADMIN         |
| /admin/precos           | VIEWER        |
| /admin/importar         | ADMIN         |
| /admin/importacoes      | VIEWER        |
| /admin/logs             | VIEWER        |

---

## Row Level Security

All Supabase queries are protected by RLS policies defined in
`supabase/migrations/20260317000000_admin_module.sql`:

```sql
-- Only admin users can read/write admin tables
CREATE POLICY "admin_read" ON admin_users
  FOR SELECT USING (is_admin());

-- Public can read active vehicles
CREATE POLICY "public_read_active_vehicles" ON vehicles
  FOR SELECT USING (is_active = true);

-- Admins can write vehicles
CREATE POLICY "admin_write_vehicles" ON vehicles
  FOR ALL USING (is_admin());

-- Audit logs are INSERT-only (append-only immutability)
CREATE POLICY "audit_no_update" ON audit_logs
  FOR UPDATE USING (FALSE);
CREATE POLICY "audit_no_delete" ON audit_logs
  FOR DELETE USING (FALSE);
```

---

## Excel Import Flow

```
User selects .xlsx file
  → parseExcelFile(file)          # Client-side SheetJS parse
  → ExcelParseResult              # { rows, validCount, errorCount }
  → User reviews preview tabs (Todos / Válidos / Com erros)
  → User clicks "Confirmar importação"
  → runImport(rows, tableName, adminUserId, onProgress)
    1. Create ImportJob (status: PENDING)
    2. Create/activate PricingTable
    3. Create PricingTableVersion
    4. Upsert vehicles (by name or create placeholder)
    5. Insert VehiclePricingRules + AnnualKmOptions
    6. Save ImportJobRows (success + error)
    7. Update ImportJob (status: SUCCESS/PARTIAL/FAILED)
    8. Activate new pricing version via RPC
    9. Write AuditLog entry
```

---

## TypeScript Types Quick Reference

```typescript
import type {
  Vehicle, VehicleFormData, VehicleCategory,
  PricingTable, PricingTableVersion, VehiclePricingRule, AnnualKmOption,
  ImportJob, ImportJobRow, ImportJobStatus,
  AuditLog, AuditAction,
  AdminRole,
} from '@/types/admin';
```
