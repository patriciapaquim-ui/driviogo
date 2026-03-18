# DrivioGo — Arquitetura do Módulo Admin

> **Nota sobre o projeto atual:** O projeto público usa Vite + React + Supabase.
> O módulo admin será adicionado como uma área protegida dentro da mesma SPA, utilizando o Supabase Auth com controle de roles, e as APIs do Supabase (RLS + Edge Functions) como backend.
> O schema Prisma neste documento serve como referência canônica do modelo de dados e pode ser usado caso o time decida migrar o backend para NestJS + Prisma no futuro.

---

## TAREFA 1 — Arquitetura do Módulo Admin

### Visão Geral

```
┌─────────────────────────────────────────────────────────────┐
│                        USUÁRIO ADMIN                        │
│                  (browser / dispositivo)                    │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTPS
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              FRONTEND — React SPA (Vite)                    │
│                                                             │
│  /admin/*  ←──── Área Protegida (AdminGuard)               │
│  ├── /admin/login                                           │
│  ├── /admin/dashboard                                       │
│  ├── /admin/vehicles          (CRUD de veículos)            │
│  ├── /admin/pricing           (Tabelas de preço)            │
│  ├── /admin/pricing/import    (Importar Excel)              │
│  └── /admin/audit             (Logs de auditoria)           │
│                                                             │
│  Componentes compartilhados com área pública                │
└─────────────────────────┬───────────────────────────────────┘
                          │ Supabase Client (REST + Realtime)
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    SUPABASE (Backend)                       │
│                                                             │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  Auth       │  │  PostgreSQL  │  │  Storage         │  │
│  │  (JWT)      │  │  + RLS       │  │  (Excel/Imagens) │  │
│  └─────────────┘  └──────────────┘  └──────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Edge Functions (Deno)                               │  │
│  │  ├── process-excel-import   (parsear planilha)       │  │
│  │  ├── activate-pricing-table (ativar versão)          │  │
│  │  └── audit-logger           (gravar audit_logs)      │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

### 1.1 Separação Frontend / Backend

| Camada | Tecnologia | Responsabilidade |
|--------|-----------|-----------------|
| Frontend | Vite + React + TypeScript | Interface admin, formulários, upload de arquivos |
| Auth | Supabase Auth (JWT) | Login, sessão, roles via `app_metadata` |
| Database | PostgreSQL + Row Level Security | Dados isolados por role de admin |
| Storage | Supabase Storage | Imagens de veículos, planilhas Excel |
| Funções | Supabase Edge Functions | Lógica de negócio complexa (import, ativação) |

A separação segue o padrão BFF-less (sem Backend for Frontend dedicado):
o frontend acessa Supabase diretamente, com RLS como barreira de segurança.

---

### 1.2 Autenticação de Administradores

**Estratégia:** Supabase Auth com `app_metadata.role` customizado.

```
Fluxo de autenticação admin:
1. Admin acessa /admin/login
2. Envia email + senha para Supabase Auth
3. Supabase retorna JWT com payload:
   {
     "sub": "<user_uuid>",
     "email": "admin@driviogo.com",
     "app_metadata": { "role": "admin" }   ← injetado via trigger
   }
