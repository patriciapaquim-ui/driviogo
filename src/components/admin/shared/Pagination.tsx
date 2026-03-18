// =============================================================================
// DrivioGo — Pagination component
// =============================================================================

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PaginationProps {
  page:       number;
  totalPages: number;
  total:      number;
  limit:      number;
  onPage:     (page: number) => void;
  className?: string;
}

export function Pagination({ page, totalPages, total, limit, onPage, className = '' }: PaginationProps) {
  if (totalPages <= 1) return null;

  const from  = (page - 1) * limit + 1;
  const to    = Math.min(page * limit, total);

  /** Generate page numbers with ellipsis. */
  function pages(): (number | '…')[] {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const result: (number | '…')[] = [1];
    if (page > 3)            result.push('…');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      result.push(i);
    }
    if (page < totalPages - 2) result.push('…');
    result.push(totalPages);
    return result;
  }

  return (
    <div className={`flex items-center justify-between mt-4 ${className}`}>
      <p className="text-xs text-slate-400">
        {from}–{to} de {total} {total === 1 ? 'registro' : 'registros'}
      </p>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="w-8 h-8"
          disabled={page === 1}
          onClick={() => onPage(page - 1)}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        {pages().map((p, i) =>
          p === '…' ? (
            <span key={`ellipsis-${i}`} className="px-1 text-slate-400 text-sm">…</span>
          ) : (
            <Button
              key={p}
              variant={p === page ? 'default' : 'outline'}
              size="icon"
              className="w-8 h-8 text-xs"
              onClick={() => onPage(p)}
            >
              {p}
            </Button>
          )
        )}

        <Button
          variant="outline"
          size="icon"
          className="w-8 h-8"
          disabled={page === totalPages}
          onClick={() => onPage(page + 1)}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
