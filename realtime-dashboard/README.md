# LiveDash — Real-Time Analytics Dashboard

A full-stack real-time dashboard built with:
- **Backend**: .NET 8 Web API + SignalR + Entity Framework Core + MySQL
- **Frontend**: Angular 18 + Chart.js + SignalR client
- **AI**: Claude API (claude-sonnet) for natural language data insights
- **Infrastructure**: Docker Compose (local) + Azure App Service (production)

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Project Structure](#project-structure)
3. [Option A — Run with Docker Compose (Easiest)](#option-a--run-with-docker-compose)
4. [Option B — Run Locally (VS + Angular CLI)](#option-b--run-locally-visual-studio--angular-cli)
5. [Configuration Reference](#configuration-reference)
6. [Azure Deployment](#azure-deployment)
7. [API Reference](#api-reference)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### For Docker option (A)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows/Mac/Linux)

### For Local option (B)
- [Visual Studio 2022](https://visualstudio.microsoft.com/) (Community is free) with ASP.NET workload
- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8)
- [Node.js 20+](https://nodejs.org/) and npm
- [MySQL 8.0](https://dev.mysql.com/downloads/mysql/) (or use XAMPP / MySQL Workbench)
- [Angular CLI](https://angular.io/cli): `npm install -g @angular/cli`

### For both options
- A **Claude API key** — get one free at https://console.anthropic.com

---

## Project Structure

```
realtime-dashboard/
├── backend/
│   ├── DashboardSolution.sln          ← Open this in Visual Studio
│   └── DashboardApi/
│       ├── DashboardApi.csproj
│       ├── Program.cs
│       ├── appsettings.json           ← Set your DB + API key here
│       ├── Controllers/
│       │   ├── MetricsController.cs
│       │   └── ChatController.cs
│       ├── Data/
│       │   ├── AppDbContext.cs
│       │   └── Models/
│       ├── Hubs/
│       │   └── MetricHub.cs           ← SignalR hub
│       └── Services/
│           ├── MetricBroadcastService.cs  ← Background service (every 3s)
│           └── ClaudeService.cs           ← Claude API integration
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/
│   │   │   │   ├── metric-card/
│   │   │   │   ├── line-chart/
│   │   │   │   ├── bar-chart/
│   │   │   │   └── chat-sidebar/
│   │   │   ├── pages/dashboard/
│   │   │   ├── services/
│   │   │   │   ├── signalr.service.ts
│   │   │   │   ├── metrics.service.ts
│   │   │   │   └── chat.service.ts
│   │   │   └── models/metric.model.ts
│   │   └── environments/
│   │       ├── environment.ts         ← Dev URLs (localhost:5000)
│   │       └── environment.prod.ts    ← Prod URLs (Azure)
│   ├── nginx.conf
│   └── Dockerfile
├── docker-compose.yml
├── .env.example                       ← Copy to .env and fill in secrets
└── README.md
```

---

## Option A — Run with Docker Compose

This is the fastest way to get everything running. One command starts MySQL, the .NET API, and the Angular app.

### Step 1 — Copy and fill in environment variables

```bash
cp .env.example .env
```

Open `.env` and set:
```
CLAUDE_API_KEY=sk-ant-YOUR_REAL_KEY_HERE
```
The MySQL passwords are pre-set — change them if you want.

### Step 2 — Start everything

```bash
docker compose up --build
```

First run takes 3–5 minutes (downloads images, installs npm packages, restores NuGet).

### Step 3 — Open the app

| URL | What |
|-----|------|
| http://localhost | Dashboard (Angular) |
| http://localhost:5000/swagger | API documentation |
| http://localhost:3306 | MySQL (for DB tools) |

### Step 4 — Stop

```bash
docker compose down          # stop containers, keep DB data
docker compose down -v       # stop containers AND delete DB data
```

---

## Option B — Run Locally (Visual Studio + Angular CLI)

### Step 1 — Set up MySQL

1. Install and start MySQL 8.0
2. Create the database:
   ```sql
   CREATE DATABASE dashboard;
   CREATE USER 'dashapp'@'localhost' IDENTIFIED BY 'AppPass456!';
   GRANT ALL PRIVILEGES ON dashboard.* TO 'dashapp'@'localhost';
   FLUSH PRIVILEGES;
   ```

### Step 2 — Configure the backend

Open `backend/DashboardApi/appsettings.json` and update:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Port=3306;Database=dashboard;User=dashapp;Password=AppPass456!;"
  },
  "Claude": {
    "ApiKey": "sk-ant-YOUR_CLAUDE_API_KEY_HERE"
  },
  "AllowedOrigins": "http://localhost:4200"
}
```

### Step 3 — Run the backend in Visual Studio

1. Open `backend/DashboardSolution.sln` in Visual Studio 2022
2. Right-click `DashboardApi` → Set as Startup Project
3. Press **F5** or click the green Run button
4. Visual Studio will:
   - Restore NuGet packages automatically
   - Run EF Core migrations (creates all tables in MySQL)
   - Start the API on **https://localhost:7xxx** and **http://localhost:5000**
   - Open Swagger UI in your browser

> **Note**: The first time EF Core runs `db.Database.Migrate()` in `Program.cs`, it creates all tables automatically. No manual SQL needed.

#### Alternative — Run from terminal

```bash
cd backend/DashboardApi
dotnet restore
dotnet ef database update    # if you want to run migrations manually
dotnet run
```

### Step 4 — Install Angular dependencies

```bash
cd frontend
npm install
```

### Step 5 — Run the Angular app

```bash
ng serve
```

Open **http://localhost:4200** in your browser.

The Angular app is pre-configured to connect to `http://localhost:5000` (set in `src/environments/environment.ts`).

### Step 6 — Verify it works

You should see:
- 4 metric cards (Revenue, Orders, Active Users, Conversion Rate) updating every 3 seconds
- 4 live line charts growing in real time
- A revenue-by-region bar chart
- An AI chat sidebar — type "Why did revenue spike?" to test Claude

---

## Configuration Reference

### Backend — `appsettings.json`

| Key | Description |
|-----|-------------|
| `ConnectionStrings:DefaultConnection` | MySQL connection string |
| `Claude:ApiKey` | Your Anthropic API key (`sk-ant-...`) |
| `AllowedOrigins` | Comma-separated CORS origins (Angular URL) |

### Frontend — `src/environments/environment.ts`

| Key | Description |
|-----|-------------|
| `apiUrl` | Base URL for REST API calls |
| `hubUrl` | SignalR WebSocket hub URL |

For local dev these point to `http://localhost:5000`. For production (Azure) update `environment.prod.ts`.

---

## EF Core Migrations

If you need to make model changes:

```bash
cd backend/DashboardApi

# Add a new migration
dotnet ef migrations add YourMigrationName

# Apply migrations to DB
dotnet ef database update

# Roll back last migration
dotnet ef migrations remove
```

---

## Azure Deployment

See **Phase 5** in the tutorial for the full step-by-step Azure guide. Summary:

```bash
# 1. Create Azure resources
az group create --name dashboard-rg --location eastus
az acr create --name youracrname --resource-group dashboard-rg --sku Basic --admin-enabled true
az appservice plan create --name dashboard-plan --resource-group dashboard-rg --sku F1 --is-linux

# 2. Build and push Docker images
az acr login --name youracrname
docker build -t youracrname.azurecr.io/dashboard-backend:latest ./backend/DashboardApi
docker push youracrname.azurecr.io/dashboard-backend:latest

docker build -t youracrname.azurecr.io/dashboard-frontend:latest ./frontend
docker push youracrname.azurecr.io/dashboard-frontend:latest

# 3. Create web apps and configure settings (see Phase 5 for full commands)
```

Before building for Azure, update `frontend/src/environments/environment.prod.ts` with your Azure backend URL.

---

## API Reference

### Metrics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/metrics/summary` | Latest value for each metric |
| GET | `/api/metrics/history?name=revenue&limit=60` | Historical data points |
| GET | `/api/metrics/by-category?name=revenue` | Revenue grouped by region (last 5 min) |

### Chat

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat/ask` | Send question + chart data to Claude |
| GET | `/api/chat/history/{sessionId}` | Get chat history for a session |

### SignalR Hub

- **URL**: `/hubs/metrics`
- **Server → Client event**: `MetricUpdate` — emits `MetricSnapshot[]` every 3 seconds
- **Client → Server**: No messages required — just connect and listen

---

## Troubleshooting

### "Connection refused" on startup
The backend tries to connect to MySQL on startup. Make sure MySQL is running before starting the API.

### SignalR not connecting
- Check that `AllowedOrigins` in `appsettings.json` matches your Angular URL exactly (including port)
- WebSocket must be enabled — Azure App Service requires this to be turned on manually (see Phase 5)

### Claude returns an error
- Verify your API key in `appsettings.json` starts with `sk-ant-`
- Check you have credits at https://console.anthropic.com

### EF Core migration errors
```bash
# Check your connection string is correct, then:
dotnet ef database drop --force
dotnet ef database update
```

### Port 5000 already in use (Windows)
```bash
# Find what's using it
netstat -ano | findstr :5000
# Kill it
taskkill /PID <pid> /F
```

### Angular build fails
```bash
cd frontend
rm -rf node_modules
npm install
ng serve
```

---

## Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Frontend framework | Angular 18 (standalone components) |
| Charts | Chart.js 4 |
| Real-time client | @microsoft/signalr |
| Backend framework | ASP.NET Core 8 Web API |
| Real-time server | SignalR |
| ORM | Entity Framework Core 8 |
| Database | MySQL 8 via Pomelo provider |
| AI | Claude API (claude-sonnet-4-20250514) |
| Container | Docker + nginx |
| Cloud | Azure App Service + Azure Container Registry |
