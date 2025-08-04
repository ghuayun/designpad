@echo off
REM DesignDraw Web Build and Deploy Script for Windows

setlocal EnableDelayedExpansion

echo 🚀 DesignDraw Web Deployment Script
echo ===================================

REM Default values
set ENVIRONMENT=production
set PORT=3000
set REBUILD=false

REM Parse command line arguments
:parse_args
if "%~1"=="" goto :after_parse
if "%~1"=="-e" (
    set ENVIRONMENT=%~2
    shift
    shift
    goto :parse_args
)
if "%~1"=="--env" (
    set ENVIRONMENT=%~2
    shift
    shift
    goto :parse_args
)
if "%~1"=="-p" (
    set PORT=%~2
    shift
    shift
    goto :parse_args
)
if "%~1"=="--port" (
    set PORT=%~2
    shift
    shift
    goto :parse_args
)
if "%~1"=="-r" (
    set REBUILD=true
    shift
    goto :parse_args
)
if "%~1"=="--rebuild" (
    set REBUILD=true
    shift
    goto :parse_args
)
if "%~1"=="-h" goto :show_help
if "%~1"=="--help" goto :show_help
echo Unknown option: %~1
exit /b 1

:show_help
echo Usage: %0 [OPTIONS]
echo Options:
echo   -e, --env       Environment (development^|production) [default: production]
echo   -p, --port      Port number [default: 3000]
echo   -r, --rebuild   Force rebuild of Docker image
echo   -h, --help      Show this help message
exit /b 0

:after_parse

echo Environment: %ENVIRONMENT%
echo Port: %PORT%

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not running. Please start Docker and try again.
    exit /b 1
)

REM Stop existing containers
echo 🛑 Stopping existing containers...
docker-compose down 2>nul

REM Build image
if "%REBUILD%"=="true" (
    echo 🔨 Building Docker image...
    docker build -t designdraw-web .
) else (
    docker images | findstr "designdraw-web" >nul
    if %errorlevel% neq 0 (
        echo 🔨 Building Docker image...
        docker build -t designdraw-web .
    ) else (
        echo ✅ Using existing Docker image
    )
)

REM Set environment variables
set PORT=%PORT%

REM Run based on environment
if "%ENVIRONMENT%"=="development" (
    echo 🔧 Starting development environment...
    docker-compose --profile dev up -d designdraw-dev
    
    echo 📋 Development server started!
    echo 🌐 Access the app at: http://localhost:%PORT%
    echo 📝 Logs: docker-compose logs -f designdraw-dev
    
) else if "%ENVIRONMENT%"=="production" (
    echo 🚀 Starting production environment...
    docker-compose up -d designdraw-web
    
    REM Wait for health check
    echo ⏳ Waiting for application to be ready...
    for /l %%i in (1,1,30) do (
        curl -s http://localhost:%PORT%/health >nul 2>&1
        if !errorlevel! equ 0 (
            echo ✅ Application is ready!
            goto :ready
        )
        timeout /t 2 >nul
    )
    echo ❌ Application failed to start properly
    docker-compose logs designdraw-web
    exit /b 1
    
    :ready
    echo 🎉 Production server started successfully!
    echo 🌐 Access the app at: http://localhost:%PORT%
    echo 🏥 Health check: http://localhost:%PORT%/health
    echo 📝 Logs: docker-compose logs -f designdraw-web
)

echo.
echo 📋 Useful commands:
echo   View logs:      docker-compose logs -f
echo   Stop services:  docker-compose down
echo   Restart:        docker-compose restart
echo   Shell access:   docker-compose exec designdraw-web sh
