# 🚀 Quick Setup Guide

Choose your path:

## Path 1: Docker (Easiest — 3 steps)

**Requirements**: Docker Desktop only

```bash
# 1. Copy environment template
cp .env.example .env

# 2. Edit .env and add your Claude API key
# CLAUDE_API_KEY=sk-ant-YOUR_KEY_HERE

# 3. Start everything
docker compose up --build

# Wait 3-5 minutes...
# Open: http://localhost
```

**That's it!** The entire stack (MySQL, .NET API, Angular UI) runs in containers.

Stop with: `docker compose down`

---

## Path 2: Visual Studio + Node.js (Local Dev)

**Requirements**: VS 2022, .NET 8, Node 20+, MySQL 8

### Backend Setup (Visual Studio)

1. **Create MySQL database**
   ```sql
   CREATE DATABASE dashboard;
   CREATE USER 'dashapp'@'localhost' IDENTIFIED BY 'AppPass456!';
   GRANT ALL PRIVILEGES ON dashboard.* TO 'dashapp'@'localhost';
   FLUSH PRIVILEGES;
   ```

2. **Update secrets**
   - Open `backend/DashboardApi/appsettings.json`
   - Change `CLAUDE_API_KEY` to your real key

3. **Open in Visual Studio**
   - File → Open → `backend/DashboardSolution.sln`
   - Right-click `DashboardApi` → Set as Startup Project
   - Press **F5** → Runs on http://localhost:5000

4. **Swagger UI appears** → http://localhost:5000/swagger

### Frontend Setup (Terminal)

```bash
cd frontend
npm install
ng serve
```

Open http://localhost:4200

---

## First Test

1. **You should see**:
   - 4 metric cards (Revenue, Orders, Users, Conversion) updating every 3 seconds
   - 4 live charts growing in real time
   - A revenue-by-region bar chart

2. **Test AI Chat**:
   - Click the AI Insights sidebar (right side)
   - Type: "Why did revenue spike?"
   - Wait for Claude to respond

3. **Check backend health**:
   - http://localhost:5000/swagger
   - Try: GET `/api/metrics/summary`
   - Should return latest metric values

---

## Environment Variables

Create a `.env` file (copy from `.env.example`):

```env
MYSQL_ROOT_PASSWORD=StrongRootPass123!
MYSQL_DATABASE=dashboard
MYSQL_USER=dashapp
MYSQL_PASSWORD=AppPass456!
DB_CONNECTION=Server=mysql;Port=3306;Database=dashboard;User=dashapp;Password=AppPass456!;
CLAUDE_API_KEY=sk-ant-YOUR_KEY_HERE
ALLOWED_ORIGINS=http://localhost,http://localhost:4200
```

⚠️ **Never commit `.env` to git** — it's in `.gitignore`

---

## Get Your Claude API Key

1. Go to https://console.anthropic.com
2. Sign up or log in
3. Click "API Keys" in sidebar
4. Click "Create Key"
5. Copy the key (starts with `sk-ant-`)
6. Paste into `.env` or `appsettings.json`

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Connection refused" | Make sure MySQL is running |
| SignalR not connecting | Check `AllowedOrigins` matches your Angular URL |
| Port 5000 in use | `netstat -ano \| findstr :5000` then kill process |
| Docker won't build | `docker system prune` and try again |

---

## Next Steps

Once it's running:

1. **Read the full README.md** for detailed docs
2. **Explore the code** — each component is well-commented
3. **Deploy to Azure** — see Phase 5 in tutorial
4. **Customize the UI** — edit dashboard components in `frontend/src/app/`

Good luck! 🎉
