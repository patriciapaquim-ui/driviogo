# DrivioGo — NestJS Import Module Reference

> **Contexto:** O projeto atual usa Supabase (sem NestJS).
> Este documento é a **referência de arquitetura** para quando o time migrar para um backend NestJS dedicado.
> O código aqui é funcional e pode ser copiado diretamente para um projeto NestJS.

---

## Arquitetura do Módulo

```
src/
└── modules/
    └── import/
        ├── import.module.ts
        ├── import.controller.ts
        ├── import.service.ts
        ├── excel-parser.service.ts
        ├── dto/
        │   ├── upload-import.dto.ts
        │   ├── import-row.dto.ts
        │   ├── km-option.dto.ts
        │   └── confirm-import.dto.ts
        └── entities/
            ├── import-job.entity.ts
            └── import-job-row.entity.ts
```

### Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/import/upload` | Upload + parse + pré-visualização |
| `POST` | `/import/confirm/:jobId` | Confirma e grava no banco |
| `GET`  | `/import/jobs` | Lista histórico de importações |
| `GET`  | `/import/jobs/:id` | Detalhe de uma importação |
| `GET`  | `/import/jobs/:id/rows` | Linhas de uma importação |

---

## DTOs

```typescript
// dto/km-option.dto.ts
import { IsInt, IsNumber, Min } from 'class-validator';

export class KmOptionDto {
  @IsInt()
  @Min(1000)
  annualKm: number;

  @IsNumber()
  @Min(0)
  monthlyPrice: number;
}
```

```typescript
// dto/import-row.dto.ts
import { IsString, IsInt, IsNumber, IsArray, ValidateNested, Min, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { KmOptionDto } from './km-option.dto';

export class ImportRowDto {
  @IsInt()
  rowNumber: number;

  @IsString()
  @IsNotEmpty({ message: 'Nome do veículo é obrigatório.' })
  vehicleName: string;

  @IsInt()
  @Min(1, { message: 'Prazo do contrato deve ser maior que zero.' })
  contractDurationMonths: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => KmOptionDto)
  kmOptions: KmOptionDto[];

  @IsNumber()
  @Min(0)
  excessKmValue: number;

  @IsNumber()
  @Min(0)
  monitoringValue: number;

  @IsNumber()
  @Min(0)
  reserveCarValue: number;
}
```

```typescript
// dto/upload-import.dto.ts
import { IsString, IsOptional } from 'class-validator';

export class UploadImportDto {
  @IsString()
  pricingTableName: string;

  @IsOptional()
  @IsString()
  versionLabel?: string;
}
```

```typescript
// dto/confirm-import.dto.ts
import { IsUUID } from 'class-validator';

export class ConfirmImportDto {
  @IsUUID()
  importJobId: string;

  @IsUUID()
  pricingTableVersionId: string;
}
```

---

## Excel Parser Service

