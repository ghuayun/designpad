# DesignPad Azure Deployment Script
# This script builds and deploys your DesignPad application to Azure Container Apps

param(
    [string]$ResourceGroup = "rg-designdraw-855",
    [string]$ContainerAppName = "designdraw-web-516", 
    [string]$RegistryName = "acr54239",
    [string]$ImageName = "designpad",
    [switch]$SkipBuild,
    [switch]$Help
)

# Display help information
if ($Help) {
    Write-Host "DesignPad Deployment Script"
    Write-Host ""
    Write-Host "USAGE:"
    Write-Host "    .\deploy.ps1 [OPTIONS]"
    Write-Host ""
    Write-Host "OPTIONS:"
    Write-Host "    -ResourceGroup      Azure resource group name (default: rg-designdraw-855)"
    Write-Host "    -ContainerAppName   Container app name (default: designdraw-web-516)"
    Write-Host "    -RegistryName       Container registry name (default: acr54239)"
    Write-Host "    -ImageName          Docker image name (default: designpad)"
    Write-Host "    -SkipBuild          Skip Docker build and only update the container app"
    Write-Host "    -Help               Show this help message"
    Write-Host ""
    Write-Host "EXAMPLES:"
    Write-Host "    .\deploy.ps1                                    # Full deployment"
    Write-Host "    .\deploy.ps1 -SkipBuild                        # Only update container app"
    Write-Host "    .\deploy.ps1 -ImageName myapp -ResourceGroup my-rg  # Custom settings"
    Write-Host ""
    exit 0
}

# Configuration
$RegistryUrl = "$RegistryName.azurecr.io"
$Timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$Version = "v$Timestamp"
$FullImageName = "$RegistryUrl/${ImageName}:$Version"

Write-Host "DesignPad Deployment Script" -ForegroundColor Cyan
Write-Host "===========================" -ForegroundColor Cyan
Write-Host "Resource Group: $ResourceGroup" -ForegroundColor Yellow
Write-Host "Container App:  $ContainerAppName" -ForegroundColor Yellow
Write-Host "Registry:       $RegistryUrl" -ForegroundColor Yellow
Write-Host "Image:          $FullImageName" -ForegroundColor Yellow
Write-Host "Skip Build:     $SkipBuild" -ForegroundColor Yellow
Write-Host ""

# Function to check if command exists
function Test-Command {
    param($Command)
    $null = Get-Command $Command -ErrorAction SilentlyContinue
    return $?
}

# Function to handle errors
function Handle-Error {
    param($Message)
    Write-Host "ERROR: $Message" -ForegroundColor Red
    exit 1
}

# Check prerequisites
Write-Host "Checking prerequisites..." -ForegroundColor Blue

if (-not (Test-Command "docker")) {
    Handle-Error "Docker is not installed or not in PATH"
}

if (-not (Test-Command "az")) {
    Handle-Error "Azure CLI is not installed or not in PATH"
}

# Check if Docker is running
try {
    docker version | Out-Null
    Write-Host "SUCCESS: Docker is running" -ForegroundColor Green
}
catch {
    Handle-Error "Docker is not running. Please start Docker Desktop."
}

# Check Azure CLI login
try {
    az account show | Out-Null
    $CurrentAccount = az account show --query "user.name" -o tsv
    Write-Host "SUCCESS: Azure CLI logged in as: $CurrentAccount" -ForegroundColor Green
}
catch {
    Handle-Error "Not logged into Azure CLI. Run 'az login' first."
}

# Build and push Docker image (unless skipped)
if (-not $SkipBuild) {
    Write-Host ""
    Write-Host "Building Docker image..." -ForegroundColor Blue
    
    docker build -t "${ImageName}:latest" .
    if ($LASTEXITCODE -ne 0) {
        Handle-Error "Docker build failed"
    }
    Write-Host "SUCCESS: Docker build completed" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "Tagging image..." -ForegroundColor Blue
    
    docker tag "${ImageName}:latest" $FullImageName
    if ($LASTEXITCODE -ne 0) {
        Handle-Error "Docker tag failed"
    }
    Write-Host "SUCCESS: Image tagged: $FullImageName" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "Pushing to Azure Container Registry..." -ForegroundColor Blue
    
    docker push $FullImageName
    if ($LASTEXITCODE -ne 0) {
        Handle-Error "Docker push failed"
    }
    Write-Host "SUCCESS: Image pushed successfully" -ForegroundColor Green
}
else {
    Write-Host "SKIPPING: Docker build (using existing image)" -ForegroundColor Yellow
}

# Update Azure Container App
Write-Host ""
Write-Host "Updating Azure Container App..." -ForegroundColor Blue

$UpdateResult = az containerapp update --name $ContainerAppName --resource-group $ResourceGroup --image $FullImageName --output json

if ($LASTEXITCODE -ne 0) {
    Handle-Error "Container app update failed"
}

$UpdateJson = $UpdateResult | ConvertFrom-Json
$NewRevision = $UpdateJson.properties.latestRevisionName

Write-Host "SUCCESS: Container app updated successfully" -ForegroundColor Green
Write-Host "New revision: $NewRevision" -ForegroundColor Cyan

# Display results
Write-Host ""
Write-Host "Deployment Summary" -ForegroundColor Cyan
Write-Host "==================" -ForegroundColor Cyan
Write-Host "Image:          $FullImageName" -ForegroundColor White
Write-Host "Revision:       $NewRevision" -ForegroundColor White
Write-Host ""
Write-Host "Quick Links:" -ForegroundColor Cyan
Write-Host "  Application: https://designpad.info" -ForegroundColor Blue
Write-Host "  Statistics:  https://designpad.info/stats" -ForegroundColor Blue
Write-Host ""
Write-Host "SUCCESS: Deployment completed!" -ForegroundColor Green
