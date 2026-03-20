# Diagrama do Modelo de Banco de Dados — DrivioGo

**DrivioGo — seu carro por assinatura**
**Versão:** 1.0.0
**Data:** 2026-03-20

---

## Modelo Entidade-Relacionamento

```mermaid
erDiagram
    admin_users {
        uuid id PK
        varchar email UK
        varchar name
        text role
        boolean is_active
        timestamptz last_login_at
        timestamptz created_at
        timestamptz updated_at
    }

    vehicles {
        uuid id PK
        varchar brand
        varchar model
        smallint year
        varchar version
        text category
        text transmission
        text fuel
        varchar color
        smallint seats
        smallint doors
        text description
        text[] features
        boolean is_active
        boolean is_featured
        smallint featured_order
        timestamptz effective_from
        timestamptz effective_until
        timestamptz created_at
        timestamptz updated_at
    }

    pricing_tables {
        uuid id PK
        varchar name
        text description
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }

    pricing_table_versions {
        uuid id PK
        uuid pricing_table_id FK
        integer version_number
        varchar label
        text notes
        boolean is_active
        timestamptz effective_from
        timestamptz activated_at
        timestamptz deactivated_at
        timestamptz created_at
        uuid created_by FK
        uuid import_job_id FK
    }

    vehicle_pricing_rules {
        uuid id PK
        uuid pricing_table_version_id FK
        uuid vehicle_id FK
        smallint contract_duration_months
        numeric excess_km_value
        numeric monitoring_value
        numeric reserve_car_value
        timestamptz created_at
    }

    annual_km_options {
        uuid id PK
        uuid vehicle_pricing_rule_id FK
        integer annual_km
        numeric monthly_price
        timestamptz created_at
    }

    import_jobs {
        uuid id PK
        varchar file_name
        text file_url
        integer file_size
        text status
        integer total_rows
        integer processed_rows
        integer success_rows
        integer error_rows
        text error_summary
        uuid created_by FK
        timestamptz started_at
        timestamptz completed_at
        timestamptz created_at
        uuid pricing_table_version_id FK
    }

    import_job_rows {
        uuid id PK
        uuid import_job_id FK
        integer row_number
        varchar vehicle_name
        smallint contract_duration_months
        jsonb annual_km_options
        numeric excess_km_value
        numeric monitoring_value
        numeric reserve_car_value
        jsonb raw_data
        text status
        text error_message
        timestamptz created_at
    }

    discounts {
        uuid id PK
        varchar name
        text description
        numeric percentage
        text scope
        uuid pricing_table_id FK
        boolean is_highlighted
        boolean is_active
        timestamptz effective_from
        timestamptz effective_until
        uuid created_by FK
        timestamptz created_at
        timestamptz updated_at
    }

    discount_vehicles {
        uuid id PK
        uuid discount_id FK
        uuid vehicle_id FK
        timestamptz created_at
    }

    discount_change_log {
        uuid id PK
        uuid discount_id FK
        text action
        jsonb previous_values
        jsonb new_values
        uuid changed_by FK
        timestamptz created_at
    }

    vehicle_images {
        uuid id PK
        uuid vehicle_id FK
        text url
        varchar alt_text
        smallint display_order
        boolean is_main
        timestamptz created_at
    }

    vehicle_change_history {
        uuid id PK
        uuid vehicle_id FK
        text[] changed_fields
        jsonb previous_values
        jsonb new_values
        timestamptz effective_from
        uuid changed_by FK
        timestamptz created_at
    }

    audit_logs {
        uuid id PK
        uuid admin_user_id FK
        text action
        varchar entity_type
        uuid entity_id
        varchar entity_label
        jsonb changes
        varchar ip_address
        text user_agent
        timestamptz created_at
    }

    %% === RELACIONAMENTOS ===

    %% Precificação
    pricing_tables           ||--o{ pricing_table_versions  : "versiona"
    pricing_table_versions   ||--o{ vehicle_pricing_rules   : "contém regras de"
    vehicle_pricing_rules    ||--o{ annual_km_options        : "define opções de km para"

    %% Importação
    import_jobs              ||--o{ import_job_rows          : "contém linhas de"
    import_jobs              }o--|| pricing_table_versions   : "popula versão"
    pricing_table_versions   }o--o| import_jobs              : "originada de"

    %% Veículos
    vehicles                 ||--o{ vehicle_images           : "possui"
    vehicles                 ||--o{ vehicle_change_history   : "registra histórico de"
    vehicles                 ||--o{ vehicle_pricing_rules    : "tem regras de preço em"
    vehicles                 ||--o{ discount_vehicles        : "associado a"

    %% Descontos
    pricing_tables           ||--o{ discounts               : "associada a"
    discounts                ||--o{ discount_vehicles        : "aplica-se a"
    discounts                ||--o{ discount_change_log      : "registra log de"

    %% Admin — autoria e auditoria
    admin_users              ||--o{ audit_logs               : "gera"
    admin_users              ||--o{ discounts                : "cria"
    admin_users              ||--o{ discount_change_log      : "altera"
    admin_users              ||--o{ import_jobs              : "inicia"
    admin_users              ||--o{ pricing_table_versions   : "cria versão de"
    admin_users              ||--o{ vehicle_change_history   : "altera"
```

---

## Legenda de Tipos

| Tipo | Descrição |
|------|-----------|
| `PK` | Chave primária |
| `FK` | Chave estrangeira |
| `UK` | Unique constraint |
| `uuid` | Identificador único universal |
| `varchar` | Texto de comprimento variável |
| `text` | Texto longo |
| `text[]` | Array de texto |
| `jsonb` | JSON binário (PostgreSQL) |
| `boolean` | Verdadeiro / Falso |
| `integer` / `smallint` | Inteiro |
| `numeric` | Número decimal de precisão |
| `timestamptz` | Timestamp com fuso horário |

---

## Grupos Funcionais

| Grupo | Tabelas |
|-------|---------|
| **Identidade / Auth** | `admin_users` |
| **Catálogo de Veículos** | `vehicles`, `vehicle_images`, `vehicle_change_history` |
| **Precificação** | `pricing_tables`, `pricing_table_versions`, `vehicle_pricing_rules`, `annual_km_options` |
| **Importação** | `import_jobs`, `import_job_rows` |
| **Descontos** | `discounts`, `discount_vehicles`, `discount_change_log` |
| **Auditoria** | `audit_logs` |

---

## Enums e Valores Permitidos

### `admin_users.role`
`SUPER_ADMIN` | `ADMIN` | `VIEWER`

### `vehicles.category`
`HATCH` | `SEDAN` | `SUV` | `PICKUP` | `MINIVAN` | `ESPORTIVO` | `ELETRICO`

### `vehicles.transmission`
`MANUAL` | `AUTOMATICO` | `CVT`

### `vehicles.fuel`
`FLEX` | `GASOLINA` | `DIESEL` | `ELETRICO` | `HIBRIDO`

### `discounts.scope`
`ALL` | `TABLE` | `VEHICLE`

### `import_jobs.status`
`PENDING` | `PROCESSING` | `SUCCESS` | `FAILED` | `CANCELLED`

### `import_job_rows.status`
`PENDING` | `SUCCESS` | `ERROR` | `SKIPPED`

### `audit_logs.action`
`CREATE` | `UPDATE` | `DELETE` | `ACTIVATE` | `DEACTIVATE` | `IMPORT` | `LOGIN` | `LOGOUT` | `PASSWORD_CHANGE`

### `discount_change_log.action`
`CREATE` | `UPDATE` | `DEACTIVATE` | `REACTIVATE`