4. Frontend verifica role no JWT
5. RLS no banco usa: auth.jwt() -> 'app_metadata' -> 'role'
```

**Criação de admins:** Feita via Supabase Dashboard (ou script) com função SQL:
```sql
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"role": "admin"}'::jsonb
WHERE email = 'admin@driviogo.com';
```

**Tabela `admin_users`** espelha os admins com dados extras (nome, role granular, status).

---

### 1.3 Controle de Permissões (RBAC)

Três níveis de role:

| Role | Descrição | Permissões |
|------|-----------|-----------|
| `SUPER_ADMIN` | Dono do sistema | Tudo + criar outros admins |
| `ADMIN` | Gestor operacional | Veículos, preços, importações |
| `VIEWER` | Auditor / analista | Somente leitura |

**No banco (RLS Policy exemplo):**
```sql
-- Apenas ADMIN e SUPER_ADMIN podem inserir veículos
CREATE POLICY "admin_can_insert_vehicles"
ON vehicles FOR INSERT
TO authenticated
USING (
  (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'super_admin')
);
```

**No frontend (AdminGuard):**
```typescript
// src/components/admin/AdminGuard.tsx
const AdminGuard = ({ children, requiredRole = 'VIEWER' }) => {
  const { user, role } = useAdminAuth();
  if (!user || !hasPermission(role, requiredRole)) {
    return <Navigate to="/admin/login" />;
  }
  return children;
};
```

---

### 1.4 Organização das APIs

Supabase fornece APIs REST automáticas para cada tabela. As Edge Functions cobrem a lógica complexa:

```
Tabelas diretas (Supabase REST auto-gerado):
  GET/POST/PATCH/DELETE  /rest/v1/vehicles
  GET/POST/PATCH/DELETE  /rest/v1/vehicle_images
  GET/POST/PATCH/DELETE  /rest/v1/pricing_tables
  GET/POST/PATCH/DELETE  /rest/v1/pricing_table_versions
  GET/POST/PATCH/DELETE  /rest/v1/vehicle_pricing_rules
  GET/POST/PATCH/DELETE  /rest/v1/annual_km_options
  GET                    /rest/v1/import_jobs
  GET                    /rest/v1/audit_logs

Edge Functions (lógica complexa):
  POST  /functions/v1/process-excel-import
        → Recebe fileUrl, parseia Excel, cria ImportJob + rows
        → Valida dados, reporta erros por linha

  POST  /functions/v1/activate-pricing-table
        → Desativa versão atual, ativa nova versão (transação)
        → Grava audit_log

  GET   /functions/v1/export-pricing-table
        → Gera Excel para download da tabela ativa
```

---

### 1.5 Estrutura de Pastas

```
driviogo/
├── src/
│   ├── components/
│   │   ├── ui/                          # Shadcn components (existente)
│   │   ├── admin/                       ← NOVO
│   │   │   ├── layout/
│   │   │   │   ├── AdminLayout.tsx      # Shell do admin (sidebar + header)
│   │   │   │   ├── AdminSidebar.tsx
│   │   │   │   └── AdminHeader.tsx
│   │   │   ├── vehicles/
│   │   │   │   ├── VehicleForm.tsx      # Formulário criar/editar
│   │   │   │   ├── VehicleTable.tsx     # Listagem com ações
│   │   │   │   └── ImageUploader.tsx    # Upload múltiplas imagens
│   │   │   ├── pricing/
│   │   │   │   ├── PricingTableList.tsx
│   │   │   │   ├── PricingTableEditor.tsx
│   │   │   │   └── ExcelImporter.tsx    # Drag & drop planilha
│   │   │   ├── audit/
│   │   │   │   └── AuditLogTable.tsx
│   │   │   └── shared/
│   │   │       ├── AdminGuard.tsx       # Proteção de rotas
│   │   │       ├── ConfirmDialog.tsx    # Modal de confirmação
│   │   │       └── StatusBadge.tsx
│   │   └── ... (componentes públicos existentes)
│   ├── pages/
│   │   ├── admin/                       ← NOVO
│   │   │   ├── AdminLogin.tsx
│   │   │   ├── AdminDashboard.tsx
│   │   │   ├── AdminVehicles.tsx
│   │   │   ├── AdminVehicleEdit.tsx
│   │   │   ├── AdminPricing.tsx
│   │   │   └── AdminImport.tsx
│   │   └── ... (páginas públicas existentes)
│   ├── hooks/
│   │   ├── useAuth.tsx                  # Existente
│   │   └── admin/                       ← NOVO
│   │       ├── useAdminAuth.tsx
│   │       ├── useVehicles.tsx
│   │       ├── usePricing.tsx
│   │       └── useImportJob.tsx
│   ├── lib/
│   │   ├── utils.ts                     # Existente
│   │   └── admin/                       ← NOVO
│   │       ├── excelParser.ts           # Parse client-side (xlsx)
│   │       └── permissions.ts           # Helpers de RBAC
│   └── integrations/
│       └── supabase/
│           └── types.ts                 # Atualizar com novas tabelas
│
├── supabase/
│   ├── migrations/
│   │   ├── ... (existentes)
│   │   └── 20260317_admin_module.sql    ← NOVO (gerado do schema Prisma)
│   └── functions/
│       ├── create-checkout/             # Existente
│       ├── process-excel-import/        ← NOVO
│       └── activate-pricing-table/      ← NOVO
│
├── docs/
│   ├── admin-architecture.md           ← Este documento
│   └── admin-db-modeling.md            ← Modelagem detalhada
│
└── prisma/
    └── schema.prisma                   ← Schema de referência
