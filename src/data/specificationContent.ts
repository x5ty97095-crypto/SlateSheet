export interface SpecChapter {
  id: string;
  index: string;
  title: string;
  subtitle: string;
  markdown: string;
}

export const SPEC_DOCUMENT_TITLE = 'SlateSheet 靜析表坊 — 應用程式開發規格書';
export const SPEC_FILENAME = 'SlateSheet-Specification.md';

export const SPEC_CHAPTERS: SpecChapter[] = [
  {
    id: 'overview',
    index: '01',
    title: '專案總覽與系統邊界',
    subtitle: '產品定位、核心價值與明確排除項目',
    markdown: `## 01. 專案總覽與系統邊界

### 1.1 產品定位
**SlateSheet 靜析表坊**是一款部署於 GitHub Pages 的純前端靜態資料檢視與視覺化網頁應用程式。本工具專為「不需要儲存格公式運算，僅需快速匯入、完整閱讀、多欄篩選、排序與類別分佈視覺化」的日常資料分析與報表檢閱情境設計。

### 1.2 核心目標
- **零門檻開啟與零資料外洩**：完全運行於使用者本地瀏覽器，不依賴任何後端伺服器或雲端資料庫，匯入之敏感報表檔案全程不離開本機裝置。
- **聚焦純檢視與探勘**：剔除傳統試算表的公式求值、巨集執行與儲存格算術編輯負擔，將運算資源集中於即時篩選、智慧排序與互動圖表。
- **高舒適度長時間閱讀**：採用扁平化低飽和度「莫蘭迪冷灰霧藍」配色、亮／暗雙色主題切換、四段式文字大小調節，以及「儲存格完整顯示（自動換行）」原則。

### 1.3 明確排除項目（Out of Scope）
為確保架構輕量、效能穩定且維護成本最低，本系統明確**不包含**以下功能：
1. 儲存格公式解析與運算引擎（如 \`=SUM()\`、\`=VLOOKUP()\`、\`=IF()\` 等）。
2. 儲存格內容即時回寫修改與巨集（VBA / AppScript）執行。
3. 遠端資料庫儲存、帳號登入驗證與多人即時協作編輯。`,
  },
  {
    id: 'platform-deployment',
    index: '02',
    title: '作業平台與 GitHub Pages 部署架構',
    subtitle: '靜態網站技術選型、建置配置與 CI/CD 流程',
    markdown: `## 02. 作業平台與 GitHub Pages 部署架構

### 2.1 推薦技術架構
採用 **Vite + React + TypeScript + Tailwind CSS v4** 建置為純靜態單頁應用程式（Static SPA），可直接託管於 **GitHub Pages**（亦相容於 Cloudflare Pages、Netlify 或本機靜態伺服器）。

| 技術層級 | 選定方案 | 選型理由 |
| :--- | :--- | :--- |
| 建置工具 | Vite（\`base: './'\` 相對路徑） | 建置產物體積小、支援子路徑部署於 \`username.github.io/repo-name/\` |
| UI 框架 | React 19 + TypeScript | 元件化維護容易、型別安全，適合資料篩選與圖表狀態同步 |
| 樣式系統 | Tailwind CSS v4（\`@custom-variant dark\`） | 零執行期樣式開銷，原生支援 CSS 變數與亮暗色無縫切換 |
| 試算表解析 | SheetJS Community Edition（\`xlsx\`） | 純前端讀取 \`.xlsx\`／\`.xls\` 多工作表純值，無須後端轉換 |
| 純文字解析 | 內建 RFC-4180 狀態機解析器 | 精準處理 UTF-8 BOM、引號內逗號與多行換行字元，支援自動偵測分隔符 |
| 數據視覺化 | Recharts（響應式 SVG 圖表） | 與 React 狀態深度整合，支援無失真縮放與點擊類別聯動篩選 |

### 2.2 Vite 相對路徑設定規範
為避免部署至 GitHub Pages 專案子路徑時靜態資源 404，\`vite.config.ts\` 必須設定相對基礎路徑：

\`\`\`ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
});
\`\`\`

### 2.3 GitHub Actions 自動部署範例（\`.github/workflows/deploy.yml\`）

\`\`\`yaml
name: Deploy SlateSheet to GitHub Pages

on:
  push:
    branches: ["main", "master"]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: |
          if [ -f package-lock.json ]; then
            npm ci
          else
            npm install
          fi
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist

  deploy:
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
\`\`\`

### 2.4 瀏覽器相容性目標
支援最新兩個主要版本之桌面與行動瀏覽器（Chrome、Edge、Safari、Firefox），並於不支援 \`backdrop-filter\` 之環境自動降級為純色低飽和度按鍵。`,
  },
  {
    id: 'file-import',
    index: '03',
    title: '多格式檔案匯入與解析規格',
    subtitle: 'XLSX、CSV、TXT/TSV 讀取規範與防呆機制',
    markdown: `## 03. 多格式檔案匯入與解析規格

### 3.1 支援格式與解析行為

| 格式 | 副檔名 | 解析原則與細節 |
| :--- | :--- | :--- |
| Excel 活頁簿 | \`.xlsx\`, \`.xls\` | 啟用 \`cellFormula: false\` 與 \`raw: false\` 僅擷取儲存格顯示純值，不執行任何公式求值；偵測多工作表時提供工作表下拉切換器。 |
| 逗號分隔檔 | \`.csv\` | 自動移除 UTF-8 BOM（\`\\uFEFF\`），依 RFC-4180 狀態機解析，完整保留雙引號包覆欄位中的逗號與內部換行符號（\`\\n\`）。 |
| 純文字資料檔 | \`.txt\`, \`.tsv\` | 取樣前 12 行自動偵測分隔符（Tab \`\\t\`、逗號 \`,\`、分號 \`;\`、管線 \`|\`），並於工具列提供使用者手動覆寫分隔符即時重解析。 |

### 3.2 匯入互動與驗證規則
- **雙重匯入入口**：支援點擊按鈕選取檔案與拖放區域（Drag & Drop）直接載入。
- **標題列正規化**：第一列預設視為欄位名稱；若遇空白欄位名自動補齊為 \`欄位 N\`，若遇重複欄位名自動加上序號後綴 \`名稱 (2)\`。
- **型別自動推斷**：抽樣非空白儲存格（門檻 ≥ 85%）推斷欄位型別為 \`number\`（含千分位與貨幣符號清除）、\`date\`（YYYY-MM-DD / YYYY/MM/DD）或 \`text\`，供排序與篩選模式自動適配。
- **防呆與錯誤復原**：若檔案副檔名不符、檔案空白或僅含標題列無資料，介面須顯示明確繁體中文錯誤訊息，並保留原資料集或提供「載入內建範例資料」按鈕。`,
  },
  {
    id: 'table-filter-sort',
    index: '04',
    title: '純篩選排序表格與完整內容顯示規範',
    subtitle: '儲存格自動換行原則、多欄篩選與型別感知排序',
    markdown: `## 04. 純篩選排序表格與完整內容顯示規範

### 4.1 儲存格完整顯示與自動換行原則（核心閱讀規範）
為徹底消除傳統試算表單行截斷（\`text-overflow: ellipsis\`）造成的閱讀阻力，本系統確立以下呈現原則：
1. **預設完整展開**：所有資料儲存格一律套用 \`whitespace-pre-wrap break-words align-top\`，完整呈現長段落文字、網址與原始換行斷點，絕不以省略號隱藏內容。
2. **彈性列高與頂部對齊**：資料列高度隨該列最高儲存格內容自然延展，各欄文字採頂部對齊（\`vertical-align: top\`），維持跨欄掃視基準線一致。
3. **智慧欄寬分級保護**：依欄位內容平均長度、最大長度與是否含換行符自動歸類為三級寬度，防止短欄過窄造成中文逐字直排，亦避免單一長文欄無限撐寬版面：
   - \`compact\`（數值／代碼／短狀態）：\`min-width: 108px\`，\`max-width: 160px\`
   - \`standard\`（一般文字／日期／名稱）：\`min-width: 148px\`，\`max-width: 240px\`
   - \`wide\`（多行備註／摘要說明）：\`min-width: 280px\`，\`max-width: 440px\`

### 4.2 欄位排序機制（無公式）
- 點擊表頭可循環切換三種狀態：**升冪（ASC）→ 降冪（DESC）→ 恢復原始順序（NULL）**。
- 排序依據欄位推斷型別執行：
  - \`number\`：依數值大小比較（空值一律排於末段）。
  - \`date\`：轉為時間戳記比較。
  - \`text\`：使用 \`Intl.Collator('zh-Hant-TW', { numeric: true, sensitivity: 'base' })\` 進行自然繁體中文語意排序。

### 4.3 多條件組合篩選
- **全域關鍵字搜尋**：跨所有欄位即時比對（不分大小寫）。
- **欄位獨立篩選面板**：
  - 類別／文字欄位：顯示該欄位所有去重值與對應筆數清單，支援面板內快速搜尋、多選核取、全選與單欄清除。
  - 數值欄位：提供「最小值／最大值」雙向數值區間過濾，同時支援離散值快速勾選。
- **篩選結果匯出**：支援將目前篩選與排序後的資料列匯出為 UTF-8 with BOM 格式之 \`.csv\` 檔案。`,
  },
  {
    id: 'dashboard-viz',
    index: '05',
    title: '互動式數據視覺化儀表板規格',
    subtitle: 'KPI 摘要、類別分佈長條圖、環形圖與雙向聯動篩選',
    markdown: `## 05. 互動式數據視覺化儀表板規格

### 5.1 資料連動原則
儀表板與資料表格共用同一份前端衍生資料流（\`filteredRows\`）。使用者在表格中套用的任何全域搜尋或欄位篩選，均於 50ms 內即時反映至儀表板所有統計指標與圖表。

### 5.2 儀表板區塊構成
1. **KPI 摘要列（4 欄等寬網格，單層扁平）**：
   - **目前顯示筆數 / 總筆數**（含篩選命中占比百分比）
   - **資料欄位總數**（標示文字、數值與日期欄位組成）
   - **當前維度獨立類別數**（所選分析欄位的相異值數量）
   - **最大占比類別**（顯示筆數最高之類別名稱與占比，或無資料提示）
   - *數字紀律*：所有 KPI 數值強制套用等寬數字（\`tabular-nums\`）。
2. **分析維度選擇器**：
   - 自動依據欄位獨立值數量（優先挑選 2–15 個相異類別之欄位）設定預設主分析維度，並允許使用者切換資料集中任一欄位即時重繪圖表。
3. **類別分佈長條圖（Bar Chart）**：
   - 依出現次數由高至低呈現前 10 大類別（超出之長尾類別自動彙整為「其他」），具備低飽和度莫蘭迪色階、數值標籤與滑鼠懸停細節提示框（Tooltip）。
4. **類別占比環形圖（Donut / Pie Chart）**：
   - 清楚呈現各類別占比結構，搭配清晰可讀的結構化圖例清單（呈現類別名稱、筆數與百分比）。

### 5.3 圖表點擊聯動篩選
點擊長條圖柱狀條、環形圖切片或圖例項目時，即時將該類別加入或移出對應欄位之篩選條件，並提供一鍵跳轉回「資料表格」檢視命中明細列。`,
  },
  {
    id: 'ui-design-system',
    index: '06',
    title: 'UI 設計系統、莫蘭迪色票與字級調節規範',
    subtitle: '扁平化 60-30-10 原則、雙色主題與四段閱讀字級',
    markdown: `## 06. UI 設計系統、莫蘭迪色票與字級調節規範

### 6.1 視覺原則
- **扁平化單層級結構**：以乾淨的 1px 結構細線（\`--border-hairline\`）與留白劃分區塊，避免多重厚重陰影與「卡片包覆卡片」。
- **60-30-10 低飽和度配色紀律**：60% 柔和中性冷灰畫布、30% 清晰結構表面、10% 莫蘭迪霧藍重點色（集中於焦點狀態與主要互動控制項）。
- **零靜態藥丸雜訊**：中繼資訊（檔名、筆數、更新時間、欄位型別）以純文字與 \`·\` 分隔符號呈現，不使用大量彩色膠囊標籤干擾視覺。

### 6.2 莫蘭迪冷灰霧藍雙色主題色票

| CSS 變數 Token | 亮色模式（霧白冷灰） | 暗色模式（深岩灰藍） | 用途與對比說明 |
| :--- | :--- | :--- | :--- |
| \`--bg-canvas\` | \`#F4F6F8\` | \`#161B22\` | 主畫面底層畫布（60%） |
| \`--bg-surface\` | \`#FFFFFF\` | \`#1F2630\` | 表格、圖表、側欄與文件閱讀區（30%） |
| \`--bg-subtle\` | \`#EAEEF2\` | \`#27303C\` | 表頭、滑鼠懸停與次級分區底色 |
| \`--border-hairline\` | \`#D8E0E8\` | \`#323D4B\` | 1px 扁平結構分隔線 |
| \`--text-primary\` | \`#25303B\` | \`#E6ECF2\` | 主標題與主要內文（WCAG AA ≥ 7:1） |
| \`--text-secondary\` | \`#5E6D7E\` | \`#99A7B6\` | 次要說明、中繼資訊與圖表座標軸 |
| \`--accent-primary\` | \`#5B7A94\` | \`#7EA1BD\` | 莫蘭迪霧藍主重點色（10%） |

### 6.3 暗色模式技術規格
於 Tailwind CSS v4 全域樣式表首行明確宣告 \`@custom-variant dark (&:where(.dark, .dark *));\`，透過 \`<html>\` 節點之 \`.dark\` class 切換主題，並於 \`index.html\` 內嵌無閃爍初始化腳本讀取 \`localStorage\` 與系統偏好 \`prefers-color-scheme\`。暗色模式正文自動微調字距（\`letter-spacing: 0.01em\`）提升淺字在深底上的光學清晰度。

### 6.4 文字大小調節選項（4 段閱讀字級系統）
系統於全域工具列提供直覺的文字大小調節器（\`A-\`、四段直接選取、\`A+\`），即時切換 \`<html data-font-scale="...">\` 並記憶於 \`localStorage\`：

| 級距代碼 | 介面名稱 | 規格書正文尺寸 | 表格儲存格尺寸 | 行高設定 | 適用情境 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| \`sm\` | 小 | \`13px\` | \`12.5px\` | \`1.55\` | 寬螢幕高密度瀏覽多欄報表 |
| \`md\` | 標準（預設） | \`15px\` | \`14px\` | \`1.62\` | 日常筆電與桌面均衡閱讀 |
| \`lg\` | 大 | \`17px\` | \`16px\` | \`1.66\` | 長時間審閱長文備註、平板使用 |
| \`xl\` | 特大 | \`19px\` | \`18px\` | \`1.70\` | 會議投影展示或高齡護眼閱讀 |

### 6.5 字體搭配規範
- **介面與中文內文**：\`Plus Jakarta Sans\` 搭配 \`Noto Sans TC\`。
- **數據欄位、KPI 與程式碼**：\`JetBrains Mono\` 搭配強制 \`font-variant-numeric: tabular-nums\`。`,
  },
  {
    id: 'glassmorphism-performance',
    index: '07',
    title: '輕量化毛玻璃按鍵與效能預算規範',
    subtitle: '低算力 backdrop-filter 邊界控制與降級相容',
    markdown: `## 07. 輕量化毛玻璃按鍵與效能預算規範

### 7.1 低算力設計準則
毛玻璃特效（\`backdrop-filter\`）若濫用於大型滾動容器或高密度資料列，極易造成瀏覽器合成層重繪與行動裝置發熱卡頓。本規格嚴格訂定以下效能邊界：

1. **嚴格限定套用範圍**：僅套用於**獨立操作按鍵（\`.btn-glass\`、\`.btn-glass-primary\`）與輕量分段控制鍵**；資料表格主體、長列表列項目、圖表畫布與側邊欄一律採用純色扁平背景。
2. **受控模糊半徑**：統一限制 \`backdrop-filter: blur(8px)\`（嚴禁超過 12px 或多層巢狀毛玻璃疊加）。
3. **精細高光邊框**：以低不透明度半透明背景（亮色 \`rgba(255,255,255,0.72)\`、暗色 \`rgba(39,48,60,0.68)\`）搭配 \`1px\` 霧藍邊框與極淡內側頂部高光 \`inset 0 1px 0\` 營造通透質感，不依賴高算力擴散陰影。
4. **僅針對 GPU 合成屬性動畫**：微互動過渡時間限制於 \`150ms\` 內，僅動畫化 \`transform\`、\`opacity\` 與色彩變化，絕不動畫化 \`width\`、\`height\` 或 \`backdrop-filter\` 模糊值。

### 7.2 降級相容與減弱動態
\`\`\`css
.btn-glass {
  background-color: var(--glass-bg);
  border: 1px solid var(--glass-border);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

@supports not ((backdrop-filter: blur(8px)) or (-webkit-backdrop-filter: blur(8px))) {
  .btn-glass {
    background-color: var(--bg-surface);
  }
}

@media (prefers-reduced-motion: reduce) {
  .btn-glass {
    transition: none;
  }
}
\`\`\``,
  },
  {
    id: 'data-architecture',
    index: '08',
    title: '資料模型與前端狀態架構',
    subtitle: 'TypeScript 介面定義與單向資料流設計',
    markdown: `## 08. 資料模型與前端狀態架構

### 8.1 系統單向資料流圖

\`\`\`
本機檔案 (.xlsx / .csv / .txt)
        │
        ▼
[純前端解析引擎 fileParser] ──(剔除公式 / 保留原始換行 / 推斷型別與欄寬)
        │
        ▼
  DatasetState (rawRows, columns, sheetNames)
        │
        ├── + QueryState (globalSearch, columnFilters, sortConfig)
        │
        ▼  (useMemo 記憶化計算管線)
  derivedRows (篩選後資料列 → 排序後資料列)
        │
        ├──▶ [資料表格視圖]：分頁呈現、自動換行完整顯示、CSV 匯出
        └──▶ [視覺化儀表板]：KPI 統計、類別長條圖、類別環形圖（點擊回寫 columnFilters）
\`\`\`

### 8.2 核心 TypeScript 資料介面

\`\`\`ts
export type ColumnType = 'text' | 'number' | 'date';
export type WidthTier = 'compact' | 'standard' | 'wide';
export type FontScale = 'sm' | 'md' | 'lg' | 'xl';

export interface ColumnMeta {
  key: string;
  label: string;
  inferredType: ColumnType;
  uniqueCount: number;
  widthTier: WidthTier;
  nonEmptyCount: number;
}

export interface Dataset {
  sourceName: string;
  fileFormat: 'sample' | 'xlsx' | 'csv' | 'txt';
  sheetNames: string[];
  activeSheet: string;
  detectedDelimiter?: string;
  columns: ColumnMeta[];
  rows: Record<string, string>[];
}

export interface ColumnFilter {
  selectedValues?: string[];
  textQuery?: string;
  min?: string;
  max?: string;
}

export interface SortConfig {
  columnKey: string | null;
  direction: 'asc' | 'desc' | null;
}
\`\`\`

### 8.3 本機持久化偏好（\`localStorage\`）
- \`slatesheet-theme\`：\`'light' | 'dark'\`
- \`slatesheet-font-scale\`：\`'sm' | 'md' | 'lg' | 'xl'\``,
  },
  {
    id: 'responsive-qa',
    index: '09',
    title: '響應式斷點、無障礙與開發驗收標準',
    subtitle: '跨裝置版面規範與上線前檢查清單',
    markdown: `## 09. 響應式斷點、無障礙與開發驗收標準

### 9.1 響應式版面斷點規範

| 裝置類別 | 視窗寬度 | 佈局與互動調整 |
| :--- | :--- | :--- |
| 桌面端（Desktop） | \`≥ 1024px\` | 左側固定 248px 目錄／篩選側欄；儀表板 4 欄 KPI 與 2 欄並排圖表；表格橫向滿寬運用。 |
| 平板端（Tablet） | \`768px – 1023px\` | 側欄轉為可開合抽屜；KPI 改為 2×2 網格；表格支援順暢橫向捲動與自動換行。 |
| 行動端（Mobile） | \`< 768px\` | 頂部固定區域高度 ≤ 視窗高度 15%；所有互動按鍵觸控目標 ≥ 44px；主導覽與篩選面板以抽屜收納。 |

### 9.2 無障礙（Accessibility）要求
- 亮色與暗色模式主要文字對比度皆須達 **WCAG 2.1 AA（≥ 4.5:1）**。
- 所有按鈕、分頁、下拉選單皆須支援鍵盤 Tab 聚焦與清晰 \`focus-visible\` 外框。
- 絕不單靠顏色傳達狀態（例如篩選作用中或排序方向均搭配文字與箭頭圖示）。

### 9.3 開發完成驗收清單（Acceptance Criteria）
- [ ] **GitHub Pages 相容**：執行 \`npm run build\` 後，所有資源皆採相對路徑且無需任何後端 API 即可正常運作。
- [ ] **多格式本機匯入**：成功匯入 \`.xlsx\`（含多工作表切換）、\`.csv\`（含雙引號多行換行）與 \`.txt\`／\`.tsv\`（支援自動偵測與手動切換分隔符）。
- [ ] **零公式純篩選排序**：確認匯入含公式之 Excel 檔案時僅顯示純值且不出現運算錯誤；單欄升／降／原序排序與多欄交叉篩選運作正確。
- [ ] **儲存格完整顯示**：長段落與含換行符號之儲存格完整自動換行顯示，無截斷省略號與文字重疊。
- [ ] **字級調節**：四段文字大小（小／標準／大／特大）即時套用於規格書與表格儲存格，重新整理頁面後保持記憶。
- [ ] **互動式儀表板**：KPI 統計、類別長條圖與環形圖隨篩選即時更新，點擊圖表類別可雙向切換表格篩選。
- [ ] **雙色主題與低算力毛玻璃**：亮／暗色切換無殘留破圖或低對比區塊；毛玻璃按鍵流暢無明顯捲動掉幀。`,
  },
];

export const FULL_SPECIFICATION_MARKDOWN = [
  `# ${SPEC_DOCUMENT_TITLE}`,
  '',
  '> 本規格書定義「SlateSheet 靜析表坊」之系統架構、GitHub Pages 部署策略、純篩選排序表格、多格式本地端匯入、儲存格自動換行顯示、字級調節、互動式類別分佈儀表板，以及莫蘭迪冷灰霧藍扁平化雙色設計系統，供後續開發與驗收直接採用。',
  '',
  '## 目錄',
  ...SPEC_CHAPTERS.map((ch) => `- [${ch.index}. ${ch.title}](#${ch.index}-${ch.title})`),
  '',
  '---',
  '',
  ...SPEC_CHAPTERS.map((ch) => ch.markdown + '\n\n---'),
].join('\n');

export function downloadSpecificationMarkdown(): void {
  const blob = new Blob([FULL_SPECIFICATION_MARKDOWN], {
    type: 'text/markdown;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = SPEC_FILENAME;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
