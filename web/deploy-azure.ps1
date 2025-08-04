# DesignDraw Azure Deployment Script
# This script deploys the DesignDraw web application to Azure using best practices

param(
    [Parameter(Mandatory=$false)]
    [string]$ResourceGroupName = "rg-designdraw",
    
    [Parameter(Mandatory=$false)]
    [string]$Location = "eastus",
    
    [Parameter(Mandatory=$false)]
    [string]$AppName = "designdraw-web",
    
    [Parameter(Mandatory=$false)]
    [string]$RegistryName = "acrdesigndraw$(Get-Random -Minimum 1000 -Maximum 9999)",
    
    [Parameter(Mandatory=$false)]
    [string]$Environment = "dev"
)

# Color functions for better output
function Write-Success { param($Message) Write-Host "[SUCCESS] $Message" -ForegroundColor Green }
function Write-Info { param($Message) Write-Host "[INFO] $Message" -ForegroundColor Cyan }
function Write-Warning { param($Message) Write-Host "[WARNING] $Message" -ForegroundColor Yellow }
function Write-Error { param($Message) Write-Host "[ERROR] $Message" -ForegroundColor Red }

Write-Host "DesignDraw Azure Deployment Script" -ForegroundColor Magenta
Write-Host "================================================" -ForegroundColor Magenta
Write-Info "Resource Group: $ResourceGroupName"
Write-Info "Location: $Location"
Write-Info "App Name: $AppName"
Write-Info "Registry Name: $RegistryName"
Write-Info "Environment: $Environment"
Write-Host ""

# Step 1: Check prerequisites
Write-Info "Step 1/8: Checking prerequisites..."

# Check if Azure CLI is installed
try {
    $azVersion = az version --output table 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "Azure CLI not found"
    }
    Write-Success "Azure CLI is installed"
} catch {
    Write-Error "Azure CLI is not installed. Please install it from: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
}

# Check if Docker is running
try {
    docker ps 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Docker not running"
    }
    Write-Success "Docker is running"
} catch {
    Write-Error "Docker is not running. Please start Docker Desktop."
    exit 1
}

# Check Azure login
Write-Info "Checking Azure authentication..."
$account = az account show 2>$null | ConvertFrom-Json
if (!$account) {
    Write-Warning "Not logged into Azure. Starting login process..."
    az login
    $account = az account show | ConvertFrom-Json
    if (!$account) {
        Write-Error "Failed to login to Azure"
        exit 1
    }
}
Write-Success "Logged into Azure as: $($account.user.name)"
Write-Info "Subscription: $($account.name) ($($account.id))"

# Step 2: Create Resource Group
Write-Info "Step 2/8: Creating resource group..."
$rg = az group show --name $ResourceGroupName 2>$null | ConvertFrom-Json
if (!$rg) {
    Write-Info "Creating resource group: $ResourceGroupName"
    az group create --name $ResourceGroupName --location $Location --output none
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Resource group created successfully"
    } else {
        Write-Error "Failed to create resource group"
        exit 1
    }
} else {
    Write-Success "Resource group already exists"
}

# Step 3: Create Azure Container Registry
Write-Info "Step 3/8: Setting up Azure Container Registry..."
$acr = az acr show --name $RegistryName --resource-group $ResourceGroupName 2>$null | ConvertFrom-Json
if (!$acr) {
    Write-Info "Creating Azure Container Registry: $RegistryName"
    az acr create --resource-group $ResourceGroupName --name $RegistryName --sku Basic --admin-enabled true --output none
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Azure Container Registry created successfully"
    } else {
        Write-Error "Failed to create Azure Container Registry"
        exit 1
    }
} else {
    Write-Success "Azure Container Registry already exists"
}

# Step 4: Build and push Docker image
Write-Info "Step 4/8: Building and pushing Docker image..."
Write-Info "This may take a few minutes..."

# Login to ACR
az acr login --name $RegistryName
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to login to Azure Container Registry"
    exit 1
}

# Build and push using ACR build (recommended for production)
$imageName = "designdraw-web:latest"
Write-Info "Building image: $imageName"
az acr build --registry $RegistryName --image $imageName . --output none
if ($LASTEXITCODE -eq 0) {
    Write-Success "Docker image built and pushed successfully"
} else {
    Write-Error "Failed to build and push Docker image"
    exit 1
}

