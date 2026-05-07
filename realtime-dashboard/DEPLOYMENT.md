# ☁️ Azure Deployment Guide

This guide walks you through deploying the entire stack to Azure using the free F1 tier.

---

## Prerequisites

- **Azure Account** (free tier eligible)
- **Azure CLI** installed ([download](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli))
- **Docker** installed (for building images locally before pushing to ACR)
- **Claude API key** from https://console.anthropic.com

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│              Azure Cloud                        │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌──────────────┐   ┌──────────────┐           │
│  │ Azure App    │   │ Azure App    │           │
│  │ Service (F1) │   │ Service (F1) │           │
│  │ Frontend     │   │ Backend API  │           │
│  │ (nginx)      │   │ (.NET)       │           │
│  └──────────────┘   └──────────────┘           │
│         │                   │                   │
│         └───────────┬───────┘                   │
│                     │                           │
│         ┌───────────▼─────────────┐             │
│         │ Azure Database MySQL    │             │
│         │ Flexible (B1ms/Free)    │             │
│         └───────────────────────────┘           │
│                                                 │
│  Container Registry: Azure ACR                 │
│  - Stores Docker images                        │
│  - Auto-pulls by App Service                   │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## Step-by-Step Deployment

### Phase 1: Azure CLI Setup

```bash
# Install Azure CLI (if not already done)
# Windows: https://aka.ms/installazurecliwindows
# Mac: brew install azure-cli
# Linux: https://learn.microsoft.com/en-us/cli/azure/install-azure-cli-linux

# Login to Azure
az login

# This opens a browser — sign in with your Azure account

# List subscriptions (pick the one you want)
az account list --output table

# Set default subscription (optional)
az account set --subscription "YOUR_SUBSCRIPTION_ID"
```

---

### Phase 2: Create Azure Resources

Set variables first (customize these):

```bash
RESOURCE_GROUP="livedash-rg"
LOCATION="eastus"              # or "westus2", "northeurope", etc.
ACR_NAME="livedashacr$(date +%s | tail -c 6)"  # must be globally unique
APP_PLAN="livedash-plan"
BACKEND_APP="livedash-api"
FRONTEND_APP="livedash-ui"
MYSQL_SERVER="livedash-mysql-$(date +%s | tail -c 6)"
DB_NAME="dashboard"
DB_ADMIN="dbadmin"
DB_PASSWORD="YourSecurePass123!"  # change this!
```

**Create Resource Group:**
```bash
az group create \
  --name $RESOURCE_GROUP \
  --location $LOCATION
```

**Create Azure Container Registry (ACR):**
```bash
az acr create \
  --resource-group $RESOURCE_GROUP \
  --name $ACR_NAME \
  --sku Basic \
  --admin-enabled true

# Get ACR login server URL
ACR_DOMAIN=$(az acr show \
  --name $ACR_NAME \
  --query loginServer -o tsv)

echo "ACR Domain: $ACR_DOMAIN"
# Output: livedashacr123456.azurecr.io
```

**Create MySQL Flexible Server:**
```bash
az mysql flexible-server create \
  --resource-group $RESOURCE_GROUP \
  --name $MYSQL_SERVER \
  --location $LOCATION \
  --admin-user $DB_ADMIN \
  --admin-password $DB_PASSWORD \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --storage-size 20 \
  --version 8.0 \
  --yes

# This takes ~5 minutes. Coffee break! ☕

# Create database
az mysql flexible-server db create \
  --resource-group $RESOURCE_GROUP \
  --server-name $MYSQL_SERVER \
  --database-name $DB_NAME

# Allow Azure services to connect (IMPORTANT!)
az mysql flexible-server firewall-rule create \
  --resource-group $RESOURCE_GROUP \
  --name $MYSQL_SERVER \
  --rule-name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

**Create App Service Plan (Free F1 tier):**
```bash
az appservice plan create \
  --resource-group $RESOURCE_GROUP \
  --name $APP_PLAN \
  --sku F1 \
  --is-linux
```

**Create Backend Web App:**
```bash
az webapp create \
  --resource-group $RESOURCE_GROUP \
  --plan $APP_PLAN \
  --name $BACKEND_APP \
  --deployment-container-image-name "$ACR_DOMAIN/livedash-backend:latest"

