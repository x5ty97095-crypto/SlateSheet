import { Download, Menu, X } from 'lucide-react';
import { useState } from 'react';
import type { ActiveView } from '../types/data';

interface TopBarProps {
  activeView: ActiveView;
  onChangeView: (view: ActiveView) => void;
  onDownloadSpec: () => void;
}

const NAV_ITEMS: { id: ActiveView; label: string }[] = [
  { id: 'spec', label: '規格書文件' },
  { id: 'table', label: '資料表格' },
  { id: 'dashboard', label: '視覺化儀表板' },
];

export function TopBar({ activeView, onChangeView, onDownloadSpec }: TopBarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSelectView = (view: ActiveView) => {
    onChangeView(view);
    setMobileMenuOpen(false);
  };

  return (
    <header className="bg-[var(--bg-surface)] border-b border-[var(--border-hairline)] md:sticky md:top-0 z-30">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4 md:gap-8">
        {/* Zone 1: Single-element Brand Wordmark */}
        <button
          type="button"
          onClick={() => handleSelectView('spec')}
          className="text-base sm:text-lg font-bold tracking-tight text-[var(--text-primary)] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--accent-primary)] rounded-sm cursor-pointer"
        >
          SlateSheet 靜析表坊
        </button>

        {/* Zone 2: Clean Single-Line Text Nav Links */}
        <nav aria-label="主要功能導覽" className="hidden md:flex items-center gap-7 h-full">
          {NAV_ITEMS.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectView(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`relative h-full inline-flex items-center text-sm font-medium whitespace-nowrap shrink-0 transition-colors duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-primary)] ${
                  isActive
                    ? 'text-[var(--text-primary)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--accent-primary)]"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Single Primary Action + Mobile Menu Trigger */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onDownloadSpec}
            className="btn-glass-primary inline-flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2 min-h-[40px] md:min-h-[36px] text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-primary)]"
          >
            <Download className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>下載 MD 規格書</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? '關閉導覽選單' : '開啟導覽選單'}
            className="md:hidden btn-glass inline-flex items-center justify-center w-11 h-11 rounded-lg shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-primary)]"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <nav
          aria-label="行動版功能導覽"
          className="md:hidden border-t border-[var(--border-hairline)] bg-[var(--bg-surface)] px-4 py-2 flex flex-col gap-1"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectView(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full text-left px-3 py-3 min-h-[44px] rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-[var(--accent-soft)] text-[var(--accent-text)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      )}
    </header>
  );
}
