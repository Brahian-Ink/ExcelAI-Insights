namespace ExcelAiInsights.Api.Contracts;

public sealed record FileUploadResponse(
    string FileId,
    string OriginalName,
    long SizeBytes
);
