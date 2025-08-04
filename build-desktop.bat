@echo off
echo Building DesignDraw Desktop Application for Windows...

echo Stopping any running electron processes...
taskkill /f /im electron.exe 2>nul

echo Cleaning previous build...
if exist dist rmdir /s /q dist 2>nul

echo Running electron-builder...
call npm run build-win

echo Build complete!
if exist "dist\DesignDraw Setup*.exe" (
    echo.
    echo Installation file created in dist folder:
    dir /b dist\*.exe
    echo.
    echo You can now install DesignDraw by running the setup file.
) else (
    echo Build may have failed - check the output above.
)

pause
