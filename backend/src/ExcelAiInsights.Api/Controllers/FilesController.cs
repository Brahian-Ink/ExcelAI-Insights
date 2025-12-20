using ExcelAiInsights.Api.Contracts;
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

}
