import "./index.css";
import { useState } from "react";
import {
  uploadExcel,
  getPreview,
  getProfile,
  getInsights,
  type UploadResponse,
  type PreviewResponse,
  type ProfileResponse,
  type AiInsightsResponse,
} from "./api/files";

export default function App() {
  const [file, setFile] = useState<File | null>(null);

  const [upload, setUpload] = useState<UploadResponse | null>(null);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [profile, setProfile] = useState<ProfileResponse | null>(null);

  const [insights, setInsights] = useState<AiInsightsResponse | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);

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

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-6">
      <div className="mx-auto w-full max-w-6xl">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold">Excel AI Insights</h1>
          <p className="text-sm text-neutral-400">
            Upload an .xlsx file, preview the first rows, profile the schema, and generate AI insights.
          </p>
        </header>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              type="file"
              accept=".xlsx"
              className="block w-full text-sm file:mr-4 file:rounded-xl file:border-0 file:bg-neutral-800 file:px-4 file:py-2 file:text-neutral-100 hover:file:bg-neutral-700"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />

            <button
              onClick={handleUploadAndPreview}
              disabled={!file || loading}
              className="rounded-xl bg-white px-4 py-2 font-semibold text-neutral-900 disabled:opacity-50"
            >
              {loading ? "Uploading..." : "Upload + Preview"}
            </button>

            <button
              onClick={handleInsights}
              disabled={!upload?.fileId || insightsLoading}
              className="rounded-xl bg-neutral-200 px-4 py-2 font-semibold text-neutral-900 disabled:opacity-50"
            >
              {insights ? "Regenerate AI Insights" : "Generate AI Insights"}
            </button>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
              {error}
            </div>
          )}

          {upload && (
            <div className="mt-4 text-sm text-neutral-300">
              <span className="text-neutral-400">Uploaded:</span>{" "}
              {upload.originalName} • {upload.sizeBytes} bytes •{" "}
              <span className="text-neutral-400">fileId:</span> {upload.fileId}
            </div>
          )}
        </div>

        {insights && (
          <div className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold">AI Insights</h2>
              <span className="text-xs text-neutral-400">model output</span>
            </div>

            {insights.summary && (
              <p className="mt-2 text-sm text-neutral-200">{insights.summary}</p>
            )}

            {insights.keyFindings?.length > 0 && (
              <div className="mt-4">
                <div className="text-sm font-semibold text-neutral-100">Key findings</div>
                <ul className="mt-2 list-disc pl-5 text-sm text-neutral-200 space-y-1">
                  {insights.keyFindings.map((x, i) => (
                    <li key={i}>{x}</li>
                  ))}
                </ul>
              </div>
            )}

            {insights.dataQualityWarnings?.length > 0 && (
              <div className="mt-4">
                <div className="text-sm font-semibold text-neutral-100">Data quality</div>
                <ul className="mt-2 list-disc pl-5 text-sm text-amber-200 space-y-1">
                  {insights.dataQualityWarnings.map((x, i) => (
                    <li key={i}>{x}</li>
                  ))}
                </ul>
              </div>
            )}

            {insights.suggestedCharts?.length > 0 && (
              <div className="mt-4">
                <div className="text-sm font-semibold text-neutral-100">Suggested charts</div>
                <ul className="mt-2 list-disc pl-5 text-sm text-neutral-200 space-y-1">
                  {insights.suggestedCharts.map((x, i) => (
                    <li key={i}>{x}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {preview && (
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* TABLE */}
            <div className="lg:col-span-2 overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900">
              <div className="border-b border-neutral-800 px-4 py-3">
                <h2 className="font-semibold">Preview</h2>
                <p className="text-sm text-neutral-400">
                  Columns: {preview.columns.length} • Rows: {preview.rows.length}
                </p>
              </div>

              <div className="overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 bg-neutral-900">
                    <tr className="border-b border-neutral-800">
                      {preview.columns.map((c) => (
                        <th
                          key={c}
                          className="px-3 py-2 text-left font-semibold text-neutral-200 whitespace-nowrap"
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
                        className="border-b border-neutral-800/70 hover:bg-neutral-800/30"
                      >
                        {row.map((cell, cidx) => (
                          <td
                            key={cidx}
                            className="px-3 py-2 text-neutral-200 whitespace-nowrap"
                          >
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
            <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900">
              <div className="border-b border-neutral-800 px-4 py-3">
                <h2 className="font-semibold">Data Profile</h2>
                <p className="text-sm text-neutral-400">
                  Header row: {profile?.headerRowIndex ?? "-"} • Sampled rows:{" "}
                  {profile
                    ? (profile.columns[0]?.nonEmptyCount ?? 0) +
                      (profile.columns[0]?.emptyCount ?? 0)
                    : "-"}
                </p>
              </div>

              <div className="max-h-[520px] overflow-auto p-4 space-y-3">
                {!profile && (
                  <div className="text-sm text-neutral-400">No profile loaded yet.</div>
                )}

                {profile?.columns.map((col) => (
                  <div
                    key={col.index}
                    className="rounded-xl border border-neutral-800 bg-neutral-950 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold">{col.originalName}</div>
                        <div className="text-xs text-neutral-400">
                          normalized:{" "}
                          <span className="text-neutral-300">{col.normalizedName}</span>
                        </div>
                      </div>

                      <span className="rounded-full border border-neutral-700 bg-neutral-800 px-2 py-1 text-xs">
                        {col.inferredType}
                      </span>
                    </div>

                    <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-neutral-300">
                      <div className="rounded-lg bg-neutral-900 p-2">
                        <div className="text-neutral-400">empty</div>
                        <div className="font-semibold">{col.emptyCount}</div>
                      </div>
                      <div className="rounded-lg bg-neutral-900 p-2">
                        <div className="text-neutral-400">non-empty</div>
                        <div className="font-semibold">{col.nonEmptyCount}</div>
                      </div>
                      <div className="rounded-lg bg-neutral-900 p-2">
                        <div className="text-neutral-400">unique</div>
                        <div className="font-semibold">{col.uniqueCount}</div>
                      </div>
                    </div>

                    {col.examples.length > 0 && (
                      <div className="mt-2 text-xs text-neutral-400">
                        examples:{" "}
                        <span className="text-neutral-300">{col.examples.join(" • ")}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
