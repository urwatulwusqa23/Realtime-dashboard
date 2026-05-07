using System.Text;
using System.Text.Json;

namespace DashboardApi.Services;

/// <summary>
/// Sends questions + live chart data to Claude API and returns AI insight text.
/// </summary>
public class ClaudeService
{
    private readonly IHttpClientFactory _factory;
    private readonly IConfiguration _config;
    private readonly ILogger<ClaudeService> _logger;

    public ClaudeService(
        IHttpClientFactory factory,
        IConfiguration config,
        ILogger<ClaudeService> logger)
    {
        _factory = factory;
        _config  = config;
        _logger  = logger;
    }

    public async Task<string> AskAsync(
        string question,
        string chartDataJson,
        CancellationToken ct = default)
    {
        var client = _factory.CreateClient("Claude");

        var systemPrompt = """
            You are a data analyst AI assistant embedded in a real-time sales dashboard.
            The user will provide current metric snapshots and ask questions about them.
            Be concise, insightful, and specific — always reference actual numbers from the data.
            When you see a spike (changePercent > 10 or < -10), suggest a plausible business reason.
            Format your response in 2-3 short paragraphs. Use markdown for emphasis where helpful.
            """;

        var userContent = $"""
            Current dashboard data (JSON):
            {chartDataJson}

            User question: {question}
            """;

        var payload = new
        {
            model      = "claude-sonnet-4-20250514",
            max_tokens = 1024,
            system     = systemPrompt,
            messages   = new[] { new { role = "user", content = userContent } }
        };

        var body    = new StringContent(
            JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
        var response = await client.PostAsync("/v1/messages", body, ct);

        if (!response.IsSuccessStatusCode)
        {
            var err = await response.Content.ReadAsStringAsync(ct);
            _logger.LogError("Claude API error {Status}: {Body}", response.StatusCode, err);
            return "AI service returned an error. Please check your API key and try again.";
        }

        var result = await response.Content.ReadAsStringAsync(ct);
        using var doc = JsonDocument.Parse(result);

        return doc.RootElement
                  .GetProperty("content")[0]
                  .GetProperty("text")
                  .GetString() ?? "No response from AI.";
    }
}
