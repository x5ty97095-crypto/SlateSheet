import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type * as XLSX from 'xlsx';
import { DashboardView } from './components/DashboardView';
import { DataTableView } from './components/DataTableView';
import { ReadingToolbar } from './components/ReadingToolbar';
import { SpecificationView } from './components/SpecificationView';
import { TopBar } from './components/TopBar';
import { createSampleDataset } from './data/sampleDataset';
import { downloadSpecificationMarkdown } from './data/specificationContent';
import type {
  ActiveView,
  ColumnFilter,
  Dataset,
  DelimiterOption,
  FontScale,
  SortConfig,
  ThemeMode,
} from './types/data';
import {
  extractSheetFromWorkbook,
  parseDateTimestamp,
  parseImportedFile,
  parseNumericValue,
  parsePlainTextContent,
} from './utils/fileParser';

const THEME_STORAGE_KEY = 'slatesheet-theme';
const FONT_SCALE_STORAGE_KEY = 'slatesheet-font-scale';

const ZH_COLLATOR = new Intl.Collator('zh-Hant-TW', {
  numeric: true,
  sensitivity: 'base',
});

function getInitialTheme(): ThemeMode {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
  } catch {
    // Ignore storage access restrictions
  }
  return 'light';
}

function getInitialFontScale(): FontScale {
  try {
    const saved = localStorage.getItem(FONT_SCALE_STORAGE_KEY);
    if (saved === 'sm' || saved === 'md' || saved === 'lg' || saved === 'xl') {
      return saved;
    }
  } catch {
    // Ignore storage access restrictions
  }
  return 'md';
}

