// =============================================================================
// DrivioGo — VigenciaModal
// Reusable modal that asks the admin for an effective date before applying any
// action that changes visible data on the public site.
//
// Returns:
//   null  → "Vigência imediata" selected — apply the action right now
//   Date  → future date selected — apply at that point in time
// =============================================================================

import { useState } from 'react';
import { CalendarClock, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export interface VigenciaModalProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  loading?: boolean;
  onClose: () => void;
  /** Called with null for immediate, or a future Date */
  onConfirm: (effectiveFrom: Date | null) => void | Promise<void>;
}

type Mode = 'immediate' | 'future';

export function VigenciaModal({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  loading = false,
  onClose,
  onConfirm,
}: VigenciaModalProps) {
  const [mode, setMode] = useState<Mode>('immediate');
  const [dateValue, setDateValue] = useState('');
  const [timeValue, setTimeValue] = useState('00:00');
  const [error, setError] = useState('');

  // Reset state when modal closes/opens
  const handleOpenChange = (v: boolean) => {
    if (!v) {
      setMode('immediate');
      setDateValue('');
      setTimeValue('00:00');
      setError('');
      onClose();
    }
  };

  const handleConfirm = async () => {
    setError('');

    if (mode === 'immediate') {
      await onConfirm(null);
      handleOpenChange(false);
      return;
    }

    // Validate future date
    if (!dateValue) {
      setError('Selecione uma data.');
      return;
    }

    const dt = new Date(`${dateValue}T${timeValue || '00:00'}:00`);
    if (isNaN(dt.getTime())) {
      setError('Data inválida.');
      return;
    }
    if (dt <= new Date()) {
      setError('A data deve ser no futuro.');
      return;
    }

    await onConfirm(dt);
    handleOpenChange(false);
  };

  // Min date = today formatted as YYYY-MM-DD
  const today = new Date().toISOString().split('T')[0];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && (
            <DialogDescription>{description}</DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-3 py-2">
          <p className="text-sm font-medium text-slate-700">Quando esta alteração deve entrar em vigor?</p>

          {/* Option: Immediate */}
          <button
            type="button"
            onClick={() => setMode('immediate')}
            className={cn(
              'w-full flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-all',
              mode === 'immediate'
                ? 'border-primary bg-primary/5'
                : 'border-slate-200 hover:border-slate-300',
            )}
          >
            <div className={cn(
              'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
              mode === 'immediate' ? 'bg-primary/10' : 'bg-slate-100',
            )}>
              <Zap className={cn('h-4 w-4', mode === 'immediate' ? 'text-primary' : 'text-slate-400')} />
            </div>
            <div>
              <p className={cn('font-semibold text-sm', mode === 'immediate' ? 'text-primary' : 'text-slate-700')}>
                Vigência imediata
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                A alteração reflete no site assim que confirmada.
              </p>
            </div>
          </button>

          {/* Option: Future date */}
          <button
            type="button"
            onClick={() => setMode('future')}
            className={cn(
              'w-full flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-all',
              mode === 'future'
                ? 'border-primary bg-primary/5'
                : 'border-slate-200 hover:border-slate-300',
            )}
          >
            <div className={cn(
              'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
              mode === 'future' ? 'bg-primary/10' : 'bg-slate-100',
            )}>
              <CalendarClock className={cn('h-4 w-4', mode === 'future' ? 'text-primary' : 'text-slate-400')} />
            </div>
            <div className="flex-1">
              <p className={cn('font-semibold text-sm', mode === 'future' ? 'text-primary' : 'text-slate-700')}>
                Data futura
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Agendar para uma data/hora específica.
              </p>
            </div>
          </button>

          {/* Date/time picker (shown only in future mode) */}
          {mode === 'future' && (
            <div className="ml-11 grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <Label className="text-xs">Data</Label>
                <input
                  type="date"
                  min={today}
                  value={dateValue}
                  onChange={(e) => { setDateValue(e.target.value); setError(''); }}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Hora</Label>
                <input
                  type="time"
                  value={timeValue}
                  onChange={(e) => setTimeValue(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              {error && (
                <p className="col-span-2 text-xs text-red-600">{error}</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={loading} className="min-w-28">
            {loading ? 'Aguarde...' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