# Step 5: Create App Service Plan
Write-Info "Step 5/8: Creating App Service Plan..."
$planName = "plan-$AppName-$Environment"
$plan = az appservice plan show --name $planName --resource-group $ResourceGroupName 2>$null | ConvertFrom-Json
if (!$plan) {
    Write-Info "Creating App Service Plan: $planName"
    az appservice plan create --name $planName --resource-group $ResourceGroupName --sku B1 --is-linux --output none
    if ($LASTEXITCODE -eq 0) {
        Write-Success "App Service Plan created successfully"
    } else {
        Write-Error "Failed to create App Service Plan"
        exit 1
    }
} else {
    Write-Success "App Service Plan already exists"
}

# Step 6: Create Web App
Write-Info "Step 6/8: Creating Web App..."
$webAppName = "$AppName-$Environment-$(Get-Random -Minimum 100 -Maximum 999)"
$imageUri = "$RegistryName.azurecr.io/$imageName"

Write-Info "Creating Web App: $webAppName"
az webapp create --resource-group $ResourceGroupName --plan $planName --name $webAppName --deployment-container-image-name $imageUri --output none
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to create Web App"
    exit 1
}

# Step 7: Configure Web App
Write-Info "Step 7/8: Configuring Web App..."

# Get ACR credentials
$acrCredentials = az acr credential show --name $RegistryName | ConvertFrom-Json
$acrPassword = $acrCredentials.passwords[0].value

# Configure container registry settings
Write-Info "Configuring container registry authentication..."
az webapp config appsettings set --resource-group $ResourceGroupName --name $webAppName --settings `
    DOCKER_REGISTRY_SERVER_URL="https://$RegistryName.azurecr.io" `
    DOCKER_REGISTRY_SERVER_USERNAME=$RegistryName `
    DOCKER_REGISTRY_SERVER_PASSWORD=$acrPassword `
    WEBSITES_ENABLE_APP_SERVICE_STORAGE=false `
    WEBSITES_PORT=3000 --output none

if ($LASTEXITCODE -eq 0) {
    Write-Success "Web App configured successfully"
} else {
    Write-Error "Failed to configure Web App"
    exit 1
}

# Step 8: Get deployment information
Write-Info "Step 8/8: Getting deployment information..."

$webapp = az webapp show --resource-group $ResourceGroupName --name $webAppName | ConvertFrom-Json
$appUrl = "https://$($webapp.defaultHostName)"

Write-Host ""
Write-Host "Deployment Completed Successfully!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Success "Resource Group: $ResourceGroupName"
Write-Success "Container Registry: $RegistryName.azurecr.io"
Write-Success "Web App: $webAppName"
Write-Success "App URL: $appUrl"
Write-Host ""
Write-Info "Monitor your deployment:"
Write-Info "   Azure Portal: https://portal.azure.com"
Write-Info "   Resource Group: https://portal.azure.com/#@/resource/subscriptions/$($account.id)/resourceGroups/$ResourceGroupName"
Write-Host ""
Write-Info "Useful commands:"
Write-Info "   View logs: az webapp log tail --name $webAppName --resource-group $ResourceGroupName"
Write-Info "   Restart app: az webapp restart --name $webAppName --resource-group $ResourceGroupName"
Write-Info "   Scale app: az appservice plan update --name $planName --resource-group $ResourceGroupName --sku P1V2"
Write-Host ""
Write-Warning "Cost estimate: ~$15-30/month for Basic tier (B1)"
Write-Warning "To delete all resources: az group delete --name $ResourceGroupName --yes --no-wait"
Write-Host ""

# Test the deployment
Write-Info "Testing deployment..."
Start-Sleep -Seconds 30  # Wait for app to start

try {
    $response = Invoke-WebRequest -Uri "$appUrl/health" -TimeoutSec 30 -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Success "Health check passed! Your app is running correctly."
    } else {
        Write-Warning "Health check returned status: $($response.StatusCode)"
    }
} catch {
    Write-Warning "Could not perform health check. App may still be starting up."
    Write-Info "Please wait a few minutes and check: $appUrl"
}

Write-Host ""
Write-Success "Your DesignDraw app is now live at: $appUrl"
