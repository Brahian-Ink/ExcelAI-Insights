namespace ExcelAiInsights.Api.Contracts;

public sealed class FilePreviewResponse
{
    public List<string> Columns { get; init; } = [];
    public List<List<string>> Rows { get; init; } = [];
}
