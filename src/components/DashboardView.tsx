import { ArrowLeft, FilterX } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  MORANDI_CHART_PALETTE_DARK,
  MORANDI_CHART_PALETTE_LIGHT,
  type ColumnFilter,
  type ColumnMeta,
  type DataRow,
  type Dataset,
  type ThemeMode,
} from '../types/data';

interface DashboardViewProps {
  dataset: Dataset;
  filteredRows: DataRow[];
  columnFilters: Record<string, ColumnFilter>;
  globalSearch: string;
  onToggleCategoryFilter: (columnKey: string, categoryValue: string) => void;
  onClearAllFilters: () => void;
  onGoTable: () => void;
  theme: ThemeMode;
}

interface CategoryDatum {
  name: string;
  count: number;
  percent: number;
  isOther?: boolean;
}

function pickDefaultDimension(columns: ColumnMeta[]): string {
  const categorical = columns.find(
    (c) => c.inferredType === 'text' && c.uniqueCount >= 2 && c.uniqueCount <= 12
  );
  if (categorical) return categorical.key;
  const reasonable = columns.find((c) => c.uniqueCount >= 2 && c.uniqueCount <= 20);
  if (reasonable) return reasonable.key;
  return columns[0]?.key ?? '';
}

export function DashboardView({
  dataset,
  filteredRows,
  columnFilters,
  globalSearch,
  onToggleCategoryFilter,
  onClearAllFilters,
  onGoTable,
  theme,
}: DashboardViewProps) {
  const [dimensionKey, setDimensionKey] = useState<string>(() =>
    pickDefaultDimension(dataset.columns)
  );

  useEffect(() => {
    if (!dataset.columns.some((c) => c.key === dimensionKey)) {
      setDimensionKey(pickDefaultDimension(dataset.columns));
    }
  }, [dataset.columns, dimensionKey]);

  const palette = theme === 'dark' ? MORANDI_CHART_PALETTE_DARK : MORANDI_CHART_PALETTE_LIGHT;
  const gridColor = theme === 'dark' ? '#323D4B' : '#E2E8EE';
  const axisTextColor = theme === 'dark' ? '#99A7B6' : '#5E6D7E';
  const tooltipBg = theme === 'dark' ? '#1F2630' : '#FFFFFF';
  const tooltipBorder = theme === 'dark' ? '#435163' : '#C2CDD8';

  const quickDimensions = useMemo(() => {
    const scored = dataset.columns
      .filter((c) => c.uniqueCount >= 2 && c.uniqueCount <= 15 && c.widthTier !== 'wide')
      .slice(0, 5);
    return scored.length > 0 ? scored : dataset.columns.slice(0, 4);
  }, [dataset.columns]);

  const { chartData, distinctCount } = useMemo(() => {
    if (!dimensionKey || filteredRows.length === 0) {
      return { chartData: [] as CategoryDatum[], distinctCount: 0 };
    }

    const counts = new Map<string, number>();
    for (const row of filteredRows) {
      const raw = (row[dimensionKey] ?? '').trim();
      const label = raw === '' ? '(空白)' : raw;
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }

    const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
    const total = filteredRows.length;
    const topItems = sorted.slice(0, 9);
    const restItems = sorted.slice(9);

    const data: CategoryDatum[] = topItems.map(([name, count]) => ({
      name,
      count,
      percent: Number(((count / total) * 100).toFixed(1)),
    }));

    if (restItems.length > 0) {
      const restSum = restItems.reduce((acc, [, c]) => acc + c, 0);
      data.push({
        name: `其他（${restItems.length} 類）`,
        count: restSum,
        percent: Number(((restSum / total) * 100).toFixed(1)),
        isOther: true,
      });
    }

    return { chartData: data, distinctCount: counts.size };
  }, [dimensionKey, filteredRows]);

  const activeDimensionSelections = columnFilters[dimensionKey]?.selectedValues ?? [];
  const hasAnyFilter =
    globalSearch.trim().length > 0 ||
    Object.values(columnFilters).some(
      (f) =>
        (f.selectedValues && f.selectedValues.length > 0) ||
        (f.min && f.min.trim().length > 0) ||
        (f.max && f.max.trim().length > 0)
    );

  const matchRatio =
    dataset.rows.length > 0
      ? ((filteredRows.length / dataset.rows.length) * 100).toFixed(1)
      : '0.0';

  const typeCounts = useMemo(() => {
    let text = 0;
    let num = 0;
    let date = 0;
    for (const c of dataset.columns) {
      if (c.inferredType === 'number') num += 1;
      else if (c.inferredType === 'date') date += 1;
      else text += 1;
    }
    return { text, num, date };
  }, [dataset.columns]);

  const topCategory = chartData[0];

  const handleBarOrSliceClick = (datum: CategoryDatum) => {
    if (!dimensionKey || datum.isOther) return;
    onToggleCategoryFilter(dimensionKey, datum.name);
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* 4-Column Flat KPI Summary Strip */}
      <section
        aria-label="資料集關鍵統計摘要"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <div className="bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-xl p-5">
          <div className="text-xs font-medium text-[var(--text-secondary)]">目前篩選筆數</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-[var(--text-primary)]">
              {filteredRows.length.toLocaleString()}
            </span>
            <span className="text-xs font-mono tabular-nums text-[var(--text-muted)]">
              / {dataset.rows.length.toLocaleString()} 筆
            </span>
          </div>
          <div className="mt-1.5 text-xs text-[var(--text-muted)] font-mono tabular-nums">
            占總資料量 {matchRatio}%
          </div>
        </div>

        <div className="bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-xl p-5">
          <div className="text-xs font-medium text-[var(--text-secondary)]">資料欄位結構</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-[var(--text-primary)]">
              {dataset.columns.length}
            </span>
            <span className="text-xs text-[var(--text-muted)]">個欄位</span>
          </div>
          <div className="mt-1.5 text-xs text-[var(--text-muted)] tabular-nums">
            文字 {typeCounts.text} · 數值 {typeCounts.num} · 日期 {typeCounts.date}
          </div>
        </div>

        <div className="bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-xl p-5">
          <div className="text-xs font-medium text-[var(--text-secondary)]">
            當前維度獨立類別數
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-[var(--text-primary)]">
              {distinctCount.toLocaleString()}
            </span>
            <span className="text-xs text-[var(--text-muted)]">類</span>
          </div>
          <div className="mt-1.5 text-xs text-[var(--text-muted)] truncate">
            分析欄位：{dimensionKey || '未指定'}
          </div>
        </div>

        <div className="bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-xl p-5">
          <div className="text-xs font-medium text-[var(--text-secondary)]">最高占比類別</div>
          <div className="mt-2 text-xl sm:text-2xl font-bold text-[var(--text-primary)] truncate">
            {topCategory ? topCategory.name : '—'}
          </div>
          <div className="mt-1.5 text-xs text-[var(--text-muted)] font-mono tabular-nums">
            {topCategory
              ? `${topCategory.count.toLocaleString()} 筆 · 占 ${topCategory.percent}%`
              : '目前無可統計資料'}
          </div>
        </div>
      </section>

      {/* Dimension Selector & Cross-Filter Controls */}
      <section className="bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-[var(--text-secondary)]">
            <span className="whitespace-nowrap">統計維度欄位</span>
            <select
              value={dimensionKey}
              onChange={(e) => setDimensionKey(e.target.value)}
              className="h-10 px-3 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
            >
              {dataset.columns.map((col) => (
                <option key={col.key} value={col.key}>
                  {col.label}（{col.uniqueCount} 類）
                </option>
              ))}
            </select>
          </label>

          {/* Quick Categorical Dimension Buttons */}
          <div className="hidden sm:flex items-center gap-1 p-1 bg-[var(--bg-subtle)] border border-[var(--border-hairline)] rounded-lg">
            {quickDimensions.map((col) => {
              const isSelected = col.key === dimensionKey;
              return (
                <button
                  key={col.key}
                  type="button"
                  onClick={() => setDimensionKey(col.key)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-hairline)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-transparent'
                  }`}
                >
                  {col.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {hasAnyFilter && (
            <button
              type="button"
              onClick={onClearAllFilters}
              className="btn-glass inline-flex items-center gap-1.5 px-3.5 h-10 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FilterX className="w-4 h-4 text-[var(--accent-primary)] shrink-0" aria-hidden="true" />
              <span>清除所有篩選</span>
            </button>
          )}

          <button
            type="button"
            onClick={onGoTable}
            className="btn-glass-primary inline-flex items-center gap-1.5 px-4 h-10 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>檢視篩選明細表格</span>
          </button>
        </div>
      </section>

      {/* Empty State vs Interactive Charts Grid */}
      {filteredRows.length === 0 ? (
        <section className="bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-xl py-16 px-6 text-center">
          <p className="text-base font-semibold text-[var(--text-primary)]">
            目前篩選條件下沒有可繪製的資料
          </p>
          <p className="text-sm text-[var(--text-secondary)] mt-1.5">
            請先清除篩選條件，或返回資料表格匯入新的檔案。
          </p>
          <button
            type="button"
            onClick={onClearAllFilters}
            className="btn-glass-primary mt-5 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer"
          >
            重設所有篩選
          </button>
        </section>
      ) : (
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Category Distribution Bar Chart */}
          <div className="lg:col-span-7 bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-xl p-5 sm:p-6 flex flex-col">
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
              <div>
                <h2 className="text-base sm:text-lg font-semibold text-[var(--text-primary)]">
                  「{dimensionKey}」類別分佈長條圖
                </h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  點擊任一長條可直接切換套用該類別篩選，與資料表格即時連動
                </p>
              </div>
              {activeDimensionSelections.length > 0 && (
                <span className="text-xs font-medium text-[var(--accent-text)]">
                  已鎖定 {activeDimensionSelections.length} 個類別
                </span>
              )}
            </div>

            <div className="w-full h-[340px] sm:h-[380px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tick={{ fill: axisTextColor, fontSize: 12 }}
                    axisLine={{ stroke: gridColor }}
                    tickLine={{ stroke: gridColor }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={116}
                    tick={{ fill: axisTextColor, fontSize: 12 }}
                    axisLine={{ stroke: gridColor }}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: theme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(91,122,148,0.08)' }}
                    contentStyle={{
                      backgroundColor: tooltipBg,
                      border: `1px solid ${tooltipBorder}`,
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: theme === 'dark' ? '#E6ECF2' : '#25303B',
                    }}
                    formatter={(value: unknown, _name: unknown, item: { payload?: CategoryDatum }) => [
                      `${Number(value).toLocaleString()} 筆（${item?.payload?.percent ?? 0}%）`,
                      '筆數',
                    ]}
                  />
                  <Bar
                    dataKey="count"
                    radius={[0, 4, 4, 0]}
                    maxBarSize={28}
                    onClick={(data) => {
                      const datum = data?.payload as CategoryDatum | undefined;
                      if (datum) handleBarOrSliceClick(datum);
                    }}
                    className="cursor-pointer"
                  >
                    {chartData.map((entry, idx) => {
                      const isDimFiltered = activeDimensionSelections.length > 0;
                      const isSelected = activeDimensionSelections.includes(entry.name);
                      const fillOpacity = !isDimFiltered || isSelected ? 1 : 0.35;
                      return (
                        <Cell
                          key={entry.name}
                          fill={palette[idx % palette.length]}
                          fillOpacity={fillOpacity}
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Category Share Donut Chart & Interactive Legend */}
          <div className="lg:col-span-5 bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-xl p-5 sm:p-6 flex flex-col">
            <div className="mb-4">
              <h2 className="text-base sm:text-lg font-semibold text-[var(--text-primary)]">
                「{dimensionKey}」類別占比環形圖
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                點選切片或下方清單項目即可快速交叉篩選
              </p>
            </div>

            <div className="relative w-full h-[230px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={62}
                    outerRadius={96}
                    paddingAngle={2}
                    stroke={tooltipBg}
                    strokeWidth={2}
                    onClick={(data) => {
                      const datum = data?.payload as CategoryDatum | undefined;
                      if (datum) handleBarOrSliceClick(datum);
                    }}
                    className="cursor-pointer"
                  >
                    {chartData.map((entry, idx) => {
                      const isDimFiltered = activeDimensionSelections.length > 0;
                      const isSelected = activeDimensionSelections.includes(entry.name);
                      return (
                        <Cell
                          key={entry.name}
                          fill={palette[idx % palette.length]}
                          fillOpacity={!isDimFiltered || isSelected ? 1 : 0.35}
                        />
                      );
                    })}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: tooltipBg,
                      border: `1px solid ${tooltipBorder}`,
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: theme === 'dark' ? '#E6ECF2' : '#25303B',
                    }}
                    formatter={(value: unknown, name: unknown, item: { payload?: CategoryDatum }) => [
                      `${Number(value).toLocaleString()} 筆（${item?.payload?.percent ?? 0}%）`,
                      String(name),
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Center Metric inside Donut */}
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold font-mono tabular-nums text-[var(--text-primary)]">
                  {filteredRows.length.toLocaleString()}
                </span>
                <span className="text-[11px] text-[var(--text-muted)]">總筆數</span>
              </div>
            </div>

            {/* Structured Interactive Legend List */}
            <div className="mt-4 pt-3 border-t border-[var(--border-hairline)] flex-1 overflow-y-auto max-h-[210px] space-y-1">
              {chartData.map((entry, idx) => {
                const isSelected = activeDimensionSelections.includes(entry.name);
                return (
                  <button
                    key={entry.name}
                    type="button"
                    disabled={entry.isOther}
                    onClick={() => handleBarOrSliceClick(entry)}
                    className={`w-full flex items-center justify-between gap-3 px-2.5 py-2 rounded-lg text-left transition-colors ${
                      entry.isOther
                        ? 'cursor-default opacity-80'
                        : 'cursor-pointer hover:bg-[var(--bg-subtle)]'
                    } ${isSelected ? 'bg-[var(--accent-soft)]' : ''}`}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <span
                        aria-hidden="true"
                        className="w-3 h-3 rounded-sm shrink-0"
                        style={{ backgroundColor: palette[idx % palette.length] }}
                      />
                      <span className="text-xs sm:text-sm text-[var(--text-primary)] truncate">
                        {entry.name}
                      </span>
                    </span>
                    <span className="font-mono tabular-nums text-xs text-[var(--text-secondary)] whitespace-nowrap shrink-0">
                      {entry.count.toLocaleString()} 筆 · {entry.percent}%
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