```

---

## TAREFA 2 — Modelagem do Banco de Dados

### 2.1 Diagrama de Entidades

```
AdminUser ──────────────────────────────────────────┐
    │ criou                                          │
    ├──────► ImportJob ──────► ImportJobRow          │
    │           │ gerou                              │
    │           ▼                                   │
    ├──────► PricingTableVersion ◄─── PricingTable  │
    │              │                                │
    │              ▼                                │
    │     VehiclePricingRule ◄───────── Vehicle ◄───┤
    │              │               │                │
    │              ▼               ▼                │
    │       AnnualKmOption   VehicleImage           │
    │                                               │
    └──────► AuditLog ──────────────────────────────┘
```

---

### 2.2 Entidades e Relacionamentos

#### **AdminUser**
Usuário administrativo. Espelha o `auth.users` do Supabase com metadados extras.

- PK: `id` (UUID, referencia `auth.users.id`)
- Relacionamentos:
  - `1:N` com `ImportJob` (quem importou)
  - `1:N` com `PricingTableVersion` (quem criou)
  - `1:N` com `AuditLog` (quem executou a ação)
- Índices: `email` (UNIQUE), `role`, `is_active`

---

#### **Vehicle**
Catálogo de veículos disponíveis para assinatura.

- PK: `id` (UUID)
- Relacionamentos:
  - `1:N` com `VehicleImage`
  - `1:N` com `VehiclePricingRule`
- Índices: `is_active`, `category`, `brand + model + year` (composto)

---

#### **VehicleImage**
Imagens de um veículo. Múltiplas por veículo, com ordem de exibição.

- PK: `id` (UUID)
- FK: `vehicle_id → Vehicle`
- Índices: `vehicle_id`, `(vehicle_id, display_order)`

---

#### **PricingTable**
Tabela de preços nomeada (ex.: "Tabela Março 2026"). Pode ter múltiplas versões.
Apenas **uma** tabela pode estar ativa por vez.

- PK: `id` (UUID)
- Relacionamentos:
  - `1:N` com `PricingTableVersion`
- Índices: `is_active` (partial index where is_active = true), `name`

---

#### **PricingTableVersion**
Versão imutável de uma tabela de preços. Criada via importação ou manualmente.
Uma vez ativada, não pode ser alterada — gera nova versão.

- PK: `id` (UUID)
- FK: `pricing_table_id → PricingTable`
- FK: `import_job_id → ImportJob` (nullable — versões manuais não têm import)
- FK: `created_by → AdminUser`
- Relacionamentos:
  - `1:N` com `VehiclePricingRule`
- Índices: `pricing_table_id`, `is_active`, `version_number`
- **Regra:** `UNIQUE(pricing_table_id, version_number)`

---

#### **VehiclePricingRule**
Regra de preço específica: um veículo + prazo contratual + valores fixos.
Os valores que variam por KM ficam em `AnnualKmOption`.

- PK: `id` (UUID)
- FK: `pricing_table_version_id → PricingTableVersion`
- FK: `vehicle_id → Vehicle`
- Campos chave: `contract_duration_months`, `excess_km_value`, `monitoring_value`, `reserve_car_value`
- Relacionamentos:
  - `1:N` com `AnnualKmOption`
- Índices: `pricing_table_version_id`, `vehicle_id`
- **Regra:** `UNIQUE(pricing_table_version_id, vehicle_id, contract_duration_months)`

---

#### **AnnualKmOption**
Uma das 7 opções de KM anual para uma regra de preço.
Cada opção tem seu próprio `monthly_price`.

- PK: `id` (UUID)
- FK: `vehicle_pricing_rule_id → VehiclePricingRule`
- Campos chave: `annual_km`, `monthly_price`
- Índices: `vehicle_pricing_rule_id`
- **Regra:** `UNIQUE(vehicle_pricing_rule_id, annual_km)`

**Exemplo de dados:**

| vehicle_pricing_rule_id | annual_km | monthly_price |
|------------------------|-----------|---------------|
| rule-uuid-001          | 10000     | R$ 2.890,00   |
| rule-uuid-001          | 15000     | R$ 3.050,00   |
| rule-uuid-001          | 20000     | R$ 3.210,00   |
| rule-uuid-001          | 25000     | R$ 3.390,00   |
| rule-uuid-001          | 30000     | R$ 3.590,00   |
| rule-uuid-001          | 35000     | R$ 3.820,00   |
| rule-uuid-001          | 40000     | R$ 4.100,00   |

---

#### **ImportJob**
Registro de uma importação de planilha Excel. Rastreia o progresso e resultado.

- PK: `id` (UUID)
- FK: `created_by → AdminUser`
- FK: `pricing_table_version_id → PricingTableVersion` (nullable, preenchido após sucesso)
- Status: `PENDING → PROCESSING → SUCCESS | FAILED`
- Índices: `status`, `created_by`, `created_at`

---

#### **ImportJobRow**
Cada linha da planilha importada, com status individual de processamento.

- PK: `id` (UUID)
- FK: `import_job_id → ImportJob`
- Armazena `annual_km_options` como JSONB (array de 7 objetos)
- Índices: `import_job_id`, `status`

**Estrutura do JSONB `annual_km_options`:**
```json
[
  { "annual_km": 10000, "monthly_price": 2890.00 },
  { "annual_km": 15000, "monthly_price": 3050.00 },
  { "annual_km": 20000, "monthly_price": 3210.00 },
  { "annual_km": 25000, "monthly_price": 3390.00 },
  { "annual_km": 30000, "monthly_price": 3590.00 },
  { "annual_km": 35000, "monthly_price": 3820.00 },
  { "annual_km": 40000, "monthly_price": 4100.00 }
]
```

---

#### **AuditLog**
Registro imutável de todas as ações administrativas. Nunca deletado.

- PK: `id` (UUID)
- FK: `admin_user_id → AdminUser`
- `action`: enum (CREATE, UPDATE, DELETE, ACTIVATE, DEACTIVATE, IMPORT, LOGIN, LOGOUT)
- `entity_type`: string (Vehicle, PricingTable, etc.)
- `changes`: JSONB com `{ before: {...}, after: {...} }` para updates
- Índices: `admin_user_id`, `entity_type`, `action`, `created_at`

---

### 2.3 Lógica de Precificação

```
Preço final para o usuário =
  monthly_price (da AnnualKmOption escolhida)
  + monitoring_value (do VehiclePricingRule)
  + reserve_car_value (do VehiclePricingRule)

