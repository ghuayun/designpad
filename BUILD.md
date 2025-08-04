# DesignDraw Build Instructions

This document explains how to build DesignDraw for different platforms.

## Prerequisites

- Node.js (version 16 or higher)
- npm (comes with Node.js)

## Setup

1. Install dependencies:
```bash
npm install
```

## Building

### Quick Build Commands

```bash
# Build for Windows
npm run build-win

# Build for macOS
npm run build-mac

# Build for Linux
npm run build-linux

# Build for all platforms
npm run build-all
```

### Using Build Scripts

On Windows:
```cmd
build.bat win
build.bat mac
build.bat linux
build.bat all
```

On macOS/Linux:
```bash
./build.sh win
./build.sh mac
./build.sh linux
./build.sh all
```

## Output Files

After building, you'll find the distribution files in the `dist` folder:

### Windows
- `DesignDraw Setup 1.0.0.exe` - NSIS installer
- `DesignDraw 1.0.0.exe` - Portable executable

### macOS
- `DesignDraw-1.0.0.dmg` - DMG installer
- `DesignDraw-1.0.0-mac.zip` - ZIP archive

### Linux
- `DesignDraw-1.0.0.AppImage` - AppImage executable
- `design-draw_1.0.0_amd64.deb` - Debian package

## Icons

Place your application icons in the `assets` folder:
- `icon.ico` - Windows icon (256x256 or multiple sizes)
- `icon.icns` - macOS icon (512x512@2x recommended)
- `icon.png` - Linux icon (512x512 recommended)

## Code Signing (Optional)

### Windows
Set environment variables for code signing:
```bash
set CSC_LINK=path/to/certificate.p12
set CSC_KEY_PASSWORD=your_password
```

### macOS
Set environment variables:
```bash
export CSC_LINK=path/to/certificate.p12
export CSC_KEY_PASSWORD=your_password
export APPLE_ID=your_apple_id
export APPLE_ID_PASS=app_specific_password
```

## Troubleshooting

### Common Issues

1. **Missing electron-builder**: Run `npm install` to install dependencies
2. **Build fails on macOS**: Ensure you have Xcode command line tools installed
3. **Windows build issues**: Make sure you have Windows Build Tools installed

### Platform-specific Notes

- **Windows**: Builds work on Windows, macOS, and Linux
- **macOS**: DMG creation only works on macOS
- **Linux**: AppImage and DEB creation work on Linux and macOS

## Advanced Configuration

Edit the `build` section in `package.json` to customize:
- Output directory
- File associations
- Auto-updater settings
- Custom installer options
