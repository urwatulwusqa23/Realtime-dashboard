using DashboardApi.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DashboardApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MetricsController : ControllerBase
{
    private readonly AppDbContext _db;

    public MetricsController(AppDbContext db) => _db = db;

    /// <summary>
    /// Returns ordered history for a single metric (default: last 60 points).
    /// GET /api/metrics/history?name=revenue&amp;limit=60
    /// </summary>
    [HttpGet("history")]
    public async Task<IActionResult> GetHistory(
        [FromQuery] string name  = "revenue",
        [FromQuery] int    limit = 60)
    {
        var data = await _db.Metrics
            .Where(m => m.Name == name)
            .OrderByDescending(m => m.RecordedAt)
            .Take(limit)
            .OrderBy(m => m.RecordedAt)
            .Select(m => new { m.Value, m.RecordedAt, m.Category })
            .ToListAsync();

        return Ok(data);
    }

    /// <summary>
    /// Returns the latest value for each metric.
    /// GET /api/metrics/summary
    /// </summary>
    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary()
    {
        var names = new[] { "revenue", "orders", "users", "conversion" };

        var summary = await Task.WhenAll(names.Select(async name =>
        {
            var latest = await _db.Metrics
                .Where(m => m.Name == name)
                .OrderByDescending(m => m.RecordedAt)
                .FirstOrDefaultAsync();

            return new { name, value = latest?.Value ?? 0, latest?.RecordedAt };
        }));

        return Ok(summary);
    }

    /// <summary>
    /// Returns revenue grouped by category (last 5 minutes).
    /// GET /api/metrics/by-category?name=revenue
    /// </summary>
    [HttpGet("by-category")]
    public async Task<IActionResult> GetByCategory(
        [FromQuery] string name = "revenue")
    {
        var cutoff = DateTime.UtcNow.AddMinutes(-5);

        var data = await _db.Metrics
            .Where(m => m.Name == name && m.RecordedAt >= cutoff && m.Category != null)
            .GroupBy(m => m.Category!)
            .Select(g => new { Category = g.Key, Total = g.Sum(m => m.Value) })
            .ToListAsync();

        return Ok(data);
    }
}
