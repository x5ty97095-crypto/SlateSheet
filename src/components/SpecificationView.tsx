import {
  ArrowRight,
  Check,
  Code2,
  Copy,
  Download,
  FileText,
  List,
  X,
} from 'lucide-react';
import { Fragment, useEffect, useState } from 'react';
import {
  FULL_SPECIFICATION_MARKDOWN,
  SPEC_CHAPTERS,
  SPEC_DOCUMENT_TITLE,
  SPEC_FILENAME,
} from '../data/specificationContent';
import type { ActiveView } from '../types/data';

interface SpecificationViewProps {
  onDownloadSpec: () => void;
  onSwitchView: (view: ActiveView) => void;
}

const MORANDI_SWATCHES = [
  { name: '畫布背景', token: '--bg-canvas', light: '#F4F6F8', dark: '#161B22' },
  { name: '結構表面', token: '--bg-surface', light: '#FFFFFF', dark: '#1F2630' },
  { name: '柔和底槽', token: '--bg-subtle', light: '#EAEEF2', dark: '#27303C' },
  { name: '細線邊框', token: '--border-hairline', light: '#D8E0E8', dark: '#323D4B' },
  { name: '莫蘭迪霧藍', token: '--accent-primary', light: '#5B7A94', dark: '#7EA1BD' },
  { name: '主內文字色', token: '--text-primary', light: '#25303B', dark: '#E6ECF2' },
];

function renderInlineMarkdown(text: string) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={idx}
          className="font-mono text-[0.88em] px-1.5 py-0.5 rounded bg-[var(--bg-subtle)] text-[var(--accent-text)] border border-[var(--border-hairline)]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={idx} className="font-semibold text-[var(--text-primary)]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <em key={idx} className="italic text-[var(--text-secondary)]">
          {part.slice(1, -1)}
        </em>
      );
    }
    return <Fragment key={idx}>{part}</Fragment>;
  });
}

interface MarkdownRendererProps {
  markdown: string;
  checkedItems: Record<string, boolean>;
  onToggleCheck: (key: string) => void;
  chapterId: string;
}

