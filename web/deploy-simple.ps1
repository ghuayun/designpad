# Simple Azure Deployment without Docker requirement
# This script deploys using Azure Container Instances with Azure Container Registry build

param(
    [Parameter(Mandatory=$false)]
    [string]$ResourceGroupName = "rg-designdraw-$(Get-Random -Minimum 100 -Maximum 999)",
    
    [Parameter(Mandatory=$false)]
    [string]$Location = "eastus",
    
    [Parameter(Mandatory=$false)]
    [string]$AppName = "designdraw-web-$(Get-Random -Minimum 100 -Maximum 999)"
)

Write-Host "DesignDraw Simple Azure Deployment" -ForegroundColor Magenta
Write-Host "===================================" -ForegroundColor Magenta
Write-Host "Resource Group: $ResourceGroupName" -ForegroundColor Cyan
Write-Host "Location: $Location" -ForegroundColor Cyan
Write-Host "App Name: $AppName" -ForegroundColor Cyan
Write-Host ""

# Check Azure login
Write-Host "Checking Azure authentication..." -ForegroundColor Cyan
$account = az account show 2>$null | ConvertFrom-Json
if (!$account) {
    Write-Host "Not logged into Azure. Please run 'az login' first." -ForegroundColor Red
    exit 1
}
Write-Host "✓ Logged into Azure as: $($account.user.name)" -ForegroundColor Green
Write-Host "✓ Subscription: $($account.name)" -ForegroundColor Green

# Create Resource Group
Write-Host "Creating resource group..." -ForegroundColor Cyan
az group create --name $ResourceGroupName --location $Location --output none
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Resource group created" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to create resource group" -ForegroundColor Red
    exit 1
}

# Create Container Registry
$registryName = "acr$(Get-Random -Minimum 10000 -Maximum 99999)"
Write-Host "Creating Container Registry: $registryName..." -ForegroundColor Cyan
az acr create --resource-group $ResourceGroupName --name $registryName --sku Basic --admin-enabled true --output none
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Container Registry created" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to create Container Registry" -ForegroundColor Red
    exit 1
}

# Build image using ACR build (no local Docker required)
Write-Host "Building image in Azure Container Registry..." -ForegroundColor Cyan
Write-Host "This may take a few minutes..." -ForegroundColor Yellow
az acr build --registry $registryName --image "designdraw:latest" . --output table
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Image built successfully" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to build image" -ForegroundColor Red
    exit 1
}

# Get ACR login server
$loginServer = az acr show --name $registryName --resource-group $ResourceGroupName --query "loginServer" --output tsv

# Create App Service Plan
$planName = "plan-$AppName"
Write-Host "Creating App Service Plan..." -ForegroundColor Cyan
az appservice plan create --name $planName --resource-group $ResourceGroupName --sku B1 --is-linux --output none
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ App Service Plan created" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to create App Service Plan" -ForegroundColor Red
    exit 1
}

# Create Web App
Write-Host "Creating Web App..." -ForegroundColor Cyan
$imageUri = "$loginServer/designdraw:latest"
az webapp create --resource-group $ResourceGroupName --plan $planName --name $AppName --deployment-container-image-name $imageUri --output none
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Failed to create Web App" -ForegroundColor Red
    exit 1
}

# Configure Web App with ACR credentials
Write-Host "Configuring Web App..." -ForegroundColor Cyan
$acrCredentials = az acr credential show --name $registryName | ConvertFrom-Json
$acrPassword = $acrCredentials.passwords[0].value

az webapp config appsettings set --resource-group $ResourceGroupName --name $AppName --settings `
    DOCKER_REGISTRY_SERVER_URL="https://$loginServer" `
    DOCKER_REGISTRY_SERVER_USERNAME=$registryName `
    DOCKER_REGISTRY_SERVER_PASSWORD=$acrPassword `
    WEBSITES_ENABLE_APP_SERVICE_STORAGE=false `
    WEBSITES_PORT=3000 --output none

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Web App configured" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to configure Web App" -ForegroundColor Red
    exit 1
}

# Get the app URL
$webapp = az webapp show --resource-group $ResourceGroupName --name $AppName | ConvertFrom-Json
$appUrl = "https://$($webapp.defaultHostName)"

Write-Host ""
Write-Host "🎉 Deployment Completed!" -ForegroundColor Green
Write-Host "========================" -ForegroundColor Green
Write-Host "App URL: $appUrl" -ForegroundColor Green
Write-Host "Resource Group: $ResourceGroupName" -ForegroundColor Cyan
Write-Host "Container Registry: $loginServer" -ForegroundColor Cyan
Write-Host ""
Write-Host "Monitor deployment:" -ForegroundColor Yellow
Write-Host "  Azure Portal: https://portal.azure.com" -ForegroundColor Yellow
Write-Host ""
Write-Host "Useful commands:" -ForegroundColor Yellow
Write-Host "  View logs: az webapp log tail --name $AppName --resource-group $ResourceGroupName" -ForegroundColor Yellow
Write-Host "  Restart: az webapp restart --name $AppName --resource-group $ResourceGroupName" -ForegroundColor Yellow
Write-Host ""
Write-Host "To delete resources: az group delete --name $ResourceGroupName --yes --no-wait" -ForegroundColor Red
Write-Host ""

# Wait and test
Write-Host "Waiting for app to start..." -ForegroundColor Cyan
Start-Sleep -Seconds 45

try {
    $response = Invoke-WebRequest -Uri $appUrl -TimeoutSec 30 -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "✓ App is running!" -ForegroundColor Green
    }
} catch {
    Write-Host "App may still be starting. Check: $appUrl" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🌐 Your DesignDraw app: $appUrl" -ForegroundColor Green
