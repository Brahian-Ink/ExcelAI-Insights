using Microsoft.AspNetCore.Mvc;

namespace ExcelAiInsights.Api.Contracts;

public sealed class FileUploadRequest
{
    [FromForm(Name = "file")]
    public IFormFile File { get; set; } = default!;
}
