namespace DashboardApi.Data.Models;

public class Metric
{
    public long Id { get; set; }
    public string Name { get; set; } = "";        // revenue | orders | users | conversion
    public decimal Value { get; set; }
    public string? Category { get; set; }          // North | South | Electronics | etc.
    public DateTime RecordedAt { get; set; } = DateTime.UtcNow;
}
