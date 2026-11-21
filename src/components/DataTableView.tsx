import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  RotateCcw,
  Search,
  Upload,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  ColumnFilter,
  ColumnMeta,
  DataRow,
  Dataset,
  DelimiterOption,
  SortConfig,
} from '../types/data';
import { exportRowsToCsv } from '../utils/fileParser';

interface DataTableViewProps {
  dataset: Dataset;
  filteredRows: DataRow[];
  globalSearch: string;
  onChangeGlobalSearch: (value: string) => void;
  columnFilters: Record<string, ColumnFilter>;
  onUpdateColumnFilter: (columnKey: string, filter: ColumnFilter | null) => void;
  onClearAllFilters: () => void;
  sortConfig: SortConfig;
  onToggleSort: (columnKey: string) => void;
  delimiterOption: DelimiterOption;
  onChangeDelimiter: (option: DelimiterOption) => void;
  onChangeSheet: (sheetName: string) => void;
  onImportFile: (file: File) => void;
  onTriggerFilePicker: () => void;
  onResetSample: () => void;
  importError: string | null;
  onDismissError: () => void;
  onGoDashboard: () => void;
}

const DELIMITER_CHOICES: { value: DelimiterOption; label: string }[] = [
  { value: 'auto', label: '自動偵測' },
  { value: ',', label: '逗號 (,)' },
  { value: '\t', label: 'Tab (\\t)' },
  { value: ';', label: '分號 (;)' },
  { value: '|', label: '管線 (|)' },
];

function isFilterActive(filter?: ColumnFilter): boolean {
  if (!filter) return false;
  return Boolean(
    (filter.selectedValues && filter.selectedValues.length > 0) ||
      (filter.textQuery && filter.textQuery.trim().length > 0) ||
      (filter.min && filter.min.trim().length > 0) ||
      (filter.max && filter.max.trim().length > 0)
  );
}

function getWidthClasses(col: ColumnMeta): string {
  switch (col.widthTier) {
    case 'compact':
      return 'min-w-[116px] max-w-[172px]';
    case 'wide':
      return 'min-w-[280px] max-w-[440px]';
    default:
      return 'min-w-[152px] max-w-[248px]';
  }
}

function getColumnTypeLabel(type: ColumnMeta['inferredType']): string {
  if (type === 'number') return '數值';
  if (type === 'date') return '日期';
  return '文字';
}

interface ColumnFilterPopoverProps {
  column: ColumnMeta;
  allRows: DataRow[];
  currentFilter?: ColumnFilter;
  onApply: (filter: ColumnFilter | null) => void;
  onClose: () => void;
}