```typescript
// excel-parser.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';

export interface ParsedRow {
  rowNumber: number;
  vehicleName: string;
  contractDurationMonths: number;
  kmOptions: { annualKm: number; monthlyPrice: number }[];
  excessKmValue: number;
  monitoringValue: number;
  reserveCarValue: number;
  isValid: boolean;
  errors: string[];
}

export interface ParseResult {
  rows: ParsedRow[];
  validRows: ParsedRow[];
  errorRows: ParsedRow[];
  totalRows: number;
  columnErrors: string[];
}

@Injectable()
export class ExcelParserService {
  private readonly COL = {
    contract:   /prazo|contrato/i,
    vehicle:    /ve[íi]culo|modelo/i,
    excessKm:   /excedente|km[\s_-]*exc/i,
    monitoring: /monitoramento/i,
    reserveCar: /reserva/i,
  };

  parse(buffer: Buffer): ParseResult {
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false });
    const sheet    = workbook.Sheets[workbook.SheetNames[0]];
    const rawRows  = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });

    if (rawRows.length < 2) {
      throw new BadRequestException('A planilha está vazia ou sem dados.');
    }

    const headers = (rawRows[0] as unknown[]).map(h => String(h ?? '').trim());
    const columnErrors = this.validateHeaders(headers);
    if (columnErrors.length > 0) {
      return { rows: [], validRows: [], errorRows: [], totalRows: 0, columnErrors };
    }

    const contractIdx   = headers.findIndex(h => this.COL.contract.test(h));
    const vehicleIdx    = headers.findIndex(h => this.COL.vehicle.test(h));
    const excessKmIdx   = headers.findIndex(h => this.COL.excessKm.test(h));
    const monitoringIdx = headers.findIndex(h => this.COL.monitoring.test(h));
    const reserveCarIdx = headers.findIndex(h => this.COL.reserveCar.test(h));
    const kmCols        = this.detectKmColumns(headers);

    const rows: ParsedRow[] = [];
    const seen = new Set<string>();

    for (let i = 1; i < rawRows.length; i++) {
      const row = rawRows[i] as unknown[];
      if (!row || row.every(c => String(c ?? '').trim() === '')) continue;

      const errors: string[] = [];
      const vehicleName = String(row[vehicleIdx] ?? '').trim();
      const duration    = parseInt(String(row[contractIdx] ?? '').replace(/\D/g, ''), 10);
      const excessKm    = this.parseMoney(row[excessKmIdx]);
      const monitoring  = this.parseMoney(row[monitoringIdx]);
      const reserveCar  = this.parseMoney(row[reserveCarIdx]);

      if (!vehicleName)                       errors.push('Nome do veículo vazio.');
      if (isNaN(duration) || duration < 1)    errors.push('Prazo inválido.');
      if (excessKm   === null || excessKm < 0)  errors.push('Valor KM excedente inválido.');
      if (monitoring === null || monitoring < 0) errors.push('Valor monitoramento inválido.');
      if (reserveCar === null || reserveCar < 0) errors.push('Valor carro reserva inválido.');

      const kmOptions = kmCols.map(({ idx, km }) => {
        const price = this.parseMoney(row[idx]);
        if (price === null || price <= 0) {
          errors.push(`Valor para ${km.toLocaleString('pt-BR')} km inválido.`);
          return null;
        }
        return { annualKm: km, monthlyPrice: price };
      }).filter(Boolean) as { annualKm: number; monthlyPrice: number }[];

      const key = `${vehicleName.toLowerCase()}|${duration}`;
      if (errors.length === 0 && seen.has(key)) {
        errors.push('Linha duplicada na planilha.');
      } else if (errors.length === 0) {
        seen.add(key);
      }

      rows.push({
        rowNumber: i + 1,
        vehicleName,
        contractDurationMonths: isNaN(duration) ? 0 : duration,
        kmOptions,
        excessKmValue:   excessKm   ?? 0,
        monitoringValue: monitoring ?? 0,
        reserveCarValue: reserveCar ?? 0,
        isValid: errors.length === 0,
        errors,
      });
    }

    return {
      rows,
      validRows:  rows.filter(r => r.isValid),
      errorRows:  rows.filter(r => !r.isValid),
      totalRows:  rows.length,
      columnErrors: [],
    };
  }

  private validateHeaders(headers: string[]): string[] {
    const errors: string[] = [];
    if (!headers.some(h => this.COL.contract.test(h)))   errors.push('Coluna "Prazo do Contrato" não encontrada.');
    if (!headers.some(h => this.COL.vehicle.test(h)))    errors.push('Coluna "Veículos" não encontrada.');
    if (!headers.some(h => this.COL.excessKm.test(h)))   errors.push('Coluna "Valor KM Excedente" não encontrada.');
    if (!headers.some(h => this.COL.monitoring.test(h))) errors.push('Coluna "Valor Monitoramento" não encontrada.');
    if (!headers.some(h => this.COL.reserveCar.test(h))) errors.push('Coluna "Valor Carro Reserva" não encontrada.');
    if (this.detectKmColumns(headers).length < 2)        errors.push('Pelo menos 2 colunas de KM anual são necessárias.');
    return errors;
  }

  private detectKmColumns(headers: string[]): { idx: number; km: number }[] {
    return headers
      .map((h, idx) => {
        const raw = String(h).replace(/\./g,'').replace(/,/g,'').replace(/\s/g,'').replace(/km$/i,'');
        const km  = parseInt(raw, 10);
        return isNaN(km) || km < 5000 || km > 200000 ? null : { idx, km };
      })
      .filter(Boolean)
      .sort((a, b) => a!.km - b!.km) as { idx: number; km: number }[];
  }

  private parseMoney(value: unknown): number | null {
    if (typeof value === 'number') return isFinite(value) ? value : null;
    if (!value) return null;
    const str = String(value).replace(/R\$\s*/g,'').replace(/\s/g,'');
    const lastComma = str.lastIndexOf(',');
    const lastDot   = str.lastIndexOf('.');
    let n: string;
    if (lastComma > lastDot)   n = str.replace(/\./g,'').replace(',','.');
    else if (lastComma !== -1) n = str.replace(/,/g,'');
    else                       n = str;
    const num = parseFloat(n);
    return isNaN(num) ? null : num;
  }
}
```

