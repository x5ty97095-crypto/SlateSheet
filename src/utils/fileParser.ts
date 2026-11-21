import * as XLSX from 'xlsx';
import type {
  ColumnMeta,
  ColumnType,
  DataRow,
  Dataset,
  DelimiterOption,
  FileFormat,
  WidthTier,
} from '../types/data';

const DATE_PATTERN =
  /^(?:\d{4}[-/年]\d{1,2}[-/月]\d{1,2}日?(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?|\d{1,2}\/\d{1,2}\/\d{4})$/;

export function parseNumericValue(raw: string): number | null {
  const cleaned = raw.trim().replace(/[,$NT¥€£%\s]/gi, '');
  if (!cleaned) return null;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

export function parseDateTimestamp(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed || !DATE_PATTERN.test(trimmed)) return null;
  const normalized = trimmed
    .replace(/年|月/g, '-')
    .replace(/日/g, '')
    .replace(/\//g, '-');
  const ts = Date.parse(normalized);
  return Number.isNaN(ts) ? null : ts;
}

export function inferColumnMeta(headers: string[], rows: DataRow[]): ColumnMeta[] {
  return headers.map((header) => {
    const nonEmpty: string[] = [];
    const unique = new Set<string>();
    let numHits = 0;
    let dateHits = 0;
    let totalLen = 0;
    let maxLen = header.length;
    let hasLineBreak = false;

    for (const row of rows) {
      const val = (row[header] ?? '').trim();
      if (val.length > 0) {
        nonEmpty.push(val);
        unique.add(val);
        totalLen += val.length;
        if (val.length > maxLen) maxLen = val.length;
        if (val.includes('\n')) hasLineBreak = true;

        if (parseNumericValue(val) !== null) {
          numHits += 1;
        } else if (parseDateTimestamp(val) !== null) {
          dateHits += 1;
        }
      }
    }

    const total = nonEmpty.length;
    let inferredType: ColumnType = 'text';
    if (total > 0) {
      if (numHits / total >= 0.85) {
        inferredType = 'number';
      } else if (dateHits / total >= 0.85) {
        inferredType = 'date';
      }
    }

    const avgLen = total > 0 ? totalLen / total : header.length;
    let widthTier: WidthTier = 'standard';
    if (hasLineBreak || avgLen >= 22 || maxLen >= 42) {
      widthTier = 'wide';
    } else if (inferredType === 'number' || (avgLen <= 8 && maxLen <= 14)) {
      widthTier = 'compact';
    }

    return {
      key: header,
      label: header,
      inferredType,
      uniqueCount: unique.size,
      widthTier,
      nonEmptyCount: total,
    };
  });
}

export function detectDelimiter(text: string): string {
  const sampleLines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .slice(0, 12);

  if (sampleLines.length === 0) return ',';

  const candidates = ['\t', ',', ';', '|'];
  let bestDelim = ',';
  let bestScore = -1;

  for (const delim of candidates) {
    const counts = sampleLines.map((line) => {
      let count = 0;
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          inQuotes = !inQuotes;
        } else if (ch === delim && !inQuotes) {
          count += 1;
        }
      }
      return count;
    });

    const nonZero = counts.filter((c) => c > 0);
    if (nonZero.length === 0) continue;

    const firstCount = counts[0];
    const consistency = counts.filter((c) => c === firstCount).length / counts.length;
    const avgCount = counts.reduce((acc, c) => acc + c, 0) / counts.length;
    const score = consistency * 10 + Math.min(avgCount, 20);

    if (score > bestScore) {
      bestScore = score;
      bestDelim = delim;
    }
  }

  return bestDelim;
}

/**
 * RFC-4180 compliant state-machine parser that preserves embedded newlines
 * inside quoted cells so full-content text wrapping renders accurately.
 */
