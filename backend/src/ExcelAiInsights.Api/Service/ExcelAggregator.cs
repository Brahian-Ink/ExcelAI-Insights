using ClosedXML.Excel;
using System.Globalization;

namespace ExcelAiInsights.Api.Services;

public sealed class ExcelAggregator
{
    public AggregateResult Aggregate(
        string filePath,
        string groupByColumn,
        string valueColumn,
        string agg,
        int? maxRows = null,
        string? sheetName = null)
    {
        using var wb = new XLWorkbook(filePath);

        var ws = !string.IsNullOrWhiteSpace(sheetName) && wb.TryGetWorksheet(sheetName, out var named)
            ? named
            : wb.Worksheets.First();

        var range = ws.RangeUsed();
        if (range is null)
            return new AggregateResult([], ws.Name);

        // Assume header is first row of used range (similar to your preview)
        var headerRow = range.FirstRowUsed();
        var firstDataRow = headerRow.RowBelow();

        // Map column names -> index
        var headerCells = headerRow.Cells().ToList();
        int FindColIndex(string colName)
        {
            for (int i = 0; i < headerCells.Count; i++)
            {
                var h = headerCells[i].GetString().Trim();
                if (string.Equals(h, colName, StringComparison.OrdinalIgnoreCase))
                    return i + 1; // 1-based in ClosedXML
            }
            return -1;
        }

        var groupIdx = FindColIndex(groupByColumn);
        var valueIdx = FindColIndex(valueColumn);

        if (groupIdx == -1)
            throw new InvalidOperationException($"Column '{groupByColumn}' not found.");
        if (valueIdx == -1)
            throw new InvalidOperationException($"Column '{valueColumn}' not found.");

        agg = agg.Trim().ToLowerInvariant();
        if (agg is not ("sum" or "avg" or "count" or "min" or "max"))
            throw new InvalidOperationException("agg must be one of: sum, avg, count, min, max");

        var dict = new Dictionary<string, AggState>(StringComparer.OrdinalIgnoreCase);

        int processed = 0;
        foreach (var row in range.RowsUsed().Skip(1)) // skip header
        {
            if (maxRows is not null && processed >= maxRows.Value)
                break;

            var key = row.Cell(groupIdx).GetString().Trim();
            if (string.IsNullOrWhiteSpace(key))
                continue;

            double val = 0;

            if (agg != "count")
            {
                // Parse numeric robustly: supports "7,5" or "7.5"
                var raw = row.Cell(valueIdx).GetString().Trim();
                if (string.IsNullOrWhiteSpace(raw))
                    continue;

                raw = raw.Replace(" ", "");

                // try dot first, then comma
                if (!double.TryParse(raw, NumberStyles.Any, CultureInfo.InvariantCulture, out val))
                {
                    var comma = raw.Replace(",", ".");
                    if (!double.TryParse(comma, NumberStyles.Any, CultureInfo.InvariantCulture, out val))
                        continue;
                }
            }

            if (!dict.TryGetValue(key, out var state))
            {
                state = new AggState();
                dict[key] = state;
            }

            state.Add(val, agg);
            processed++;
        }

        // finalize
        var points = dict
            .Select(kvp => new AggregatePointInternal(kvp.Key, kvp.Value.Finalize(agg)))
            .OrderByDescending(p => p.Value) // default sorting
            .ToList();

        return new AggregateResult(points.Select(p => (p.Key, p.Value)).ToList(), ws.Name);
    }

    private sealed class AggState
    {
        public double Sum { get; private set; }
        public int Count { get; private set; }
        public double? Min { get; private set; }
        public double? Max { get; private set; }

        public void Add(double val, string agg)
        {
            Count++;
            Sum += val;

            Min = Min is null ? val : Math.Min(Min.Value, val);
            Max = Max is null ? val : Math.Max(Max.Value, val);
        }

        public double Finalize(string agg) => agg switch
        {
            "sum" => Sum,
            "avg" => Count == 0 ? 0 : Sum / Count,
            "count" => Count,
            "min" => Min ?? 0,
            "max" => Max ?? 0,
            _ => Sum
        };
    }

    private readonly record struct AggregatePointInternal(string Key, double Value);
}

public sealed record AggregateResult(List<(string Key, double Value)> Data, string SheetName);