---

## Import Service

```typescript
// import.service.ts
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { AuditService } from '../audit/audit.service';
import { ExcelParserService, ParsedRow } from './excel-parser.service';

@Injectable()
export class ImportService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private audit: AuditService,
    private parser: ExcelParserService,
  ) {}

  /**
   * Step 1: Upload and parse the Excel file.
   * Returns parse result for frontend preview — does NOT save pricing data yet.
   */
  async uploadAndParse(file: Express.Multer.File, adminUserId: string) {
    const result = this.parser.parse(file.buffer);

    if (result.columnErrors.length > 0) {
      throw new BadRequestException({ columnErrors: result.columnErrors });
    }

    // Upload to storage for later use in confirm step
    const fileUrl = await this.storage.upload('import-files', file);

    // Create ImportJob in PENDING state
    const importJob = await this.prisma.importJob.create({
      data: {
        fileName:      file.originalname,
        fileUrl,
        fileSize:      file.size,
        status:        'PENDING',
        totalRows:     result.totalRows,
        processedRows: 0,
        successRows:   0,
        errorRows:     0,
        createdById:   adminUserId,
      },
    });

    return {
      importJobId: importJob.id,
      preview: {
        totalRows:  result.totalRows,
        validCount: result.validRows.length,
        errorCount: result.errorRows.length,
        rows:       result.rows,
      },
    };
  }

  /**
   * Step 2: Confirm the import — saves all pricing data transactionally.
   */
  async confirmImport(
    importJobId: string,
    pricingTableName: string,
    versionLabel: string | undefined,
    adminUserId: string,
  ) {
    const importJob = await this.prisma.importJob.findUniqueOrThrow({
      where: { id: importJobId },
    });

    if (importJob.status !== 'PENDING') {
      throw new BadRequestException('Esta importação já foi processada.');
    }

    // Download file from storage and re-parse
    const fileBuffer = await this.storage.download('import-files', importJob.fileUrl);
    const parsed     = this.parser.parse(fileBuffer);

    // Update to PROCESSING
    await this.prisma.importJob.update({
      where:  { id: importJobId },
      data:   { status: 'PROCESSING', startedAt: new Date() },
    });

    // Run entire import in a transaction
    return this.prisma.$transaction(async (tx) => {
      // Resolve or create PricingTable
      let pricingTable = await tx.pricingTable.findFirst({ where: { name: pricingTableName } });
      if (!pricingTable) {
        pricingTable = await tx.pricingTable.create({ data: { name: pricingTableName, isActive: false } });
      }

      // Compute next version number
      const lastVersion = await tx.pricingTableVersion.findFirst({
        where:   { pricingTableId: pricingTable.id },
        orderBy: { versionNumber: 'desc' },
      });
      const nextVersionNum = (lastVersion?.versionNumber ?? 0) + 1;

      // Create new version (inactive)
      const version = await tx.pricingTableVersion.create({
        data: {
          pricingTableId: pricingTable.id,
          versionNumber:  nextVersionNum,
          label:          versionLabel ?? `v${nextVersionNum} — ${new Date().toLocaleDateString('pt-BR')}`,
          isActive:       false,
          createdById:    adminUserId,
          importJobId,
        },
      });

      let successCount = 0;
      let errorCount   = 0;

      // Process each valid row
      for (const row of parsed.validRows) {
        try {
          const vehicle = await this.resolveVehicle(tx, row.vehicleName);

          const rule = await tx.vehiclePricingRule.create({
            data: {
              pricingTableVersionId:  version.id,
              vehicleId:              vehicle.id,
              contractDurationMonths: row.contractDurationMonths,
              excessKmValue:          row.excessKmValue,
              monitoringValue:        row.monitoringValue,
              reserveCarValue:        row.reserveCarValue,
            },
          });

          await tx.annualKmOption.createMany({
            data: row.kmOptions.map(opt => ({
              vehiclePricingRuleId: rule.id,
              annualKm:             opt.annualKm,
              monthlyPrice:         opt.monthlyPrice,
            })),
          });

          await tx.importJobRow.create({
            data: {
              importJobId,
              rowNumber:              row.rowNumber,
              vehicleName:            row.vehicleName,
              contractDurationMonths: row.contractDurationMonths,
              annualKmOptions:        row.kmOptions,
              excessKmValue:          row.excessKmValue,
              monitoringValue:        row.monitoringValue,
              reserveCarValue:        row.reserveCarValue,
              status: 'SUCCESS',
            },
          });

          successCount++;
        } catch (err) {
          errorCount++;
          await tx.importJobRow.create({
            data: {
              importJobId,
              rowNumber:   row.rowNumber,
              vehicleName: row.vehicleName,
              contractDurationMonths: row.contractDurationMonths,
              annualKmOptions: row.kmOptions,
              status:       'ERROR',
              errorMessage: String(err),
            },
          });
        }
      }

      // Persist error rows
      for (const row of parsed.errorRows) {
        await tx.importJobRow.create({
          data: {
            importJobId,
            rowNumber:   row.rowNumber,
            vehicleName: row.vehicleName,
            contractDurationMonths: row.contractDurationMonths,
            annualKmOptions: row.kmOptions,
            status:       'ERROR',
            errorMessage: row.errors.join(' | '),
          },
        });
        errorCount++;
      }

      // Finalize ImportJob
      const finalStatus = successCount > 0 ? 'SUCCESS' : 'FAILED';
      await tx.importJob.update({
        where: { id: importJobId },
        data: {
          status:                 finalStatus,
          processedRows:          parsed.totalRows,
          successRows:            successCount,
          errorRows:              errorCount,
          completedAt:            new Date(),
          pricingTableVersionId:  version.id,
        },
      });

      // AuditLog
      await this.audit.log(tx, {
        adminUserId,
        action:      'IMPORT',
        entityType:  'ImportJob',
        entityId:    importJobId,
        entityLabel: importJob.fileName,
        changes: {
          data: { pricingTableName, totalRows: parsed.totalRows, successRows: successCount, errorRows: errorCount, versionId: version.id }
        },
      });

      return { importJobId, versionId: version.id, successRows: successCount, errorRows: errorCount, status: finalStatus };
    });
  }

  private async resolveVehicle(tx: any, name: string) {
    const found = await tx.vehicle.findFirst({ where: { model: { contains: name, mode: 'insensitive' } } });
    if (found) return found;

    const parts = name.trim().split(/\s+/);
    return tx.vehicle.create({
      data: {
        brand: parts[0],
        model: parts.slice(1).join(' ') || name,
        year: new Date().getFullYear(),
        category: 'SUV',
        transmission: 'AUTOMATICO',
        fuel: 'FLEX',
        seats: 5, doors: 4,
        features: [],
        isActive: false,
      },
    });
  }

  async listJobs(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [jobs, total] = await this.prisma.$transaction([
      this.prisma.importJob.findMany({
        skip, take: limit,
        orderBy: { createdAt: 'desc' },
        include: { createdBy: { select: { name: true } } },
      }),
      this.prisma.importJob.count(),
    ]);
    return { jobs, total, page, limit };
  }

  async getJobWithRows(id: string) {
    const job = await this.prisma.importJob.findUnique({
      where: { id },
      include: { rows: { orderBy: { rowNumber: 'asc' } } },
    });
    if (!job) throw new NotFoundException('Importação não encontrada.');
    return job;
  }
}
```

