import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileSpreadsheet, X, CheckCircle2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { AdminHeader } from '@/components/admin/layout/AdminHeader';
import { PageHeader } from '@/components/admin/shared/PageHeader';
import { cn } from '@/lib/utils';

type Step = 'upload' | 'preview' | 'done';

export default function AdminImport() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('upload');
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFile = (f: File) => {
    if (!f.name.match(/\.xlsx?$/i)) {
      alert('Por favor, envie apenas arquivos Excel (.xlsx ou .xls).');
      return;
    }
    setFile(f);
    setStep('preview');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleConfirmImport = async () => {
    setIsProcessing(true);
    // Simulate processing progress
    for (let i = 0; i <= 100; i += 10) {
      await new Promise((r) => setTimeout(r, 120));
      setProgress(i);
    }
    setIsProcessing(false);
    setStep('done');
  };

  const reset = () => {
    setFile(null);
    setStep('upload');
    setProgress(0);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <AdminLayout>
      <AdminHeader
        title="Importar Planilha de Preços"
        subtitle="Atualize a tabela de preços enviando um arquivo Excel"
      />

      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto">
          <PageHeader
            title="Importar Tabela de Preços"
            description="Envie a planilha Excel no formato padrão para atualizar os preços do catálogo."
          />

          {/* Steps indicator */}
          <div className="flex items-center gap-2 mb-8">
            {(['upload', 'preview', 'done'] as Step[]).map((s, i) => {
              const labels = ['1. Selecionar arquivo', '2. Revisar dados', '3. Concluído'];
              const isActive = step === s;
              const isDone =
                (s === 'upload' && step !== 'upload') ||
                (s === 'preview' && step === 'done');
              return (
                <div key={s} className="flex items-center gap-2">
                  <div className={cn(
                    'flex items-center gap-2 text-sm',
                    isActive ? 'text-primary font-medium' : isDone ? 'text-emerald-600' : 'text-slate-400'
                  )}>
                    <div className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                      isActive ? 'bg-primary text-primary-foreground' :
                      isDone ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'
                    )}>
                      {isDone ? '✓' : i + 1}
                    </div>
                    <span className="hidden sm:block">{labels[i]}</span>
                  </div>
                  {i < 2 && <div className="w-8 h-px bg-slate-200 mx-1" />}
                </div>
              );
            })}
          </div>

          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div className="space-y-4">
              <Alert className="border-blue-200 bg-blue-50">
                <Info className="w-4 h-4 text-blue-500" />
                <AlertDescription className="text-blue-700 text-sm">
                  A planilha deve seguir o modelo padrão da DrivioGo com as colunas:
                  Prazo do Contrato, Veículo, 7 faixas de KM Anual, KM Excedente, Monitoramento e Carro Reserva.
                </AlertDescription>
              </Alert>

              <div
                className={cn(
                  'border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors',
                  dragOver
                    ? 'border-primary bg-primary/5'
                    : 'border-slate-300 hover:border-primary/50 hover:bg-slate-50/50'
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
                <FileSpreadsheet className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-base font-medium text-slate-700 mb-1">
                  Arraste a planilha aqui ou clique para selecionar
                </p>
                <p className="text-sm text-slate-400">Aceita arquivos .xlsx e .xls</p>
                <Button variant="outline" className="mt-5 gap-2" onClick={(e) => e.stopPropagation()}>
                  <Upload className="w-4 h-4" />
                  Escolher arquivo
                </Button>
              </div>

              <div className="text-center">
                <button className="text-xs text-primary hover:underline">
                  Baixar modelo de planilha
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Preview */}
          {step === 'preview' && file && (
            <div className="space-y-5">
              {/* File info */}
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 truncate">{file.name}</p>
                    <p className="text-sm text-slate-400">{formatSize(file.size)}</p>
                  </div>
                  <button
                    onClick={reset}
                    className="text-slate-400 hover:text-slate-600"
                    title="Remover arquivo"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </CardContent>
              </Card>

              <Alert className="border-amber-200 bg-amber-50">
                <Info className="w-4 h-4 text-amber-600" />
                <AlertDescription className="text-amber-700 text-sm">
                  <strong>Atenção:</strong> Esta ação vai criar uma nova versão da tabela de preços.
                  A tabela atual continuará ativa até você confirmar a ativação da nova versão.
                </AlertDescription>
              </Alert>

              {/* Mock preview table */}
              <Card className="border-0 shadow-sm">
                <CardContent className="p-0 overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b">
                      <tr>
                        <th className="text-left p-3 text-xs font-medium text-slate-500">Veículo</th>
                        <th className="text-left p-3 text-xs font-medium text-slate-500">Prazo</th>
                        <th className="text-right p-3 text-xs font-medium text-slate-500">10k km</th>
                        <th className="text-right p-3 text-xs font-medium text-slate-500">20k km</th>
                        <th className="text-right p-3 text-xs font-medium text-slate-500">30k km</th>
                        <th className="text-right p-3 text-xs font-medium text-slate-500">KM exc.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { v: 'Toyota Corolla Cross', p: '24 meses', k10: 'R$ 2.890', k20: 'R$ 3.210', k30: 'R$ 3.590', exc: 'R$ 1,45' },
                        { v: 'Honda HR-V', p: '24 meses', k10: 'R$ 3.190', k20: 'R$ 3.560', k30: 'R$ 3.980', exc: 'R$ 1,55' },
                        { v: 'Volkswagen T-Cross', p: '24 meses', k10: 'R$ 2.750', k20: 'R$ 3.050', k30: 'R$ 3.380', exc: 'R$ 1,40' },
                      ].map((row, i) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="p-3 font-medium text-slate-700">{row.v}</td>
                          <td className="p-3 text-slate-500">{row.p}</td>
                          <td className="p-3 text-right text-slate-600">{row.k10}</td>
                          <td className="p-3 text-right text-slate-600">{row.k20}</td>
                          <td className="p-3 text-right text-slate-600">{row.k30}</td>
                          <td className="p-3 text-right text-slate-600">{row.exc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="text-xs text-slate-400 p-3 border-t">
                    Mostrando prévia de 3 linhas · arquivo contém 42 linhas no total
                  </p>
                </CardContent>
              </Card>

              {isProcessing && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Processando planilha...</span>
                    <span className="text-slate-500">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="outline" onClick={reset} disabled={isProcessing} className="flex-1">
                  Cancelar
                </Button>
                <Button
                  onClick={handleConfirmImport}
                  disabled={isProcessing}
                  className="flex-1 gap-2"
                >
                  <Upload className="w-4 h-4" />
                  {isProcessing ? 'Processando...' : 'Confirmar importação'}
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Done */}
          {step === 'done' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800 mb-2">Importação concluída!</h3>
              <p className="text-slate-500 text-sm max-w-sm mx-auto mb-2">
                A planilha foi processada com sucesso. <strong>42 linhas</strong> importadas, <strong>0 erros</strong>.
              </p>
              <p className="text-slate-400 text-xs mb-8">
                A nova versão foi criada mas ainda não está ativa.
                Acesse a tabela de preços para ativá-la.
              </p>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={reset}>
                  Importar outro arquivo
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
