# DesignDraw

A lightweight work/data flow design application similar to Excalidraw, built with Electron and HTML5 Canvas.

## Features

- **File Management**: Save/load drawings in .dd format with auto-save functionality
- **Text Tool**: Add text anywhere on the canvas with customizable fonts and sizes
- **Multi-line Text Support**: Press Enter for new lines, Ctrl+Enter or Shift+Enter to finish editing
- **Shape Tools**: Draw rectangles, circles, and diamonds
- **Arrow Tools**: Create single and bi-directional arrows with optional curves
- **Hand Tool**: Pan around the canvas by dragging
- **Eraser Tool**: Remove any object from the canvas
- **Selection Tool**: Select and highlight objects with multi-selection support
- **Undo/Redo**: Full undo/redo functionality with keyboard shortcuts
- **PNG Export**: Export your drawings as PNG images
- **Auto-save**: Automatically saves every 10 seconds
- **Keyboard Shortcuts**: Quick access to all tools and operations

## Installation

### Option 1: Pre-built Binaries (Recommended)
Download the latest release for your platform:
- **Windows**: `DesignDraw Setup 1.0.0.exe` (installer) or `DesignDraw 1.0.0.exe` (portable)
- **macOS**: `DesignDraw-1.0.0.dmg` (installer) or `DesignDraw-1.0.0-mac.zip` (archive)
- **Linux**: `DesignDraw-1.0.0.AppImage` (portable) or `design-draw_1.0.0_amd64.deb` (package)

### Option 2: Run from Source
1. Clone or download the project
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the application:
   ```bash
   npm start
   ```

### Option 3: Build from Source
See [BUILD.md](BUILD.md) for detailed build instructions.

Quick build commands:
```bash
# Install dependencies
npm install

# Build for your current platform
npm run build

# Build for specific platforms
npm run build-win    # Windows
npm run build-mac    # macOS  
npm run build-linux  # Linux
npm run build-all    # All platforms
```

## How to Use

### Tools

- **Select Tool (V)**: Click to select and drag objects. Selected objects are highlighted with a blue dashed border.
  - **Single Selection**: Click on an object to select it
  - **Multi-Selection**: Hold Shift and click objects to select multiple objects individually
  - **Range Selection**: Click and drag on empty space to select all objects within the rectangle
- **Hand Tool (H)**: Click and drag to pan around the canvas. Alternative to Ctrl+drag.
- **Text Tool (T)**: Click anywhere to start typing directly on the canvas. Click on existing text to edit it.
- **Rectangle Tool (R)**: Click and drag to create rectangles.
- **Circle Tool (C)**: Click and drag to create circles/ellipses.
- **Diamond Tool (D)**: Click and drag to create diamond shapes.
- **Arrow Tool (A)**: Click to set the start point, the arrow will follow your mouse. Click again to set the end point. Right-click to cancel. Hold Shift while clicking on shapes to snap to their centers.
- **Bi-directional Arrow (B)**: Same as arrow tool but with arrowheads at both ends.
- **Eraser Tool (E)**: Click on any object to delete it.

### Enhanced Features

- **Direct Text Input**: No more modal dialogs! Click with the text tool and start typing immediately.
- **Multi-line Text Support**: Press Enter to create new lines. Use Ctrl+Enter or Shift+Enter to finish editing.
- **Text Editing**: Click on existing text with the text tool to edit it in place.
- **Shape Movement**: Select any object and drag it to move it around the canvas.
- **Arrow Live Preview**: When drawing arrows, see a live preview of the arrow following your mouse cursor.
- **Arrow Snapping**: Hold Shift while clicking on shapes to snap arrows to their centers for clean connections.
- **Canvas Panning**: Hold Ctrl and drag, use middle mouse button, or use the Hand tool to pan the canvas.
- **Multi-Selection Support**: Select multiple objects with Shift+click or drag selection rectangle
- **Smart Object Selection**: Click and drag objects naturally with visual feedback.

### Keyboard Shortcuts

