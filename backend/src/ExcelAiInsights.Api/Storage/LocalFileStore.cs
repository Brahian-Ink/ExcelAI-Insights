using System.Security.Cryptography;

namespace ExcelAiInsights.Api.Storage;

public sealed class LocalFileStore
{
    private readonly string _basePath;

    public LocalFileStore(IWebHostEnvironment env)
    {
        // App_Data/uploads
        _basePath = Path.Combine(env.ContentRootPath, "App_Data", "uploads");
        Directory.CreateDirectory(_basePath);
    }

    public async Task<(string fileId, string fullPath)> SaveAsync(IFormFile file, CancellationToken ct)
    {
        var fileId = CreateId();
        var fullPath = Path.Combine(_basePath, $"{fileId}.xlsx");

        await using var stream = new FileStream(fullPath, FileMode.CreateNew, FileAccess.Write, FileShare.None);
        await file.CopyToAsync(stream, ct);

        return (fileId, fullPath);
    }

    public string? GetPath(string fileId)
    {
        var path = Path.Combine(_basePath, $"{fileId}.xlsx");
        return File.Exists(path) ? path : null;
    }

    private static string CreateId()
    {
        // 16 bytes -> 32 hex chars
        var bytes = RandomNumberGenerator.GetBytes(16);
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }
}