Km excedente =
  excess_km_value (do VehiclePricingRule) × km rodado acima do limite
```

**Fluxo de ativação de tabela de preços:**
```
1. Admin faz upload de Excel
2. Edge Function processa → cria ImportJob + ImportJobRows
3. Sistema valida todas as linhas
4. Se OK: cria PricingTableVersion com versão incrementada
5. Admin revisa e clica "Ativar"
6. Edge Function (transação atômica):
   a. Desativa versão anterior (is_active = false)
   b. Ativa nova versão (is_active = true)
   c. Grava AuditLog
7. Site público passa a usar a nova versão
```

---

### 2.4 Índices Recomendados

```sql
-- Performance para o site público (queries mais frequentes)
CREATE INDEX idx_vehicles_active_category ON vehicles(is_active, category);
CREATE INDEX idx_annual_km_rule ON annual_km_options(vehicle_pricing_rule_id, annual_km);

-- Performance para joins de precificação
CREATE INDEX idx_pricing_rule_version_vehicle
  ON vehicle_pricing_rules(pricing_table_version_id, vehicle_id);

-- Partial index: apenas a versão ativa (alta seletividade)
CREATE UNIQUE INDEX idx_unique_active_version
  ON pricing_table_versions(pricing_table_id)
  WHERE is_active = true;

-- Auditoria
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id, created_at DESC);
CREATE INDEX idx_audit_admin ON audit_logs(admin_user_id, created_at DESC);

-- Import jobs
CREATE INDEX idx_import_status ON import_jobs(status, created_at DESC);
```
