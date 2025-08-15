@echo off
REM DesignPad Quick Deployment Script
REM Simple batch file for Windows deployment

echo.
echo ================================================
echo          DesignPad Quick Deployment
echo ================================================
echo.

REM Configuration
set RESOURCE_GROUP=rg-designdraw-855
set CONTAINER_APP=designdraw-web-516
set REGISTRY=acr54239
set IMAGE_NAME=designpad

REM Generate timestamp for version
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "YY=%dt:~2,2%" & set "YYYY=%dt:~0,4%" & set "MM=%dt:~4,2%" & set "DD=%dt:~6,2%"
set "HH=%dt:~8,2%" & set "Min=%dt:~10,2%" & set "Sec=%dt:~12,2%"
set "VERSION=v%YYYY%%MM%%DD%-%HH%%Min%%Sec%"

set FULL_IMAGE=%REGISTRY%.azurecr.io/%IMAGE_NAME%:%VERSION%

echo Resource Group: %RESOURCE_GROUP%
echo Container App:  %CONTAINER_APP%
echo Image:          %FULL_IMAGE%
echo.

REM Check if Docker is running
echo Checking Docker...
docker version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker is not running. Please start Docker Desktop.
    pause
    exit /b 1
)
echo ✓ Docker is running

REM Check Azure CLI
echo Checking Azure CLI...
az account show >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Not logged into Azure CLI. Please run 'az login' first.
    pause
    exit /b 1
)
echo ✓ Azure CLI is ready

echo.
echo Building Docker image...
docker build -t %IMAGE_NAME%:latest .
if %errorlevel% neq 0 (
    echo ERROR: Docker build failed
    pause
    exit /b 1
)
echo ✓ Build completed

echo.
echo Tagging image...
docker tag %IMAGE_NAME%:latest %FULL_IMAGE%
if %errorlevel% neq 0 (
    echo ERROR: Docker tag failed
    pause
    exit /b 1
)
echo ✓ Image tagged

echo.
echo Pushing to Azure Container Registry...
docker push %FULL_IMAGE%
if %errorlevel% neq 0 (
    echo ERROR: Docker push failed
    pause
    exit /b 1
)
echo ✓ Image pushed

echo.
echo Updating Azure Container App...
az containerapp update --name %CONTAINER_APP% --resource-group %RESOURCE_GROUP% --image %FULL_IMAGE%
if %errorlevel% neq 0 (
    echo ERROR: Container app update failed
    pause
    exit /b 1
)

echo.
echo ================================================
echo          Deployment Completed!
echo ================================================
echo.
echo Your app is available at:
echo • https://designpad.info
echo • https://designpad.info/stats
echo.
echo Image deployed: %FULL_IMAGE%
echo.
pause