export default function App() {
  const [activeView, setActiveView] = useState<ActiveView>('spec');
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);
  const [fontScale, setFontScale] = useState<FontScale>(getInitialFontScale);

  const [dataset, setDataset] = useState<Dataset>(() => createSampleDataset());
  const [loadedWorkbook, setLoadedWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [loadedRawText, setLoadedRawText] = useState<string | null>(null);
  const [delimiterOption, setDelimiterOption] = useState<DelimiterOption>('auto');
  const [importError, setImportError] = useState<string | null>(null);

  const [globalSearch, setGlobalSearch] = useState('');
  const [columnFilters, setColumnFilters] = useState<Record<string, ColumnFilter>>({});
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    columnKey: null,
    direction: null,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync Dark / Light theme class & storage
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage errors
    }
  }, [theme]);

  // Sync Font Scale attribute & storage
  useEffect(() => {
    document.documentElement.setAttribute('data-font-scale', fontScale);
    try {
      localStorage.setItem(FONT_SCALE_STORAGE_KEY, fontScale);
    } catch {
      // Ignore storage errors
    }
  }, [fontScale]);

  const resetQueryState = useCallback(() => {
    setGlobalSearch('');
    setColumnFilters({});
    setSortConfig({ columnKey: null, direction: null });
  }, []);

  const handleImportFile = useCallback(
    async (file: File) => {
      setImportError(null);
      try {
        const result = await parseImportedFile(file, 'auto');
        setDataset(result.dataset);
        setLoadedWorkbook(result.workbook ?? null);
        setLoadedRawText(result.rawText ?? null);
        setDelimiterOption('auto');
        resetQueryState();
        if (activeView === 'spec') {
          setActiveView('table');
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : '檔案解析失敗，請確認檔案格式與內容。';
        setImportError(msg);
      }
    },
    [activeView, resetQueryState]
  );

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void handleImportFile(file);
    }
    e.target.value = '';
  };

  const handleTriggerFileImport = () => {
    fileInputRef.current?.click();
  };

  const handleChangeSheet = (sheetName: string) => {
    if (!loadedWorkbook) return;
    setImportError(null);
    try {
      const nextDataset = extractSheetFromWorkbook(loadedWorkbook, sheetName, dataset.sourceName);
      setDataset(nextDataset);
      resetQueryState();
    } catch (err) {
      setImportError(err instanceof Error ? err.message : '無法切換工作表。');
    }
  };

  const handleChangeDelimiter = (option: DelimiterOption) => {
    setDelimiterOption(option);
    if (!loadedRawText || (dataset.fileFormat !== 'csv' && dataset.fileFormat !== 'txt')) {
      return;
    }
    setImportError(null);
    try {
      const nextDataset = parsePlainTextContent(
        loadedRawText,
        dataset.sourceName,
        dataset.fileFormat,
        option
      );
      setDataset(nextDataset);
      resetQueryState();
    } catch (err) {
      setImportError(err instanceof Error ? err.message : '無法使用指定分隔符解析檔案。');
    }
  };

  const handleResetSample = () => {
    setImportError(null);
    setLoadedWorkbook(null);
    setLoadedRawText(null);
    setDelimiterOption('auto');
    setDataset(createSampleDataset());
    resetQueryState();
  };

  const handleUpdateColumnFilter = (columnKey: string, filter: ColumnFilter | null) => {
    setColumnFilters((prev) => {
      const next = { ...prev };
      if (!filter) {
        delete next[columnKey];
      } else {
        next[columnKey] = filter;
      }
      return next;
    });
  };

  const handleToggleCategoryFilter = (columnKey: string, categoryValue: string) => {
    setColumnFilters((prev) => {
      const existing = prev[columnKey];
      const currentSelected = new Set(existing?.selectedValues ?? []);
      if (currentSelected.has(categoryValue)) {
        currentSelected.delete(categoryValue);
      } else {
        currentSelected.add(categoryValue);
      }

      const next = { ...prev };
      const updatedValues = Array.from(currentSelected);
      if (updatedValues.length === 0 && !existing?.min && !existing?.max) {
        delete next[columnKey];
      } else {
        next[columnKey] = {
          ...existing,
          selectedValues: updatedValues.length > 0 ? updatedValues : undefined,
        };
      }
      return next;
    });
  };

  const handleToggleSort = (columnKey: string) => {
    setSortConfig((prev) => {
      if (prev.columnKey !== columnKey) {
        return { columnKey, direction: 'asc' };
      }
      if (prev.direction === 'asc') {
        return { columnKey, direction: 'desc' };
      }
      return { columnKey: null, direction: null };
    });
  };

  // Unified client-side Filter + Sort pipeline (strictly no formula calculation)
  const filteredAndSortedRows = useMemo(() => {
    const query = globalSearch.trim().toLowerCase();
    const activeFilterEntries = Object.entries(columnFilters);

    const filtered = dataset.rows.filter((row) => {
      if (query) {
        const matchesGlobal = dataset.columns.some((col) =>
          (row[col.key] ?? '').toLowerCase().includes(query)
        );
        if (!matchesGlobal) return false;
      }

      for (const [colKey, filter] of activeFilterEntries) {
        const raw = (row[colKey] ?? '').trim();
        const normalizedLabel = raw === '' ? '(空白)' : raw;

        if (filter.selectedValues && filter.selectedValues.length > 0) {
          if (!filter.selectedValues.includes(normalizedLabel)) {
            return false;
          }
        }

        if (filter.min || filter.max) {
          const numVal = parseNumericValue(raw);
          if (numVal === null) return false;
          if (filter.min) {
            const minNum = Number(filter.min);
            if (Number.isFinite(minNum) && numVal < minNum) return false;
          }
          if (filter.max) {
            const maxNum = Number(filter.max);
            if (Number.isFinite(maxNum) && numVal > maxNum) return false;
          }
        }
      }

      return true;
    });

    if (!sortConfig.columnKey || !sortConfig.direction) {
      return filtered;
    }

    const colMeta = dataset.columns.find((c) => c.key === sortConfig.columnKey);
    if (!colMeta) return filtered;

    const dirMultiplier = sortConfig.direction === 'asc' ? 1 : -1;

    return [...filtered].sort((a, b) => {
      const rawA = (a[colMeta.key] ?? '').trim();
      const rawB = (b[colMeta.key] ?? '').trim();

      // Always keep empty values at the bottom
      if (!rawA && !rawB) return 0;
      if (!rawA) return 1;
      if (!rawB) return -1;

      if (colMeta.inferredType === 'number') {
        const numA = parseNumericValue(rawA);
        const numB = parseNumericValue(rawB);
        if (numA !== null && numB !== null) {
          return (numA - numB) * dirMultiplier;
        }
      }

      if (colMeta.inferredType === 'date') {
        const tsA = parseDateTimestamp(rawA);
        const tsB = parseDateTimestamp(rawB);
        if (tsA !== null && tsB !== null) {
          return (tsA - tsB) * dirMultiplier;
        }
      }

      return ZH_COLLATOR.compare(rawA, rawB) * dirMultiplier;
    });
  }, [dataset.columns, dataset.rows, globalSearch, columnFilters, sortConfig]);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      {/* Hidden File Picker */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv,.tsv,.txt"
        onChange={handleFileInputChange}
        className="hidden"
        aria-hidden="true"
      />

      {/* Top Navigation Bar */}
      <TopBar
        activeView={activeView}
        onChangeView={setActiveView}
        onDownloadSpec={downloadSpecificationMarkdown}
      />

      {/* Reading Preferences & Contextual Toolbar */}
      <ReadingToolbar
        activeView={activeView}
        theme={theme}
        onToggleTheme={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
        fontScale={fontScale}
        onChangeFontScale={setFontScale}
        sourceName={dataset.sourceName}
        filteredCount={filteredAndSortedRows.length}
        totalCount={dataset.rows.length}
        onTriggerFileImport={handleTriggerFileImport}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {activeView === 'spec' && (
          <SpecificationView
            onDownloadSpec={downloadSpecificationMarkdown}
            onSwitchView={setActiveView}
          />
        )}

        {activeView === 'table' && (
          <DataTableView
            dataset={dataset}
            filteredRows={filteredAndSortedRows}
            globalSearch={globalSearch}
            onChangeGlobalSearch={setGlobalSearch}
            columnFilters={columnFilters}
            onUpdateColumnFilter={handleUpdateColumnFilter}
            onClearAllFilters={resetQueryState}
            sortConfig={sortConfig}
            onToggleSort={handleToggleSort}
            delimiterOption={delimiterOption}
            onChangeDelimiter={handleChangeDelimiter}
            onChangeSheet={handleChangeSheet}
            onImportFile={(file) => void handleImportFile(file)}
            onTriggerFilePicker={handleTriggerFileImport}
            onResetSample={handleResetSample}
            importError={importError}
            onDismissError={() => setImportError(null)}
            onGoDashboard={() => setActiveView('dashboard')}
          />
        )}

        {activeView === 'dashboard' && (
          <DashboardView
            dataset={dataset}
            filteredRows={filteredAndSortedRows}
            columnFilters={columnFilters}
            globalSearch={globalSearch}
            onToggleCategoryFilter={handleToggleCategoryFilter}
            onClearAllFilters={resetQueryState}
            onGoTable={() => setActiveView('table')}
            theme={theme}
          />
        )}
      </main>

      {/* Quiet Minimal Footer */}
      <footer className="border-t border-[var(--border-hairline)] bg-[var(--bg-surface)] mt-12">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--text-muted)]">
          <span>SlateSheet 靜析表坊 · 純前端靜態規格書與資料檢視原型</span>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setActiveView('spec')}
              className="hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              規格書
            </button>
            <button
              type="button"
              onClick={() => setActiveView('table')}
              className="hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              資料表格
            </button>
            <button
              type="button"
              onClick={() => setActiveView('dashboard')}
              className="hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              儀表板
            </button>
            <button
              type="button"
              onClick={downloadSpecificationMarkdown}
              className="hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              下載 .md
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
