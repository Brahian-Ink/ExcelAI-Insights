
export type AggregatePoint = { key: string; value: number };

export type AggregateResponse = {
  fileId: string;
  sheet: string;
  groupBy: string;
  value: string;
  agg: string;
  data: AggregatePoint[];
};
export type ChartSpec = {
  title: string;
  type: "bar" | "line" | "pie" | "scatter";
  groupBy?: string;
  value?: string;
  x?: string;
  y?: string;
  agg?: "sum" | "avg" | "count" | "min" | "max";
  top?: number;
};
export async function getAggregate(params: {
  fileId: string;
  groupBy: string;
  value: string;
  agg?: string;
  top?: number;
  sheet?: string;
  columnsMap?: Record<string, string>; // normalized -> original
}) {
  const { fileId, groupBy, value, agg = "sum", top = 10, sheet, columnsMap } = params;

  const groupByNorm = normalizeHeader(groupBy);
  const valueNorm = normalizeHeader(value);

  const groupByResolved = columnsMap?.[groupByNorm] ?? groupBy;
  const valueResolved = columnsMap?.[valueNorm] ?? value;

  const qs = new URLSearchParams();
  qs.set("groupBy", groupByResolved);
  qs.set("value", valueResolved);
  qs.set("agg", agg);
  qs.set("top", String(top));
  if (sheet) qs.set("sheet", sheet);

  const res = await fetch(`${API_BASE}/api/files/${fileId}/aggregate?${qs.toString()}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}



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
  suggestedCharts: ChartSpec[];
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

function normalizeHeader(s: string) {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

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
