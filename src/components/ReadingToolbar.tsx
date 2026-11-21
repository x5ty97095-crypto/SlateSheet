import { Moon, Sun, Upload } from 'lucide-react';
import {
  FONT_SCALE_OPTIONS,
  type ActiveView,
  type FontScale,
  type ThemeMode,
} from '../types/data';

interface ReadingToolbarProps {
  activeView: ActiveView;
  theme: ThemeMode;
  onToggleTheme: () => void;
  fontScale: FontScale;
  onChangeFontScale: (scale: FontScale) => void;
  sourceName: string;
  filteredCount: number;
  totalCount: number;
  onTriggerFileImport: () => void;
}

export function ReadingToolbar({
  activeView,
  theme,
  onToggleTheme,
  fontScale,
  onChangeFontScale,
  sourceName,
  filteredCount,
  totalCount,
  onTriggerFileImport,
}: ReadingToolbarProps) {
  const currentIdx = FONT_SCALE_OPTIONS.findIndex((o) => o.id === fontScale);
  const currentOption = FONT_SCALE_OPTIONS[currentIdx] ?? FONT_SCALE_OPTIONS[1];

  const handleStepDown = () => {
    if (currentIdx > 0) {
      onChangeFontScale(FONT_SCALE_OPTIONS[currentIdx - 1].id);
    }
  };

  const handleStepUp = () => {
    if (currentIdx < FONT_SCALE_OPTIONS.length - 1) {
      onChangeFontScale(FONT_SCALE_OPTIONS[currentIdx + 1].id);
    }
  };

  return (
    <div className="bg-[var(--bg-canvas)] border-b border-[var(--border-hairline)]">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Font Scale Control & Theme Switch */}
        <div className="flex flex-wrap items-center gap-3">
          {/* 4-Step Reading Font Size Control */}
          <div
            role="group"
            aria-label="文字大小調節"
            className="inline-flex items-center gap-1.5"
          >
            <span className="text-xs font-medium text-[var(--text-secondary)] whitespace-nowrap shrink-0 mr-0.5">
              文字大小
            </span>

            <button
              type="button"
              onClick={handleStepDown}
              disabled={currentIdx <= 0}
              aria-label="縮小文字大小"
              className="btn-glass inline-flex items-center justify-center px-2.5 h-9 md:h-8 rounded-md text-xs font-mono font-medium whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-primary)]"
            >
              A-
            </button>

            <div className="inline-flex items-center p-0.5 bg-[var(--bg-subtle)] border border-[var(--border-hairline)] rounded-lg">
              {FONT_SCALE_OPTIONS.map((opt) => {
                const isSelected = opt.id === fontScale;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onChangeFontScale(opt.id)}
                    aria-pressed={isSelected}
                    className={`px-2.5 h-8 md:h-7 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent-primary)] ${
                      isSelected
                        ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-hairline)]'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-transparent'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleStepUp}
              disabled={currentIdx >= FONT_SCALE_OPTIONS.length - 1}
              aria-label="放大文字大小"
              className="btn-glass inline-flex items-center justify-center px-2.5 h-9 md:h-8 rounded-md text-xs font-mono font-medium whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-primary)]"
            >
              A+
            </button>

            <span className="hidden sm:inline text-xs font-mono tabular-nums text-[var(--text-muted)] whitespace-nowrap ml-1">
              {activeView === 'spec' ? currentOption.docPx : currentOption.tablePx}
            </span>
          </div>

          <span aria-hidden="true" className="hidden sm:inline text-[var(--border-strong)]">
            |
          </span>

          {/* Light / Dark Mode Toggle */}
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? '切換為亮色模式' : '切換為暗色模式'}
            className="btn-glass inline-flex items-center gap-2 px-3 h-9 md:h-8 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-primary)]"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-[var(--accent-primary)] shrink-0" aria-hidden="true" />
                <span>亮色模式</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-[var(--accent-primary)] shrink-0" aria-hidden="true" />
                <span>暗色模式</span>
              </>
            )}
          </button>
        </div>

        {/* Right: Clean Unboxed Metadata & Contextual Import Trigger */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-secondary)]">
          {activeView === 'spec' ? (
            <div className="flex items-center gap-2">
              <span>9 個規格章節</span>
              <span aria-hidden="true">·</span>
              <span>GitHub Pages 靜態架構</span>
              <span aria-hidden="true" className="hidden sm:inline">
                ·
              </span>
              <span className="hidden sm:inline">UTF-8 Markdown</span>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 min-w-0">
                <span className="truncate max-w-[200px] sm:max-w-[280px] text-[var(--text-primary)] font-medium">
                  {sourceName}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums whitespace-nowrap">
                  {filteredCount.toLocaleString()} / {totalCount.toLocaleString()} 筆
                </span>
              </div>
              <button
                type="button"
                onClick={onTriggerFileImport}
                className="btn-glass inline-flex items-center gap-1.5 px-3 h-9 md:h-8 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-primary)]"
              >
                <Upload className="w-3.5 h-3.5 text-[var(--accent-primary)] shrink-0" aria-hidden="true" />
                <span>匯入檔案</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
