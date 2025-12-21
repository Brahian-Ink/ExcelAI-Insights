using System.Text.Json.Serialization;

namespace ExcelAiInsights.Api.Contracts;

public sealed class OpenAiResponsesRequest
{
    [JsonPropertyName("model")]
    public string Model { get; set; } = "gpt-4.1-mini";

    [JsonPropertyName("input")]
    public List<OpenAiInputMessage> Input { get; set; } = [];
}

public sealed class OpenAiInputMessage
{
    [JsonPropertyName("role")]
    public string Role { get; set; } = "user";

    [JsonPropertyName("content")]
    public string Content { get; set; } = "";
}

public sealed class OpenAiResponsesResponse
{
    // La Responses API devuelve una estructura grande; para no complicar:
    // vamos a leer el body como JsonDocument y extraer "output_text" si existe,
    // o fallback a texto completo.
}
