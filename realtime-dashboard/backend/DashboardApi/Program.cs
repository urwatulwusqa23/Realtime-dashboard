using DashboardApi.Data;
using DashboardApi.Hubs;
using DashboardApi.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// ── Database (MySQL via Pomelo) ────────────────────────────────────────────────
var connStr = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");

builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseMySql(connStr, ServerVersion.AutoDetect(connStr),
        mySqlOpt => mySqlOpt.EnableRetryOnFailure(3)));

// ── SignalR ────────────────────────────────────────────────────────────────────
builder.Services.AddSignalR();

// ── Background broadcast service ──────────────────────────────────────────────
builder.Services.AddHostedService<MetricBroadcastService>();

// ── Claude HTTP client ─────────────────────────────────────────────────────────
builder.Services.AddHttpClient("Claude", client =>
{
    client.BaseAddress = new Uri("https://api.anthropic.com");
    client.DefaultRequestHeaders.Add(
        "x-api-key", builder.Configuration["Claude:ApiKey"]);
    client.DefaultRequestHeaders.Add(
        "anthropic-version", "2023-06-01");
    client.Timeout = TimeSpan.FromSeconds(60);
});
builder.Services.AddScoped<ClaudeService>();

// ── CORS (Angular dev: localhost:4200, prod: your domain) ─────────────────────
var allowedOrigins = builder.Configuration["AllowedOrigins"]
    ?? "http://localhost:4200";

builder.Services.AddCors(opt =>
    opt.AddPolicy("Angular", p =>
        p.WithOrigins(allowedOrigins.Split(','))
         .AllowAnyHeader()
         .AllowAnyMethod()
         .AllowCredentials()));   // Required for SignalR WebSocket

// ── Controllers + Swagger ─────────────────────────────────────────────────────
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "Dashboard API", Version = "v1" });
});

var app = builder.Build();

// ── Auto-migrate on startup ────────────────────────────────────────────────────
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
}

// ── Middleware pipeline ────────────────────────────────────────────────────────
app.UseCors("Angular");

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Dashboard API v1"));
}

app.UseDefaultFiles();
app.UseStaticFiles();

app.MapControllers();
app.MapHub<MetricHub>("/hubs/metrics");   // WebSocket endpoint

app.Run();
