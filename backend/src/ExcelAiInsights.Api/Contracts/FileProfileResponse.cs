namespace ExcelAiInsights.Api.Contracts;

public sealed class FileProfileResponse
{

    public int HeaderRowIndex { get; init; } // 1-based row number in Excel
    public List<ColumnProfile> Columns { get; init; } = [];
}

public sealed class ColumnProfile
{
    public int Index { get; init; } // 1-based column index
    public string OriginalName { get; init; } = "";
    public string NormalizedName { get; init; } = "";
    public string InferredType { get; init; } = "text"; // text|number|date|bool|mixed|empty
    public int NonEmptyCount { get; init; }
    public int EmptyCount { get; init; }
    public int UniqueCount { get; init; }
    public List<string> Examples { get; init; } = [];
}