export function parseDelimitedText(text: string, delimiter: string): string[][] {
  const cleanText = text.replace(/^\uFEFF/, '');
  const matrix: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const ch = cleanText[i];
    const next = cleanText[i + 1];

    if (inQuotes) {
      if (ch === '"') {
        if (next === '"') {
          currentField += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        currentField += ch;
      }
    } else if (ch === '"' && currentField.length === 0) {
      inQuotes = true;
    } else if (ch === delimiter) {
      currentRow.push(currentField);
      currentField = '';
    } else if (ch === '\r') {
      if (next === '\n') {
        i += 1;
      }
      currentRow.push(currentField);
      matrix.push(currentRow);
      currentRow = [];
      currentField = '';
    } else if (ch === '\n') {
      currentRow.push(currentField);
      matrix.push(currentRow);
      currentRow = [];
      currentField = '';
    } else {
      currentField += ch;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    matrix.push(currentRow);
  }

  return matrix.filter((row) => row.some((cell) => cell.trim().length > 0));
}

function matrixToDataset(
  matrix: string[][],
  sourceName: string,
  fileFormat: FileFormat,
  sheetNames: string[],
  activeSheet: string,
  detectedDelimiter?: string
): Dataset {
  if (matrix.length === 0) {
    throw new Error('檔案中找不到有效的資料列，請確認內容非空白。');
  }

  const rawHeaders = matrix[0];
  const seen = new Map<string, number>();
  const headers = rawHeaders.map((cell, idx) => {
    const base = String(cell ?? '').trim() || `欄位 ${idx + 1}`;
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base} (${count + 1})`;
  });

  const dataLines = matrix.slice(1);
  const rows: DataRow[] = dataLines.map((cells) => {
    const rowObj: DataRow = {};
    headers.forEach((header, idx) => {
      rowObj[header] = cells[idx] !== undefined && cells[idx] !== null ? String(cells[idx]) : '';
    });
    return rowObj;
  });

  const columns = inferColumnMeta(headers, rows);

  return {
    sourceName,
    fileFormat,
    sheetNames,
    activeSheet,
    detectedDelimiter,
    columns,
    rows,
    importedAt: new Date().toLocaleTimeString('zh-TW', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }),
  };
}

export interface ParsedImportResult {
  dataset: Dataset;
  workbook?: XLSX.WorkBook;
  rawText?: string;
}

export function extractSheetFromWorkbook(
  workbook: XLSX.WorkBook,
  sheetName: string,
  sourceName: string
): Dataset {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error(`找不到工作表「${sheetName}」。`);
  }

  // Strictly read formatted/raw values without invoking or exposing formula expressions
  const rawMatrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: false,
    defval: '',
    blankrows: false,
  });

  const normalizedMatrix: string[][] = rawMatrix.map((row) =>
    Array.isArray(row) ? row.map((cell) => (cell === null || cell === undefined ? '' : String(cell))) : []
  );

  return matrixToDataset(
    normalizedMatrix,
    sourceName,
    'xlsx',
    workbook.SheetNames,
    sheetName
  );
}

export function parsePlainTextContent(
  rawText: string,
  sourceName: string,
  fileFormat: 'csv' | 'txt',
  delimiterOption: DelimiterOption = 'auto'
): Dataset {
  const chosenDelimiter =
    delimiterOption === 'auto' ? detectDelimiter(rawText) : delimiterOption;

  const matrix = parseDelimitedText(rawText, chosenDelimiter);

  // If plain text has no delimiter structure at all (single column lines), handle gracefully
  if (matrix.length === 1 && matrix[0].length === 1) {
    throw new Error('僅偵測到單一標題列，請確認檔案至少包含標題列與一筆資料列。');
  }

  return matrixToDataset(
    matrix,
    sourceName,
    fileFormat,
    ['主資料表'],
    '主資料表',
    chosenDelimiter
  );
}

export async function parseImportedFile(
  file: File,
  delimiterOption: DelimiterOption = 'auto'
): Promise<ParsedImportResult> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';

  if (ext === 'xlsx' || ext === 'xls') {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, {
      type: 'array',
      cellFormula: false, // Explicitly discard formula expressions
      cellDates: false,
    });

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new Error('此 Excel 檔案未包含任何可讀取的工作表。');
    }

    const firstSheet = workbook.SheetNames[0];
    const dataset = extractSheetFromWorkbook(workbook, firstSheet, file.name);
    return { dataset, workbook };
  }

  if (ext === 'csv' || ext === 'txt' || ext === 'tsv') {
    const rawText = await file.text();
    const format: 'csv' | 'txt' = ext === 'csv' ? 'csv' : 'txt';
    const effectiveOption: DelimiterOption =
      ext === 'tsv' && delimiterOption === 'auto' ? '\t' : delimiterOption;
    const dataset = parsePlainTextContent(rawText, file.name, format, effectiveOption);
    return { dataset, rawText };
  }

  throw new Error('不支援的檔案格式，請上傳 .xlsx、.csv、.tsv 或 .txt 檔案。');
}

export function exportRowsToCsv(columns: ColumnMeta[], rows: DataRow[], filename: string): void {
  const escapeCell = (val: string) => {
    if (/[",\r\n]/.test(val)) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const headerLine = columns.map((c) => escapeCell(c.label)).join(',');
  const bodyLines = rows.map((row) =>
    columns.map((c) => escapeCell(row[c.key] ?? '')).join(',')
  );
  const csvContent = '\uFEFF' + [headerLine, ...bodyLines].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
