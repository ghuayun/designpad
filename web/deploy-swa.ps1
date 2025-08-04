# Azure Static Web Apps Deployment for DesignDraw
# This approach is simpler and perfect for web applications like DesignDraw

param(
    [Parameter(Mandatory=$false)]
    [string]$ResourceGroupName = "rg-designdraw-$(Get-Random -Minimum 100 -Maximum 999)",
    
    [Parameter(Mandatory=$false)]
    [string]$Location = "eastus2",
    
    [Parameter(Mandatory=$false)]
    [string]$AppName = "designdraw-swa-$(Get-Random -Minimum 100 -Maximum 999)"
)

Write-Host "DesignDraw Azure Static Web Apps Deployment" -ForegroundColor Magenta
Write-Host "===========================================" -ForegroundColor Magenta
Write-Host "Resource Group: $ResourceGroupName" -ForegroundColor Cyan
Write-Host "Location: $Location" -ForegroundColor Cyan
Write-Host "App Name: $AppName" -ForegroundColor Cyan
Write-Host ""

# Check Azure login
Write-Host "Checking Azure authentication..." -ForegroundColor Cyan
$account = az account show 2>$null | ConvertFrom-Json
if (!$account) {
    Write-Host "[ERROR] Not logged into Azure. Please run 'az login' first." -ForegroundColor Red
    exit 1
}
Write-Host "[SUCCESS] Logged into Azure as: $($account.user.name)" -ForegroundColor Green
Write-Host "[SUCCESS] Subscription: $($account.name)" -ForegroundColor Green

# Create Resource Group
Write-Host "Creating resource group..." -ForegroundColor Cyan
az group create --name $ResourceGroupName --location $Location --output none
if ($LASTEXITCODE -eq 0) {
    Write-Host "[SUCCESS] Resource group created" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Failed to create resource group" -ForegroundColor Red
    exit 1
}

# Build the app locally
Write-Host "Building application..." -ForegroundColor Cyan
if (Test-Path "dist") {
    Remove-Item -Recurse -Force "dist"
}
New-Item -ItemType Directory -Force -Path "dist" | Out-Null

# Copy all public files to dist folder
Copy-Item -Path "public/*" -Destination "dist/" -Recurse -Force
Copy-Item -Path "server.js" -Destination "dist/"
Copy-Item -Path "package.json" -Destination "dist/"

# Create a simple staticwebapp.config.json for Azure Static Web Apps
@"
{
  "routes": [
    {
      "route": "/api/*",
      "allowedRoles": ["anonymous"]
    },
    {
      "route": "/*",
      "serve": "/index.html",
      "statusCode": 200
    }
  ],
  "navigationFallback": {
    "rewrite": "/index.html"
  },
  "responseOverrides": {
    "404": {
      "rewrite": "/index.html"
    }
  }
}
"@ | Out-File -FilePath "dist/staticwebapp.config.json" -Encoding UTF8

Write-Host "[SUCCESS] Application built" -ForegroundColor Green

# Create Azure Static Web App
Write-Host "Creating Azure Static Web App..." -ForegroundColor Cyan
$swa = az staticwebapp create --name $AppName --resource-group $ResourceGroupName --location $Location --source "dist" --output json | ConvertFrom-Json

if ($LASTEXITCODE -eq 0) {
    Write-Host "[SUCCESS] Static Web App created" -ForegroundColor Green
    $appUrl = $swa.defaultHostname
} else {
    Write-Host "[ERROR] Failed to create Static Web App" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Deployment Completed!" -ForegroundColor Green
Write-Host "====================" -ForegroundColor Green
Write-Host "App URL: https://$appUrl" -ForegroundColor Green
Write-Host "Resource Group: $ResourceGroupName" -ForegroundColor Cyan
Write-Host ""
Write-Host "Monitor deployment:" -ForegroundColor Yellow
Write-Host "  Azure Portal: https://portal.azure.com" -ForegroundColor Yellow
Write-Host ""
Write-Host "To delete resources: az group delete --name $ResourceGroupName --yes --no-wait" -ForegroundColor Red
Write-Host ""

# Wait and test
Write-Host "Waiting for app to be available..." -ForegroundColor Cyan
Start-Sleep -Seconds 30

try {
    $response = Invoke-WebRequest -Uri "https://$appUrl" -TimeoutSec 30 -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "[SUCCESS] App is running!" -ForegroundColor Green
    }
}
catch {
    Write-Host "App may still be starting. Check: https://$appUrl" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Your DesignDraw app: https://$appUrl" -ForegroundColor Green
