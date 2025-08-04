# DesignDraw Azure Deployment Guide

This guide provides multiple ways to deploy your DesignDraw web application to Azure.

## 🚀 Quick Start (Recommended)

### Option 1: Azure Developer CLI (Modern Approach)

1. **Install Azure Developer CLI**:
   ```powershell
   winget install microsoft.azd
   ```

2. **Run the deployment**:
   ```powershell
   .\deploy-azd.ps1
   ```

This will:
- ✅ Create all Azure resources using Infrastructure as Code
- ✅ Build and deploy your Docker container
- ✅ Set up monitoring and logging
- ✅ Provide a public URL for your app

### Option 2: Traditional Azure CLI

1. **Install Azure CLI**:
   ```powershell
   winget install Microsoft.AzureCLI
   ```

2. **Run the deployment**:
   ```powershell
   .\deploy-azure.ps1
   ```

## 📋 Prerequisites

- **Azure Subscription**: You need an active Azure subscription
- **Docker Desktop**: Must be running for building images
- **PowerShell**: Windows PowerShell 5.1+ or PowerShell Core 7+

## 🏗️ Architecture

Your deployment will create:

```
┌─────────────────────────────────────────────────────────────┐
│                     Azure Resource Group                    │
├─────────────────────────────────────────────────────────────┤
│  🏗️  Container Registry (ACR)                              │
│     └── designdraw-web:latest                              │
│                                                             │
│  🌐 Container Apps Environment                             │
│     ├── 📊 Log Analytics Workspace                        │
│     └── 🚀 Container App                                  │
│         ├── Auto-scaling (1-10 instances)                 │
│         ├── Health checks                                 │
│         ├── HTTPS termination                             │
│         └── Public endpoint                               │
│                                                             │
│  🔒 Managed Identity                                       │
│     └── ACR Pull permissions                               │
└─────────────────────────────────────────────────────────────┘
```

## 💰 Cost Estimate

**Monthly costs (approximate)**:
- Container Apps: $15-30/month
- Container Registry: $5/month  
- Log Analytics: $5-10/month
- **Total: ~$25-45/month**

## 🛠️ Advanced Usage

### Custom Parameters

```powershell
# Deploy to production environment
.\deploy-azd.ps1 -EnvironmentName "prod" -Location "westus2"

# Deploy with custom names
.\deploy-azure.ps1 -ResourceGroupName "my-rg" -AppName "my-app" -Location "centralus"
```

### Environment Variables

The deployment supports these environment variables:
- `AZURE_ENV_NAME` - Environment name (dev/staging/prod)
- `AZURE_LOCATION` - Azure region
- `AZURE_SUBSCRIPTION_ID` - Target subscription

### Manual Commands

If you prefer manual control:

```powershell
# Initialize azd
azd init

# Preview deployment
azd provision --preview

# Deploy infrastructure only
azd provision

# Deploy application only
azd deploy

# Full deployment
azd up
```

## 📊 Monitoring & Management

### View Logs
```powershell
# Real-time logs
azd monitor --live

# Azure CLI logs
az webapp log tail --name <app-name> --resource-group <rg-name>
```

### Scale Your Application
```powershell
# Scale manually (Azure CLI method)
az appservice plan update --name <plan-name> --resource-group <rg-name> --sku P1V2

# Container Apps scales automatically based on traffic
```

### Health Monitoring
- Health endpoint: `https://your-app.azurecontainerapps.io/health`
- Azure Monitor: Available in Azure Portal
- Application Insights: Optional addition

## 🧹 Cleanup

### Delete Everything
```powershell
# Using azd (recommended)
azd down

# Using Azure CLI
az group delete --name <resource-group-name> --yes --no-wait
```

## 🔧 Troubleshooting

### Common Issues

1. **Docker not running**:
   - Start Docker Desktop
   - Verify with: `docker ps`

2. **Azure CLI not logged in**:
   - Run: `az login`
   - Verify with: `az account show`

3. **azd not installed**:
   - Install: `winget install microsoft.azd`
   - Restart your terminal

4. **Resource name conflicts**:
   - Container Registry names must be globally unique
   - Try different names or let the script generate random suffixes

5. **Deployment fails**:
   - Check logs: `azd monitor --live`
   - Verify all prerequisites are met
   - Ensure Docker image builds locally: `docker build -t test .`

### Support Resources

- [Azure Container Apps Documentation](https://docs.microsoft.com/en-us/azure/container-apps/)
- [Azure Developer CLI Documentation](https://docs.microsoft.com/en-us/azure/developer/azure-developer-cli/)
- [Bicep Documentation](https://docs.microsoft.com/en-us/azure/azure-resource-manager/bicep/)

## 🎯 Next Steps

After deployment:

1. **Custom Domain**: Add your own domain name
2. **SSL Certificate**: Configure custom SSL (automatic with Azure)
3. **CI/CD**: Set up GitHub Actions for automatic deployments
4. **Monitoring**: Add Application Insights for detailed analytics
5. **Backup**: Configure backup strategies for your data

## 📝 File Structure

```
web/
├── deploy-azd.ps1              # Modern deployment script
├── deploy-azure.ps1            # Traditional deployment script  
├── azure.yaml                  # Azure Developer CLI config
├── infra/                      # Infrastructure as Code
│   ├── main.bicep             # Main Bicep template
│   └── main.parameters.json    # Parameters file
├── Dockerfile                  # Container definition
├── server/                     # Application code
└── public/                     # Static assets
```

---

🎉 **Happy deploying!** Your DesignDraw application will be running on Azure in minutes!
