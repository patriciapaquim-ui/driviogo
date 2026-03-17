import { useState } from 'react';
import { MOCK_IMPORT_JOBS } from '@/lib/admin/mockData';
import type { ImportJob } from '@/types/admin';

export function useImportJobs() {
  const [jobs] = useState<ImportJob[]>(MOCK_IMPORT_JOBS);
  const [loading] = useState(false);

  return { jobs, loading };
}
