namespace ExcelAiInsights.Api.Contracts;

public sealed class AiInsightsResponse
{
    public string Summary { get; init; } = "";
    public List<string> KeyFindings { get; init; } = [];
    public List<string> DataQualityWarnings { get; init; } = [];
    public List<ChartSpec> SuggestedCharts { get; init; } = [];
}

public sealed class ChartSpec
{
    public string Title { get; init; } = "";
    public string Type { get; init; } = "";     // "bar" | "pie" | "line" | "scatter"
    public string GroupBy { get; init; } = "";  // for bar/pie
    public string Value { get; init; } = "";    // for bar/pie (metric)
    public string Agg { get; init; } = "sum";   // sum|avg|count|min|max
    public int Top { get; init; } = 10;
}
