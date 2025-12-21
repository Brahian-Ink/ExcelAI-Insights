using System.Net.Http.Json;
using System.Text.Json;
using ExcelAiInsights.Api.Contracts;
using ExcelAiInsights.Api.Services;
using ExcelAiInsights.Api.Storage;
using Microsoft.AspNetCore.Mvc;

namespace ExcelAiInsights.Api.Controllers;

[ApiController]
[Route("api/files")]
public sealed class FilesController : ControllerBase
{
    private const long MaxFileSizeBytes = 15 * 1024 * 1024; // 15MB
    private readonly LocalFileStore _store;

    public FilesController(LocalFileStore store)
    {
        _store = store;
    }
    private static string Clip(string s)
        => s.Length > 200 ? s[..200] + "..." : s;
    [HttpPost("upload")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(MaxFileSizeBytes)]
    public async Task<ActionResult<FileUploadResponse>> Upload([FromForm] FileUploadRequest request, CancellationToken ct)
    {
        var file = request.File;

        if (file is null || file.Length == 0)
            return BadRequest("File is required.");

        if (file.Length > MaxFileSizeBytes)
            return BadRequest("File is too large (max 15MB).");

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (ext != ".xlsx")
            return BadRequest("Only .xlsx files are supported.");

        var (fileId, _) = await _store.SaveAsync(file, ct);

        return Ok(new FileUploadResponse(
            FileId: fileId,
            OriginalName: file.FileName,
            SizeBytes: file.Length
        ));
    }

    [HttpGet("{fileId}/preview")]
    public ActionResult<FilePreviewResponse> Preview(string fileId, ExcelPreviewReader reader)
    {
        var path = _store.GetPath(fileId);
        if (path is null)
            return NotFound("File not found.");

        var result = reader.ReadPreview(path);

        return Ok(new FilePreviewResponse
        {
            Columns = result.Columns,
            Rows = result.Rows
        });
    }

    [HttpGet("{fileId}/profile")]
    public ActionResult<FileProfileResponse> Profile(string fileId, ExcelProfiler profiler)
    {
        var path = _store.GetPath(fileId);
        if (path is null)
            return NotFound("File not found.");

        var profile = profiler.Profile(path);
        return Ok(profile);
    }

    [HttpPost("{fileId}/insights")]
    [Produces("application/json")]
    public async Task<ActionResult<AiInsightsResponse>> Insights(
        string fileId,
        ExcelProfiler profiler,
        ExcelPreviewReader previewReader,
        IHttpClientFactory httpClientFactory,
        CancellationToken ct)
    {
        var path = _store.GetPath(fileId);
        if (path is null)
            return NotFound("File not found.");

        var profile = profiler.Profile(path);
        var pv = previewReader.ReadPreview(path, maxRows: 50);

        var payload = new
        {
            headerRowIndex = profile.HeaderRowIndex,
            columns = profile.Columns.Select(c => new
            {
                c.Index,
                c.OriginalName,
                c.NormalizedName,
                c.InferredType,
                c.NonEmptyCount,
                c.EmptyCount,
                c.UniqueCount,
                c.Examples
            }),
            preview = new
            {
                columns = pv.Columns,
                rows = pv.Rows
        .Select(r => r.Select(Clip).ToList())
        .ToList()
            }

        };

        var payloadJson = JsonSerializer.Serialize(payload);

        var system = """
You are a data analyst. You receive a dataset profile + a small preview.
Return ONLY valid JSON (json object). No markdown.

Schema:
{
  "summary": "string",
  "keyFindings": ["string"],
  "dataQualityWarnings": ["string"],
  "suggestedCharts": [
    {
      "title": "string",
      "type": "bar|pie|line|scatter",
      "groupBy": "string",
      "value": "string",
      "agg": "sum|avg|count|min|max",
      "top": 10
    }
  ]
}

Rules:
- Use EXACT column names from the payload (case-sensitive).
- suggestedCharts must contain 2 to 4 items.
- For bar/pie ALWAYS set: groupBy + value + agg + top.
- For line/scatter you may set type, but still include groupBy/value empty if not applicable.
""";



        var user = $"Return JSON only.\nDataset payload:\n{payloadJson}";

        var req = new
        {
            model = "gpt-4.1-mini",
            instructions = system,
            input = user,
            text = new
            {
                format = new { type = "json_object" }
            }
        };

        var client = httpClientFactory.CreateClient("OpenAI");

        var httpRes = await client.PostAsJsonAsync("responses", req, ct);
        var raw = await httpRes.Content.ReadAsStringAsync(ct);

        if (!httpRes.IsSuccessStatusCode)
            return StatusCode((int)httpRes.StatusCode, raw);

        var text = OpenAiTextExtractor.ExtractOutputText(raw);

        try
        {
            var result = JsonSerializer.Deserialize<AiInsightsResponse>(
                text,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true }
            );

            return Ok(result ?? new AiInsightsResponse { Summary = "Empty AI result." });
        }
        catch
        {
            return Ok(new AiInsightsResponse
            {
                Summary = "AI returned non-JSON output (see warnings).",
                DataQualityWarnings = [text]
            });
        }
    }
    [HttpGet("{fileId}/aggregate")]
    public ActionResult<AggregateResponse> Aggregate(
    string fileId,
    [FromQuery] string groupBy,
    [FromQuery] string value,
    ExcelAggregator aggregator,
    [FromQuery] string agg = "sum",
    [FromQuery] int? top = 20,
    [FromQuery] string? sheet = null)
    {
        var path = _store.GetPath(fileId);
        if (path is null)
            return NotFound("File not found.");

        try
        {
            var result = aggregator.Aggregate(
                filePath: path,
                groupByColumn: groupBy,
                valueColumn: value,
                agg: agg,
                sheetName: sheet
            );

            var data = result.Data;

            if (top is > 0)
                data = data.Take(top.Value).ToList();

            return Ok(new AggregateResponse
            {
                FileId = fileId,
                Sheet = result.SheetName,
                GroupBy = groupBy,
                Value = value,
                Agg = agg,
                Data = data.Select(x => new AggregatePoint { Key = x.Key, Value = x.Value }).ToList()
            });
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }


}
