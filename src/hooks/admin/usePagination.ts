// =============================================================================
// DrivioGo — usePagination hook
// =============================================================================

import { useState, useCallback } from 'react';

export function usePagination(initialPage = 1) {
  const [page, setPage] = useState(initialPage);

  const goToPage    = useCallback((p: number)    => setPage(p), []);
  const nextPage    = useCallback((total: number) => setPage((p) => Math.min(p + 1, total)), []);
  const prevPage    = useCallback(()              => setPage((p) => Math.max(p - 1, 1)), []);
  const resetPage   = useCallback(()              => setPage(1), []);

  return { page, goToPage, nextPage, prevPage, resetPage };
}