# Enable WebSockets (REQUIRED for SignalR)
az webapp config set \
  --resource-group $RESOURCE_GROUP \
  --name $BACKEND_APP \
  --web-sockets-enabled true
```

**Create Frontend Web App:**
```bash
az webapp create \
  --resource-group $RESOURCE_GROUP \
  --plan $APP_PLAN \
  --name $FRONTEND_APP \
  --deployment-container-image-name "$ACR_DOMAIN/livedash-frontend:latest"
```

---

### Phase 3: Configure App Settings

**Build connection string:**
```bash
DB_CONNECTION="Server=$MYSQL_SERVER.mysql.database.azure.com;Port=3306;\
Database=$DB_NAME;User=$DB_ADMIN;Password=$DB_PASSWORD;SslMode=Required;"

echo "DB Connection String:"
echo $DB_CONNECTION
```

**Get ACR credentials:**
```bash
ACR_USERNAME=$(az acr credential show \
  --name $ACR_NAME \
  --query username -o tsv)

ACR_PASSWORD=$(az acr credential show \
  --name $ACR_NAME \
  --query passwords[0].value -o tsv)

echo "ACR Username: $ACR_USERNAME"
echo "ACR Password: $ACR_PASSWORD"
```

**Configure Backend App Settings:**
```bash
az webapp config appsettings set \
  --resource-group $RESOURCE_GROUP \
  --name $BACKEND_APP \
  --settings \
    "ConnectionStrings__DefaultConnection=$DB_CONNECTION" \
    "Claude__ApiKey=sk-ant-YOUR_REAL_CLAUDE_KEY" \
    "AllowedOrigins=https://$FRONTEND_APP.azurewebsites.net" \
    "ASPNETCORE_ENVIRONMENT=Production" \
    "ASPNETCORE_URLS=http://+:8080"

# Configure ACR authentication
az webapp config container set \
  --resource-group $RESOURCE_GROUP \
  --name $BACKEND_APP \
  --docker-custom-image-name "$ACR_DOMAIN/livedash-backend:latest" \
  --docker-registry-server-url "https://$ACR_DOMAIN" \
  --docker-registry-server-user $ACR_USERNAME \
  --docker-registry-server-password "$ACR_PASSWORD"
```

**Configure Frontend App Settings:**
```bash
az webapp config appsettings set \
  --resource-group $RESOURCE_GROUP \
  --name $FRONTEND_APP \
  --settings \
    "BACKEND_URL=https://$BACKEND_APP.azurewebsites.net"

# Configure ACR authentication
az webapp config container set \
  --resource-group $RESOURCE_GROUP \
  --name $FRONTEND_APP \
  --docker-custom-image-name "$ACR_DOMAIN/livedash-frontend:latest" \
  --docker-registry-server-url "https://$ACR_DOMAIN" \
  --docker-registry-server-user $ACR_USERNAME \
  --docker-registry-server-password "$ACR_PASSWORD"
```

---

### Phase 4: Update Frontend for Production

Before building the Docker image, update Angular to point to Azure backend.

**Edit `frontend/src/environments/environment.prod.ts`:**
```typescript
export const environment = {
  production: true,
  apiUrl: 'https://livedash-api.azurewebsites.net/api',
  hubUrl: 'https://livedash-api.azurewebsites.net/hubs/metrics'
};
```

Replace `livedash-api` with your actual `$BACKEND_APP` name.

---

### Phase 5: Build & Push Docker Images

**Login to ACR:**
```bash
az acr login --name $ACR_NAME
```

**Build and push Backend:**
```bash
cd backend/DashboardApi

docker build -t $ACR_DOMAIN/livedash-backend:latest .

docker push $ACR_DOMAIN/livedash-backend:latest

cd ../..
```

**Build and push Frontend:**
```bash
cd frontend

docker build -t $ACR_DOMAIN/livedash-frontend:latest .

docker push $ACR_DOMAIN/livedash-frontend:latest

