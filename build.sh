#!/bin/bash

# DesignDraw Build Script
echo "DesignDraw Build Script"
echo "======================"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Check which platform to build
case "$1" in
    "win")
        echo "Building for Windows..."
        npm run build-win
        ;;
    "mac")
        echo "Building for macOS..."
        npm run build-mac
        ;;
    "linux")
        echo "Building for Linux..."
        npm run build-linux
        ;;
    "all")
        echo "Building for all platforms..."
        npm run build-all
        ;;
    *)
        echo "Usage: $0 {win|mac|linux|all}"
        echo ""
        echo "Available commands:"
        echo "  win    - Build for Windows (NSIS installer + portable)"
        echo "  mac    - Build for macOS (DMG + ZIP)"
        echo "  linux  - Build for Linux (AppImage + DEB)"
        echo "  all    - Build for all platforms"
        exit 1
        ;;
esac

echo "Build completed! Check the 'dist' folder for output files."