function ColumnFilterPopover({
  column,
  allRows,
  currentFilter,
  onApply,
  onClose,
}: ColumnFilterPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [valueSearch, setValueSearch] = useState('');
  const [selectedSet, setSelectedSet] = useState<Set<string>>(
    () => new Set(currentFilter?.selectedValues ?? [])
  );
  const [minVal, setMinVal] = useState(currentFilter?.min ?? '');
  const [maxVal, setMaxVal] = useState(currentFilter?.max ?? '');

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  const valueOptions = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of allRows) {
      const raw = (row[column.key] ?? '').trim();
      const label = raw === '' ? '(空白)' : raw;
      map.set(label, (map.get(label) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [allRows, column.key]);

  const filteredOptions = useMemo(() => {
    const q = valueSearch.trim().toLowerCase();
    if (!q) return valueOptions.slice(0, 120);
    return valueOptions.filter(([val]) => val.toLowerCase().includes(q)).slice(0, 120);
  }, [valueOptions, valueSearch]);

  const toggleValue = (val: string) => {
    setSelectedSet((prev) => {
      const next = new Set(prev);
      if (next.has(val)) {
        next.delete(val);
      } else {
        next.add(val);
      }
      return next;
    });
  };

  const handleConfirm = () => {
    const selectedValues = Array.from(selectedSet);
    const trimmedMin = minVal.trim();
    const trimmedMax = maxVal.trim();

    if (selectedValues.length === 0 && !trimmedMin && !trimmedMax) {
      onApply(null);
    } else {
      onApply({
        selectedValues: selectedValues.length > 0 ? selectedValues : undefined,
        min: trimmedMin || undefined,
        max: trimmedMax || undefined,
      });
    }
    onClose();
  };

  const handleClearColumn = () => {
    onApply(null);
    onClose();
  };

  return (
    <div
      ref={popoverRef}
      role="dialog"
      aria-label={`篩選欄位：${column.label}`}
      className="absolute left-0 top-full mt-1.5 z-40 w-[272px] bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-xl shadow-lg p-3.5 text-left font-normal"
    >
      <div className="flex items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-[var(--border-hairline)]">
        <div className="min-w-0">
          <div className="text-xs font-semibold text-[var(--text-primary)] truncate">
            篩選「{column.label}」
          </div>
          <div className="text-[11px] text-[var(--text-muted)]">
            {getColumnTypeLabel(column.inferredType)} · {valueOptions.length} 個獨立值
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="關閉篩選視窗"
          className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {column.inferredType === 'number' && (
        <div className="mb-3 pb-3 border-b border-[var(--border-hairline)]">
          <div className="text-[11px] font-medium text-[var(--text-secondary)] mb-1.5">
            數值區間過濾
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              inputMode="decimal"
              value={minVal}
              onChange={(e) => setMinVal(e.target.value)}
              placeholder="最小值"
              aria-label="最小值"
              className="w-full px-2.5 py-1.5 text-xs font-mono tabular-nums rounded-md border border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
            />
            <input
              type="number"
              inputMode="decimal"
              value={maxVal}
              onChange={(e) => setMaxVal(e.target.value)}
              placeholder="最大值"
              aria-label="最大值"
              className="w-full px-2.5 py-1.5 text-xs font-mono tabular-nums rounded-md border border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
            />
          </div>
        </div>
      )}

      <div className="relative mb-2">
        <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={valueSearch}
          onChange={(e) => setValueSearch(e.target.value)}
          placeholder="搜尋此欄項目..."
          aria-label="搜尋欄位項目"
          className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-md border border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
        />
      </div>

      <div className="max-h-48 overflow-y-auto space-y-0.5 pr-1">
        {filteredOptions.length === 0 ? (
          <div className="py-4 text-center text-xs text-[var(--text-muted)]">無符合項目</div>
        ) : (
          filteredOptions.map(([val, count]) => {
            const checked = selectedSet.has(val);
            return (
              <label
                key={val}
                className="flex items-start justify-between gap-2 px-2 py-1.5 rounded-md hover:bg-[var(--bg-subtle)] cursor-pointer text-xs"
              >
                <span className="flex items-start gap-2 min-w-0">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleValue(val)}
                    className="mt-0.5 accent-[var(--accent-primary)] shrink-0 cursor-pointer"
                  />
                  <span className="text-[var(--text-primary)] break-words leading-snug line-clamp-2">
                    {val}
                  </span>
                </span>
                <span className="font-mono tabular-nums text-[11px] text-[var(--text-muted)] shrink-0">
                  {count}
                </span>
              </label>
            );
          })
        )}
      </div>

      <div className="mt-3 pt-2.5 border-t border-[var(--border-hairline)] flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={handleClearColumn}
          className="px-2.5 py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
        >
          清除此欄
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          className="btn-glass-primary px-3.5 py-1.5 rounded-md text-xs font-medium cursor-pointer"
        >
          套用篩選
        </button>
      </div>
    </div>
  );
}

