export type UploadResponse = {
  fileId: string;
  originalName: string;
  sizeBytes: number;
};

export async function uploadExcel(file: File): Promise<UploadResponse> {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch("http://localhost:5125/api/files/upload", {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Upload failed");
  }

  return res.json();
}