function SafeMarkdownBlock({
  markdown,
  checkedItems,
  onToggleCheck,
  chapterId,
}: MarkdownRendererProps) {
  const lines = markdown.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Skip top ## chapter heading since chapter header renders it cleanly
    if (line.startsWith('## ')) {
      i += 1;
      continue;
    }

    // Blank line
    if (line.trim() === '') {
      i += 1;
      continue;
    }

    // Fenced code block
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i += 1;
      }
      i += 1;
      elements.push(
        <div
          key={`code-${i}`}
          className="my-5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-canvas)] overflow-hidden"
        >
          {lang && (
            <div className="px-4 py-1.5 border-b border-[var(--border-hairline)] bg-[var(--bg-subtle)] text-xs font-mono text-[var(--text-secondary)]">
              {lang}
            </div>
          )}
          <pre className="p-4 overflow-x-auto code-block-text font-mono text-[var(--text-primary)]">
            <code>{codeLines.join('\n')}</code>
          </pre>
        </div>
      );
      continue;
    }

    // H3 subheading
    if (line.startsWith('### ')) {
      elements.push(
        <h3
          key={`h3-${i}`}
          className="mt-7 mb-3 text-[1.12em] font-semibold text-[var(--text-primary)] tracking-tight"
        >
          {line.slice(4)}
        </h3>
      );
      i += 1;
      continue;
    }

    // Markdown table
    if (line.trim().startsWith('|') && i + 1 < lines.length && lines[i + 1].includes('---')) {
      const parseRow = (rowLine: string) =>
        rowLine
          .trim()
          .replace(/^\|/, '')
          .replace(/\|$/, '')
          .split('|')
          .map((c) => c.trim());

      const headers = parseRow(line);
      i += 2; // Skip header & separator
      const bodyRows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        bodyRows.push(parseRow(lines[i]));
        i += 1;
      }

      elements.push(
        <div
          key={`tbl-${i}`}
          className="my-5 overflow-x-auto rounded-lg border border-[var(--border-hairline)]"
        >
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-[var(--bg-subtle)] border-b border-[var(--border-hairline)]">
                {headers.map((h, hIdx) => (
                  <th
                    key={hIdx}
                    className="px-4 py-2.5 text-[0.88em] font-semibold text-[var(--text-primary)] whitespace-nowrap"
                  >
                    {renderInlineMarkdown(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-hairline)] bg-[var(--bg-surface)]">
              {bodyRows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-[var(--bg-canvas)] transition-colors">
                  {row.map((cell, cIdx) => (
                    <td
                      key={cIdx}
                      className="px-4 py-3 align-top whitespace-pre-wrap break-words text-[0.94em] text-[var(--text-secondary)]"
                    >
                      {renderInlineMarkdown(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // Interactive QA Checklist (- [ ] ...)
    if (line.trim().startsWith('- [ ] ')) {
      const listItems: { text: string; key: string }[] = [];
      while (i < lines.length && lines[i].trim().startsWith('- [ ] ')) {
        const text = lines[i].trim().slice(6);
        listItems.push({ text, key: `${chapterId}-chk-${i}` });
        i += 1;
      }
      elements.push(
        <ul key={`chk-${i}`} className="my-4 space-y-2.5">
          {listItems.map((item) => {
            const isChecked = !!checkedItems[item.key];
            return (
              <li key={item.key}>
                <label className="flex items-start gap-3 p-2.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-canvas)] hover:border-[var(--accent-primary)] transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => onToggleCheck(item.key)}
                    className="mt-1 w-4 h-4 accent-[var(--accent-primary)] shrink-0 cursor-pointer"
                  />
                  <span
                    className={`transition-colors ${
                      isChecked
                        ? 'line-through text-[var(--text-muted)]'
                        : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    {renderInlineMarkdown(item.text)}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      );
      continue;
    }

    // Unordered list
    if (line.trim().startsWith('- ')) {
      const items: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('- ')) {
        items.push(lines[i].trim().slice(2));
        i += 1;
      }
      elements.push(
        <ul key={`ul-${i}`} className="my-3.5 space-y-2 list-disc pl-5 text-[var(--text-secondary)]">
          {items.map((item, idx) => (
            <li key={idx} className="pl-1">
              {renderInlineMarkdown(item)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Ordered list
    if (/^\d+\.\s/.test(line.trim())) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s/, ''));
        i += 1;
      }
      elements.push(
        <ol
          key={`ol-${i}`}
          className="my-3.5 space-y-2 list-decimal pl-5 text-[var(--text-secondary)]"
        >
          {items.map((item, idx) => (
            <li key={idx} className="pl-1">
              {renderInlineMarkdown(item)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={`p-${i}`} className="my-3 text-[var(--text-secondary)]">
        {renderInlineMarkdown(line)}
      </p>
    );
    i += 1;
  }

  return <>{elements}</>;
}

export function SpecificationView({
  onDownloadSpec,
  onSwitchView,
}: SpecificationViewProps) {
  const [viewMode, setViewMode] = useState<'rendered' | 'raw'>('rendered');
  const [activeChapterId, setActiveChapterId] = useState<string>(SPEC_CHAPTERS[0].id);
  const [copied, setCopied] = useState(false);
  const [mobileTocOpen, setMobileTocOpen] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (viewMode !== 'rendered') return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveChapterId(entry.target.id);
            break;
          }
        }
      },
      { rootMargin: '-18% 0px -65% 0px', threshold: 0.05 }
    );

    SPEC_CHAPTERS.forEach((chapter) => {
      const el = document.getElementById(chapter.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [viewMode]);

  const handleCopyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(FULL_SPECIFICATION_MARKDOWN);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback copy via temporary textarea
      const textarea = document.createElement('textarea');
      textarea.value = FULL_SPECIFICATION_MARKDOWN;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleJumpChapter = (id: string) => {
    setViewMode('rendered');
    setActiveChapterId(id);
    setMobileTocOpen(false);
    setTimeout(() => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 30);
  };

  const toggleChecklistItem = (key: string) => {
    setCheckedItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div className="flex flex-col lg:flex-row items-start gap-6 lg:gap-8">
        {/* Mobile TOC Toggle */}
        <div className="lg:hidden w-full flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setMobileTocOpen((prev) => !prev)}
            className="btn-glass inline-flex items-center gap-2 px-3.5 py-2.5 min-h-[44px] rounded-lg text-sm font-medium cursor-pointer"
          >
            {mobileTocOpen ? <X className="w-4 h-4" /> : <List className="w-4 h-4" />}
            <span>規格書章節目錄</span>
          </button>
          <span className="text-xs font-mono text-[var(--text-muted)]">{SPEC_FILENAME}</span>
        </div>

        {/* Left Sidebar: Chapter TOC */}
        <aside
          aria-label="規格書章節目錄"
          className={`${
            mobileTocOpen ? 'block' : 'hidden'
          } lg:block w-full lg:w-[256px] shrink-0 lg:sticky lg:top-20 bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-xl p-4`}
        >
          <div className="pb-3 mb-3 border-b border-[var(--border-hairline)]">
            <h2 className="text-xs font-semibold text-[var(--text-primary)] tracking-wide">
              規格書章節目錄
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5 font-mono">{SPEC_FILENAME}</p>
          </div>

          <nav className="space-y-1">
            {SPEC_CHAPTERS.map((chapter) => {
              const isActive = activeChapterId === chapter.id && viewMode === 'rendered';
              return (
                <button
                  key={chapter.id}
                  type="button"
                  onClick={() => handleJumpChapter(chapter.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors duration-150 flex items-baseline gap-2.5 cursor-pointer ${
                    isActive
                      ? 'bg-[var(--accent-soft)] text-[var(--accent-text)] font-medium'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <span className="font-mono tabular-nums text-xs text-[var(--text-muted)] shrink-0">
                    {chapter.index}
                  </span>
                  <span className="leading-snug">{chapter.title}</span>
                </button>
              );
            })}
          </nav>

          <div className="mt-5 pt-4 border-t border-[var(--border-hairline)] space-y-2">
            <button
              type="button"
              onClick={() => onSwitchView('table')}
              className="btn-glass w-full inline-flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium cursor-pointer"
            >
              <span>操作純篩選資料表格</span>
              <ArrowRight className="w-3.5 h-3.5 text-[var(--accent-primary)] shrink-0" />
            </button>
            <button
              type="button"
              onClick={() => onSwitchView('dashboard')}
              className="btn-glass w-full inline-flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium cursor-pointer"
            >
              <span>檢視類別分佈儀表板</span>
              <ArrowRight className="w-3.5 h-3.5 text-[var(--accent-primary)] shrink-0" />
            </button>
          </div>
        </aside>

        {/* Main Specification Document Canvas */}
        <article className="flex-1 min-w-0 w-full bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-xl">
          {/* Document Header & Action Bar */}
          <div className="p-6 sm:p-8 border-b border-[var(--border-hairline)]">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)] mb-3">
              <span>軟體需求與介面規格書</span>
              <span aria-hidden="true">·</span>
              <span>Vite + React 靜態部署</span>
              <span aria-hidden="true">·</span>
              <span>莫蘭迪冷灰霧藍設計系統</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight leading-tight">
              {SPEC_DOCUMENT_TITLE}
            </h1>

            <p className="mt-3 text-[var(--text-secondary)] doc-prose max-w-[74ch]">
              本文件完整規範「SlateSheet 靜析表坊」之 GitHub Pages
              靜態架構、無公式純篩選排序表格、多格式本地端匯入、儲存格自動換行完整顯示、四段字級調節、互動式類別分佈儀表板與低算力毛玻璃介面規範，可直接匯出為標準
              Markdown（.md）投入後續工程開發。
            </p>

            {/* Document Mode & Export Controls */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <div
                role="tablist"
                aria-label="規格書檢視模式"
                className="inline-flex items-center p-1 bg-[var(--bg-subtle)] border border-[var(--border-hairline)] rounded-lg"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={viewMode === 'rendered'}
                  onClick={() => setViewMode('rendered')}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs sm:text-sm font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    viewMode === 'rendered'
                      ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-hairline)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-transparent'
                  }`}
                >
                  <FileText className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>排版閱讀檢視</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={viewMode === 'raw'}
                  onClick={() => setViewMode('raw')}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs sm:text-sm font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    viewMode === 'raw'
                      ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-hairline)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-transparent'
                  }`}
                >
                  <Code2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>Markdown 原始碼</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleCopyMarkdown}
                  className="btn-glass inline-flex items-center gap-2 px-4 py-2 min-h-[40px] rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-[var(--status-success)] shrink-0" aria-hidden="true" />
                      <span>已複製 Markdown 全文</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-[var(--accent-primary)] shrink-0" aria-hidden="true" />
                      <span>複製 Markdown</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={onDownloadSpec}
                  className="btn-glass-primary inline-flex items-center gap-2 px-4 py-2 min-h-[40px] rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Download className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>匯出 .md 檔案</span>
                </button>
              </div>
            </div>
          </div>

          {/* Document Body */}
          {viewMode === 'raw' ? (
            <div className="p-6 sm:p-8">
              <div className="flex items-center justify-between gap-4 pb-3 mb-4 border-b border-[var(--border-hairline)] text-xs text-[var(--text-muted)]">
                <span className="font-mono">{SPEC_FILENAME}</span>
                <span className="font-mono tabular-nums">
                  {FULL_SPECIFICATION_MARKDOWN.split('\n').length} 行 ·{' '}
                  {FULL_SPECIFICATION_MARKDOWN.length.toLocaleString()} 字元
                </span>
              </div>
              <pre className="p-5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-canvas)] overflow-x-auto font-mono code-block-text text-[var(--text-primary)] whitespace-pre-wrap break-words">
                <code>{FULL_SPECIFICATION_MARKDOWN}</code>
              </pre>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-hairline)]">
              {SPEC_CHAPTERS.map((chapter) => (
                <section
                  key={chapter.id}
                  id={chapter.id}
                  className="p-6 sm:p-8 scroll-mt-20 doc-prose"
                >
                  <div className="mb-4">
                    <div className="text-xs font-mono tabular-nums text-[var(--accent-text)] mb-1">
                      第 {chapter.index} 章
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] tracking-tight">
                      {chapter.index}. {chapter.title}
                    </h2>
                    <p className="text-sm text-[var(--text-muted)] mt-1">{chapter.subtitle}</p>
                  </div>

                  <div className="max-w-[78ch]">
                    <SafeMarkdownBlock
                      markdown={chapter.markdown}
                      checkedItems={checkedItems}
                      onToggleCheck={toggleChecklistItem}
                      chapterId={chapter.id}
                    />
                  </div>

                  {/* Interactive Morandi Swatch Reference inside Chapter 06 */}
                  {chapter.id === 'ui-design-system' && (
                    <div className="mt-6 pt-5 border-t border-[var(--border-hairline)]">
                      <p className="text-sm font-semibold text-[var(--text-primary)] mb-3">
                        莫蘭迪冷灰霧藍即時色票對照（隨目前亮／暗色模式即時預覽）
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        {MORANDI_SWATCHES.map((swatch) => (
                          <div
                            key={swatch.token}
                            className="rounded-lg border border-[var(--border-hairline)] overflow-hidden bg-[var(--bg-canvas)]"
                          >
                            <div
                              className="h-12 w-full border-b border-[var(--border-hairline)]"
                              style={{ backgroundColor: `var(${swatch.token})` }}
                            />
                            <div className="p-2.5">
                              <div className="text-xs font-medium text-[var(--text-primary)]">
                                {swatch.name}
                              </div>
                              <div className="text-[11px] font-mono tabular-nums text-[var(--text-muted)] mt-0.5">
                                {swatch.light} / {swatch.dark}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              ))}
            </div>
          )}
        </article>
      </div>
    </div>
  );
}