---

## Controller

```typescript
// import.controller.ts
import {
  Controller, Post, Get, Param, Body, UploadedFile,
  UseInterceptors, UseGuards, Query, Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AdminJwtGuard } from '../auth/guards/admin-jwt.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ImportService } from './import.service';
import { UploadImportDto } from './dto/upload-import.dto';

@Controller('import')
@UseGuards(AdminJwtGuard)
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  /**
   * POST /import/upload
   * Upload Excel + return validation preview (no data saved yet).
   */
  @Post('upload')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    fileFilter: (_, file, cb) => {
      const ok = /\.(xlsx|xls)$/i.test(file.originalname);
      cb(ok ? null : new Error('Apenas arquivos .xlsx e .xls são aceitos.'), ok);
    },
  }))
  uploadAndParse(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadImportDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.importService.uploadAndParse(file, req.user.id);
  }

  /**
   * POST /import/confirm/:jobId
   * Confirm a pending import — saves all pricing data.
   */
  @Post('confirm/:jobId')
  @Roles('ADMIN', 'SUPER_ADMIN')
  confirmImport(
    @Param('jobId') jobId: string,
    @Body() dto: UploadImportDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.importService.confirmImport(jobId, dto.pricingTableName, dto.versionLabel, req.user.id);
  }

  /**
   * GET /import/jobs?page=1&limit=20
   */
  @Get('jobs')
  listJobs(
    @Query('page')  page:  number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.importService.listJobs(page, limit);
  }

  /**
   * GET /import/jobs/:id
   */
  @Get('jobs/:id')
  getJob(@Param('id') id: string) {
    return this.importService.getJobWithRows(id);
  }
}
```

