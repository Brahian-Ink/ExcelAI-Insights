namespace ExcelAiInsights.Api.Contracts;

public sealed class AggregateResponse
{
    public string FileId { get; init; } = "";
    public string Sheet { get; init; } = "Sheet1";
    public string GroupBy { get; init; } = "";
    public string Value { get; init; } = "";
    public string Agg { get; init; } = "";
    public List<AggregatePoint> Data { get; init; } = [];
}

public sealed class AggregatePoint
{
    public string Key { get; init; } = "";
    public double Value { get; init; }
}