cd ..
```

Verify images in Azure:
```bash
az acr repository list --name $ACR_NAME
```

Should see:
```
livedash-backend
livedash-frontend
```

---

### Phase 6: Deploy & Start

**Restart backend to pull latest image:**
```bash
az webapp restart \
  --resource-group $RESOURCE_GROUP \
  --name $BACKEND_APP
```

**Restart frontend:**
```bash
az webapp restart \
  --resource-group $RESOURCE_GROUP \
  --name $FRONTEND_APP
```

Wait 1-2 minutes for containers to start.

---

### Phase 7: Verify Deployment

**Get app URLs:**
```bash
BACKEND_URL="https://$BACKEND_APP.azurewebsites.net"
FRONTEND_URL="https://$FRONTEND_APP.azurewebsites.net"

echo "🎉 Your app is live!"
echo "Frontend: $FRONTEND_URL"
echo "Backend API: $BACKEND_URL/swagger"
```

**Test the dashboard:**
```bash
# Open in browser
https://livedash-ui.azurewebsites.net

# You should see:
# - 4 live metric cards updating every 3 seconds
# - Charts with live data
# - Working chat sidebar with Claude
```

**Check logs:**
```bash
# Backend logs
az webapp log tail \
  --resource-group $RESOURCE_GROUP \
  --name $BACKEND_APP

# Frontend logs
az webapp log tail \
  --resource-group $RESOURCE_GROUP \
  --name $FRONTEND_APP
```

---

## Cost Estimates

| Service | SKU | Monthly Cost |
|---------|-----|--------------|
| App Service (Backend) | F1 Free | $0 |
| App Service (Frontend) | F1 Free | $0 |
| MySQL Flexible | B1ms Burstable | ~$13* |
| Container Registry | Basic | ~$5 |
| **Total** | | ~$18/mo |

> *Free tier provides 750 hours/month of B1ms. For newer Azure accounts, this is covered by the free trial.

---

## Monitoring & Troubleshooting

### Check Application Insights

```bash
# Enable Application Insights (Application monitoring)
az monitor app-insights component create \
  --app livedash-insights \
  --location $LOCATION \
  --resource-group $RESOURCE_GROUP \
  --application-type web
```

### View Real-Time Logs

```bash
# Stream backend logs
az webapp log tail \
  --resource-group $RESOURCE_GROUP \
  --name $BACKEND_APP \
  --follow

# Stream frontend logs
az webapp log tail \
  --resource-group $RESOURCE_GROUP \
  --name $FRONTEND_APP \
  --follow
```

### Common Issues

**502 Bad Gateway**
- Backend container may not be running
- Check logs: `az webapp log tail ...`
- Ensure MySQL firewall rule allows Azure services

**WebSocket connection refused**
- Verify WebSockets are enabled:
  ```bash
  az webapp config show \
    --resource-group $RESOURCE_GROUP \
    --name $BACKEND_APP \
    --query webSocketsEnabled
  ```

**Claude returns 401 Unauthorized**
- API key is wrong or expired
- Update in Azure Portal → App Settings → Claude__ApiKey

---

## CI/CD with GitHub Actions (Optional)

To auto-deploy on every `git push main`:

1. Create `.github/workflows/deploy.yml` (included in project)
2. Add GitHub secrets:
   - `AZURE_CREDENTIALS` — from `az ad sp create-for-rbac`
   - `ACR_USERNAME`, `ACR_PASSWORD`, `ACR_DOMAIN`
3. Push to GitHub
4. Actions automatically builds, pushes, and deploys

See `.github/workflows/deploy.yml` for full config.

---

## Cleanup

To delete all resources (stop incurring costs):

```bash
az group delete \
  --name $RESOURCE_GROUP \
  --yes
```

This deletes:
- Resource group
- All web apps
- MySQL server
- Container registry
- Everything

---

## Next Steps

1. ✅ Your app is live on Azure!
2. 🔒 **Add a custom domain** — use Azure App Service with your domain name
3. 🔐 **Enable SSL/TLS** — automatic with Azure App Service
4. 📊 **Set up monitoring** — Application Insights + Log Analytics
5. 🚀 **Configure auto-scaling** — pay-as-you-go (not available on F1)
6. 🔄 **Set up CI/CD** — GitHub Actions auto-deploys on push

Enjoy! 🎉
