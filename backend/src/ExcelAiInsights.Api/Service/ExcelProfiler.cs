using ClosedXML.Excel;
using ExcelAiInsights.Api.Contracts;
using System.Text.RegularExpressions;

namespace ExcelAiInsights.Api.Services;

public sealed class ExcelProfiler
{
    public FileProfileResponse Profile(string path, int scanRows = 25, int sampleRows = 200)
    {
        using var wb = new XLWorkbook(path);
        var ws = wb.Worksheets.First();

        var usedRange = ws.RangeUsed();
        if (usedRange is null)
            return new FileProfileResponse { HeaderRowIndex = 1 };

        var headerRow = DetectHeaderRow(ws, scanRows);
        var headerRowIndex = headerRow.RowNumber();

        var headerCells = headerRow.CellsUsed().ToList();
        var colCount = headerCells.Count;

        // Build column names
        var originalNames = headerCells.Select(c => c.GetString()).ToList();
        var normalizedNames = MakeUnique(originalNames.Select(NormalizeHeader).ToList());

        // Prepare sample rows (below header)
        var dataRows = ws.RowsUsed()
            .Where(r => r.RowNumber() > headerRowIndex)
            .Take(sampleRows)
            .ToList();

        var cols = new List<ColumnProfile>();

        for (int c = 1; c <= colCount; c++)
        {
            var values = new List<string>();

            foreach (var r in dataRows)
            {
                var cell = r.Cell(c);
                var v = cell.GetFormattedString()?.Trim() ?? "";
                values.Add(v);
            }

            var nonEmpty = values.Count(v => !string.IsNullOrWhiteSpace(v));
            var empty = values.Count - nonEmpty;

            var uniques = values
                .Where(v => !string.IsNullOrWhiteSpace(v))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .Count();

            var examples = values
                .Where(v => !string.IsNullOrWhiteSpace(v))
                .Distinct()
                .Take(3)
                .ToList();

            cols.Add(new ColumnProfile
            {
                Index = c,
                OriginalName = originalNames.ElementAtOrDefault(c - 1) ?? $"column_{c}",
                NormalizedName = normalizedNames.ElementAtOrDefault(c - 1) ?? $"column_{c}",
                InferredType = InferType(values),
                NonEmptyCount = nonEmpty,
                EmptyCount = empty,
                UniqueCount = uniques,
                Examples = examples
            });
        }

        return new FileProfileResponse
        {
            HeaderRowIndex = headerRowIndex,
            Columns = cols
        };
    }

    private static IXLRow DetectHeaderRow(IXLWorksheet ws, int scanRows)
    {
        // Score each row: prefer many non-empty stringy cells, fewer pure-numeric cells
        IXLRow best = ws.FirstRowUsed() ?? ws.Row(1);
        double bestScore = double.NegativeInfinity;

        var rows = ws.RowsUsed().Take(scanRows).ToList();
        if (rows.Count == 0) return ws.Row(1);

        foreach (var r in rows)
        {
            var cells = r.CellsUsed().Take(50).ToList();
            if (cells.Count == 0) continue;

            int nonEmpty = cells.Count;
            int stringy = cells.Count(c => LooksLikeHeaderText(c.GetFormattedString()));
            int numeric = cells.Count(c => double.TryParse(c.GetFormattedString(), out _));

            // heuristic score
            var score = (stringy * 2.0) + (nonEmpty * 0.5) - (numeric * 1.5);

            if (score > bestScore)
            {
                bestScore = score;
                best = r;
            }
        }

        return best;
    }

    private static bool LooksLikeHeaderText(string? s)
    {
        if (string.IsNullOrWhiteSpace(s)) return false;
        s = s.Trim();
        if (s.Length < 2) return false;
        // header-like: contains letters, not just numbers
        return Regex.IsMatch(s, "[A-Za-zÁÉÍÓÚáéíóúÑñ]");
    }

    private static string NormalizeHeader(string? name)
    {
        if (string.IsNullOrWhiteSpace(name)) return "column";
        name = name.Trim().ToLowerInvariant();

        // Replace separators with underscore
        name = Regex.Replace(name, @"[\s\-\/\.]+", "_");

        // Remove non-alphanumeric/underscore
        name = Regex.Replace(name, @"[^a-z0-9_]+", "");

        // Collapse underscores
        name = Regex.Replace(name, @"_+", "_").Trim('_');

        return string.IsNullOrEmpty(name) ? "column" : name;
    }

    private static List<string> MakeUnique(List<string> names)
    {
        var seen = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);

        for (int i = 0; i < names.Count; i++)
        {
            var n = string.IsNullOrWhiteSpace(names[i]) ? "column" : names[i];

            if (!seen.TryAdd(n, 1))
            {
                seen[n]++;
                names[i] = $"{n}_{seen[n]}";
            }
            else
            {
                names[i] = n;
            }
        }

        return names;
    }

    private static string InferType(List<string> values)
    {
        var nonEmpty = values.Where(v => !string.IsNullOrWhiteSpace(v)).Take(200).ToList();
        if (nonEmpty.Count == 0) return "empty";

        int num = 0, date = 0, boolean = 0, text = 0;

        foreach (var v in nonEmpty)
        {
            if (bool.TryParse(v, out _)) { boolean++; continue; }
            if (double.TryParse(v, out _)) { num++; continue; }
            if (DateTime.TryParse(v, out _)) { date++; continue; }
            text++;
        }

        var total = nonEmpty.Count;
        double nP = (double)num / total;
        double dP = (double)date / total;
        double bP = (double)boolean / total;

        if (nP >= 0.85) return "number";
        if (dP >= 0.85) return "date";
        if (bP >= 0.85) return "bool";
        if (text >= total * 0.85) return "text";

        return "mixed";
    }
}
