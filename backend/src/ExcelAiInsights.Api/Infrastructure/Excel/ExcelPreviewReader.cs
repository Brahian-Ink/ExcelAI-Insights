using ClosedXML.Excel;

namespace ExcelAiInsights.Infrastructure.Excel;

public sealed class ExcelPreviewReader
{
    public FilePreviewResult ReadPreview(string path, int maxRows = 20)
    {
        using var workbook = new XLWorkbook(path);
        var sheet = workbook.Worksheets.First();

        var firstRow = sheet.FirstRowUsed();
        var lastRow = sheet.LastRowUsed();

        var columns = firstRow.Cells()
            .Select(c => c.GetString())
            .ToList();

        var rows = new List<List<string>>();

        foreach (var row in sheet.RowsUsed().Skip(1).Take(maxRows))
        {
            var values = row.Cells(1, columns.Count)
                .Select(c => c.GetValue<string>())
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