export function DataTableView({
  dataset,
  filteredRows,
  globalSearch,
  onChangeGlobalSearch,
  columnFilters,
  onUpdateColumnFilter,
  onClearAllFilters,
  sortConfig,
  onToggleSort,
  delimiterOption,
  onChangeDelimiter,
  onChangeSheet,
  onImportFile,
  onTriggerFilePicker,
  onResetSample,
  importError,
  onDismissError,
  onGoDashboard,
}: DataTableViewProps) {
  const [openFilterCol, setOpenFilterCol] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isDragging, setIsDragging] = useState(false);

  const activeFilterKeys = useMemo(
    () => Object.keys(columnFilters).filter((k) => isFilterActive(columnFilters[k])),
    [columnFilters]
  );
  const hasAnyFilter = globalSearch.trim().length > 0 || activeFilterKeys.length > 0;

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  useEffect(() => {
    setCurrentPage(1);
  }, [filteredRows.length, pageSize, dataset.sourceName, dataset.activeSheet]);

  const pageRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, safePage, pageSize]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      onImportFile(file);
    }
  };

  const handleExportCsv = () => {
    const baseName = dataset.sourceName.replace(/\.[^.]+$/, '');
    exportRowsToCsv(dataset.columns, filteredRows, `${baseName}-篩選結果.csv`);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 space-y-4 relative"
    >
      {/* Drag-and-Drop Overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-50 bg-[var(--bg-canvas)]/85 backdrop-blur-sm flex items-center justify-center p-6 pointer-events-none">
          <div className="bg-[var(--bg-surface)] border-2 border-dashed border-[var(--accent-primary)] rounded-2xl px-10 py-12 text-center max-w-md">
            <Upload className="w-10 h-10 text-[var(--accent-primary)] mx-auto mb-3" />
            <div className="text-lg font-semibold text-[var(--text-primary)]">
              放開滑鼠以匯入本機檔案
            </div>
            <p className="text-sm text-[var(--text-secondary)] mt-1.5">
              支援 .xlsx、.xls、.csv、.tsv 與純文字 .txt，完全於本機瀏覽器解析，不執行公式運算。
            </p>
          </div>
        </div>
      )}

      {/* Import Error Alert (Flat Hairline Border — Zero Thick Left Bar) */}
      {importError && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl border border-[var(--status-danger)] bg-[var(--bg-surface)] text-sm"
        >
          <div className="flex items-center gap-2.5 text-[var(--status-danger)]">
            <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{importError}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onResetSample}
              className="btn-glass px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer"
            >
              載入範例資料
            </button>
            <button
              type="button"
              onClick={onDismissError}
              aria-label="關閉錯誤提示"
              className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Workspace Control Strip */}
      <section className="bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-xl p-4 space-y-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Global Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search
              className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="text"
              value={globalSearch}
              onChange={(e) => onChangeGlobalSearch(e.target.value)}
              placeholder="全文關鍵字篩選所有欄位..."
              aria-label="全域關鍵字搜尋"
              className="w-full pl-9 pr-8 h-10 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
            />
            {globalSearch && (
              <button
                type="button"
                onClick={() => onChangeGlobalSearch('')}
                aria-label="清除搜尋字詞"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Action Buttons (Lightweight Frosted Glass) */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Multi-sheet selector for XLSX */}
            {dataset.fileFormat === 'xlsx' && dataset.sheetNames.length > 1 && (
              <label className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                <span className="whitespace-nowrap">工作表</span>
                <select
                  value={dataset.activeSheet}
                  onChange={(e) => onChangeSheet(e.target.value)}
                  className="h-10 px-2.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                >
                  {dataset.sheetNames.map((sheet) => (
                    <option key={sheet} value={sheet}>
                      {sheet}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {/* Delimiter selector for CSV / TXT */}
            {(dataset.fileFormat === 'csv' || dataset.fileFormat === 'txt') && (
              <label className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                <span className="whitespace-nowrap">分隔符</span>
                <select
                  value={delimiterOption}
                  onChange={(e) => onChangeDelimiter(e.target.value as DelimiterOption)}
                  className="h-10 px-2.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                >
                  {DELIMITER_CHOICES.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <button
              type="button"
              onClick={onTriggerFilePicker}
              className="btn-glass inline-flex items-center gap-1.5 px-3.5 h-10 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Upload className="w-4 h-4 text-[var(--accent-primary)] shrink-0" aria-hidden="true" />
              <span>匯入 XLSX / CSV / TXT</span>
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              disabled={filteredRows.length === 0}
              className="btn-glass inline-flex items-center gap-1.5 px-3.5 h-10 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4 text-[var(--accent-primary)] shrink-0" aria-hidden="true" />
              <span>匯出篩選 CSV</span>
            </button>

            <button
              type="button"
              onClick={onGoDashboard}
              className="btn-glass inline-flex items-center gap-1.5 px-3.5 h-10 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap shrink-0 cursor-pointer"
            >
              <BarChart3 className="w-4 h-4 text-[var(--accent-primary)] shrink-0" aria-hidden="true" />
              <span>圖表分析</span>
            </button>

            {dataset.fileFormat !== 'sample' && (
              <button
                type="button"
                onClick={onResetSample}
                className="btn-glass inline-flex items-center gap-1.5 px-3 h-10 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>還原範例</span>
              </button>
            )}
          </div>
        </div>

        {/* Unboxed Status & Active Filter Summary Line */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[var(--border-hairline)] text-xs text-[var(--text-secondary)]">
          <div className="flex flex-wrap items-center gap-2">
            <span>自動換行完整顯示已啟用</span>
            <span aria-hidden="true">·</span>
            <span>純值檢視（無公式運算）</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              共 {dataset.columns.length} 欄 / 顯示 {filteredRows.length.toLocaleString()} 筆
            </span>
            {sortConfig.columnKey && sortConfig.direction && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-[var(--accent-text)] font-medium">
                  排序：{sortConfig.columnKey}（{sortConfig.direction === 'asc' ? '升冪' : '降冪'}）
                </span>
              </>
            )}
          </div>

          {hasAnyFilter && (
            <div className="flex flex-wrap items-center gap-2.5">
              {activeFilterKeys.map((colKey) => {
                const f = columnFilters[colKey];
                const summaryParts: string[] = [];
                if (f.selectedValues && f.selectedValues.length > 0) {
                  summaryParts.push(
                    f.selectedValues.length <= 2
                      ? f.selectedValues.join('、')
                      : `已選 ${f.selectedValues.length} 項`
                  );
                }
                if (f.min || f.max) {
                  summaryParts.push(`${f.min || '−∞'} ~ ${f.max || '+∞'}`);
                }
                return (
                  <button
                    key={colKey}
                    type="button"
                    onClick={() => onUpdateColumnFilter(colKey, null)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--accent-soft)] text-[var(--accent-text)] text-xs font-medium hover:opacity-85 transition-opacity cursor-pointer"
                  >
                    <span>
                      {colKey}：{summaryParts.join(' / ')}
                    </span>
                    <X className="w-3 h-3 shrink-0" aria-hidden="true" />
                  </button>
                );
              })}

              <button
                type="button"
                onClick={onClearAllFilters}
                className="text-xs font-medium text-[var(--accent-text)] hover:underline cursor-pointer whitespace-nowrap"
              >
                清除全部篩選
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Main Pure Filter/Sort Data Table — Full Cell Wrapping */}
      <section className="bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-xl overflow-hidden">
        {filteredRows.length === 0 ? (
          <div className="py-16 px-6 text-center">
            <p className="text-base font-semibold text-[var(--text-primary)]">
              找不到符合目前篩選條件的資料列
            </p>
            <p className="text-sm text-[var(--text-secondary)] mt-1.5">
              請調整關鍵字、放寬欄位篩選條件，或匯入其他 .xlsx / .csv / .txt 檔案。
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
              {hasAnyFilter && (
                <button
                  type="button"
                  onClick={onClearAllFilters}
                  className="btn-glass-primary px-4 py-2 rounded-lg text-sm font-medium cursor-pointer"
                >
                  清除所有篩選條件
                </button>
              )}
              <button
                type="button"
                onClick={onTriggerFilePicker}
                className="btn-glass px-4 py-2 rounded-lg text-sm font-medium cursor-pointer"
              >
                匯入其他檔案
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-[var(--bg-subtle)] border-b border-[var(--border-hairline)]">
                    <th className="px-3.5 py-3 text-xs font-mono font-semibold text-[var(--text-muted)] w-12 text-right select-none whitespace-nowrap">
                      #
                    </th>
                    {dataset.columns.map((col) => {
                      const isSorted = sortConfig.columnKey === col.key;
                      const filterActive = isFilterActive(columnFilters[col.key]);
                      const isPopoverOpen = openFilterCol === col.key;
                      const isNumeric = col.inferredType === 'number';

                      return (
                        <th
                          key={col.key}
                          className={`relative px-3.5 py-3 align-middle border-l border-[var(--border-hairline)] first:border-l-0 ${getWidthClasses(
                            col
                          )}`}
                        >
                          <div
                            className={`flex items-center justify-between gap-2 ${
                              isNumeric ? 'flex-row-reverse' : ''
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => onToggleSort(col.key)}
                              title={`點擊排序「${col.label}」`}
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-primary)] hover:text-[var(--accent-primary)] transition-colors cursor-pointer min-w-0"
                            >
                              <span className="whitespace-nowrap truncate">{col.label}</span>
                              {isSorted && sortConfig.direction === 'asc' ? (
                                <ArrowUp
                                  className="w-3.5 h-3.5 text-[var(--accent-primary)] shrink-0"
                                  aria-label="升冪排序"
                                />
                              ) : isSorted && sortConfig.direction === 'desc' ? (
                                <ArrowDown
                                  className="w-3.5 h-3.5 text-[var(--accent-primary)] shrink-0"
                                  aria-label="降冪排序"
                                />
                              ) : (
                                <ArrowUpDown
                                  className="w-3.5 h-3.5 text-[var(--text-muted)] opacity-60 shrink-0"
                                  aria-hidden="true"
                                />
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                setOpenFilterCol((prev) => (prev === col.key ? null : col.key))
                              }
                              aria-expanded={isPopoverOpen}
                              aria-label={`篩選欄位 ${col.label}`}
                              className={`p-1.5 rounded-md transition-colors shrink-0 cursor-pointer ${
                                filterActive || isPopoverOpen
                                  ? 'bg-[var(--accent-soft)] text-[var(--accent-text)]'
                                  : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                              }`}
                            >
                              <Filter className="w-3.5 h-3.5" aria-hidden="true" />
                            </button>
                          </div>

                          {isPopoverOpen && (
                            <ColumnFilterPopover
                              column={col}
                              allRows={dataset.rows}
                              currentFilter={columnFilters[col.key]}
                              onApply={(f) => onUpdateColumnFilter(col.key, f)}
                              onClose={() => setOpenFilterCol(null)}
                            />
                          )}
                        </th>
                      );
                    })}
                  </tr>
                </thead>

                <tbody className="divide-y divide-[var(--border-hairline)]">
                  {pageRows.map((row, idx) => {
                    const rowNumber = (safePage - 1) * pageSize + idx + 1;
                    return (
                      <tr
                        key={rowNumber}
                        className="hover:bg-[var(--bg-canvas)] transition-colors duration-100"
                      >
                        <td className="px-3.5 py-3 align-top text-right font-mono tabular-nums text-xs text-[var(--text-muted)] select-none">
                          {rowNumber}
                        </td>
                        {dataset.columns.map((col) => {
                          const value = row[col.key] ?? '';
                          const isNumeric = col.inferredType === 'number';
                          const isDate = col.inferredType === 'date';
                          return (
                            <td
                              key={col.key}
                              className={`px-3.5 py-3 align-top border-l border-[var(--border-hairline)] table-cell-text whitespace-pre-wrap break-words ${getWidthClasses(
                                col
                              )} ${
                                isNumeric
                                  ? 'text-right font-mono tabular-nums text-[var(--text-primary)]'
                                  : isDate
                                    ? 'font-mono tabular-nums text-[var(--text-secondary)]'
                                    : 'text-[var(--text-primary)]'
                              }`}
                            >
                              {value !== '' ? (
                                value
                              ) : (
                                <span className="text-[var(--text-muted)]">—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Bar */}
            <div className="px-4 py-3 border-t border-[var(--border-hairline)] bg-[var(--bg-canvas)] flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--text-secondary)]">
              <div className="flex items-center gap-3">
                <span className="font-mono tabular-nums">
                  第 {((safePage - 1) * pageSize + 1).toLocaleString()}–
                  {Math.min(safePage * pageSize, filteredRows.length).toLocaleString()} 筆，共{' '}
                  {filteredRows.length.toLocaleString()} 筆
                </span>

                <label className="inline-flex items-center gap-1.5">
                  <span>每頁</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="px-2 py-1 rounded-md border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-mono tabular-nums"
                  >
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span>筆</span>
                </label>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                  aria-label="上一頁"
                  className="btn-glass inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>上一頁</span>
                </button>

                <span className="font-mono tabular-nums px-1.5">
                  {safePage} / {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                  aria-label="下一頁"
                  className="btn-glass inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span>下一頁</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
