using DashboardApi.Data;
using DashboardApi.Data.Models;
using DashboardApi.Hubs;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace DashboardApi.Services;

/// <summary>
/// Runs in the background, generates mock metric data every 3 seconds,
/// persists it to MySQL, and broadcasts via SignalR to all clients.
/// </summary>
public class MetricBroadcastService : BackgroundService
{
    private readonly IHubContext<MetricHub> _hub;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<MetricBroadcastService> _logger;

    // Tracks previous values so we can compute % change
    private readonly Dictionary<string, decimal> _previous = new()
    {
        ["revenue"]    = 45_000m,
        ["orders"]     = 320m,
        ["users"]      = 1_240m,
        ["conversion"] = 3.4m
    };

    private static readonly string[] Regions =
        ["North", "South", "East", "West"];

    private static readonly string[] ProductLines =
        ["Electronics", "Apparel", "Home", "Sports"];

    private readonly Random _rng = new();

    public MetricBroadcastService(
        IHubContext<MetricHub> hub,
        IServiceScopeFactory scopeFactory,
        ILogger<MetricBroadcastService> logger)
    {
        _hub = hub;
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("MetricBroadcastService started.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var snapshots = GenerateSnapshots();
                await PersistAsync(snapshots, stoppingToken);
                await _hub.Clients.All.SendAsync("MetricUpdate", snapshots, stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogError(ex, "Error during metric broadcast.");
            }

            await Task.Delay(3_000, stoppingToken);
        }
    }

    private List<MetricSnapshot> GenerateSnapshots()
    {
        var now = DateTime.UtcNow;
        var results = new List<MetricSnapshot>();

        foreach (var (name, prev) in _previous.ToList())
        {
            // Occasional spike (5% chance): ±20%, otherwise ±5%
            bool spike = _rng.NextDouble() < 0.05;
            decimal pct = spike
                ? (decimal)(_rng.NextDouble() * 0.4 - 0.2)
                : (decimal)(_rng.NextDouble() * 0.1 - 0.05);

            decimal newVal = Math.Max(0, prev * (1 + pct));
            newVal = name == "conversion"
                ? Math.Round(newVal, 2)
                : Math.Round(newVal, 0);

            decimal change = prev == 0 ? 0 : (newVal - prev) / prev * 100;
            _previous[name] = newVal;

            string category = name == "revenue"
                ? Regions[_rng.Next(Regions.Length)]
                : ProductLines[_rng.Next(ProductLines.Length)];

            results.Add(new MetricSnapshot(name, newVal, category, now, Math.Round(change, 2)));
        }

        return results;
    }

    private async Task PersistAsync(List<MetricSnapshot> snapshots, CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var entities = snapshots.Select(s => new Metric
        {
            Name       = s.Name,
            Value      = s.Value,
            Category   = s.Category,
            RecordedAt = s.RecordedAt
        });

        await db.Metrics.AddRangeAsync(entities, ct);
        await db.SaveChangesAsync(ct);
    }
}