---

## Module

```typescript
// import.module.ts
import { Module } from '@nestjs/common';
import { ImportController } from './import.controller';
import { ImportService } from './import.service';
import { ExcelParserService } from './excel-parser.service';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, StorageModule, AuditModule],
  controllers: [ImportController],
  providers: [ImportService, ExcelParserService],
  exports: [ImportService],
})
export class ImportModule {}
```

---

## Fluxo Completo

```
[Admin Frontend]
     │
     │ 1. POST /import/upload (multipart: file, tableName)
     ▼
[ImportController.uploadAndParse]
     │  ├── ExcelParserService.parse(buffer)
     │  ├── StorageService.upload(file)
     │  └── PrismaService.importJob.create (status: PENDING)
     │
     │ Retorna: { importJobId, preview: { validCount, errorCount, rows } }
     │
[Frontend exibe pré-visualização]
     │
     │ 2. POST /import/confirm/:importJobId (body: tableName)
     ▼
[ImportController.confirmImport]
     │
     └── ImportService.confirmImport (TRANSAÇÃO)
          ├── Atualiza ImportJob → PROCESSING
          ├── Resolve/cria PricingTable
          ├── Cria PricingTableVersion (isActive: false)
          ├── Para cada linha válida:
          │    ├── Resolve/cria Vehicle
          │    ├── Cria VehiclePricingRule
          │    ├── Cria AnnualKmOptions (batch)
          │    └── Cria ImportJobRow (SUCCESS)
          ├── Para cada linha inválida:
          │    └── Cria ImportJobRow (ERROR)
          ├── Atualiza ImportJob → SUCCESS | FAILED
          └── Cria AuditLog

[Ativar versão separadamente]
     │
     └── POST /pricing/versions/:id/activate
          └── prisma.$transaction: deactivate all → activate target
```

---

## Validações Implementadas

| Validação | Local | Mensagem ao usuário |
|-----------|-------|-------------------|
| Colunas obrigatórias presentes | Parser | "Coluna X não encontrada" |
| Veículo não vazio | Parser | "Nome do veículo vazio" |
| Prazo numérico > 0 | Parser | "Prazo inválido. Use 12, 24, 36 ou 48." |
| Valores monetários > 0 | Parser | "Valor para X km inválido" |
| KM excedente ≥ 0 | Parser | "Valor KM excedente não pode ser negativo" |
| Linhas duplicadas (mesmo veículo + prazo) | Parser | "Linha duplicada na planilha" |
| Veículo não encontrado no banco | Service | Cria placeholder automaticamente |
| Versão duplicada (mesmo número) | DB UNIQUE constraint | Erro controlado no service |
| Permissão ADMIN/SUPER_ADMIN | Guard | HTTP 403 |
| Arquivo inválido (não Excel) | FileInterceptor | HTTP 400 |
| Arquivo > 10 MB | FileInterceptor | HTTP 413 |
