using Microsoft.AspNetCore.SignalR;

namespace DashboardApi.Hubs;

public class MetricHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        await Clients.Caller.SendAsync("Connected", Context.ConnectionId);
        await base.OnConnectedAsync();
    }
}

/// <summary>DTO broadcast on every 3-second tick.</summary>
public record MetricSnapshot(
    string Name,
    decimal Value,
    string Category,
    DateTime RecordedAt,
    decimal ChangePercent
);
