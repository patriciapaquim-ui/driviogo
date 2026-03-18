import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload, FileSpreadsheet, X, CheckCircle2, AlertCircle,
  Info, ChevronDown, ChevronUp, ArrowRight, RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { AdminHeader } from '@/components/admin/layout/AdminHeader';
import { PageHeader } from '@/components/admin/shared/PageHeader';
import { cn } from '@/lib/utils';
import { parseExcelFile, type ExcelParseResult, type RowValidationResult } from '@/lib/admin/excelParser';
import { executeImport, type ImportProgress } from '@/services/admin/importService';
import { useAdminAuth } from '@/hooks/admin/useAdminAuth';
import { toast } from 'sonner';

// ---------------------------------------------------------------------------
// Step machine
// ---------------------------------------------------------------------------
type Step = 'upload' | 'parsing' | 'preview' | 'importing' | 'done';

const STEP_LABELS: Record<Step, string> = {
  upload:    '1. Selecionar arquivo',
  parsing:   '2. Validando...',
  preview:   '2. Revisar dados',
  importing: '3. Importando...',
  done:      '3. Concluído',
};

const VISIBLE_STEPS: Step[] = ['upload', 'preview', 'done'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StepIndicator({ current }: { current: Step }) {
  const displayStep = current === 'parsing' ? 'preview' : current === 'importing' ? 'done' : current;
  return (
    <div className="flex items-center gap-2 mb-8">
      {VISIBLE_STEPS.map((step, i) => {
        const order = VISIBLE_STEPS.indexOf(displayStep);
        const isDone   = i < order;
        const isActive = step === displayStep;
        return (
          <div key={step} className="flex items-center gap-2">
            <div className={cn(
              'flex items-center gap-2 text-sm',
              isActive ? 'text-primary font-medium' :
              isDone   ? 'text-emerald-600 font-medium' : 'text-slate-400'
            )}>
              <div className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                isActive ? 'bg-primary text-white' :
                isDone   ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'
              )}>
                {isDone ? '✓' : i + 1}
              </div>
              <span className="hidden sm:block">{STEP_LABELS[step]}</span>
            </div>
            {i < VISIBLE_STEPS.length - 1 && (
              <div className={cn('w-8 h-px mx-1', isDone ? 'bg-emerald-300' : 'bg-slate-200')} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function RowPreviewTable({ rows, emptyLabel }: { rows: RowValidationResult[]; emptyLabel: string }) {
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  if (rows.length === 0) {
    return <p className="text-center text-sm text-slate-400 py-8">{emptyLabel}</p>;
  }

  return (
    <div className="overflow-auto max-h-80 rounded-lg border border-slate-200">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 sticky top-0 z-10">
          <tr>
            <th className="text-left p-3 text-xs font-medium text-slate-500 w-12">Linha</th>
            <th className="text-left p-3 text-xs font-medium text-slate-500">Veículo</th>
            <th className="text-left p-3 text-xs font-medium text-slate-500">Prazo</th>
            <th className="text-right p-3 text-xs font-medium text-slate-500">KM opções</th>
            <th className="text-right p-3 text-xs font-medium text-slate-500">KM excedente</th>
            <th className="text-right p-3 text-xs font-medium text-slate-500">Monitoramento</th>
            <th className="text-right p-3 text-xs font-medium text-slate-500">Carro reserva</th>
            <th className="w-8"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <>
              <tr
                key={row.rowNumber}
                className={cn(
                  'border-t border-slate-100 cursor-pointer hover:bg-slate-50/60',
                  !row.isValid && 'bg-red-50/40'
                )}
                onClick={() => !row.isValid && setExpandedRow(
                  expandedRow === row.rowNumber ? null : row.rowNumber
                )}
              >
                <td className="p-3 text-slate-400 text-xs">{row.rowNumber}</td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    {row.isValid
                      ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      : <AlertCircle  className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    }
                    <span className="font-medium text-slate-700">{row.vehicleName || '—'}</span>
                  </div>
                </td>
                <td className="p-3 text-slate-600">
                  {row.contractDurationMonths > 0 ? `${row.contractDurationMonths} meses` : '—'}
                </td>
                <td className="p-3 text-right text-slate-500">
                  {row.kmOptions.length > 0
                    ? <Badge variant="outline" className="text-xs">{row.kmOptions.length} opções</Badge>
                    : <span className="text-red-400">—</span>
                  }
                </td>
                <td className="p-3 text-right text-slate-600">
                  {row.excessKmValue > 0 ? formatBRL(row.excessKmValue) + '/km' : '—'}
                </td>
                <td className="p-3 text-right text-slate-600">
                  {row.monitoringValue > 0 ? formatBRL(row.monitoringValue) : '—'}
                </td>
                <td className="p-3 text-right text-slate-600">
                  {row.reserveCarValue > 0 ? formatBRL(row.reserveCarValue) : '—'}
                </td>
                <td className="p-3">
                  {!row.isValid && (
                    expandedRow === row.rowNumber
                      ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                      : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </td>
              </tr>

              {/* Error details */}
              {!row.isValid && expandedRow === row.rowNumber && (
                <tr key={`${row.rowNumber}-errors`} className="bg-red-50/60">
                  <td colSpan={8} className="px-6 py-3">
                    <ul className="space-y-1">
                      {row.errors.map((err, ei) => (
                        <li key={ei} className="text-sm text-red-700 flex items-start gap-2">
                          <span className="text-red-400 shrink-0 mt-0.5">•</span>
                          {err}
                        </li>
                      ))}
                    </ul>
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function AdminImport() {
  const navigate = useNavigate();
  const { adminEmail } = useAdminAuth();
  const inputRef = useRef<HTMLInputElement>(null);

  const [step, setStep]           = useState<Step>('upload');
  const [dragOver, setDragOver]   = useState(false);
  const [file, setFile]           = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<ExcelParseResult | null>(null);
  const [tableName, setTableName] = useState('');
  const [progress, setProgress]   = useState<ImportProgress | null>(null);
  const [importResult, setImportResult] = useState<{ successRows: number; errorRows: number; versionId: string } | null>(null);

  // ── File handling ─────────────────────────────────────────────────────────

  const handleFile = async (f: File) => {
    if (!f.name.match(/\.xlsx?$/i)) {
      toast.error('Formato inválido. Envie apenas arquivos .xlsx ou .xls');
      return;
    }
    setFile(f);
    setStep('parsing');

    // Auto-generate table name from current month
    if (!tableName) {
      setTableName(`Tabela ${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())}`);
    }

    try {
      const result = await parseExcelFile(f);
      setParseResult(result);
      setStep('preview');
    } catch (err) {
      toast.error('Falha ao ler o arquivo. Verifique se é um Excel válido.');
      reset();
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const reset = () => {
    setFile(null);
    setParseResult(null);
    setProgress(null);
    setImportResult(null);
    setStep('upload');
  };

  // ── Import execution ──────────────────────────────────────────────────────

  const handleConfirmImport = async () => {
    if (!file || !parseResult || !parseResult.validCount) return;
    if (!tableName.trim()) {
      toast.error('Informe o nome da tabela de preços antes de importar.');
      return;
    }

    setStep('importing');

    // For development/demo, simulate the import if Supabase tables don't exist
    const isDev = import.meta.env.DEV;

    if (isDev) {
      // Simulated flow for development
      const total = parseResult.validCount;
      for (let i = 0; i <= total; i++) {
        await new Promise((r) => setTimeout(r, 60));
        setProgress({
          phase: i < total ? 'processing_rows' : 'done',
          current: i,
          total,
          message: i < total ? `Processando linha ${parseResult.validRows[i]?.rowNumber ?? i}...` : 'Concluído!',
        });
      }
      setImportResult({ successRows: total, errorRows: parseResult.errorCount, versionId: 'simulated' });
      setStep('done');
      toast.success(`${total} regras importadas com sucesso!`);
      return;
    }

    try {
      // TEMP: use email as adminUserId until admin_users table exists
      const result = await executeImport(
        {
          file,
          validRows:   parseResult.validRows,
          invalidRows: parseResult.errorRows,
          pricingTableName: tableName,
          adminUserId: adminEmail || 'unknown',
        },
        (p) => setProgress(p)
      );

      setImportResult({
        successRows: result.successRows,
        errorRows:   result.errorRows,
        versionId:   result.pricingTableVersionId,
      });
      setStep('done');
      toast.success(`Importação concluída! ${result.successRows} regras salvas.`);

    } catch (err) {
      toast.error(`Falha na importação: ${String(err)}`);
      setStep('preview');
    }
  };

  const progressPercent = progress
    ? Math.round((progress.current / Math.max(progress.total, 1)) * 100)
    : 0;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <AdminLayout>
      <AdminHeader
        title="Importar Planilha de Preços"
        subtitle="Atualize as regras comerciais enviando um arquivo Excel"
      />

      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl mx-auto">
          <PageHeader
            title="Importar Tabela de Preços"
            description="Envie a planilha Excel no formato padrão para atualizar os preços do catálogo."
          />

          <StepIndicator current={step} />

          {/* ── Step 1: Upload ──────────────────────────────────────────── */}
          {step === 'upload' && (
            <div className="space-y-5">
              <Alert className="border-blue-200 bg-blue-50">
                <Info className="w-4 h-4 text-blue-600 shrink-0" />
                <AlertDescription className="text-blue-800 text-sm">
                  <strong>Formato esperado da planilha:</strong>{' '}
                  Prazo do Contrato · Veículos · 7 colunas de KM Anual (ex: 10.000, 15.000, …) · Valor KM Excedente · Valor Monitoramento · Valor Carro Reserva
                </AlertDescription>
              </Alert>

              <div
                className={cn(
                  'border-2 border-dashed rounded-xl p-14 text-center cursor-pointer transition-all',
                  dragOver
                    ? 'border-primary bg-primary/5 scale-[1.01]'
                    : 'border-slate-300 hover:border-primary/50 hover:bg-slate-50'
                )}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
                <FileSpreadsheet className={cn('w-14 h-14 mx-auto mb-4', dragOver ? 'text-primary' : 'text-slate-300')} />
                <p className="text-base font-medium text-slate-700 mb-1">
                  Arraste a planilha aqui ou clique para selecionar
                </p>
                <p className="text-sm text-slate-400 mb-5">Aceita .xlsx e .xls · Tamanho máximo 10 MB</p>
                <Button variant="outline" size="sm" className="gap-2" onClick={(e) => e.stopPropagation()}>
                  <Upload className="w-4 h-4" />
                  Escolher arquivo
                </Button>
              </div>

              <p className="text-center">
                <button className="text-xs text-primary hover:underline">
                  Baixar modelo de planilha (.xlsx)
                </button>
              </p>
            </div>
          )}

          {/* ── Parsing spinner ─────────────────────────────────────────── */}
          {step === 'parsing' && (
            <div className="text-center py-16">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="font-medium text-slate-700">Lendo e validando a planilha...</p>
              <p className="text-sm text-slate-400 mt-1">{file?.name}</p>
            </div>
          )}

          {/* ── Step 2: Preview ─────────────────────────────────────────── */}
          {step === 'preview' && parseResult && (
            <div className="space-y-5">
              {/* File info bar */}
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 truncate">{file?.name}</p>
                    <p className="text-xs text-slate-400">{formatFileSize(file?.size ?? 0)}</p>
                  </div>
                  <button onClick={reset} className="text-slate-400 hover:text-slate-600 shrink-0" title="Trocar arquivo">
                    <X className="w-4 h-4" />
                  </button>
                </CardContent>
              </Card>

              {/* Column errors — cannot proceed */}
              {parseResult.columnErrors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>
                    <p className="font-medium mb-1">Estrutura da planilha inválida</p>
                    <ul className="space-y-0.5">
                      {parseResult.columnErrors.map((e, i) => (
                        <li key={i} className="text-sm">• {e}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Summary banner */}
              {parseResult.columnErrors.length === 0 && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-50 rounded-xl p-4 text-center border border-slate-200">
                    <p className="text-2xl font-bold text-slate-800">{parseResult.totalRows}</p>
                    <p className="text-xs text-slate-500 mt-0.5">Total de linhas</p>
                  </div>
                  <div className="bg-emerald-50 rounded-xl p-4 text-center border border-emerald-200">
                    <p className="text-2xl font-bold text-emerald-700">{parseResult.validCount}</p>
                    <p className="text-xs text-emerald-600 mt-0.5">Prontas para importar</p>
                  </div>
                  <div className={cn(
                    'rounded-xl p-4 text-center border',
                    parseResult.errorCount > 0
                      ? 'bg-red-50 border-red-200'
                      : 'bg-slate-50 border-slate-200'
                  )}>
                    <p className={cn('text-2xl font-bold', parseResult.errorCount > 0 ? 'text-red-600' : 'text-slate-400')}>
                      {parseResult.errorCount}
                    </p>
                    <p className={cn('text-xs mt-0.5', parseResult.errorCount > 0 ? 'text-red-500' : 'text-slate-400')}>
                      Com problemas
                    </p>
                  </div>
                </div>
              )}

              {/* Error warning when some rows have errors */}
              {parseResult.errorCount > 0 && parseResult.columnErrors.length === 0 && (
                <Alert className="border-amber-200 bg-amber-50">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <AlertDescription className="text-amber-800 text-sm">
                    {parseResult.errorCount} linha{parseResult.errorCount !== 1 ? 's' : ''} com problema{parseResult.errorCount !== 1 ? 's' : ''} serão <strong>ignoradas</strong>. Apenas as {parseResult.validCount} linhas válidas serão importadas.
                    Você pode corrigir a planilha e importar novamente.
                  </AlertDescription>
                </Alert>
              )}

              {/* Rows preview with tabs */}
              {parseResult.columnErrors.length === 0 && parseResult.totalRows > 0 && (
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Pré-visualização dos dados</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue={parseResult.errorCount > 0 ? 'errors' : 'valid'}>
                      <TabsList className="mb-4">
                        <TabsTrigger value="all">
                          Todos <Badge variant="secondary" className="ml-1.5 text-xs">{parseResult.totalRows}</Badge>
                        </TabsTrigger>
                        <TabsTrigger value="valid">
                          Válidos <Badge className="ml-1.5 text-xs bg-emerald-100 text-emerald-700 hover:bg-emerald-100">{parseResult.validCount}</Badge>
                        </TabsTrigger>
                        {parseResult.errorCount > 0 && (
                          <TabsTrigger value="errors">
                            Com erros <Badge className="ml-1.5 text-xs bg-red-100 text-red-700 hover:bg-red-100">{parseResult.errorCount}</Badge>
                          </TabsTrigger>
                        )}
                      </TabsList>
                      <TabsContent value="all">
                        <RowPreviewTable rows={parseResult.rows} emptyLabel="Nenhuma linha." />
                      </TabsContent>
                      <TabsContent value="valid">
                        <RowPreviewTable rows={parseResult.validRows} emptyLabel="Nenhuma linha válida." />
                      </TabsContent>
                      <TabsContent value="errors">
                        <RowPreviewTable rows={parseResult.errorRows} emptyLabel="Nenhum erro." />
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              )}

              {/* Table name input */}
              {parseResult.columnErrors.length === 0 && parseResult.validCount > 0 && (
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-5 space-y-3">
                    <div className="space-y-1.5">
                      <Label>Nome da tabela de preços</Label>
                      <Input
                        value={tableName}
                        onChange={(e) => setTableName(e.target.value)}
                        placeholder="ex: Tabela Março 2026"
                      />
                      <p className="text-xs text-slate-400">
                        Uma nova versão será criada. A tabela atual continuará ativa até você confirmar a ativação.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Action buttons */}
              <div className="flex gap-3">
                <Button variant="outline" onClick={reset} className="flex-1">
                  Trocar arquivo
                </Button>
                {parseResult.columnErrors.length === 0 && parseResult.validCount > 0 && (
                  <Button
                    onClick={handleConfirmImport}
                    disabled={!tableName.trim()}
                    className="flex-1 gap-2"
                  >
                    <ArrowRight className="w-4 h-4" />
                    Importar {parseResult.validCount} regra{parseResult.validCount !== 1 ? 's' : ''}
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* ── Importing progress ───────────────────────────────────────── */}
          {step === 'importing' && (
            <div className="py-8 space-y-5">
              <div className="text-center mb-6">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="font-medium text-slate-700">Importando dados...</p>
                <p className="text-sm text-slate-400 mt-1">Não feche esta janela.</p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">{progress?.message ?? 'Iniciando...'}</span>
                  <span className="text-slate-500 font-medium">{progressPercent}%</span>
                </div>
                <Progress value={progressPercent} className="h-2.5" />
                {progress && (
                  <p className="text-xs text-slate-400 text-right">
                    {progress.current} de {progress.total} linhas
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── Step 3: Done ────────────────────────────────────────────── */}
          {step === 'done' && importResult && (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800">Importação concluída!</h3>

              <div className="inline-flex gap-4 bg-slate-50 rounded-xl p-5 border border-slate-200">
                <div className="text-center">
                  <p className="text-2xl font-bold text-emerald-700">{importResult.successRows}</p>
                  <p className="text-xs text-slate-500">Regras importadas</p>
                </div>
                {importResult.errorRows > 0 && (
                  <div className="text-center border-l border-slate-300 pl-4">
                    <p className="text-2xl font-bold text-red-500">{importResult.errorRows}</p>
                    <p className="text-xs text-slate-500">Com erros</p>
                  </div>
                )}
              </div>

              <p className="text-sm text-slate-500 max-w-sm mx-auto">
                Uma nova versão da tabela foi criada. Acesse a
                {' '}<strong>Tabela de Preços</strong> para ativá-la e torná-la visível no site.
              </p>

              <div className="flex gap-3 justify-center pt-2">
                <Button variant="outline" onClick={reset} className="gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Nova importação
                </Button>
                <Button onClick={() => navigate('/admin/precos')}>
                  Ver tabela de preços
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </AdminLayout>
  );
}
