import './index.css'
import { useState } from "react";
import { getPreview, uploadExcel, type PreviewResponse, type UploadResponse } from "./api/files";

export default function App() {
  const [file, setFile] = useState<File | null>(null);

  const [upload, setUpload] = useState<UploadResponse | null>(null);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleUploadAndPreview() {
    if (!file) return;

    try {
      setError("");
      setLoading(true);
      setUpload(null);
      setPreview(null);

      const up = await uploadExcel(file);
      setUpload(up);

      const pv = await getPreview(up.fileId);
      setPreview(pv);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-6">
      <div className="mx-auto w-full max-w-6xl">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold">Excel AI Insights</h1>
          <p className="text-sm text-neutral-400">
            Upload an .xlsx file and preview the first 20 rows.
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
              {loading ? "Working..." : "Upload + Preview"}
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

        {preview && (
          <div className="mt-6 overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900">
            <div className="border-b border-neutral-800 px-4 py-3">
              <h2 className="font-semibold">Preview (first 20 rows)</h2>
              <p className="text-sm text-neutral-400">
                Columns: {preview.columns.length} • Rows: {preview.rows.length}
              </p>
            </div>

            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 bg-neutral-900">
                  <tr className="border-b border-neutral-800">
                    {preview.columns.map((c) => (
                      <th key={c} className="px-3 py-2 text-left font-semibold text-neutral-200">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {preview.rows.map((row, idx) => (
                    <tr key={idx} className="border-b border-neutral-800/70 hover:bg-neutral-800/30">
                      {row.map((cell, cidx) => (
                        <td key={cidx} className="px-3 py-2 text-neutral-200">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
