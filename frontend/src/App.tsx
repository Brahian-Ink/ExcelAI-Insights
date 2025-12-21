import "./index.css";
import { useState } from "react";
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
} from "recharts";

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

      const up = await uploadExcel(file);
      setUpload(up);

      const [pv, pf] = await Promise.all([
        getPreview(up.fileId),
        getProfile(up.fileId),
      ]);

      setPreview(pv);
      setProfile(pf);
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
      });

      setAggData(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setChartLoading(false);
    }
  }

  // Data para charts
  const chartData =
    aggData?.data?.map((d) => ({ name: d.key, value: d.value })) ?? [];

  // “AI palette” suave (no fijamos colores exactos al bar/line, solo para pie)
  const pieColors = [
    "rgba(49,177,214,0.85)",
    "rgba(89,98,211,0.85)",
    "rgba(239,120,122,0.85)",
    "rgba(185,209,92,0.85)",
    "rgba(37,165,90,0.85)",
    "rgba(88,190,73,0.85)",
  ];

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto w-full max-w-6xl">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">
                Excel AI Insights
              </h1>
              <span className="ai-badge">AI</span>
            </div>
            <p className="mt-1 text-sm subtle">
              Minimal • Excel-ish • Upload → Profile → Insights → Charts
            </p>
          </div>

          {upload && (
            <div className="pill px-3 py-2 text-xs">
              <div className="font-semibold">fileId</div>
              <div className="subtle">{upload.fileId}</div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="card p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <input
              type="file"
              accept=".xlsx"
              className="fileinput w-full text-sm"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />

            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleUploadAndPreview}
                disabled={!file || loading}
                className="btn btn-primary"
              >
                {loading ? "Uploading..." : "Upload"}
              </button>

              <button
                onClick={handleInsights}
                disabled={!upload?.fileId || insightsLoading}
                className="btn"
              >
                {insightsLoading ? "Thinking..." : insights ? "Re-Insights" : "Insights"}
              </button>
            </div>
          </div>

          {upload && (
            <div className="mt-3 text-sm subtle">
              <span className="font-semibold text-[var(--text)]">
                {upload.originalName}
              </span>{" "}
              • {upload.sizeBytes} bytes
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-800">
              {error}
            </div>
          )}
        </div>

        {/* Suggested charts */}
        {insights?.suggestedCharts?.length ? (
          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-semibold">Suggested charts</div>
              <div className="text-xs subtle">click to render</div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {insights.suggestedCharts.map((c, i) => {
                const title = c.title || `${c.type} chart`;
                const groupBy = c.groupBy ?? "-";
                const value = c.value ?? "-";
                const agg = c.agg ?? "sum";
                const top = c.top ?? 10;

                const canUseAggregate =
                  (c.type === "bar" || c.type === "pie" || c.type === "line") &&
                  !!c.groupBy &&
                  !!c.value;

                return (
                  <button
                    key={i}
                    type="button"
                    disabled={!upload?.fileId || !canUseAggregate || chartLoading}
                    onClick={() => handleLoadChartFromSpec(c)}
                    className="card hovercard ai-sheen p-4 text-left disabled:opacity-50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold">{title}</div>
                        <div className="mt-1 text-xs subtle">
                          {c.type} • {agg}({value}) by {groupBy} • top {top}
                        </div>
                      </div>

                      <span className="btn btn-mini">
                        {c.type.toUpperCase()}
                      </span>
                    </div>

                    {!canUseAggregate && (
                      <div className="mt-2 text-xs text-amber-900">
                        Not supported yet
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* Chart */}
        {aggData && (
          <div className="mt-6 card p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">
                  {activeSpec?.title ?? "Chart"}
                </h2>
                <p className="text-sm subtle">
                  {aggData.agg.toUpperCase()}({aggData.value}) by {aggData.groupBy}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="pill px-3 py-1 text-xs">
                  {aggData.data.length} groups
                </span>
                <span className="pill px-3 py-1 text-xs">
                  {activeSpec?.type?.toUpperCase() ?? "CHART"}
                </span>
              </div>
            </div>

            <div className="mt-4 h-[380px]">
              <ResponsiveContainer width="100%" height="100%">
                {activeSpec?.type === "line" ? (
                  <LineChart data={chartData}>
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Line dataKey="value" strokeWidth={2} dot={false} />
                  </LineChart>
                ) : activeSpec?.type === "pie" ? (
                  <PieChart>
                    <Tooltip />
                    <Pie
                      data={chartData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius="62%"   /* DONA */
                      outerRadius="86%"
                      paddingAngle={2}
                    >
                      {chartData.map((_, idx) => (
                        <Cell
                          key={idx}
                          fill={pieColors[idx % pieColors.length]}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                ) : (
                  <BarChart data={chartData}>
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" radius={[10, 10, 4, 4]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Preview + Profile */}
        {preview && (
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* TABLE */}
            <div className="card lg:col-span-2 overflow-hidden">
              <div className="border-b border-[var(--border)] px-4 py-3">
                <h2 className="font-semibold">Preview</h2>
                <p className="text-sm subtle">
                  Columns: {preview.columns.length} • Rows: {preview.rows.length}
                </p>
              </div>

              <div className="overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 bg-white">
                    <tr className="border-b border-[var(--border)]">
                      {preview.columns.map((c) => (
                        <th
                          key={c}
                          className="px-3 py-2 text-left font-semibold whitespace-nowrap"
                        >
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {preview.rows.map((row, idx) => (
                      <tr
                        key={idx}
                        className="border-b border-[var(--border)]/70 hover:bg-[var(--bg2)]"
                      >
                        {row.map((cell, cidx) => (
                          <td key={cidx} className="px-3 py-2 whitespace-nowrap">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* PROFILE */}
            <div className="card overflow-hidden">
              <div className="border-b border-[var(--border)] px-4 py-3">
                <h2 className="font-semibold">Data Profile</h2>
                <p className="text-sm subtle">Header row: {profile?.headerRowIndex ?? "-"}</p>
              </div>

              <div className="max-h-[560px] overflow-auto p-4 space-y-3">
                {profile?.columns.map((col) => (
                  <div
                    key={col.index}
                    className="rounded-2xl border border-[var(--border)] bg-white p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold">{col.originalName}</div>
                        <div className="text-xs subtle">
                          normalized:{" "}
                          <span className="font-semibold">{col.normalizedName}</span>
                        </div>
                      </div>

                      <span className="pill px-3 py-1 text-xs">
                        {col.inferredType}
                      </span>
                    </div>

                    <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-2">
                        <div className="subtle">empty</div>
                        <div className="font-semibold">{col.emptyCount}</div>
                      </div>
                      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-2">
                        <div className="subtle">non-empty</div>
                        <div className="font-semibold">{col.nonEmptyCount}</div>
                      </div>
                      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-2">
                        <div className="subtle">unique</div>
                        <div className="font-semibold">{col.uniqueCount}</div>
                      </div>
                    </div>

                    {col.examples.length > 0 && (
                      <div className="mt-2 text-xs subtle">
                        examples:{" "}
                        <span className="font-semibold">
                          {col.examples.join(" • ")}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Insights text */}
        {insights && (
          <div className="mt-6 card p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">AI Insights</h2>
              <span className="ai-badge">structured JSON</span>
            </div>

            <div className="mt-3 text-sm">
              <div className="subtle">Summary</div>
              <div className="mt-1">{insights.summary}</div>
            </div>

            {insights.keyFindings?.length > 0 && (
              <div className="mt-4">
                <div className="text-sm font-semibold">Key findings</div>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                  {insights.keyFindings.map((k, i) => (
                    <li key={i}>{k}</li>
                  ))}
                </ul>
              </div>
            )}

            {insights.dataQualityWarnings?.length > 0 && (
              <div className="mt-4">
                <div className="text-sm font-semibold">Data quality warnings</div>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                  {insights.dataQualityWarnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
