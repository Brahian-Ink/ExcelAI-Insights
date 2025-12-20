export type UploadResponse = {
  fileId: string;
  originalName: string;
  sizeBytes: number;
};

export type PreviewResponse = {
  columns: string[];
  rows: string[][];
};

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
