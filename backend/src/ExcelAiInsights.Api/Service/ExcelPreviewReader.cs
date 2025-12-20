using ClosedXML.Excel;

namespace ExcelAiInsights.Api.Services;

public sealed class ExcelPreviewReader
{
    public FilePreviewResult ReadPreview(string path, int maxRows = 20)
    {
        using var wb = new XLWorkbook(path);
        var ws = wb.Worksheets.First();

        var headerRow = ws.FirstRowUsed();
        if (headerRow is null)
            return new FilePreviewResult(new List<string>(), new List<List<string>>());

        var columns = headerRow.CellsUsed().Select(c => c.GetString()).ToList();

        var rows = new List<List<string>>();
        foreach (var row in ws.RowsUsed().Skip(1).Take(maxRows))
        {
            var values = row.Cells(1, columns.Count)
                .Select(c => c.GetFormattedString())
                .ToList();

            rows.Add(values);
        }

        return new FilePreviewResult(columns, rows);
    }
}

public sealed record FilePreviewResult(
    List<string> Columns,
    List<List<string>> Rows
);
