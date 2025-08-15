# DesignPad Deployment Scripts

This directory contains automated deployment scripts for deploying your DesignPad application to Azure Container Apps.

## Available Scripts

### 1. `deploy.ps1` (PowerShell - Recommended for Windows)
Advanced PowerShell script with full error handling and status checking.

**Usage:**
```powershell
# Basic deployment
.\deploy.ps1

# Show help
.\deploy.ps1 -Help

# Skip Docker build (update only)
.\deploy.ps1 -SkipBuild

# Custom configuration
.\deploy.ps1 -ResourceGroup "my-rg" -ContainerAppName "my-app" -ImageName "myapp"
```

**Features:**
- ✅ Comprehensive error handling
- ✅ Prerequisites checking
- ✅ Deployment status monitoring
- ✅ Detailed logging
- ✅ Custom parameters support
- ✅ Health check validation

### 2. `quick-deploy.bat` (Batch - Simple Windows)
Simple batch file for quick deployments on Windows.

**Usage:**
```cmd
quick-deploy.bat
```

**Features:**
- ✅ Simple one-click deployment
- ✅ Basic error checking
- ✅ Suitable for beginners

### 3. `deploy-azure.sh` (Bash - Linux/macOS)
Cross-platform shell script for Linux and macOS users.

**Usage:**
```bash
# Make executable (Linux/macOS only)
chmod +x deploy-azure.sh

# Run deployment
./deploy-azure.sh
```

**Features:**
- ✅ Color-coded output
- ✅ Error handling
- ✅ Cross-platform compatibility

## Prerequisites

Before running any deployment script, ensure you have:

1. **Docker Desktop** installed and running
2. **Azure CLI** installed and logged in (`az login`)
3. **Access** to your Azure subscription and resource group

## Configuration

All scripts use these default values (configurable):

```
Resource Group:    rg-designdraw-855
Container App:     designdraw-web-516
Registry:          acr54239.azurecr.io
Image Name:        designpad
```

## What the Scripts Do

1. **🔍 Prerequisites Check** - Verify Docker and Azure CLI are available
2. **🔨 Build Docker Image** - Create new Docker image from your code
3. **🏷️ Tag with Version** - Use timestamp-based versioning (e.g., `v20250807-233531`)
4. **📤 Push to Registry** - Upload image to Azure Container Registry
5. **🔄 Update Container App** - Deploy new image to Azure Container Apps
6. **✅ Verify Deployment** - Check that the new version is running

## Deployment URLs

After successful deployment, your app will be available at:

- **Production:** https://designpad.info
- **Statistics:** https://designpad.info/stats
- **Direct URL:** https://designdraw-web-516.greenstone-e6d1eb36.eastus.azurecontainerapps.io

## Troubleshooting

### Common Issues

**Docker not running:**
```
ERROR: Docker is not running
```
**Solution:** Start Docker Desktop and wait for it to fully initialize.

**Azure CLI not logged in:**
```
ERROR: Not logged into Azure CLI
```
**Solution:** Run `az login` and authenticate with your Azure account.

**Image already exists:**
```
ERROR: Image push failed
```
**Solution:** The scripts use timestamp-based versioning to avoid this issue.

### Manual Deployment Commands

If you prefer to run commands manually:

```bash
# Generate timestamp
$VERSION = "v$(Get-Date -Format 'yyyyMMdd-HHmmss')"

# Build and tag
docker build -t designpad:latest .
docker tag designpad:latest acr54239.azurecr.io/designpad:$VERSION

# Push to registry
docker push acr54239.azurecr.io/designpad:$VERSION

# Update container app
az containerapp update \
  --name designdraw-web-516 \
  --resource-group rg-designdraw-855 \
  --image acr54239.azurecr.io/designpad:$VERSION
```

## Version Management

The scripts automatically create unique versions using timestamps:
- Format: `vYYYYMMDD-HHMMSS`
- Example: `v20250807-233531`

This ensures:
- ✅ No image caching issues
- ✅ Easy rollback capability
- ✅ Clear deployment history

## Support

If you encounter issues:

1. Check the Azure portal for container app logs
2. Verify your Azure permissions
3. Ensure Docker Desktop has sufficient resources
4. Check network connectivity for registry access

## Security Notes

- Scripts use your existing Azure CLI credentials
- No sensitive information is stored in the scripts
- All deployments use managed identities where possible
