import "./index.css";
import React, { useEffect, useRef, useState, useMemo } from "react";
import {
  uploadExcel,
  getPreview,
  getProfile,
  getInsights,
  getAggregate,
  type UploadResponse,
  type PreviewResponse,
  type ProfileResponse,
  type AiInsightsResponse,
  type AggregateResponse,
  type ChartSpec,
} from "./api/files";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  Upload,
  Sparkles,
  ChevronRight,
  BarChart3,
  Loader2,
  PieChart as PieChartIcon,
  Download,
  Sun,
  Moon,
} from "/ExcelAI/backend/src/ExcelAiInsights.Api/node_modules/lucide-react";

export default function App() {
  const [file, setFile] = useState<File | null>(null);

  const [upload, setUpload] = useState<UploadResponse | null>(null);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [profile, setProfile] = useState<ProfileResponse | null>(null);

  const [insights, setInsights] = useState<AiInsightsResponse | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);

  const [aggData, setAggData] = useState<AggregateResponse | null>(null);
  const [activeSpec, setActiveSpec] = useState<ChartSpec | null>(null);
  const [chartLoading, setChartLoading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const isGlobalLoading = loading || insightsLoading || chartLoading;

  const canRunAI = !!upload?.fileId;
  const isBusyAI = insightsLoading;

  const [theme, setTheme] = useState<"dark" | "light">(() => {
    const saved = localStorage.getItem("excelai-theme");
    return saved === "light" ? "light" : "dark";
  });

  useEffect(() => {
    localStorage.setItem("excelai-theme", theme);
    document.body.classList.toggle("theme-light", theme === "light");
  }, [theme]);

  // ===== Excel Preview interactions =====
  const [selectedCell, setSelectedCell] = useState<{
    r: number;
    c: number;
  } | null>(null);
  const [editingCell, setEditingCell] = useState<{
    r: number;
    c: number;
  } | null>(null);
  const [editValue, setEditValue] = useState<string>("");

  // Editable copy of preview rows
  const [previewRows, setPreviewRows] = useState<string[][]>([]);

  const sheetRef = useRef<HTMLDivElement | null>(null);

  const columnsMap = useMemo(() => {
  const map: Record<string, string> = {};
  for (const c of profile?.columns ?? []) {
    map[c.normalizedName] = c.originalName; // normalized -> original
  }
  return map;
}, [profile]);



  async function handleUploadAndPreview() {
    if (!file) return;

    try {
      setError("");
      setLoading(true);

      setUpload(null);
      setPreview(null);
      setProfile(null);
      setInsights(null);
      setAggData(null);
      setActiveSpec(null);

      setSelectedCell(null);
      setEditingCell(null);
      setEditValue("");
      setPreviewRows([]);

      const up = await uploadExcel(file);
      setUpload(up);

      const [pv, pf] = await Promise.all([getPreview(up.fileId), getProfile(up.fileId)]);

      setPreview(pv);
      setProfile(pf);

      const rows = pv.rows.map((r) => r.map((x) => String(x ?? "")));
      setPreviewRows(rows);
      setSelectedCell({ r: 0, c: 0 });
      setEditingCell(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function handleInsights() {
    if (!upload?.fileId) return;

    try {
      setError("");
      setInsights(null);
      setInsightsLoading(true);

      const data = await getInsights(upload.fileId);
      setInsights(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setInsightsLoading(false);
    }
  }

  async function handleLoadChartFromSpec(spec: ChartSpec) {
    if (!upload?.fileId) return;

    if (!spec.groupBy || !spec.value) {
      setError("Chart spec missing groupBy/value.");
      return;
    }

    if (spec.type !== "bar" && spec.type !== "pie" && spec.type !== "line") {
      setError("This chart type is not supported yet.");
      return;
    }

    setActiveSpec(spec);

    try {
      setError("");
      setChartLoading(true);

       const data = await getAggregate({
      fileId: upload.fileId,
      groupBy: spec.groupBy,
      value: spec.value,
      agg: spec.agg ?? "sum",
      top: spec.top ?? 10,
      columnsMap, 
    });

      setAggData(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setChartLoading(false);
    }
  }

  // Chart data
  const chartData = aggData?.data?.map((d) => ({ name: d.key, value: d.value })) ?? [];

  // ===== Helpers =====
  function toExcelCol(n: number) {
    let s = "";
    let x = n + 1;
    while (x > 0) {
      const m = (x - 1) % 26;
      s = String.fromCharCode(65 + m) + s;
      x = Math.floor((x - 1) / 26);
    }
    return s;
  }

  function clamp(v: number, min: number, max: number) {
    return Math.max(min, Math.min(max, v));
  }

  function startEdit(r: number, c: number) {
    const current = previewRows[r]?.[c] ?? "";
    setEditingCell({ r, c });
    setEditValue(String(current));
  }

  function commitEdit() {
    if (!editingCell) return;
    const { r, c } = editingCell;

    setPreviewRows((prev) => {
      const next = prev.map((row) => row.slice());
      if (!next[r]) return prev;
      next[r][c] = editValue;
      return next;
    });

    setEditingCell(null);
    setEditValue("");
  }

  function cancelEdit() {
    setEditingCell(null);
    setEditValue("");
  }

  async function copySelectedCell() {
    if (!selectedCell) return;
    const v = previewRows[selectedCell.r]?.[selectedCell.c] ?? "";

    try {
      await navigator.clipboard.writeText(String(v));
    } catch {
      const ta = document.createElement("textarea");
      ta.value = String(v);
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
  }

  function exportPreviewCSV() {
    if (!preview) return;

    const cols = preview.columns.map((c) => String(c ?? ""));
    const rows = previewRows;

    const escapeCSV = (val: string) => {
      const s = String(val ?? "");
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };

    const csv = [cols, ...rows].map((row) => row.map(escapeCSV).join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${upload?.originalName?.replace(/\.[^/.]+$/, "") ?? "preview"}_edited.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
  }

  // ===== Paste (Ctrl+V / Cmd+V) =====
  function applyPasteText(text: string) {
    if (!preview || !selectedCell) return;

    const raw = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

    const rows = raw
      .split("\n")
      .filter((r) => r.length > 0)
      .map((r) => r.split("\t"));

    if (rows.length === 0) return;

    const startR = selectedCell.r;
    const startC = selectedCell.c;

    const maxR = previewRows.length;
    const maxC = preview.columns.length;

    setPreviewRows((prev) => {
      const next = prev.map((r) => r.slice());

      for (let rr = 0; rr < rows.length; rr++) {
        const targetR = startR + rr;
        if (targetR >= next.length) break;

        for (let cc = 0; cc < rows[rr].length; cc++) {
          const targetC = startC + cc;
          if (targetC >= maxC) break;

          next[targetR][targetC] = rows[rr][cc];
        }
      }

      return next;
    });

    const endR = clamp(startR + rows.length - 1, 0, Math.max(0, maxR - 1));
    const endC = clamp(
      startC + Math.max(0, (rows[0]?.length ?? 1) - 1),
      0,
      Math.max(0, maxC - 1)
    );
    setSelectedCell({ r: endR, c: endC });
  }

  async function pasteFromClipboardReadText() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) applyPasteText(text);
    } catch {
      // No pasa nada: onPaste suele funcionar igual
    }
  }

  function onSheetKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (!preview || !selectedCell) return;

    const rowsCount = previewRows.length;
    const colsCount = preview.columns.length;

    // Si estás editando, no interceptamos (input maneja)
    if (editingCell) return;

    // Copiar
    if ((e.ctrlKey || e.metaKey) && (e.key === "c" || e.key === "C")) {
      e.preventDefault();
      void copySelectedCell();
      return;
    }

    // Pegar
    if ((e.ctrlKey || e.metaKey) && (e.key === "v" || e.key === "V")) {
      e.preventDefault();
      void pasteFromClipboardReadText();
      return;
    }

    let { r, c } = selectedCell;

    switch (e.key) {
      case "ArrowUp":
        e.preventDefault();
        r = clamp(r - 1, 0, rowsCount - 1);
        break;
      case "ArrowDown":
        e.preventDefault();
        r = clamp(r + 1, 0, rowsCount - 1);
        break;
      case "ArrowLeft":
        e.preventDefault();
        c = clamp(c - 1, 0, colsCount - 1);
        break;
      case "ArrowRight":
        e.preventDefault();
        c = clamp(c + 1, 0, colsCount - 1);
        break;
      case "Enter":
        e.preventDefault();
        startEdit(r, c);
        return;
      default:
        return;
    }

    setSelectedCell({ r, c });
  }

  // Safety: si cambia preview y previewRows aún no está inicializado
  useEffect(() => {
    if (!preview) return;
    if (previewRows.length === 0 && preview.rows?.length) {
      const rows = preview.rows.map((r) => r.map((x) => String(x ?? "")));
      setPreviewRows(rows);
      setSelectedCell({ r: 0, c: 0 });
      setEditingCell(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview]);

  return (
    <div className="min-h-screen p-6 app-shell">
      {isGlobalLoading && (
        <div className="ai-loader-overlay">
          <div className="ai-loader-box">
            <div className="ai-loader-ring" />
            <div className="ai-loader-text">
              {loading && "Uploading file…"}
              {insightsLoading && "Analyzing data with AI…"}
              {chartLoading && "Building chart…"}
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto w-full max-w-6xl">
        {/* Header */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="w-full flex justify-end mb-2">
            <div className="theme-toggle">
              <button
                type="button"
                className={`theme-btn ${theme === "dark" ? "is-active" : ""}`}
                onClick={() => setTheme("dark")}
                aria-label="Dark mode"
                title="Dark mode"
              >
                <Moon className="w-4 h-4" />
              </button>

              <button
                type="button"
                className={`theme-btn ${theme === "light" ? "is-active" : ""}`}
                onClick={() => setTheme("light")}
                aria-label="Light mode"
                title="Light mode"
              >
                <Sun className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex flex-col items-center">
            <div className="flex items-center justify-center">
              <h1 className="text-[50px] tracking-tight font-[100]">Excel Assistant</h1>
              <span className="ai-badge text-[22px]">AI</span>
            </div>
            <p className="text-sm subtle">Minimal • AI • Upload • Insights • Charts</p>
          </div>

          {upload && (
            <div className="text-[12px] px-3 py-2 flex flex-row items-center">
              <div>File Id:</div>
              <div className="subtle">{upload.fileId}</div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex flex-col items-center justify-center w-full p-0">
          <div className="w-full flex justify-center">
            <div className="flex flex-col lg:flex-row items-center justify-center gap-10">
              {/* Excel Icon */}
              <div className="flex flex-col items-center w-[80px]">
                <label
                  htmlFor="excel-upload"
                  className="flex flex-col items-center justify-center cursor-pointer transition-all active:scale-95 group"
                >
                  <img
                    src="../src/assets/microsoft-excel.png"
                    alt="Upload Excel"
                    className={`h-[55px] w-auto object-contain transition-transform group-hover:scale-110 ${
                      file ? "brightness-110" : "grayscale-[0.5]"
                    }`}
                  />
                  <span className="mt-1 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                    {file ? " " : " "}
                  </span>
                </label>

                <input
                  id="excel-upload"
                  type="file"
                  accept=".xlsx"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </div>

              {/* Buttons */}
              <div className="flex flex-row lg:flex-col gap-8 items-center justify-center w-[48px] lg:translate-y-[6px]">
                {/* Upload */}
                <button
                  onClick={handleUploadAndPreview}
                  disabled={!file || loading}
                  className="btn-reset text-white/60 hover:text-white hover:scale-125 transition-all duration-300 disabled:opacity-10 active:scale-90 cursor-pointer"
                  title="Upload"
                >
                  {loading ? (
                    <Loader2 className="w-9 h-9 animate-spin" color="#fff" />
                  ) : (
                    <Upload className="w-9 h-9" color="#fff" />
                  )}
                </button>

                {/* IA */}
                <button
                  onClick={handleInsights}
                  disabled={!canRunAI || isBusyAI}
                  title="AI Insights"
                  className={[
                    "btn-reset relative flex items-center justify-center p-1 transition-all duration-300 active:scale-90",
                    !canRunAI ? "opacity-10 cursor-not-allowed" : "opacity-100 cursor-pointer",
                    isBusyAI ? "cursor-wait" : "",
                  ].join(" ")}
                >
                  {isBusyAI && (
                    <>
                      <div className="ai-glow" />
                      <div className="absolute inset-0 rounded-full ai-loading-ring" />
                    </>
                  )}

                  <Sparkles
                    className={`relative z-10 w-9 h-9 transition-all duration-300 transform translate-x-2 ${
                      isBusyAI
                        ? "animate-pulse"
                        : "opacity-60 hover:opacity-100 hover:scale-125"
                    }`}
                    color="#fff"
                    style={{ transform: "translateX(0.5rem)" }}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* File info + error */}
          <div className="mt-4 flex flex-col items-center text-center">
            {upload && (
              <div className="text-[11px] text-gray-400 italic">
                <span className="font-semibold">{upload.originalName}</span>
                <br />({(upload.sizeBytes / 1024).toFixed(1)} KB)
              </div>
            )}

            {error && (
              <div className="mt-2 text-xs text-red-500 font-medium bg-red-50 px-3 py-1 rounded-full">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* IA blocks */}
        {insights && (
          <div className="app-section mx-auto max-w-[1400px] w-full">
            <div className="ai-grid gap-6">
              {/* INFO IA (JSON) */}
              <div className="aiinfo-panel">
                <div className="aiinfo-header flex items-center justify-center gap-3 px-5 py-4">
                  <h2 className="text-lg ai-title text-center">Información de IA</h2>
                  <span className="ai-badge">JSON</span>
                </div>

                <div className="aiinfo-body ai-panel-body p-5 space-y-4">
                  <div className="aiinfo-block">
                    <div className="aiinfo-label">Resumen</div>
                    <div className="aiinfo-text">{insights.summary}</div>
                  </div>

                  {insights.keyFindings?.length > 0 && (
                    <div className="aiinfo-block">
                      <div className="aiinfo-label">Hallazgos clave</div>
                      <ul className="aiinfo-list">
                        {insights.keyFindings.map((k, i) => (
                          <li key={i} className="aiinfo-li">
                            <span className="aiinfo-dot">•</span>
                            <span className="aiinfo-text">{k}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {insights.dataQualityWarnings?.length > 0 && (
                    <div className="aiinfo-block aiinfo-warnblock">
                      <div className="aiinfo-label">Calidad de datos</div>
                      <ul className="aiinfo-warnlist">
                        {insights.dataQualityWarnings.map((w, i) => (
                          <li key={i} className="aiinfo-warnitem">
                            <span className="aiinfo-warnicon">!</span>
                            <span className="aiinfo-warntext">{w}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* SUGGESTED CHARTS */}
              <div className="w-full suggested-panel">
                <div className="suggested-header flex items-center justify-center gap-2 px-5 py-4">
                  <div className="relative w-6 h-6 grid place-items-center">
                    <div className="ai-aura opacity-80" />
                    <Sparkles className="relative z-10 w-4 h-4" color="#fff" />
                  </div>
                  <h2 className="text-lg ai-title text-center">Gráficos sugeridos</h2>
                </div>

                <div className="suggested-body ai-panel-body px-4 pb-4">
                  <div className="flex flex-col items-center gap-3 w-full">
                    {insights.suggestedCharts?.map((c, i) => {
                      const title = c.title || `${c.type} chart`;
                      const groupBy = c.groupBy ?? "-";
                      const value = c.value ?? "-";
                      const agg = c.agg ?? "sum";
                      const top = c.top ?? 10;

                      const canUseAggregate =
                        (c.type === "bar" || c.type === "pie" || c.type === "line") &&
                        !!c.groupBy &&
                        !!c.value;

                      const Icon =
                        c.type === "bar" ? BarChart3 : c.type === "pie" ? PieChartIcon : LineChart;

                      const disabled = !upload?.fileId || !canUseAggregate || chartLoading;

                      return (
                        <button
                          key={i}
                          type="button"
                          disabled={disabled}
                          onClick={() => handleLoadChartFromSpec(c)}
                          className={[
                            "btn-reset group",
                            "suggested-item",
                            "flex items-center gap-3",
                            "w-full text-left",
                            "transition-all duration-300",
                            "hover:translate-y-[-1px]",
                            "active:scale-[0.99]",
                            "disabled:opacity-30 disabled:cursor-not-allowed",
                          ].join(" ")}
                        >
                          <div className="suggested-icon w-10 h-10 grid place-items-center shrink-0">
                            <Icon className="w-6 h-6" color="#fff" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="suggested-title text-sm font-semibold truncate">{title}</div>

                            <div className="suggested-sub mt-0.5 text-[11px] flex flex-wrap gap-x-2">
                              <span className="uppercase tracking-wide">
                                {agg?.toUpperCase()} {value}
                              </span>
                              <span className="opacity-60">·</span>
                              <span className="truncate">por {groupBy}</span>
                              <span className="opacity-60">·</span>
                              <span>Top {top}</span>
                            </div>

                            {!canUseAggregate && (
                              <div className="mt-1 text-[11px] text-amber-200/90">
                                No soportado todavía
                              </div>
                            )}
                          </div>

                          <ChevronRight className="w-4 h-4 suggested-chevron" color="#fff" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

       {aggData && (() => {
  // 🔒 Sanitiza data para que Recharts nunca reciba NaN/undefined
  const safeChartData = (chartData ?? [])
    .map((d: any) => {
      const rawName = d?.name ?? d?.key ?? "-";
      const rawValue = d?.value;

      const num =
        typeof rawValue === "string"
          ? Number(rawValue.replace(/\./g, "").replace(",", ".")) // "1.234,56" -> 1234.56
          : Number(rawValue);

      return {
        name: String(rawName),
        value: Number.isFinite(num) ? num : NaN,
      };
    })
    .filter((d) => d.name && Number.isFinite(d.value));

  // KPIs
  const values = safeChartData.map((d) => d.value);
  const count = values.length;
  const total = values.reduce((a, b) => a + b, 0);
  const avg = count ? total / count : 0;
  const min = count ? Math.min(...values) : 0;
  const max = count ? Math.max(...values) : 0;

  const maxItem =
    safeChartData.reduce(
      (best, cur) => (cur.value > best.value ? cur : best),
      safeChartData[0] ?? { name: "-", value: 0 }
    ) ?? { name: "-", value: 0 };

  const fmt = (n: number) =>
    Number.isFinite(n)
      ? n.toLocaleString(undefined, { maximumFractionDigits: 2 })
      : "-";

  // Pie totals
  const pieTotal = safeChartData.reduce((a, b) => a + b.value, 0);
  const MIN_PCT_TO_LABEL = 0.03;
  const formatPct = (pct: number) => `${Math.round(pct * 100)}%`;

  const chartKey = `${activeSpec?.type}-${aggData.fileId}-${aggData.groupBy}-${aggData.value}-${aggData.agg}-${aggData.sheet}`;

  return (
    <div className="app-section mx-auto max-w-[1400px] w-full chart-panel overflow-hidden">
      {/* Header */}
      <div className="chart-header px-6 py-5">
        <div className="chart-header-center">
          <h2 className="chart-title">{activeSpec?.title ?? "Chart"}</h2>

          <p className="chart-sub">
            {aggData.agg.toUpperCase()}({aggData.value}) by {aggData.groupBy}
            <span className="mx-2 text-white/30">•</span>
            <span className="uppercase tracking-widest text-white/55">
              {activeSpec?.type}
            </span>
          </p>

          <div className="mt-3 chart-meta">
            {chartLoading ? (
              <span className="chart-meta-pill">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading chart…
              </span>
            ) : (
              <span className="chart-meta-pill">
                Items: <b className="text-white/90">{safeChartData.length}</b>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="chart-body px-6 pb-6 pt-5">
        {/* KPI Row */}
        <div className="chart-kpis mb-5">
          <div className="chart-kpi">
            <div className="chart-kpi-label">TOTAL</div>
            <div className="chart-kpi-value">{fmt(total)}</div>
          </div>

          <div className="chart-kpi">
            <div className="chart-kpi-label">AVERAGE</div>
            <div className="chart-kpi-value">{fmt(avg)}</div>
          </div>

          <div className="chart-kpi">
            <div className="chart-kpi-label">MAX</div>
            <div className="chart-kpi-value">{fmt(max)}</div>
            <div
              className="chart-kpi-sub truncate"
              title={String(maxItem?.name ?? "-")}
            >
              {String(maxItem?.name ?? "-")}
            </div>
          </div>

          <div className="chart-kpi">
            <div className="chart-kpi-label">MIN</div>
            <div className="chart-kpi-value">{fmt(min)}</div>
          </div>

          <div className="chart-kpi">
            <div className="chart-kpi-label">ITEMS</div>
            <div className="chart-kpi-value">{fmt(count)}</div>
          </div>
        </div>

        {/* Chart box */}
        <div className="chart-box">
          <div className="chart-box-inner">
            {safeChartData.length === 0 ? (
              <div className="p-6 text-sm text-white/60">
                No chartable numeric data. (Values are empty/invalid or not numeric.)
              </div>
            ) : (
              <ResponsiveContainer key={chartKey} width="100%" height="100%">
                {activeSpec?.type === "line" ? (
                  <LineChart
                    data={safeChartData}
                    margin={{ top: 14, right: 20, left: 8, bottom: 14 }}
                  >
                    <XAxis
                      dataKey="name"
                      tick={{ fill: "rgba(255,255,255,0.80)", fontSize: 11 }}
                      axisLine={{ stroke: "rgba(255,255,255,0.18)" }}
                      tickLine={{ stroke: "rgba(255,255,255,0.18)" }}
                    />
                    <YAxis
                      tick={{ fill: "rgba(255,255,255,0.80)", fontSize: 11 }}
                      axisLine={{ stroke: "rgba(255,255,255,0.18)" }}
                      tickLine={{ stroke: "rgba(255,255,255,0.18)" }}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "rgba(10, 12, 16, 0.92)",
                        border: "1px solid rgba(255,255,255,0.10)",
                        borderRadius: 14,
                        padding: "10px 12px",
                      }}
                      labelStyle={{ color: "rgba(255,255,255,0.85)" }}
                      itemStyle={{ color: "rgba(255,255,255,0.92)" }}
                    />
                    <Line
                      dataKey="value"
                      stroke="rgba(33,163,102,0.95)"
                      strokeWidth={2.25}
                      dot={false}
                      activeDot={{ r: 5 }}
                      isAnimationActive={false}
                    />
                  </LineChart>
                ) : activeSpec?.type === "pie" ? (
                  <PieChart>
                    <Tooltip
                      contentStyle={{
                        background: "rgba(10, 12, 16, 0.92)",
                        border: "1px solid rgba(255,255,255,0.10)",
                        borderRadius: 14,
                        padding: "10px 12px",
                      }}
                      labelStyle={{ color: "rgba(255,255,255,0.85)" }}
                      itemStyle={{ color: "rgba(255,255,255,0.92)" }}
                      formatter={(v: any) => {
                        const n = Number(v) || 0;
                        const pct = pieTotal ? n / pieTotal : 0;
                        return [`${n.toLocaleString()} (${formatPct(pct)})`, "Value"];
                      }}
                    />

                    <Legend
                      verticalAlign="bottom"
                      align="center"
                      wrapperStyle={{
                        color: "rgba(255,255,255,0.80)",
                        fontSize: 11,
                        paddingTop: 8,
                      }}
                    />

                    <Pie
                      data={safeChartData}
                      dataKey="value"
                      nameKey="name"
                      outerRadius="88%"
                      innerRadius="58%"     // ✅ dona
                      paddingAngle={0}
                      labelLine={true}
                      isAnimationActive={false}
                      label={(props: any) => {
                        const { name, value } = props;
                        const n = Number(value) || 0;
                        const pct = pieTotal ? n / pieTotal : 0;
                        if (pct < MIN_PCT_TO_LABEL) return "";
                        return `${name} ${formatPct(pct)}`;
                      }}
                    >
                      {safeChartData.map((d, idx) => (
                        <Cell
                          key={d.name}
                          fill={[
                            "rgba(33,163,102,0.95)",
                            "rgba(88,190,73,0.92)",
                            "rgba(37,165,90,0.92)",
                            "rgba(51,192,74,0.92)",
                            "rgba(185,209,92,0.90)",
                            "rgba(14,109,59,0.92)",
                            "rgba(26,144,86,0.92)",
                            "rgba(73,214,122,0.92)",
                          ][idx % 8]}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                ) : (
                  <BarChart
                    data={safeChartData}
                    margin={{ top: 14, right: 20, left: 8, bottom: 14 }}
                  >
                    <XAxis
                      dataKey="name"
                      tick={{ fill: "rgba(255,255,255,0.80)", fontSize: 11 }}
                      axisLine={{ stroke: "rgba(255,255,255,0.18)" }}
                      tickLine={{ stroke: "rgba(255,255,255,0.18)" }}
                    />
                    <YAxis
                      tick={{ fill: "rgba(255,255,255,0.80)", fontSize: 11 }}
                      axisLine={{ stroke: "rgba(255,255,255,0.18)" }}
                      tickLine={{ stroke: "rgba(255,255,255,0.18)" }}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(33,163,102,0.08)" }}
                      contentStyle={{
                        background: "rgba(10, 12, 16, 0.92)",
                        border: "1px solid rgba(255,255,255,0.10)",
                        borderRadius: 14,
                        padding: "10px 12px",
                      }}
                      labelStyle={{ color: "rgba(255,255,255,0.85)" }}
                      itemStyle={{ color: "rgba(255,255,255,0.92)" }}
                    />

                    <Bar
                      dataKey="value"
                      radius={[12, 12, 6, 6]}
                      maxBarSize={54}
                      isAnimationActive={false}
                    >
                      {safeChartData.map((d, idx) => (
                        <Cell
                          key={d.name}
                          fill={[
                            "rgba(33,163,102,0.95)",
                            "rgba(88,190,73,0.94)",
                            "rgba(37,165,90,0.94)",
                            "rgba(51,192,74,0.94)",
                            "rgba(185,209,92,0.90)",
                            "rgba(14,109,59,0.94)",
                            "rgba(26,144,86,0.94)",
                            "rgba(73,214,122,0.92)",
                          ][idx % 8]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                )}
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
})()}


        {/* Preview + Profile */}
        {preview && (
          <div className="app-section mx-auto max-w-[1400px] w-full">
            <div className="flex flex-row gap-6 items-stretch">
              {/* PREVIEW */}
              <div className="relative excel-sheet-real flex-1 min-w-0 overflow-hidden">
                <div className="excel-sheet-real-header px-5 py-3">
                  <div className="flex items-center justify-between">
                    <div className="text-center flex-1">
                      <h2 className="font-semibold text-[#111827]">Preview</h2>
                      <p className="mt-1 text-[11px] text-[#6B7280]">
                        Columns: {preview.columns.length} • Rows: {previewRows.length}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={exportPreviewCSV}
                      className="btn-reset p-2 rounded-xl hover:bg-black/5 active:scale-95 transition cursor-pointer"
                      title="Export CSV"
                    >
                      <Download className="w-5 h-5" color="#111827" />
                    </button>
                  </div>
                </div>

                <div
                  ref={sheetRef}
                  tabIndex={0}
                  onKeyDown={onSheetKeyDown}
                  onPaste={(e) => {
                    if (editingCell) return;
                    const text = e.clipboardData.getData("text");
                    if (!text) return;
                    e.preventDefault();
                    applyPasteText(text);
                  }}
                  onMouseDown={() => sheetRef.current?.focus()}
                  className="excel-sheet-real-scroll outline-none"
                  title="Click aquí. Flechas: mover. Enter/Doble click: editar. Ctrl+C: copiar. Ctrl+V: pegar."
                >
                  <table className="excel-real-table">
                    <thead>
                      <tr>
                        <th className="excel-real-corner" />
                        {preview.columns.map((_, colIdx) => (
                          <th key={colIdx} className="excel-real-colletter">
                            {toExcelCol(colIdx)}
                          </th>
                        ))}
                      </tr>

                      <tr>
                        <th className="excel-real-rowhead" />
                        {preview.columns.map((c, colIdx) => (
                          <th key={colIdx} className="excel-real-th">
                            {c}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      {previewRows.map((row, r) => (
                        <tr key={r} className="excel-real-tr">
                          <td className="excel-real-rownum">{r + 1}</td>

                          {row.map((cell, c) => {
                            const isSelected = selectedCell?.r === r && selectedCell?.c === c;
                            const isEditing = editingCell?.r === r && editingCell?.c === c;

                            return (
                              <td
                                key={c}
                                className={["excel-real-td", isSelected ? "excel-real-selected" : ""].join(" ")}
                                onClick={() => setSelectedCell({ r, c })}
                                onDoubleClick={() => startEdit(r, c)}
                              >
                                {isEditing ? (
                                  <input
                                    autoFocus
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onBlur={commitEdit}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        commitEdit();
                                      }
                                      if (e.key === "Escape") {
                                        e.preventDefault();
                                        cancelEdit();
                                      }
                                    }}
                                    className="excel-edit-input"
                                  />
                                ) : (
                                  cell
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* PROFILE */}
              <div className="relative profile-panel w-[360px] shrink-0 overflow-hidden">
                <div className="relative profile-header px-5 py-4">
                  <div className="text-center">
                    <h2 className="font-semibold text-white">Data Profile</h2>
                    <p className="mt-1 text-[11px] text-white/60">Header row: {profile?.headerRowIndex ?? "-"}</p>
                  </div>
                </div>

                <div className="profile-body max-h-[520px] overflow-auto p-5 space-y-4">
                  {profile?.columns.map((col) => {
                    const total = Math.max(1, (col.emptyCount ?? 0) + (col.nonEmptyCount ?? 0));
                    const emptyPct = Math.round(((col.emptyCount ?? 0) / total) * 100);

                    return (
                      <div key={col.index} className="profile-card">
                        <div className="profile-card-top">
                          <div className="min-w-0">
                            <div className="profile-colname" title={col.originalName}>
                              {col.originalName}
                            </div>
                            <div className="profile-sub">
                              normalized:{" "}
                              <span className="profile-sub-strong">{col.normalizedName}</span>
                            </div>
                          </div>

                          <span className="profile-type">{col.inferredType}</span>
                        </div>

                        <div className="profile-metrics">
                          <div className="profile-metric">
                            <div className="profile-metric-label">empty</div>
                            <div className="profile-metric-value">{col.emptyCount}</div>
                          </div>
                          <div className="profile-metric">
                            <div className="profile-metric-label">non-empty</div>
                            <div className="profile-metric-value">{col.nonEmptyCount}</div>
                          </div>
                          <div className="profile-metric">
                            <div className="profile-metric-label">unique</div>
                            <div className="profile-metric-value">{col.uniqueCount}</div>
                          </div>
                        </div>

                        <div className="profile-barwrap">
                          <div className="profile-barlabel">
                            <span>empty rate</span>
                            <span className="profile-barpct">{emptyPct}%</span>
                          </div>
                          <div className="profile-bar">
                            <div className="profile-barfill" style={{ width: `${emptyPct}%` }} />
                          </div>
                        </div>

                        {col.examples?.length > 0 && (
                          <div className="profile-examples">
                            <div className="profile-examples-label">examples</div>
                            <div className="profile-examples-list">
                              {col.examples.slice(0, 6).map((ex, i) => (
                                <span key={i} className="profile-chip" title={ex}>
                                  {ex}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <footer className="app-footer">
        <div className="app-footer-inner app-footer-center">
          <div className="app-footer-row">
            <span>© {new Date().getFullYear()} — Excel Assistant AI</span>
            <span className="app-footer-sep">•</span>
            <span>
              Built by <span className="app-footer-me">Brahian Moya</span>
            </span>
            <span className="app-footer-sep">•</span>
            <a
              href="https://github.com/Brahian-Ink"
              target="_blank"
              rel="noreferrer"
              className="app-footer-me app-footer-link-ai"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
