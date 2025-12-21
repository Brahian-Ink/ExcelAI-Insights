namespace ExcelAiInsights.Api.Contracts;

public sealed class AiInsightsResponse
{
    public string Summary { get; init; } = "";
    public List<string> KeyFindings { get; init; } = [];
    public List<string> DataQualityWarnings { get; init; } = [];
    public List<string> SuggestedCharts { get; init; } = [];
}
