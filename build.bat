@echo off
REM DesignDraw Build Script for Windows
echo DesignDraw Build Script
echo ======================

REM Install dependencies if needed
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
)

REM Check which platform to build
if "%1"=="win" (
    echo Building for Windows...
    npm run build-win
) else if "%1"=="mac" (
    echo Building for macOS...
    npm run build-mac
) else if "%1"=="linux" (
    echo Building for Linux...
    npm run build-linux
) else if "%1"=="all" (
    echo Building for all platforms...
    npm run build-all
) else (
    echo Usage: %0 {win^|mac^|linux^|all}
    echo.
    echo Available commands:
    echo   win    - Build for Windows (NSIS installer + portable)
    echo   mac    - Build for macOS (DMG + ZIP)
    echo   linux  - Build for Linux (AppImage + DEB)
    echo   all    - Build for all platforms
    exit /b 1
)

echo Build completed! Check the 'dist' folder for output files.
