// =============================================================================
// DrivioGo — Excel Parser
// Parses and validates Excel spreadsheets with vehicle pricing rules.
//
// Expected column format:
//   Prazo do Contrato | Veículos | 10.000 km | 15.000 km | ... | KM Excedente | Monitoramento | Carro Reserva
//
// The 7 KM columns are detected automatically by their numeric headers.
// =============================================================================

import * as XLSX from 'xlsx';

// ---------------------------------------------------------------------------
// Public Types
// ---------------------------------------------------------------------------

export interface KmOption {
  annualKm: number;      // e.g. 10000
  monthlyPrice: number;  // e.g. 2890.00
}

export interface ParsedRow {
  rowNumber: number;
  vehicleName: string;
  contractDurationMonths: number;
  kmOptions: KmOption[];
  excessKmValue: number;
  monitoringValue: number;
  reserveCarValue: number;
}

export interface RowValidationResult extends ParsedRow {
  isValid: boolean;
  errors: string[];
}

export interface DetectedColumns {
  contractDurationIdx: number;
  vehicleNameIdx: number;
  kmIndices: number[];
  kmValues: number[];       // The actual annual KM values (e.g. [10000, 15000, ...])
  excessKmIdx: number;
  monitoringIdx: number;
  reserveCarIdx: number;
}

export interface ExcelParseResult {
  rows: RowValidationResult[];
  validRows: RowValidationResult[];
  errorRows: RowValidationResult[];
  totalRows: number;
  validCount: number;
  errorCount: number;
  columnErrors: string[];    // Structural problems (missing required columns)
  detectedColumns: DetectedColumns | null;
}

// ---------------------------------------------------------------------------
// Column detection patterns (case-insensitive, flexible)
// ---------------------------------------------------------------------------

