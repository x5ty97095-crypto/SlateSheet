export type ColumnType = 'text' | 'number' | 'date';
export type WidthTier = 'compact' | 'standard' | 'wide';
export type FileFormat = 'sample' | 'xlsx' | 'csv' | 'txt';
export type DelimiterOption = 'auto' | ',' | '\t' | ';' | '|';
export type SortDirection = 'asc' | 'desc' | null;
export type FontScale = 'sm' | 'md' | 'lg' | 'xl';
export type ThemeMode = 'light' | 'dark';
export type ActiveView = 'spec' | 'table' | 'dashboard';

export interface ColumnMeta {
  key: string;
  label: string;
  inferredType: ColumnType;
  uniqueCount: number;
  widthTier: WidthTier;
  nonEmptyCount: number;
}

export type DataRow = Record<string, string>;

export interface Dataset {
  sourceName: string;
  fileFormat: FileFormat;
  sheetNames: string[];
  activeSheet: string;
  detectedDelimiter?: string;
  columns: ColumnMeta[];
  rows: DataRow[];
  importedAt: string;
}

export interface ColumnFilter {
  selectedValues?: string[];
  textQuery?: string;
  min?: string;
  max?: string;
}

export interface SortConfig {
  columnKey: string | null;
  direction: SortDirection;
}

export interface FontScaleConfig {
  id: FontScale;
  label: string;
  docPx: string;
  tablePx: string;
}

export const FONT_SCALE_OPTIONS: FontScaleConfig[] = [
  { id: 'sm', label: '小', docPx: '13px', tablePx: '12.5px' },
  { id: 'md', label: '標準', docPx: '15px', tablePx: '14px' },
  { id: 'lg', label: '大', docPx: '17px', tablePx: '16px' },
  { id: 'xl', label: '特大', docPx: '19px', tablePx: '18px' },
];

export const MORANDI_CHART_PALETTE_LIGHT = [
  '#5B7A94',
  '#7D97A6',
  '#84A194',
  '#9C93A6',
  '#B49D8E',
  '#7A8C99',
  '#6E8A9E',
  '#93A69E',
  '#A6949B',
  '#A9A28C',
];

export const MORANDI_CHART_PALETTE_DARK = [
  '#7EA1BD',
  '#96B2C2',
  '#9BB8AA',
  '#B2A9BD',
  '#C9B2A3',
  '#95A7B5',
  '#86A3B8',
  '#ABBEB6',
  '#BDAAB2',
  '#BFB8A1',
];
