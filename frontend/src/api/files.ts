export type UploadResponse = {
  fileId: string;
  originalName: string;
  sizeBytes: number;
};

export type PreviewResponse = {
  columns: string[];
  rows: string[][];
};
export type ColumnProfile = {
  index: number;
  originalName: string;
  normalizedName: string;
  inferredType: "text" | "number" | "date" | "bool" | "mixed" | "empty" | string;
  nonEmptyCount: number;
  emptyCount: number;
  uniqueCount: number;
  examples: string[];
};

export type ProfileResponse = {
  headerRowIndex: number;
  columns: ColumnProfile[];
};
export type AiInsightsResponse = {
  summary: string;
  keyFindings: string[];
  dataQualityWarnings: string[];
  suggestedCharts: string[];
};

export async function getInsights(fileId: string): Promise<AiInsightsResponse> {
  const res = await fetch(`${API_BASE}/api/files/${fileId}/insights`, { method: "POST" });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Insights failed");
  }
  return res.json();
}

export async function getProfile(fileId: string): Promise<ProfileResponse> {
  const res = await fetch(`${API_BASE}/api/files/${fileId}/profile`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Profile failed");
  }
  return res.json();
}

const API_BASE = "http://localhost:5125";

export async function uploadExcel(file: File): Promise<UploadResponse> {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch(`${API_BASE}/api/files/upload`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Upload failed");
  }

  return res.json();
}

export async function getPreview(fileId: string): Promise<PreviewResponse> {
  const res = await fetch(`${API_BASE}/api/files/${fileId}/preview`);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Preview failed");
  }

  return res.json();
}