const COL = {
  contract:    /prazo|contrato|dura[çc][aã]o/i,
  vehicle:     /ve[íi]culo|modelo|carro|veiculo/i,
  excessKm:    /excedente|km[\s_-]*exc|valor[\s_-]*km/i,
  monitoring:  /monitoramento|monitora[çc][aã]o/i,
  reserveCar:  /reserva|carro[\s_-]*reserva/i,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Detects columns whose header represents an annual KM value
 * (numeric value between 5_000 and 200_000).
 */
function detectKmColumns(headers: string[]): { idx: number; km: number }[] {
  const results: { idx: number; km: number }[] = [];
  for (let i = 0; i < headers.length; i++) {
    const raw = String(headers[i] ?? '')
      .replace(/\./g, '')   // remove BR thousands separator
      .replace(/,/g, '')    // remove commas
      .replace(/\s/g, '')   // remove spaces
      .replace(/km$/i, '')  // remove trailing "km"
      .replace(/^km/i, ''); // remove leading "km"
    const num = parseInt(raw, 10);
    if (!isNaN(num) && num >= 5_000 && num <= 200_000) {
      results.push({ idx: i, km: num });
    }
  }
  return results.sort((a, b) => a.km - b.km);
}

/**
 * Parses a monetary value that may be in Brazilian format
 * ("R$ 1.234,56"), international format ("1234.56"), or plain number.
 * Returns null if unparseable.
 */
function parseMoney(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return isFinite(value) ? value : null;

  const str = String(value)
    .trim()
    .replace(/R\$\s*/g, '')   // strip R$
    .replace(/\s/g, '');      // strip spaces

  // Detect format: if contains comma and dot, the last separator is decimal
  // e.g. "1.234,56" → 1234.56 ; "1,234.56" → 1234.56 ; "1234,56" → 1234.56
  let normalized: string;

  if (str.includes(',') && str.includes('.')) {
    // Both present: last one is decimal separator
    const lastComma = str.lastIndexOf(',');
    const lastDot   = str.lastIndexOf('.');
    if (lastComma > lastDot) {
      // BR format: "1.234,56"
      normalized = str.replace(/\./g, '').replace(',', '.');
    } else {
      // US format: "1,234.56"
      normalized = str.replace(/,/g, '');
    }
  } else if (str.includes(',')) {
    // Only comma → treat as decimal separator ("1234,56" or "1.234,56")
    normalized = str.replace(/\./g, '').replace(',', '.');
  } else {
    // Only dot or no separator
    normalized = str;
  }

  const num = parseFloat(normalized);
  return isNaN(num) ? null : num;
}

/**
 * Validates a single contract duration value.
 * Accepts 12, 24, 36, 48 months (and similar reasonable values).
 */
function parseContractDuration(value: unknown): number | null {
  const raw = String(value ?? '').replace(/\D/g, '');
  const num = parseInt(raw, 10);
  if (isNaN(num) || num < 1 || num > 120) return null;
  return num;
}

// ---------------------------------------------------------------------------
// Main parser
// ---------------------------------------------------------------------------

export function parseExcelBuffer(buffer: ArrayBuffer): ExcelParseResult {
  const empty: ExcelParseResult = {
    rows: [],
    validRows: [],
    errorRows: [],
    totalRows: 0,
    validCount: 0,
    errorCount: 0,
    columnErrors: [],
    detectedColumns: null,
  };

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: 'array', cellDates: false });
  } catch {
    return { ...empty, columnErrors: ['Não foi possível ler o arquivo. Certifique-se que é um arquivo Excel válido (.xlsx ou .xls).'] };
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { ...empty, columnErrors: ['O arquivo Excel não contém nenhuma aba.'] };
  }

  const sheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: '',
    blankrows: false,
  });

  if (rawRows.length < 2) {
    return { ...empty, columnErrors: ['A planilha está vazia ou contém apenas o cabeçalho.'] };
  }

  // ── Locate the header row (first non-empty row) ──────────────────────────
  const headerRowIdx = rawRows.findIndex(
    (row) => Array.isArray(row) && row.some((cell) => String(cell ?? '').trim() !== '')
  );
  if (headerRowIdx === -1) return { ...empty, columnErrors: ['Cabeçalho não encontrado.'] };

  const headers = (rawRows[headerRowIdx] as unknown[]).map((h) => String(h ?? '').trim());

  // ── Detect required columns ───────────────────────────────────────────────
  const contractIdx    = headers.findIndex((h) => COL.contract.test(h));
  const vehicleIdx     = headers.findIndex((h) => COL.vehicle.test(h));
  const excessKmIdx    = headers.findIndex((h) => COL.excessKm.test(h));
  const monitoringIdx  = headers.findIndex((h) => COL.monitoring.test(h));
  const reserveCarIdx  = headers.findIndex((h) => COL.reserveCar.test(h));
  const kmDetected     = detectKmColumns(headers);

  const columnErrors: string[] = [];
  if (contractIdx   === -1) columnErrors.push('Coluna "Prazo do Contrato" não encontrada. Verifique o cabeçalho.');
  if (vehicleIdx    === -1) columnErrors.push('Coluna "Veículos" não encontrada. Verifique o cabeçalho.');
  if (excessKmIdx   === -1) columnErrors.push('Coluna "Valor do KM Excedente" não encontrada.');
  if (monitoringIdx === -1) columnErrors.push('Coluna "Valor do Monitoramento" não encontrada.');
  if (reserveCarIdx === -1) columnErrors.push('Coluna "Valor do Carro Reserva" não encontrada.');
  if (kmDetected.length < 2) columnErrors.push(
    `Pelo menos 2 colunas de KM anual são necessárias (ex: 10.000, 15.000, …). Encontradas: ${kmDetected.length}.`
  );

  if (columnErrors.length > 0) {
    return { ...empty, columnErrors };
  }

  const detectedColumns: DetectedColumns = {
    contractDurationIdx: contractIdx,
    vehicleNameIdx: vehicleIdx,
    kmIndices: kmDetected.map((k) => k.idx),
    kmValues:  kmDetected.map((k) => k.km),
    excessKmIdx,
    monitoringIdx,
    reserveCarIdx,
  };

  // ── Parse data rows ───────────────────────────────────────────────────────
  const dataRows = rawRows.slice(headerRowIdx + 1) as unknown[][];
  const rows: RowValidationResult[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    if (!row || row.every((cell) => String(cell ?? '').trim() === '')) continue;

    const rowNumber = headerRowIdx + i + 2; // Excel is 1-indexed
    const errors: string[] = [];

    // Vehicle name
    const vehicleName = String(row[vehicleIdx] ?? '').trim();
    if (!vehicleName) errors.push('Nome do veículo não pode estar vazio.');

    // Contract duration
    const contractDurationMonths = parseContractDuration(row[contractIdx]);
    if (contractDurationMonths === null) {
      errors.push(`Prazo do contrato inválido ("${row[contractIdx]}"). Use valores como 12, 24, 36 ou 48.`);
    }

    // KM options
    const kmOptions: KmOption[] = [];
    for (let k = 0; k < kmDetected.length; k++) {
      const cellValue = row[kmDetected[k].idx];
      const price = parseMoney(cellValue);
      const kmLabel = kmDetected[k].km.toLocaleString('pt-BR') + ' km';
      if (price === null) {
        errors.push(`Valor para ${kmLabel}: "${cellValue}" não é um número válido.`);
      } else if (price <= 0) {
        errors.push(`Valor para ${kmLabel} deve ser maior que zero (recebido: ${price}).`);
      } else {
        kmOptions.push({ annualKm: kmDetected[k].km, monthlyPrice: price });
      }
    }

    // Excess KM value
    const excessKmValue = parseMoney(row[excessKmIdx]);
    if (excessKmValue === null) {
      errors.push(`Valor do KM excedente inválido ("${row[excessKmIdx]}").`);
    } else if (excessKmValue < 0) {
      errors.push('Valor do KM excedente não pode ser negativo.');
    }

    // Monitoring value
    const monitoringValue = parseMoney(row[monitoringIdx]);
    if (monitoringValue === null) {
      errors.push(`Valor de monitoramento inválido ("${row[monitoringIdx]}").`);
    } else if (monitoringValue < 0) {
      errors.push('Valor de monitoramento não pode ser negativo.');
    }

    // Reserve car value
    const reserveCarValue = parseMoney(row[reserveCarIdx]);
    if (reserveCarValue === null) {
      errors.push(`Valor do carro reserva inválido ("${row[reserveCarIdx]}").`);
    } else if (reserveCarValue < 0) {
      errors.push('Valor do carro reserva não pode ser negativo.');
    }

    rows.push({
      rowNumber,
      vehicleName,
      contractDurationMonths: contractDurationMonths ?? 0,
      kmOptions,
      excessKmValue:   excessKmValue   ?? 0,
      monitoringValue: monitoringValue ?? 0,
      reserveCarValue: reserveCarValue ?? 0,
      isValid: errors.length === 0,
      errors,
    });
  }

  // ── Detect duplicate rows (same vehicle + contract duration) ─────────────
  const seen = new Set<string>();
  for (const row of rows) {
    if (!row.isValid) continue;
    const key = `${row.vehicleName.toLowerCase().trim()}|${row.contractDurationMonths}`;
    if (seen.has(key)) {
      row.isValid = false;
      row.errors.push(
        `Linha duplicada: "${row.vehicleName}" com prazo de ${row.contractDurationMonths} meses já aparece na planilha.`
      );
    } else {
      seen.add(key);
    }
  }

  const validRows  = rows.filter((r) => r.isValid);
  const errorRows  = rows.filter((r) => !r.isValid);

  return {
    rows,
    validRows,
    errorRows,
    totalRows:  rows.length,
    validCount:  validRows.length,
    errorCount:  errorRows.length,
    columnErrors: [],
    detectedColumns,
  };
}

/**
 * Reads a File object and returns the parse result.
 * Suitable for use in a browser FileReader.
 */
export function parseExcelFile(file: File): Promise<ExcelParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        resolve(parseExcelBuffer(buffer));
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Falha ao ler o arquivo.'));
    reader.readAsArrayBuffer(file);
  });
}
