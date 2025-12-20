import './index.css'
import { useState } from "react";
import { uploadExcel, type UploadResponse } from "./api/files";

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<UploadResponse | null>(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function handleUpload() {
    if (!file) return;

    try {
      setError("");
      setResult(null);
      setLoading(true);

      const data = await uploadExcel(file);
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-6">
      <div className="w-full max-w-xl rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
        <h1 className="text-2xl font-semibold">Excel AI Insights</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Upload a .xlsx file to generate a fileId (temporary storage).
        </p>

        <div className="mt-6 space-y-3">
          <input
            type="file"
            accept=".xlsx"
            className="block w-full text-sm file:mr-4 file:rounded-xl file:border-0 file:bg-neutral-800 file:px-4 file:py-2 file:text-neutral-100 hover:file:bg-neutral-700"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />

          <button
            onClick={handleUpload}
            disabled={!file || loading}
            className="w-full rounded-xl bg-white px-4 py-2 text-neutral-900 font-semibold disabled:opacity-50"
          >
            {loading ? "Uploading..." : "Upload"}
          </button>

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
              {error}
            </div>
          )}

          {result && (
            <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3 text-sm">
              <div><span className="text-neutral-400">fileId:</span> {result.fileId}</div>
              <div><span className="text-neutral-400">originalName:</span> {result.originalName}</div>
              <div><span className="text-neutral-400">sizeBytes:</span> {result.sizeBytes}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
