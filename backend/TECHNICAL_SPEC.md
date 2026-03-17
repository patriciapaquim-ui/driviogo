# Especificação Técnica — DrivioGo Backend
**DrivioGo — seu carro por assinatura**
**Versão:** 1.0.0
**Data:** 2026-03-17
**Status:** Implementado e publicado no branch `claude/driviogo-backend-setup-UCC4y`

---

## Sumário

1. [Visão Geral do Sistema](#1-visão-geral-do-sistema)
2. [Stack Tecnológica](#2-stack-tecnológica)
3. [Estrutura de Diretórios](#3-estrutura-de-diretórios)
4. [Banco de Dados — Prisma Schema](#4-banco-de-dados--prisma-schema)
5. [Arquitetura de Módulos NestJS](#5-arquitetura-de-módulos-nestjs)
6. [Sistema de Autenticação e Autorização](#6-sistema-de-autenticação-e-autorização)
7. [Módulos de Domínio](#7-módulos-de-domínio)
8. [Camada Comum (Common)](#8-camada-comum-common)
9. [API — Rotas Completas](#9-api--rotas-completas)
10. [DTOs e Validação](#10-dtos-e-validação)
11. [Configuração e Variáveis de Ambiente](#11-configuração-e-variáveis-de-ambiente)
12. [Seed de Banco de Dados](#12-seed-de-banco-de-dados)
13. [Decisões Arquiteturais](#13-decisões-arquiteturais)
14. [Padrões de Segurança](#14-padrões-de-segurança)
15. [Padrões de Resposta da API](#15-padrões-de-resposta-da-api)
16. [Como Executar](#16-como-executar)

---

## 1. Visão Geral do Sistema

O DrivioGo Backend é uma API RESTful construída com NestJS que fornece toda a infraestrutura de dados para uma plataforma de assinatura de veículos. O sistema suporta:

- Catálogo de veículos com imagens e planos de assinatura
- Geração e gestão de leads comerciais
- Contas de usuário com autenticação JWT
- Ciclo completo de assinaturas (criação → pagamento → cancelamento)
- Rastreamento de pagamentos
- Sistema de tickets de suporte
- Painel administrativo com KPIs
- Notificações in-app
- Lista de favoritos por usuário

---

## 2. Stack Tecnológica

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Runtime | Node.js | ≥ 20 LTS |
| Framework | NestJS | ^10.4 |
| Linguagem | TypeScript | ^5.5 |
| ORM | Prisma | ^5.18 |
| Banco de Dados | PostgreSQL | ≥ 15 |
| Autenticação | JWT (passport-jwt) | ^4.0 |
| Hash de senha | bcryptjs | ^2.4 |
| Validação de DTO | class-validator + class-transformer | ^0.14 / ^0.5 |
| Documentação | Swagger / OpenAPI 3 | ^7.4 |
| Rate Limiting | @nestjs/throttler | ^6.2 |
| Segurança HTTP | helmet | ^7.1 |

---

## 3. Estrutura de Diretórios

```
backend/
├── prisma/
│   ├── schema.prisma              # Definição completa do banco de dados
│   └── seed.ts                    # Script de seed (veículos + admin)
│
├── src/
│   ├── main.ts                    # Bootstrap da aplicação
│   ├── app.module.ts              # Módulo raiz (importa todos os módulos)
│   │
│   ├── prisma/                    # Módulo global de acesso ao banco
│   │   ├── prisma.module.ts
│   │   └── prisma.service.ts
│   │
│   ├── auth/                      # Autenticação e autorização
│   │   ├── dto/
│   │   │   ├── login.dto.ts
│   │   │   └── register.dto.ts
│   │   ├── decorators/
│   │   │   ├── public.decorator.ts     # @Public() — isenta rota de auth
│   │   │   └── roles.decorator.ts      # @Roles(...) — controle de acesso
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts       # Guarda JWT global
│   │   │   └── roles.guard.ts          # Guarda de papéis global
│   │   ├── strategies/
│   │   │   └── jwt.strategy.ts         # Estratégia Passport JWT
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   └── auth.module.ts
│   │
│   ├── users/                     # Contas de usuário
│   │   ├── dto/
│   │   │   ├── create-user.dto.ts
│   │   │   └── update-user.dto.ts
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   └── users.module.ts
│   │
│   ├── vehicles/                  # Catálogo de veículos
│   │   ├── dto/
│   │   │   ├── create-vehicle.dto.ts
│   │   │   ├── update-vehicle.dto.ts
│   │   │   └── vehicle-filter.dto.ts   # Filtros + paginação
│   │   ├── vehicles.controller.ts
│   │   ├── vehicles.service.ts
│   │   └── vehicles.module.ts
│   │
│   ├── plans/                     # Planos de assinatura por veículo
│   │   ├── dto/
│   │   │   ├── create-plan.dto.ts
│   │   │   └── update-plan.dto.ts
│   │   ├── plans.controller.ts
│   │   ├── plans.service.ts
│   │   └── plans.module.ts
│   │
│   ├── subscriptions/             # Assinaturas de veículos
│   │   ├── dto/
│   │   │   ├── create-subscription.dto.ts
│   │   │   └── update-subscription.dto.ts
│   │   ├── subscriptions.controller.ts
│   │   ├── subscriptions.service.ts
│   │   └── subscriptions.module.ts
│   │
│   ├── leads/                     # Captura e gestão de leads
│   │   ├── dto/
│   │   │   └── create-lead.dto.ts
│   │   ├── leads.controller.ts
│   │   ├── leads.service.ts
│   │   └── leads.module.ts
│   │
│   ├── payments/                  # Pagamentos
│   │   ├── dto/
│   │   │   └── create-payment.dto.ts
│   │   ├── payments.controller.ts
│   │   ├── payments.service.ts
│   │   └── payments.module.ts
│   │
│   ├── support/                   # Tickets de suporte
│   │   ├── dto/
│   │   │   ├── create-ticket.dto.ts
│   │   │   └── update-ticket.dto.ts
│   │   ├── support.controller.ts
│   │   ├── support.service.ts
│   │   └── support.module.ts
│   │
│   ├── notifications/             # Notificações in-app
│   │   ├── dto/
│   │   │   └── create-notification.dto.ts
│   │   ├── notifications.controller.ts
│   │   ├── notifications.service.ts
│   │   └── notifications.module.ts
│   │
│   ├── favorites/                 # Favoritos por usuário
│   │   ├── favorites.controller.ts
│   │   ├── favorites.service.ts
│   │   └── favorites.module.ts
│   │
│   ├── admin/                     # Painel administrativo
│   │   ├── admin.controller.ts
│   │   ├── admin.service.ts
│   │   └── admin.module.ts
│   │
│   └── common/                    # Utilitários compartilhados
│       ├── filters/
│       │   └── http-exception.filter.ts     # Tratamento global de erros
│       ├── interceptors/
│       │   └── transform.interceptor.ts     # Envelope de resposta uniforme
│       └── decorators/
│           └── current-user.decorator.ts    # @CurrentUser() param decorator
│
├── .env.example                   # Template de variáveis de ambiente
├── nest-cli.json                  # Configuração do CLI NestJS
├── package.json                   # Dependências e scripts
└── tsconfig.json                  # Configuração TypeScript
```

---

## 4. Banco de Dados — Prisma Schema

### 4.1 Enums

| Enum | Valores |
|------|---------|
| `Role` | `USER`, `ADMIN` |
| `VehicleStatus` | `AVAILABLE`, `UNAVAILABLE`, `MAINTENANCE` |
| `SubscriptionStatus` | `PENDING`, `ACTIVE`, `PAUSED`, `CANCELLED`, `EXPIRED` |
| `LeadStatus` | `NEW`, `CONTACTED`, `QUALIFIED`, `CONVERTED`, `LOST` |
| `PaymentStatus` | `PENDING`, `PAID`, `FAILED`, `REFUNDED` |
| `PaymentMethod` | `CREDIT_CARD`, `DEBIT_CARD`, `PIX`, `BOLETO` |
| `TicketStatus` | `OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED` |
| `TicketPriority` | `LOW`, `MEDIUM`, `HIGH`, `URGENT` |
| `NotificationType` | `SUBSCRIPTION`, `PAYMENT`, `SUPPORT`, `GENERAL` |

### 4.2 Tabela `users`

| Coluna | Tipo | Restrições | Descrição |
|--------|------|-----------|-----------|
| `id` | `String` (UUID) | PK | Identificador único |
| `email` | `String` | UNIQUE, NOT NULL | E-mail de login |
| `password_hash` | `String` | NOT NULL | Senha hasheada com bcrypt (salt 12) |
| `name` | `String` | NOT NULL | Nome completo |
| `phone` | `String` | NULLABLE | Telefone |
| `cpf` | `String` | UNIQUE, NULLABLE | CPF (uso futuro para KYC) |
| `role` | `Role` | DEFAULT USER | Papel de acesso |
| `is_active` | `Boolean` | DEFAULT true | Soft delete |
| `avatar_url` | `String` | NULLABLE | URL do avatar |
| `created_at` | `DateTime` | DEFAULT now() | Data de criação |
| `updated_at` | `DateTime` | @updatedAt | Atualização automática |

**Relações:** `subscriptions`, `payments`, `tickets`, `notifications`, `favorites`, `leads`

### 4.3 Tabela `vehicles`

| Coluna | Tipo | Restrições | Descrição |
|--------|------|-----------|-----------|
| `id` | `String` (UUID) | PK | Identificador único |
| `brand` | `String` | NOT NULL | Marca (Toyota, VW…) |
| `model` | `String` | NOT NULL | Modelo (Corolla, T-Cross…) |
| `year` | `Int` | NOT NULL | Ano de fabricação |
| `color` | `String` | NULLABLE | Cor |
| `plate` | `String` | UNIQUE, NULLABLE | Placa |
| `mileage` | `Int` | DEFAULT 0 | Quilometragem atual |
| `transmission` | `String` | DEFAULT 'automatic' | Câmbio |
| `fuel_type` | `String` | DEFAULT 'flex' | Combustível |
| `doors` | `Int` | DEFAULT 4 | Número de portas |
| `seats` | `Int` | DEFAULT 5 | Número de assentos |
| `description` | `String` | NULLABLE | Descrição detalhada |
| `status` | `VehicleStatus` | DEFAULT AVAILABLE | Disponibilidade |
| `featured` | `Boolean` | DEFAULT false | Destaque na vitrine |
| `thumbnail_url` | `String` | NULLABLE | Imagem principal |
| `created_at` | `DateTime` | DEFAULT now() | Data de criação |
| `updated_at` | `DateTime` | @updatedAt | Atualização automática |

**Relações:** `images` (1:N), `plans` (1:N), `subscriptions` (1:N), `favorites` (1:N), `leads` (1:N)

### 4.4 Tabela `vehicle_images`

| Coluna | Tipo | Restrições | Descrição |
|--------|------|-----------|-----------|
| `id` | `String` (UUID) | PK | — |
| `vehicle_id` | `String` | FK → vehicles | — |
| `url` | `String` | NOT NULL | URL da imagem |
| `alt_text` | `String` | NULLABLE | Texto alternativo |
| `is_primary` | `Boolean` | DEFAULT false | Imagem principal |
| `order` | `Int` | DEFAULT 0 | Ordem de exibição |
| `created_at` | `DateTime` | DEFAULT now() | — |

**Cascade:** `onDelete: Cascade` — imagens são removidas com o veículo.

### 4.5 Tabela `plans`

| Coluna | Tipo | Restrições | Descrição |
|--------|------|-----------|-----------|
| `id` | `String` (UUID) | PK | — |
| `vehicle_id` | `String` | FK → vehicles | Veículo ao qual pertence |
| `name` | `String` | NOT NULL | Ex: "Plano 12 meses" |
| `duration_months` | `Int` | NOT NULL | Duração em meses |
| `monthly_price` | `Decimal(10,2)` | NOT NULL | Mensalidade |
| `included_km` | `Int` | NOT NULL | KM incluídos/mês |
| `extra_km_price` | `Decimal(8,2)` | NOT NULL | Preço por KM extra |
| `includes_insurance` | `Boolean` | DEFAULT true | Seguro incluso |
| `includes_maintenance` | `Boolean` | DEFAULT true | Manutenção inclusa |
| `is_active` | `Boolean` | DEFAULT true | Soft delete |
| `created_at` | `DateTime` | DEFAULT now() | — |
| `updated_at` | `DateTime` | @updatedAt | — |

**Cascade:** `onDelete: Cascade` — planos são removidos com o veículo.

### 4.6 Tabela `subscriptions`

| Coluna | Tipo | Restrições | Descrição |
|--------|------|-----------|-----------|
| `id` | `String` (UUID) | PK | — |
| `user_id` | `String` | FK → users | Assinante |
| `vehicle_id` | `String` | FK → vehicles | Veículo assinado |
| `plan_id` | `String` | FK → plans | Plano contratado |
| `status` | `SubscriptionStatus` | DEFAULT PENDING | Estado atual |
| `start_date` | `DateTime` | NULLABLE | Início da assinatura |
| `end_date` | `DateTime` | NULLABLE | Calculado: start + durationMonths |
| `delivery_address` | `String` | NULLABLE | Endereço de entrega |
| `notes` | `String` | NULLABLE | Observações |
| `created_at` | `DateTime` | DEFAULT now() | — |
| `updated_at` | `DateTime` | @updatedAt | — |

**Relações:** `payments` (1:N)

### 4.7 Tabela `leads`

| Coluna | Tipo | Restrições | Descrição |
|--------|------|-----------|-----------|
| `id` | `String` (UUID) | PK | — |
| `name` | `String` | NOT NULL | Nome do prospect |
| `email` | `String` | NOT NULL | E-mail |
| `phone` | `String` | NOT NULL | Telefone |
| `vehicle_id` | `String` | FK → vehicles, NULLABLE | Veículo de interesse |
| `user_id` | `String` | FK → users, NULLABLE | Conta criada (se houver) |
| `status` | `LeadStatus` | DEFAULT NEW | Estágio no funil |
| `message` | `String` | NULLABLE | Mensagem do formulário |
| `source` | `String` | NULLABLE | Origem (landing_page, google…) |
| `notes` | `String` | NULLABLE | Notas internas do admin |
| `created_at` | `DateTime` | DEFAULT now() | — |
| `updated_at` | `DateTime` | @updatedAt | — |

**Cascade:** `onDelete: SetNull` — vehicle/user deletado não remove o lead.

### 4.8 Tabela `payments`

| Coluna | Tipo | Restrições | Descrição |
|--------|------|-----------|-----------|
| `id` | `String` (UUID) | PK | — |
| `subscription_id` | `String` | FK → subscriptions | Assinatura vinculada |
| `user_id` | `String` | FK → users | Pagador |
| `amount` | `Decimal(10,2)` | NOT NULL | Valor em R$ |
| `status` | `PaymentStatus` | DEFAULT PENDING | Estado do pagamento |
| `method` | `PaymentMethod` | DEFAULT PIX | Método |
| `due_date` | `DateTime` | NOT NULL | Data de vencimento |
| `paid_at` | `DateTime` | NULLABLE | Preenchido ao marcar como pago |
| `external_id` | `String` | NULLABLE | ID do gateway de pagamento |
| `receipt_url` | `String` | NULLABLE | URL do comprovante |
| `failure_reason` | `String` | NULLABLE | Motivo de falha |
| `created_at` | `DateTime` | DEFAULT now() | — |
| `updated_at` | `DateTime` | @updatedAt | — |

### 4.9 Tabela `support_tickets`

| Coluna | Tipo | Restrições | Descrição |
|--------|------|-----------|-----------|
| `id` | `String` (UUID) | PK | — |
| `user_id` | `String` | FK → users | Autor do ticket |
| `subject` | `String` | NOT NULL | Assunto |
| `description` | `String` | NOT NULL | Descrição detalhada |
| `status` | `TicketStatus` | DEFAULT OPEN | Estado |
| `priority` | `TicketPriority` | DEFAULT MEDIUM | Prioridade |
| `resolved_at` | `DateTime` | NULLABLE | Preenchido ao resolver |
| `admin_notes` | `String` | NULLABLE | Notas internas |
| `created_at` | `DateTime` | DEFAULT now() | — |
| `updated_at` | `DateTime` | @updatedAt | — |

### 4.10 Tabela `notifications`

| Coluna | Tipo | Restrições | Descrição |
|--------|------|-----------|-----------|
| `id` | `String` (UUID) | PK | — |
| `user_id` | `String` | FK → users | Destinatário |
| `type` | `NotificationType` | DEFAULT GENERAL | Categoria |
| `title` | `String` | NOT NULL | Título |
| `body` | `String` | NOT NULL | Corpo da mensagem |
| `read` | `Boolean` | DEFAULT false | Lida ou não |
| `metadata` | `Json` | NULLABLE | Dados extras (ex: subscriptionId) |
| `created_at` | `DateTime` | DEFAULT now() | — |

**Cascade:** `onDelete: Cascade` — removida com o usuário.

### 4.11 Tabela `favorites`

| Coluna | Tipo | Restrições | Descrição |
|--------|------|-----------|-----------|
| `id` | `String` (UUID) | PK | — |
| `user_id` | `String` | FK → users | — |
| `vehicle_id` | `String` | FK → vehicles | — |
| `created_at` | `DateTime` | DEFAULT now() | — |

**Constraint único:** `@@unique([userId, vehicleId])` — impede duplicação de favoritos.
**Cascade:** `onDelete: Cascade` em ambas as relações.

---

## 5. Arquitetura de Módulos NestJS

### 5.1 Diagrama de Dependências

```
AppModule
├── ConfigModule (global)
├── ThrottlerModule (global)
├── PrismaModule (global — exporta PrismaService para todos)
├── AuthModule ──────── registra APP_GUARD (JwtAuthGuard + RolesGuard)
├── UsersModule
├── VehiclesModule
├── PlansModule
├── SubscriptionsModule
├── LeadsModule
├── PaymentsModule
├── SupportModule
├── NotificationsModule
├── FavoritesModule
└── AdminModule
```

### 5.2 Bootstrap — `main.ts`

O arquivo de entrada configura:

| Configuração | Detalhe |
|-------------|---------|
| `helmet()` | Cabeçalhos de segurança HTTP |
| `enableCors()` | Origens permitidas via `ALLOWED_ORIGINS` env var |
| `setGlobalPrefix('api/v1')` | Todas as rotas com prefixo `/api/v1` |
| `ValidationPipe` | `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true` |
| `HttpExceptionFilter` | Formato uniforme de erros |
| `TransformInterceptor` | Envelope de respostas de sucesso |
| `SwaggerModule` | Documentação em `/api/docs` (desabilitada em `production`) |
| `PORT` | Padrão 3000, configurável via env |

### 5.3 PrismaModule

- Decorado com `@Global()` — exporta `PrismaService` sem necessidade de importação explícita em cada módulo.
- `PrismaService` implementa `OnModuleInit` (`$connect`) e `OnModuleDestroy` (`$disconnect`) para gestão do ciclo de vida da conexão.

---

## 6. Sistema de Autenticação e Autorização

### 6.1 Fluxo de Autenticação JWT

```
Cliente                     API
  │                          │
  ├─ POST /auth/register ──► │ bcrypt.hash(password, 12)
  │                          │ prisma.user.create(...)
  │ ◄── { user, token } ────┤ jwt.sign({ sub, email, role })
  │                          │
  ├─ POST /auth/login ─────► │ prisma.user.findUnique({ email })
  │                          │ bcrypt.compare(password, hash)
  │ ◄── { user, token } ────┤ jwt.sign({ sub, email, role })
  │                          │
  ├─ GET /auth/me ──────────► │ JwtStrategy.validate(payload)
  │   Bearer <token>         │ prisma.user.findUnique({ id: payload.sub })
  │ ◄── { user } ───────────┤
```

### 6.2 JwtStrategy (`passport-jwt`)

- Extrai token do header `Authorization: Bearer <token>`
- Valida a assinatura com `JWT_SECRET`
- Busca o usuário no banco — rejeita se não encontrado ou `isActive = false`
- Injeta o objeto `{ id, email, role, isActive }` em `request.user`

### 6.3 Guardas Globais

Ambos os guardas são registrados como `APP_GUARD` no `AuthModule`, aplicando-se a **todas as rotas automaticamente**:

**JwtAuthGuard**
- Verifica se a rota tem metadado `isPublic` (via `@Public()`)
- Se sim: passa sem validar token
- Se não: executa `AuthGuard('jwt')` → aciona `JwtStrategy`

**RolesGuard**
- Lê metadado `roles` (via `@Roles(...)`)
- Se sem roles definidas: permite acesso
- Se com roles: verifica `request.user.role` contra a lista

### 6.4 Decorators de Segurança

```typescript
// Isenta uma rota de autenticação JWT
@Public()

// Restringe acesso a papéis específicos
@Roles(Role.ADMIN)
@Roles(Role.ADMIN, Role.USER)

// Injeta o usuário autenticado como parâmetro
@CurrentUser() user: AuthenticatedUser
```

### 6.5 Payload JWT

```typescript
interface JwtPayload {
  sub: string;   // userId (UUID)
  email: string;
  role: string;  // 'USER' | 'ADMIN'
  iat: number;   // issued at
  exp: number;   // expiration (default: 7d)
}
```

---

## 7. Módulos de Domínio

### 7.1 AuthModule

**Arquivo:** `src/auth/`

| Endpoint | Método | Auth | Descrição |
|----------|--------|------|-----------|
| `/auth/register` | POST | Public | Cadastro de novo usuário |
| `/auth/login` | POST | Public | Login → retorna JWT |
| `/auth/me` | GET | JWT | Perfil do usuário autenticado |

**Regras de negócio:**
- Email único — lança `ConflictException` se duplicado
- Senha hash com bcrypt salt 12
- Retorna `{ user, token }` em register e login
- Senha nunca é retornada — `passwordHash` é omitido via desestruturação

---

### 7.2 UsersModule

**Arquivo:** `src/users/`

| Endpoint | Método | Auth | Descrição |
|----------|--------|------|-----------|
| `/users` | POST | Public | Criar conta |
| `/users/profile` | GET | JWT | Ver perfil próprio |
| `/users/profile` | PUT | JWT | Atualizar perfil próprio |
| `/users` | GET | ADMIN | Listar todos os usuários |
| `/users/:id` | GET | ADMIN | Buscar usuário por ID |
| `/users/:id` | DELETE | ADMIN | Desativar usuário (soft delete) |

**Campos selecionados (nunca retorna `passwordHash`):**
```typescript
const USER_SELECT = {
  id, name, email, phone, cpf, role,
  isActive, avatarUrl, createdAt, updatedAt
}
```

---

### 7.3 VehiclesModule

**Arquivo:** `src/vehicles/`

| Endpoint | Método | Auth | Descrição |
|----------|--------|------|-----------|
| `/vehicles` | GET | Public | Catálogo com filtros e paginação |
| `/vehicles/:id` | GET | Public | Detalhes + planos + imagens |
| `/vehicles` | POST | ADMIN | Criar veículo |
| `/vehicles/:id` | PUT | ADMIN | Atualizar veículo |
| `/vehicles/:id` | DELETE | ADMIN | Desativar veículo (status → UNAVAILABLE) |

**Filtros disponíveis (`VehicleFilterDto`):**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `brand` | string | Filtro por marca (case-insensitive, contains) |
| `model` | string | Filtro por modelo (case-insensitive, contains) |
| `transmission` | string | Câmbio |
| `fuelType` | string | Combustível |
| `featured` | boolean | Somente destaques |
| `status` | VehicleStatus | Default: AVAILABLE |
| `yearFrom` | number | Ano mínimo |
| `yearTo` | number | Ano máximo |
| `page` | number | Default: 1 |
| `limit` | number | Default: 12, Max: 100 |

**Paginação — resposta:**
```json
{
  "data": [...],
  "meta": {
    "total": 42,
    "page": 1,
    "limit": 12,
    "totalPages": 4
  }
}
```

**Ordenação padrão:** `featured DESC, createdAt DESC`

**`findOne` inclui:** todas as imagens ordenadas por `order ASC` + planos ativos ordenados por `monthlyPrice ASC`

---

### 7.4 PlansModule

**Arquivo:** `src/plans/`

| Endpoint | Método | Auth | Descrição |
|----------|--------|------|-----------|
| `/plans` | GET | Public | Listar planos (filtro por vehicleId) |
| `/plans/:id` | GET | Public | Detalhes do plano |
| `/plans` | POST | ADMIN | Criar plano |
| `/plans/:id` | PUT | ADMIN | Atualizar plano |
| `/plans/:id` | DELETE | ADMIN | Desativar plano (isActive → false) |

**Nota:** Um plano pertence a exatamente um veículo. A relação é validada na criação de assinatura.

---

### 7.5 SubscriptionsModule

**Arquivo:** `src/subscriptions/`

| Endpoint | Método | Auth | Descrição |
|----------|--------|------|-----------|
| `/subscriptions` | POST | JWT | Criar assinatura |
| `/subscriptions/my` | GET | JWT | Assinaturas do usuário autenticado |
| `/subscriptions/:id` | GET | JWT | Detalhes de uma assinatura |
| `/subscriptions/:id/cancel` | PATCH | JWT | Cancelar assinatura própria |
| `/subscriptions` | GET | ADMIN | Listar todas as assinaturas |
| `/subscriptions/:id` | PUT | ADMIN | Atualizar status de assinatura |

**Regras de negócio:**
- Valida existência do veículo e do plano antes de criar
- Valida que `plan.vehicleId === dto.vehicleId` — plano pertence ao veículo
- `startDate`: usa data fornecida ou `new Date()`
- `endDate`: calculado automaticamente como `startDate + plan.durationMonths`
- Cancelamento bloqueado se status já for `CANCELLED` ou `EXPIRED`
- Admin pode ver qualquer assinatura; usuário comum só vê as suas

**Dados incluídos na resposta:**
```typescript
{
  vehicle: { id, brand, model, year, thumbnailUrl },
  plan: { ... },
  payments: [ últimos 5, orderBy: dueDate DESC ]
}
```

---

### 7.6 LeadsModule

**Arquivo:** `src/leads/`

| Endpoint | Método | Auth | Descrição |
|----------|--------|------|-----------|
| `/leads` | POST | Public | Submeter formulário de interesse |
| `/leads` | GET | ADMIN | Listar leads (filtro por status) |
| `/leads/:id` | GET | ADMIN | Detalhes do lead |
| `/leads/:id/status` | PATCH | ADMIN | Atualizar status + notas |

**Funil de status:** `NEW → CONTACTED → QUALIFIED → CONVERTED / LOST`

**Nota:** Se o usuário estiver autenticado ao submeter o lead, o `userId` é vinculado automaticamente via `request.user?.id`.

---

### 7.7 PaymentsModule

**Arquivo:** `src/payments/`

| Endpoint | Método | Auth | Descrição |
|----------|--------|------|-----------|
| `/payments` | POST | JWT | Registrar pagamento |
| `/payments/my` | GET | JWT | Histórico de pagamentos do usuário |
| `/payments/:id` | GET | JWT | Detalhes de um pagamento |
| `/payments` | GET | ADMIN | Listar todos os pagamentos |
| `/payments/:id/paid` | PATCH | ADMIN | Marcar como pago (define `paidAt`) |
| `/payments/:id/failed` | PATCH | ADMIN | Marcar como falho (define `failureReason`) |

**Nota:** O módulo está desenhado para integração futura com gateways (Stripe, PagSeguro, Mercado Pago) via `externalId` e `receiptUrl`.

---

### 7.8 SupportModule

**Arquivo:** `src/support/`

| Endpoint | Método | Auth | Descrição |
|----------|--------|------|-----------|
| `/support/tickets` | POST | JWT | Abrir ticket |
| `/support/tickets/my` | GET | JWT | Tickets do usuário autenticado |
| `/support/tickets/:id` | GET | JWT | Detalhes de um ticket |
| `/support/tickets` | GET | ADMIN | Todos os tickets |
| `/support/tickets/:id` | PUT | ADMIN | Atualizar status/prioridade/notas |

**Ordenação admin:** `priority DESC, createdAt ASC` — urgentes primeiro, mais antigos em cima.
**`resolvedAt`:** preenchido automaticamente quando `status → RESOLVED`.

---

### 7.9 NotificationsModule

**Arquivo:** `src/notifications/`

| Endpoint | Método | Auth | Descrição |
|----------|--------|------|-----------|
| `/notifications` | GET | JWT | Últimas 50 notificações do usuário |
| `/notifications/unread-count` | GET | JWT | Contagem de não lidas |
| `/notifications/:id/read` | PATCH | JWT | Marcar uma como lida |
| `/notifications/read-all` | PATCH | JWT | Marcar todas como lidas |

**`metadata`:** campo JSON livre para dados contextuais — ex: `{ subscriptionId: "...", vehicleModel: "..." }`.

---

### 7.10 FavoritesModule

**Arquivo:** `src/favorites/`

| Endpoint | Método | Auth | Descrição |
|----------|--------|------|-----------|
| `/favorites` | GET | JWT | Veículos favoritados com imagem + menor plano |
| `/favorites/:vehicleId` | POST | JWT | Toggle favorito (adiciona ou remove) |
| `/favorites/:vehicleId` | GET | JWT | Verifica se veículo é favorito |

**Toggle response:**
```json
{ "favorited": true }  // ou false, dependendo da operação
```

**Dados incluídos ao listar:** imagem principal (`isPrimary: true`) + plano mais barato (`monthlyPrice ASC`).

---

### 7.11 AdminModule

**Arquivo:** `src/admin/`

Todas as rotas exigem `@Roles(Role.ADMIN)` aplicado no controller.

| Endpoint | Método | Auth | Descrição |
|----------|--------|------|-----------|
| `/admin/dashboard` | GET | ADMIN | KPIs da plataforma |
| `/admin/activity` | GET | ADMIN | Atividade recente |

**KPIs do dashboard (executados em paralelo com `Promise.all`):**

| KPI | Descrição |
|-----|-----------|
| `totalUsers` | Usuários ativos |
| `totalVehicles` | Total de veículos |
| `activeSubscriptions` | Assinaturas com status ACTIVE |
| `pendingLeads` | Leads com status NEW |
| `revenueThisMonth` | Soma de pagamentos PAID no mês corrente |
| `openTickets` | Tickets com status OPEN |

**Atividade recente:** 5 últimas assinaturas, 5 últimos leads, 5 últimos pagamentos.

---

## 8. Camada Comum (Common)

### 8.1 HttpExceptionFilter

**Arquivo:** `src/common/filters/http-exception.filter.ts`

Captura **todas** as exceções (HTTP e não-HTTP) e retorna um JSON padronizado:

```json
{
  "success": false,
  "statusCode": 404,
  "timestamp": "2026-03-17T12:00:00.000Z",
  "path": "/api/v1/vehicles/abc",
  "message": "Vehicle not found"
}
```

- Erros 5xx são logados com stack trace via `Logger`
- Mensagens aninhadas (`exception.getResponse().message`) são extraídas corretamente

### 8.2 TransformInterceptor

**Arquivo:** `src/common/interceptors/transform.interceptor.ts`

Envolve **todas** as respostas de sucesso:

```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2026-03-17T12:00:00.000Z"
}
```

### 8.3 CurrentUser Decorator

**Arquivo:** `src/common/decorators/current-user.decorator.ts`

Param decorator que extrai `request.user` injetado pelo `JwtStrategy`:

```typescript
@Get('profile')
getProfile(@CurrentUser() user: AuthenticatedUser) {
  return user;
}
```

---

## 9. API — Rotas Completas

### 9.1 Rotas Públicas

```
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/users
GET    /api/v1/vehicles
GET    /api/v1/vehicles/:id
GET    /api/v1/plans
GET    /api/v1/plans/:id
POST   /api/v1/leads
```

### 9.2 Rotas Autenticadas (qualquer usuário)

```
GET    /api/v1/auth/me
GET    /api/v1/users/profile
PUT    /api/v1/users/profile

POST   /api/v1/subscriptions
GET    /api/v1/subscriptions/my
GET    /api/v1/subscriptions/:id
PATCH  /api/v1/subscriptions/:id/cancel

POST   /api/v1/payments
GET    /api/v1/payments/my
GET    /api/v1/payments/:id

POST   /api/v1/support/tickets
GET    /api/v1/support/tickets/my
GET    /api/v1/support/tickets/:id

GET    /api/v1/notifications
GET    /api/v1/notifications/unread-count
PATCH  /api/v1/notifications/:id/read
PATCH  /api/v1/notifications/read-all

GET    /api/v1/favorites
POST   /api/v1/favorites/:vehicleId
GET    /api/v1/favorites/:vehicleId
```

### 9.3 Rotas Administrativas (ADMIN only)

```
GET    /api/v1/users
GET    /api/v1/users/:id
DELETE /api/v1/users/:id

POST   /api/v1/vehicles
PUT    /api/v1/vehicles/:id
DELETE /api/v1/vehicles/:id

POST   /api/v1/plans
PUT    /api/v1/plans/:id
DELETE /api/v1/plans/:id

GET    /api/v1/subscriptions
PUT    /api/v1/subscriptions/:id

GET    /api/v1/leads
GET    /api/v1/leads/:id
PATCH  /api/v1/leads/:id/status

GET    /api/v1/payments
PATCH  /api/v1/payments/:id/paid
PATCH  /api/v1/payments/:id/failed

GET    /api/v1/support/tickets
PUT    /api/v1/support/tickets/:id

GET    /api/v1/admin/dashboard
GET    /api/v1/admin/activity
```

---

## 10. DTOs e Validação

Todos os DTOs usam `class-validator` e `class-transformer`. O `ValidationPipe` global garante:
- `whitelist: true` — propriedades não declaradas são removidas silenciosamente
- `forbidNonWhitelisted: true` — propriedades extras geram erro 400
- `transform: true` — strings numéricas viram números, etc.

### Exemplo de Validação — RegisterDto

```typescript
class RegisterDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[A-Z])(?=.*[0-9])/, {
    message: 'Password must contain at least one uppercase letter and one number',
  })
  password: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
```

### Exemplo de Resposta de Erro de Validação

```json
{
  "success": false,
  "statusCode": 400,
  "timestamp": "2026-03-17T12:00:00.000Z",
  "path": "/api/v1/auth/register",
  "message": [
    "email must be an email",
    "Password must contain at least one uppercase letter and one number"
  ]
}
```

---

## 11. Configuração e Variáveis de Ambiente

**Arquivo:** `backend/.env.example`

| Variável | Obrigatória | Padrão | Descrição |
|----------|------------|--------|-----------|
| `NODE_ENV` | Não | `development` | Ambiente de execução |
| `PORT` | Não | `3000` | Porta HTTP |
| `DATABASE_URL` | **Sim** | — | Connection string PostgreSQL |
| `JWT_SECRET` | **Sim** | — | Segredo JWT (mín. 32 chars recomendado) |
| `JWT_EXPIRES_IN` | Não | `7d` | Expiração do token |
| `ALLOWED_ORIGINS` | Não | `http://localhost:5173` | Origens CORS (vírgula separadas) |

**Nota de segurança:** Nunca commitar o arquivo `.env`. Apenas `.env.example` vai para o repositório.

---

## 12. Seed de Banco de Dados

**Arquivo:** `backend/prisma/seed.ts`

Cria os dados iniciais necessários para desenvolvimento e demonstração:

**Usuário Admin:**
| Campo | Valor |
|-------|-------|
| Email | `admin@driviogo.com.br` |
| Senha | `Admin@123` |
| Role | `ADMIN` |

**Veículos de exemplo:**

| Veículo | Planos |
|---------|--------|
| Toyota Corolla 2024 (Prata) | 12 meses: R$ 2.800/mês, 24 meses: R$ 2.500/mês |
| VW T-Cross 2024 (Branco) | 12 meses: R$ 2.600/mês |
| Chevrolet Onix 2024 (Vermelho) | 6 meses: R$ 1.800/mês, 12 meses: R$ 1.600/mês |

**Execução:** `npm run db:seed`

**Segurança:** Usa `upsert` — pode ser executado múltiplas vezes sem duplicar dados.

---

## 13. Decisões Arquiteturais

### 13.1 Default-Closed Security (Segurança por Padrão)

O `JwtAuthGuard` e o `RolesGuard` são registrados como `APP_GUARD` — guardas globais que se aplicam a **todas** as rotas. Uma rota só é pública se explicitamente marcada com `@Public()`. Isso elimina o risco de esquecer de proteger um endpoint.

```
Sem decorador → Protegida por JWT
@Public()     → Pública
@Roles(ADMIN) → Só admin
```

### 13.2 Soft Delete em Entidades Críticas

Nenhuma entidade é deletada fisicamente. Em vez disso:
- `User`: `isActive = false`
- `Vehicle`: `status = UNAVAILABLE`
- `Plan`: `isActive = false`

Isso preserva o histórico (assinaturas, pagamentos) e evita erros de integridade referencial.

### 13.3 PrismaModule Global

Decorado com `@Global()`, o `PrismaService` está disponível em qualquer módulo sem necessidade de importação explícita. Um único pool de conexões é compartilhado.

### 13.4 Cálculo Automático de EndDate

Na criação de assinatura, a `endDate` é calculada pelo backend:
```typescript
endDate = startDate + plan.durationMonths
```
O frontend nunca envia `endDate` — elimina inconsistências.

### 13.5 Validação Cruzada de Plano × Veículo

Antes de criar uma assinatura, o serviço verifica:
```typescript
if (plan.vehicleId !== dto.vehicleId) throw BadRequestException(...)
```
Impede que um usuário assine o Corolla usando um plano do T-Cross.

### 13.6 Padrão de Resposta Uniforme

Toda resposta usa o mesmo envelope via `TransformInterceptor` e `HttpExceptionFilter`, facilitando o consumo no frontend:
```typescript
// Sucesso
{ success: true, data: T, timestamp: string }

// Erro
{ success: false, statusCode: number, message: string|string[], path: string, timestamp: string }
```

### 13.7 Parallel Queries com Promise.all

Queries independentes são executadas em paralelo:
```typescript
const [vehicle, plan] = await Promise.all([
  prisma.vehicle.findUnique(...),
  prisma.plan.findUnique(...),
]);
```
Reduz latência em endpoints que precisam buscar múltiplas entidades.

---

## 14. Padrões de Segurança

| Mecanismo | Implementação |
|-----------|--------------|
| Hash de senha | `bcryptjs` com salt 12 rounds |
| Token JWT | Assinado com `HS256`, expira em 7 dias |
| Validação de entrada | `class-validator` + `ValidationPipe` whitelist |
| Cabeçalhos HTTP | `helmet` — X-Frame-Options, CSP, HSTS, etc. |
| Rate limiting | `@nestjs/throttler` — 100 req/min por IP |
| CORS | Origens controladas via `ALLOWED_ORIGINS` |
| Autorização | RBAC via `RolesGuard` global |
| Dados sensíveis | `passwordHash` nunca retornado (omitido por `select`) |
| IDs | UUIDs v4 — não sequenciais, não adivinháveis |

---

## 15. Padrões de Resposta da API

### Sucesso (2xx)

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "João Silva",
    "email": "joao@email.com"
  },
  "timestamp": "2026-03-17T12:00:00.000Z"
}
```

### Erro de Validação (400)

```json
{
  "success": false,
  "statusCode": 400,
  "timestamp": "2026-03-17T12:00:00.000Z",
  "path": "/api/v1/auth/register",
  "message": ["email must be an email"]
}
```

### Não Autorizado (401)

```json
{
  "success": false,
  "statusCode": 401,
  "timestamp": "2026-03-17T12:00:00.000Z",
  "path": "/api/v1/subscriptions",
  "message": "Unauthorized"
}
```

### Proibido (403)

```json
{
  "success": false,
  "statusCode": 403,
  "timestamp": "2026-03-17T12:00:00.000Z",
  "path": "/api/v1/admin/dashboard",
  "message": "Insufficient permissions"
}
```

### Não Encontrado (404)

```json
{
  "success": false,
  "statusCode": 404,
  "timestamp": "2026-03-17T12:00:00.000Z",
  "path": "/api/v1/vehicles/abc",
  "message": "Vehicle not found"
}
```

---

## 16. Como Executar

### Pré-requisitos
- Node.js ≥ 20
- PostgreSQL ≥ 15
- npm ou yarn

### Instalação

```bash
# Entrar no diretório do backend
cd backend

# Copiar variáveis de ambiente
cp .env.example .env
# Editar .env com DATABASE_URL e JWT_SECRET

# Instalar dependências
npm install

# Gerar client do Prisma
npm run db:generate

# Executar migrations
npm run db:migrate

# Popular banco com dados iniciais
npm run db:seed

# Iniciar em desenvolvimento (watch mode)
npm run start:dev
```

### URLs

| Recurso | URL |
|---------|-----|
| API | `http://localhost:3000/api/v1` |
| Swagger UI | `http://localhost:3000/api/docs` |
| Prisma Studio | `npx prisma studio` (porta 5555) |

### Scripts disponíveis

| Script | Descrição |
|--------|-----------|
| `npm run start:dev` | Desenvolvimento com hot-reload |
| `npm run build` | Build de produção |
| `npm run start` | Inicia build de produção |
| `npm run db:generate` | Regenera Prisma Client |
| `npm run db:migrate` | Executa migrations (dev) |
| `npm run db:migrate:prod` | Executa migrations (produção) |
| `npm run db:studio` | Interface visual do banco |
| `npm run db:seed` | Popula banco com dados iniciais |
| `npm run lint` | Lint com ESLint |

---

*DrivioGo Backend — Especificação Técnica v1.0.0*
*Gerado em 2026-03-17*
