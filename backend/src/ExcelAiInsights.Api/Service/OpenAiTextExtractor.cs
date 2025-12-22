using System.Text;
using System.Text.Json;

namespace ExcelAiInsights.Api.Services;

public static class OpenAiTextExtractor
{
    public static string ExtractOutputText(string json)
    {
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        //  Si existe output_text (a veces está), lo usamos
        if (root.TryGetProperty("output_text", out var ot) && ot.ValueKind == JsonValueKind.String)
            return ot.GetString() ?? "";

        //  Si no, recorremos output[] y buscamos items tipo message
        if (!root.TryGetProperty("output", out var output) || output.ValueKind != JsonValueKind.Array)
            return "";

        var sb = new StringBuilder();

        foreach (var item in output.EnumerateArray())
        {
            if (!item.TryGetProperty("type", out var typeEl)) continue;
            if (typeEl.GetString() != "message") continue;

            if (!item.TryGetProperty("content", out var content) || content.ValueKind != JsonValueKind.Array)
                continue;

            foreach (var c in content.EnumerateArray())
            {
                // En Responses, el texto suele venir como content[].type == "output_text" y content[].text
                if (c.TryGetProperty("type", out var ct) && ct.GetString() == "output_text" &&
                    c.TryGetProperty("text", out var textEl) && textEl.ValueKind == JsonValueKind.String)
                {
                    sb.Append(textEl.GetString());
                }
            }
        }

        return sb.ToString();
    }
}
