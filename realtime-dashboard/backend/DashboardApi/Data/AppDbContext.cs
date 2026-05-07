using DashboardApi.Data.Models;
using Microsoft.EntityFrameworkCore;

namespace DashboardApi.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Metric> Metrics => Set<Metric>();
    public DbSet<User> Users => Set<User>();
    public DbSet<ChatSession> ChatSessions => Set<ChatSession>();
    public DbSet<ChatMessage> ChatMessages => Set<ChatMessage>();

    protected override void OnModelCreating(ModelBuilder mb)
    {
        mb.Entity<Metric>(e =>
        {
            e.HasIndex(m => new { m.Name, m.RecordedAt });
            e.Property(m => m.Value).HasPrecision(18, 4);
        });

        mb.Entity<ChatSession>()
          .HasMany(s => s.Messages)
          .WithOne()
          .HasForeignKey(m => m.SessionId);

        mb.Entity<User>()
          .HasIndex(u => u.Email).IsUnique();
    }
}