- **File Operations**: Ctrl+N (New), Ctrl+O (Open), Ctrl+S (Save), Ctrl+Shift+S (Save As)
- **Tool Selection**: V (Select), H (Hand), T (Text), R (Rectangle), C (Circle), D (Diamond), A (Arrow), B (Bi-Arrow), E (Eraser)
- **Undo**: Ctrl+Z / Cmd+Z
- **Redo**: Ctrl+Y / Cmd+Y or Ctrl+Shift+Z / Cmd+Shift+Z
- **Delete**: Delete key (when object is selected)
- **Text Editing**: Enter (new line), Ctrl+Enter or Shift+Enter (finish editing), Escape (cancel editing)

### Customization

- **Font Size**: Choose from 12px to 48px
- **Font Family**: Arial, Times New Roman, Courier New, or Helvetica
- **Colors**: Set stroke (outline) and fill colors using the color pickers
- **Arrow Curves**: Arrows are randomly curved or straight for visual variety

### File Formats

- **Native Format (.dd)**: Save and load your drawings with all objects and properties preserved
- **Export Format (PNG)**: Export drawings as high-quality PNG images

### Auto-Save

- **Automatic Backup**: Drawings are automatically saved every 10 seconds
- **Temp Location**: If no file is specified, auto-saves to temporary location
- **File Location**: If you've saved the file, auto-saves to the same location

### Menu Options

- **File Menu**:
  - New: Create a new drawing (Ctrl+N)
  - Open: Load a .dd drawing file (Ctrl+O)
  - Save: Save current drawing (Ctrl+S)
  - Save As: Save with a new name (Ctrl+Shift+S)
  - Export as PNG: Save drawing as PNG image
  - Exit: Close the application

- **Edit Menu**:
  - Undo: Undo last action (Ctrl+Z)
  - Redo: Redo last undone action (Ctrl+Y)

## Technical Details

- Built with Electron for cross-platform desktop support
- Uses HTML5 Canvas for high-performance drawing
- Object-based rendering system for easy editing and manipulation
- Command pattern implementation for undo/redo functionality
- Responsive design with grid background

## File Structure

```
DesignDraw/
├── package.json          # Project configuration and dependencies
├── main.js              # Electron main process
├── index.html           # Application UI
├── styles.css           # Application styling
├── renderer.js          # Main application logic and canvas handling
└── README.md           # This file
```

## Canvas Features

- **Grid Background**: Visual guide for alignment
- **Scrollable Canvas**: Large drawing area (1600x1200px)
- **Object Selection**: Click to select, visual feedback with blue highlight
- **Preview Mode**: Live preview while drawing shapes
- **Hit Detection**: Accurate selection for all shape types including curved arrows

## Export

The PNG export captures the entire canvas content at full resolution. Use the File > Save as PNG menu option or Ctrl+S/Cmd+S shortcut to save your work.

## Browser Compatibility

Since this is an Electron application, it runs on its own Chromium instance and doesn't require a separate browser.

## Building & Distribution

DesignDraw can be built for Windows, macOS, and Linux using Electron Builder.

### Quick Build
```bash
npm run build        # Build for current platform
npm run build-win    # Windows (NSIS installer + portable)
npm run build-mac    # macOS (DMG + ZIP)
npm run build-linux  # Linux (AppImage + DEB)
npm run build-all    # All platforms
```

### Build Scripts
- **Windows**: `build.bat win` or `.\build.ps1 win`
- **macOS/Linux**: `./build.sh mac` or `./build.sh linux`

### Output Files
Built files are saved to the `dist` folder:
- Windows: `DesignDraw Setup 1.0.0.exe` (installer), `DesignDraw 1.0.0.exe` (portable)
- macOS: `DesignDraw-1.0.0.dmg` (installer), `DesignDraw-1.0.0-mac.zip` (archive)
- Linux: `DesignDraw-1.0.0.AppImage` (portable), `design-draw_1.0.0_amd64.deb` (package)

For detailed build instructions, see [BUILD.md](BUILD.md).

## License

MIT License - Feel free to modify and distribute as needed.
