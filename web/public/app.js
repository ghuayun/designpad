// Web version of DesignDraw - no Electron dependencies
class DesignDrawApp {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.currentTool = 'select';
        this.isDrawing = false;
        this.objects = [];
        this.selectedObject = null;
        this.selectedObjects = []; // For multi-selection
        this.isSelectionDrag = false;
        this.selectionStartX = 0;
        this.selectionStartY = 0;
        this.undoStack = [];
        this.redoStack = [];
        
        // Canvas dimensions - start with reasonable defaults
        this.canvasWidth = 3000;
        this.canvasHeight = 1500;
        this.minCanvasWidth = 1200;
        this.minCanvasHeight = 800;
        this.expandMargin = 200; // Expand when objects get within this distance of edge
        
        // Drawing state
        this.startX = 0;
        this.startY = 0;
        this.currentX = 0;
        this.currentY = 0;
        
        // Arrow drawing state
        this.arrowStart = null;
        this.arrowEnd = null;
        this.arrowCurveOffset = 0;
        
        // Direct text editing
        this.isEditingText = false;
        this.editingTextObject = null;
        this.textCursor = 0;
        this.textContent = '';
        
        // Canvas panning
        this.isPanning = false;
        this.panStartX = 0;
        this.panStartY = 0;
        this.panOffsetX = 0;
        this.panOffsetY = 0;
        
        // Object dragging
        this.isDragging = false;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;
        this.dragStateSaved = false;
        
        // File management (web version)
        this.currentFileName = 'untitled.dd';
        this.hasUnsavedChanges = false;
        this.autoSaveEnabled = false;
        
        // Theme management
        this.currentTheme = localStorage.getItem('designpad-theme') || 'light';
        
        // Clipboard for copy/paste
        this.clipboard = [];
        
        // Pen tool drawing
        this.penPath = [];
        this.currentPenPath = [];
        this.isPenDrawing = false;
        
        // Resize handles
        this.isResizing = false;
        this.resizeHandle = null; // 'nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'
        this.resizeStartBounds = null;
        this.resizeStartX = 0;
        this.resizeStartY = 0;
        
        // Double-click detection for text in shapes
        this.lastClickTime = 0;
        this.lastClickX = 0;
        this.lastClickY = 0;
        this.doubleClickThreshold = 300; // milliseconds
        this.doubleClickDistance = 10; // pixels
        
        this.init();
    }
    
    init() {
        // Removed welcome screen setup - reverted to original layout
        this.setupCanvas();
        this.setupEventListeners();
        this.initializeTheme();
        this.render();
        this.startAutoSave();
    }
    
    
    setupCanvas() {
        // Get the container size to fit canvas properly
        const container = this.canvas.parentElement;
        const containerRect = container.getBoundingClientRect();
        
        // Set canvas to fill the available space
        this.canvasWidth = containerRect.width || 1200;
        this.canvasHeight = containerRect.height || 800;
        
        // Set canvas dimensions
        this.canvas.width = this.canvasWidth;
        this.canvas.height = this.canvasHeight;
        
        // Set canvas style to fill container
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.display = 'block';
        this.canvas.style.position = 'static';
        this.canvas.style.margin = '0';
        this.canvas.style.padding = '0';
        
        // Enable high DPI support
        const ratio = window.devicePixelRatio || 1;
        if (ratio > 1) {
            this.canvas.width = this.canvasWidth * ratio;
            this.canvas.height = this.canvasHeight * ratio;
            this.canvas.style.width = '100%';
            this.canvas.style.height = '100%';
            this.ctx.scale(ratio, ratio);
        }
        
        console.log(`Canvas set up: ${this.canvasWidth}x${this.canvasHeight}`);
    }
    
    setupEventListeners() {
        // Tool selection
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setTool(e.target.closest('.tool-btn').dataset.tool);
            });
        });
        
        // Canvas events
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('click', this.handleClick.bind(this));
        
        // Keyboard shortcuts
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        
        // Window resize
        window.addEventListener('resize', this.handleWindowResize.bind(this));
        
        // Undo/Redo buttons
        document.getElementById('undo-btn').addEventListener('click', () => this.undo());
        document.getElementById('redo-btn').addEventListener('click', () => this.redo());
        
        // Copy/Cut/Paste buttons
        document.getElementById('copy-btn').addEventListener('click', () => this.copySelectedObjects());
        document.getElementById('cut-btn').addEventListener('click', () => this.cutSelectedObjects());
        document.getElementById('paste-btn').addEventListener('click', () => this.pasteObjects());
        
        // File operation buttons - web version
        document.getElementById('new-btn').addEventListener('click', () => this.newFile());
        document.getElementById('open-btn').addEventListener('click', () => this.openFile());
        document.getElementById('save-btn').addEventListener('click', () => this.saveFile());
        document.getElementById('export-btn').addEventListener('click', () => this.saveAsPNG());
        
        // Theme toggle button
        document.getElementById('theme-toggle').addEventListener('click', () => this.toggleTheme());
        
        // Prevent context menu
        this.canvas.addEventListener('contextmenu', e => e.preventDefault());
    }
    
    setTool(tool) {
        this.currentTool = tool;
        document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-tool="${tool}"]`).classList.add('active');
        
        // Update cursor
        this.canvas.className = '';
        if (tool === 'select') this.canvas.classList.add('select-mode');
        else if (tool === 'hand') this.canvas.classList.add('hand-mode');
        else if (tool === 'text') this.canvas.classList.add('text-mode');
        else if (tool === 'eraser') this.canvas.classList.add('eraser-mode');
        else if (tool === 'pen') this.canvas.classList.add('pen-mode');
        
        this.selectedObject = null;
        this.selectedObjects = [];
        this.render();
    }
    
    handleKeyDown(e) {
        // Handle direct text input
        if (this.isEditingText) {
            e.preventDefault();
            this.handleTextInput(e);
            return;
        }
        
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 'z':
                    e.preventDefault();
                    if (e.shiftKey) this.redo();
                    else this.undo();
                    break;
                case 'y':
                    e.preventDefault();
                    this.redo();
                    break;
                case 'c':
                    e.preventDefault();
                    this.copySelectedObjects();
                    break;
                case 'v':
                    e.preventDefault();
                    this.pasteObjects();
                    break;
                case 'x':
                    e.preventDefault();
                    this.cutSelectedObjects();
                    break;
                case 'n':
                    e.preventDefault();
                    this.newFile();
                    break;
                case 'o':
                    e.preventDefault();
                    this.openFile();
                    break;
                case 's':
                    e.preventDefault();
                    this.saveFile();
                    break;
            }
        }
        
        // Tool shortcuts
        switch (e.key.toLowerCase()) {
            case 's': if (!e.ctrlKey && !e.metaKey) this.setTool('select'); break;
            case 'h': this.setTool('hand'); break;
            case 'p': this.setTool('pen'); break;
            case 't': this.setTool('text'); break;
            case 'r': this.setTool('rectangle'); break;
            case 'c': if (!e.ctrlKey && !e.metaKey) this.setTool('circle'); break;
            case 'd': this.setTool('diamond'); break;
            case 'a': this.setTool('arrow'); break;
            case 'b': this.setTool('bi-arrow'); break;
            case 'e': this.setTool('eraser'); break;
        }
        
        // Delete selected object(s)
        if (e.key === 'Delete' && this.selectedObjects.length > 0) {
            this.deleteSelectedObjects();
        }
    }
    
    handleTextInput(e) {
        switch (e.key) {
            case 'Enter':
                // Ctrl+Enter or Shift+Enter to finish editing, just Enter for new line
                if (e.ctrlKey || e.shiftKey) {
                    this.stopTextEditing();
                } else {
                    // Add newline character for multi-line support
                    this.textContent = this.textContent.slice(0, this.textCursor) + 
                                     '\n' + 
                                     this.textContent.slice(this.textCursor);
                    this.textCursor++;
                    this.updateTextObject();
                }
                break;
            case 'Escape':
                this.cancelTextEditing();
                break;
            case 'Backspace':
                if (this.textCursor > 0) {
                    this.textContent = this.textContent.slice(0, this.textCursor - 1) + 
                                     this.textContent.slice(this.textCursor);
                    this.textCursor--;
                    this.updateTextObject();
                }
                break;
            case 'Delete':
                if (this.textCursor < this.textContent.length) {
                    this.textContent = this.textContent.slice(0, this.textCursor) + 
                                     this.textContent.slice(this.textCursor + 1);
                    this.updateTextObject();
                }
                break;
            case 'ArrowLeft':
                if (this.textCursor > 0) {
                    this.textCursor--;
                    this.render();
                    this.drawTextCursor();
                }
                break;
            case 'ArrowRight':
                if (this.textCursor < this.textContent.length) {
                    this.textCursor++;
                    this.render();
                    this.drawTextCursor();
                }
                break;
            case 'Home':
                this.textCursor = 0;
                this.render();
                this.drawTextCursor();
                break;
            case 'End':
                this.textCursor = this.textContent.length;
                this.render();
                this.drawTextCursor();
                break;
            default:
                if (e.key.length === 1) {
                    this.textContent = this.textContent.slice(0, this.textCursor) + 
                                     e.key + 
                                     this.textContent.slice(this.textCursor);
                    this.textCursor++;
                    this.updateTextObject();
                }
                break;
        }
    }
    
    updateTextObject() {
        if (this.editingTextObject) {
            this.editingTextObject.text = this.textContent;
            this.render();
            this.drawTextCursor();
        }
    }
    
    cancelTextEditing() {
        if (!this.isEditingText) return;
        
        if (this.editingTextObject.isTemporary) {
            // Remove temporary text
            const index = this.objects.indexOf(this.editingTextObject);
            if (index > -1) {
                this.objects.splice(index, 1);
            }
        } else {
            // Restore original text
            this.editingTextObject.text = this.editingTextObject.originalText || '';
        }
        
        this.isEditingText = false;
        this.editingTextObject = null;
        this.textContent = '';
        this.textCursor = 0;
        this.render();
    }
    
    handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.startX = e.clientX - rect.left - this.panOffsetX;
        this.startY = e.clientY - rect.top - this.panOffsetY;
        this.currentX = this.startX;
        this.currentY = this.startY;
        
        // Stop text editing if clicking elsewhere
        if (this.isEditingText && this.currentTool !== 'text') {
            this.stopTextEditing();
        }
        
        // Handle right-click for arrow cancellation
        if (e.button === 2) { // Right mouse button
            if (['arrow', 'bi-arrow'].includes(this.currentTool) && this.arrowStart) {
                // Cancel arrow drawing
                this.arrowStart = null;
                this.arrowEnd = null;
                this.render();
            }
            return;
        }
        
        // Middle mouse button or Ctrl+click or hand tool for panning
        if (e.button === 1 || (e.button === 0 && e.ctrlKey) || (e.button === 0 && this.currentTool === 'hand')) {
            this.isPanning = true;
            const rect = this.canvas.getBoundingClientRect();
            this.panStartX = e.clientX - rect.left;
            this.panStartY = e.clientY - rect.top;
            this.canvas.style.cursor = 'grabbing';
            return;
        }
        
        if (this.currentTool === 'select') {
            this.handleSelectMouseDown(e);
        } else if (this.currentTool === 'hand') {
            // Hand tool - do nothing, panning is handled above
            return;
        } else if (this.currentTool === 'pen') {
            this.handlePenMouseDown(e);
        } else if (this.currentTool === 'eraser') {
            this.handleEraserClick();
        } else if (this.currentTool === 'text') {
            this.handleTextMouseDown();
        } else if (['rectangle', 'circle', 'diamond'].includes(this.currentTool)) {
            this.isDrawing = true;
        } else if (['arrow', 'bi-arrow'].includes(this.currentTool)) {
            this.handleArrowMouseDown(e);
        }
    }
    
    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const rawX = e.clientX - rect.left;
        const rawY = e.clientY - rect.top;
        this.currentX = rawX - this.panOffsetX;
        this.currentY = rawY - this.panOffsetY;
        
        // Check if we need to expand the canvas while drawing
        if (this.isDrawing || this.isPenDrawing) {
            this.checkAndExpandCanvas();
        }
        
        // Update cursor based on what's under the mouse
        this.updateCursor();
        
        if (this.isPanning) {
            const deltaX = rawX - this.panStartX;
            const deltaY = rawY - this.panStartY;
            this.panOffsetX += deltaX;
            this.panOffsetY += deltaY;
            this.panStartX = rawX;
            this.panStartY = rawY;
            
            this.render();
            return;
        }
        
        // Handle pen tool drawing
        if (this.isPenDrawing) {
            this.currentPenPath.push({x: this.currentX, y: this.currentY});
            this.render();
            return;
        }
        
        // Handle resizing
        if (this.isResizing && this.selectedObjects.length === 1) {
            this.handleResize();
            this.render();
            return;
        }
        
        if (this.isDragging && this.selectedObjects.length > 0) {
            // Move all selected objects
            const deltaX = this.currentX - this.startX;
            const deltaY = this.currentY - this.startY;
            
            // Only save state once at the beginning of drag
            if (!this.dragStateSaved) {
                this.saveState();
                this.dragStateSaved = true;
            }
            
            this.selectedObjects.forEach(obj => {
                this.moveObjectBy(obj, deltaX, deltaY);
            });
            
            // Update start position for next frame
            this.startX = this.currentX;
            this.startY = this.currentY;
            
            // Check if we need to expand canvas while dragging
            this.checkAndExpandCanvas();
            
            this.render();
            return;
        }
        
        // Handle selection rectangle
        if (this.isSelectionDrag) {
            this.render();
            this.ctx.save();
            this.ctx.translate(this.panOffsetX, this.panOffsetY);
            this.drawSelectionRectangle();
            this.ctx.restore();
            return;
        }
        
        // Handle arrow preview while drawing
        if (this.arrowStart && ['arrow', 'bi-arrow'].includes(this.currentTool)) {
            this.render();
            this.ctx.save();
            this.ctx.translate(this.panOffsetX, this.panOffsetY);
            this.drawArrowPreview();
            this.ctx.restore();
            return;
        }
        
        if (!this.isDrawing) return;
        
        this.render();
        this.ctx.save();
        this.ctx.translate(this.panOffsetX, this.panOffsetY);
        this.drawPreview();
        this.ctx.restore();
    }
    
    handleMouseUp(e) {
        if (this.isPanning) {
            this.isPanning = false;
            this.canvas.style.cursor = '';
            return;
        }
        
        // Handle resize completion
        if (this.isResizing) {
            this.isResizing = false;
            this.resizeHandle = null;
            this.resizeStartBounds = null;
            this.markAsChanged();
            this.render();
            return;
        }
        
        this.isDragging = false;
        this.dragStateSaved = false;
        
        // Handle pen tool completion
        if (this.isPenDrawing) {
            this.isPenDrawing = false;
            if (this.currentPenPath.length > 1) {
                this.saveState();
                this.objects.push({
                    type: 'pen',
                    path: [...this.currentPenPath],
                    color: document.getElementById('stroke-color').value,
                    size: parseInt(document.getElementById('brush-size').value) || 2
                });
                this.markAsChanged();
                
                // Auto-switch to select tool after completing pen drawing
                this.setTool('select');
            }
            this.currentPenPath = [];
            this.render();
            return;
        }
        
        // Handle selection rectangle completion
        if (this.isSelectionDrag) {
            this.isSelectionDrag = false;
            this.selectObjectsInRectangle();
            this.render();
            return;
        }
        
        if (!this.isDrawing) return;
        
        this.isDrawing = false;
        
        if (['rectangle', 'circle', 'diamond'].includes(this.currentTool)) {
            this.createShape();
        }
    }
    
    handleClick(e) {
        if (this.isEditingText) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left - this.panOffsetX;
        const clickY = e.clientY - rect.top - this.panOffsetY;
        const currentTime = Date.now();
        
        // Check for double-click
        const timeDiff = currentTime - this.lastClickTime;
        const distance = Math.sqrt(
            Math.pow(clickX - this.lastClickX, 2) + 
            Math.pow(clickY - this.lastClickY, 2)
        );
        
        if (timeDiff < this.doubleClickThreshold && distance < this.doubleClickDistance) {
            // Double-click detected
            this.handleDoubleClick(clickX, clickY);
        }
        
        // Update last click info
        this.lastClickTime = currentTime;
        this.lastClickX = clickX;
        this.lastClickY = clickY;
    }
    
    handleDoubleClick(x, y) {
        // Find object at click position
        const clickedObject = this.getObjectAtPoint(x, y);
        
        if (clickedObject && ['rectangle', 'circle', 'diamond'].includes(clickedObject.type)) {
            // Calculate center of the shape for text placement
            const centerX = clickedObject.x + clickedObject.width / 2;
            const centerY = clickedObject.y + clickedObject.height / 2;
            
            // Create text at the center of the shape
            this.createTextInShape(centerX, centerY, clickedObject);
        }
    }
    
    createTextInShape(x, y, parentShape) {
        // Switch to text tool temporarily
        const originalTool = this.currentTool;
        
        // Create text object
        const fontSize = document.getElementById('font-size').value;
        const fontFamily = document.getElementById('font-family').value;
        
        const textObj = {
            type: 'text',
            text: '',
            x: x,
            y: y - parseInt(fontSize) / 2, // Center vertically
            fontSize: fontSize,
            fontFamily: fontFamily,
            color: document.getElementById('stroke-color').value,
            id: Date.now(),
            isTemporary: true,
            parentShape: parentShape.id // Reference to parent shape
        };
        
        this.objects.push(textObj);
        
        // Start text editing
        this.isEditingText = true;
        this.editingTextObject = textObj;
        this.textContent = '';
        this.textCursor = 0;
        
        this.render();
        this.drawTextCursor();
        
        console.log('Double-click text creation in shape');
    }
    
    handleEraserClick() {
        const objectToErase = this.getObjectAtPoint(this.startX, this.startY);
        if (objectToErase) {
            this.deleteObject(objectToErase);
        }
    }
    
    handleResize() {
        if (!this.isResizing || this.selectedObjects.length !== 1) return;
        
        const obj = this.selectedObjects[0];
        const deltaX = this.currentX - this.resizeStartX;
        const deltaY = this.currentY - this.resizeStartY;
        const originalBounds = this.resizeStartBounds;
        
        let newX = originalBounds.x;
        let newY = originalBounds.y;
        let newWidth = originalBounds.width;
        let newHeight = originalBounds.height;
        
        // Calculate new dimensions based on resize handle
        switch (this.resizeHandle) {
            case 'nw': // Northwest
                newX = originalBounds.x + deltaX;
                newY = originalBounds.y + deltaY;
                newWidth = originalBounds.width - deltaX;
                newHeight = originalBounds.height - deltaY;
                break;
            case 'ne': // Northeast
                newY = originalBounds.y + deltaY;
                newWidth = originalBounds.width + deltaX;
                newHeight = originalBounds.height - deltaY;
                break;
            case 'sw': // Southwest
                newX = originalBounds.x + deltaX;
                newWidth = originalBounds.width - deltaX;
                newHeight = originalBounds.height + deltaY;
                break;
            case 'se': // Southeast
                newWidth = originalBounds.width + deltaX;
                newHeight = originalBounds.height + deltaY;
                break;
            case 'n': // North
                newY = originalBounds.y + deltaY;
                newHeight = originalBounds.height - deltaY;
                break;
            case 's': // South
                newHeight = originalBounds.height + deltaY;
                break;
            case 'w': // West
                newX = originalBounds.x + deltaX;
                newWidth = originalBounds.width - deltaX;
                break;
            case 'e': // East
                newWidth = originalBounds.width + deltaX;
                break;
        }
        
        // Ensure minimum dimensions
        const minSize = 10;
        if (newWidth < minSize) {
            if (this.resizeHandle.includes('w')) {
                newX = originalBounds.x + originalBounds.width - minSize;
            }
            newWidth = minSize;
        }
        if (newHeight < minSize) {
            if (this.resizeHandle.includes('n')) {
                newY = originalBounds.y + originalBounds.height - minSize;
            }
            newHeight = minSize;
        }
        
        // Apply resize to object
        this.resizeObject(obj, newX, newY, newWidth, newHeight);
    }
    
    resizeObject(obj, newX, newY, newWidth, newHeight) {
        switch (obj.type) {
            case 'rectangle':
            case 'circle':
            case 'diamond':
                obj.x = newX;
                obj.y = newY;
                obj.width = newWidth;
                obj.height = newHeight;
                break;
            case 'text':
                obj.x = newX;
                obj.y = newY;
                // For text, we could scale font size proportionally
                const scaleX = newWidth / this.resizeStartBounds.width;
                const scaleY = newHeight / this.resizeStartBounds.height;
                const avgScale = (scaleX + scaleY) / 2;
                obj.fontSize = Math.max(8, Math.round(obj.fontSize * avgScale));
                break;
            case 'arrow':
            case 'bi-arrow':
                // For arrows, resize the endpoints
                const originalStartX = Math.min(obj.startX, obj.endX);
                const originalStartY = Math.min(obj.startY, obj.endY);
                const originalEndX = Math.max(obj.startX, obj.endX);
                const originalEndY = Math.max(obj.startY, obj.endY);
                
                const scaleWidth = newWidth / this.resizeStartBounds.width;
                const scaleHeight = newHeight / this.resizeStartBounds.height;
                
                obj.startX = newX + (obj.startX - originalStartX) * scaleWidth;
                obj.startY = newY + (obj.startY - originalStartY) * scaleHeight;
                obj.endX = newX + (obj.endX - originalStartX) * scaleWidth;
                obj.endY = newY + (obj.endY - originalStartY) * scaleHeight;
                break;
            case 'pen':
                // For pen paths, scale all points
                const scaleXPen = newWidth / this.resizeStartBounds.width;
                const scaleYPen = newHeight / this.resizeStartBounds.height;
                
                obj.path.forEach(point => {
                    point.x = newX + (point.x - this.resizeStartBounds.x) * scaleXPen;
                    point.y = newY + (point.y - this.resizeStartBounds.y) * scaleYPen;
                });
                break;
        }
    }
    
    updateCursor() {
        if (this.isResizing || this.isDragging || this.isPanning) {
            return; // Don't change cursor during active operations
        }
        
        // Check if hovering over resize handle
        if (this.currentTool === 'select' && this.selectedObjects.length === 1) {
            const selectedObj = this.selectedObjects[0];
            const resizeHandle = this.getResizeHandle(selectedObj, this.currentX, this.currentY);
            
            if (resizeHandle) {
                // Set appropriate resize cursor
                const cursors = {
                    'nw': 'nw-resize',
                    'ne': 'ne-resize',
                    'sw': 'sw-resize',
                    'se': 'se-resize',
                    'n': 'n-resize',
                    's': 's-resize',
                    'w': 'w-resize',
                    'e': 'e-resize'
                };
                this.canvas.style.cursor = cursors[resizeHandle];
                return;
            }
        }
        
        // Default cursor based on tool
        const toolCursors = {
            'select': 'default',
            'rectangle': 'crosshair',
            'circle': 'crosshair',
            'diamond': 'crosshair',
            'arrow': 'crosshair',
            'bi-arrow': 'crosshair',
            'text': 'text',
            'pen': 'crosshair',
            'eraser': 'crosshair',
            'hand': 'grab'
        };
        
        this.canvas.style.cursor = toolCursors[this.currentTool] || 'default';
    }
    
    handleSelectMouseDown(e) {
        const clickedObject = this.getObjectAtPoint(this.startX, this.startY);
        
        // Check if clicking on a resize handle of a selected object
        if (this.selectedObjects.length === 1) {
            const selectedObj = this.selectedObjects[0];
            const resizeHandle = this.getResizeHandle(selectedObj, this.startX, this.startY);
            
            if (resizeHandle) {
                // Start resizing
                this.isResizing = true;
                this.resizeHandle = resizeHandle;
                this.resizeStartX = this.startX;
                this.resizeStartY = this.startY;
                this.resizeStartBounds = this.getObjectBounds(selectedObj);
                this.saveState(); // Save state for undo
                return;
            }
        }
        
        if (e.shiftKey && clickedObject) {
            // Shift+click for multi-selection
            if (this.selectedObjects.includes(clickedObject)) {
                // Remove from selection
                this.selectedObjects = this.selectedObjects.filter(obj => obj !== clickedObject);
            } else {
                // Add to selection
                this.selectedObjects.push(clickedObject);
            }
            this.selectedObject = clickedObject;
        } else if (clickedObject) {
            // Single object selection
            if (!this.selectedObjects.includes(clickedObject)) {
                this.selectedObjects = [clickedObject];
            }
            this.selectedObject = clickedObject;
            this.isDragging = true;
            
            // Calculate drag offset
            const bounds = this.getObjectBounds(clickedObject);
            if (bounds) {
                this.dragOffsetX = this.startX - bounds.x;
                this.dragOffsetY = this.startY - bounds.y;
            }
        } else {
            // Clicked on empty space - start selection rectangle
            this.selectedObject = null;
            this.selectedObjects = [];
            this.isSelectionDrag = true;
            this.selectionStartX = this.startX;
            this.selectionStartY = this.startY;
        }
        this.render();
    }
    
    handleTextMouseDown() {
        const clickedObject = this.getObjectAtPoint(this.startX, this.startY);
        if (clickedObject && clickedObject.type === 'text') {
            // Start editing existing text
            this.startTextEditing(clickedObject);
        } else {
            // Create new text directly on canvas
            this.startDirectTextInput(this.startX, this.startY);
        }
    }
    
    handlePenMouseDown(e) {
        this.isPenDrawing = true;
        this.currentPenPath = [{x: this.startX, y: this.startY}];
    }
    
    handleArrowMouseDown(e) {
        const clickedObject = this.getObjectAtPoint(this.startX, this.startY);
        
        if (!this.arrowStart) {
            // Set arrow start point
            // Check if user wants to snap to object center (Shift key) or clicked on a shape without Shift
            if (clickedObject && ['rectangle', 'circle', 'diamond'].includes(clickedObject.type)) {
                // If shift is held, snap to center, otherwise allow precise positioning
                if (e.shiftKey) {
                    const bounds = this.getObjectBounds(clickedObject);
                    this.arrowStart = { 
                        x: bounds.x + bounds.width / 2, 
                        y: bounds.y + bounds.height / 2 
                    };
                } else {
                    // Allow precise positioning even on shapes
                    this.arrowStart = { x: this.startX, y: this.startY };
                }
            } else {
                this.arrowStart = { x: this.startX, y: this.startY };
            }
        } else {
            // Set arrow end point
            if (clickedObject && ['rectangle', 'circle', 'diamond'].includes(clickedObject.type)) {
                // If shift is held, snap to center, otherwise allow precise positioning
                if (e.shiftKey) {
                    const bounds = this.getObjectBounds(clickedObject);
                    this.arrowEnd = { 
                        x: bounds.x + bounds.width / 2, 
                        y: bounds.y + bounds.height / 2 
                    };
                } else {
                    // Allow precise positioning even on shapes
                    this.arrowEnd = { x: this.startX, y: this.startY };
                }
            } else {
                this.arrowEnd = { x: this.startX, y: this.startY };
            }
            this.createArrow();
            this.arrowStart = null;
            this.arrowEnd = null;
        }
        this.render();
    }
    
    startDirectTextInput(x, y) {
        this.isEditingText = true;
        this.textContent = '';
        this.textCursor = 0;
        
        // Create temporary text object
        const fontSize = document.getElementById('font-size').value;
        const fontFamily = document.getElementById('font-family').value;
        
        this.editingTextObject = {
            type: 'text',
            text: '',
            x: x,
            y: y,
            fontSize: fontSize,
            fontFamily: fontFamily,
            color: document.getElementById('stroke-color').value,
            id: Date.now(),
            isTemporary: true
        };
        
        this.objects.push(this.editingTextObject);
        this.render();
        this.drawTextCursor();
    }
    
    startTextEditing(textObject) {
        this.isEditingText = true;
        this.editingTextObject = textObject;
        this.textContent = textObject.text;
        this.textCursor = textObject.text.length;
        this.render();
        this.drawTextCursor();
    }
    
    stopTextEditing() {
        if (!this.isEditingText) return;
        
        if (this.editingTextObject.isTemporary && this.textContent.trim() === '') {
            // Remove empty temporary text
            const index = this.objects.indexOf(this.editingTextObject);
            if (index > -1) {
                this.objects.splice(index, 1);
            }
        } else {
            // Update text content
            this.saveState();
            this.editingTextObject.text = this.textContent;
            delete this.editingTextObject.isTemporary;
            
            // Auto-switch to select tool after completing text entry
            this.setTool('select');
        }
        
        this.isEditingText = false;
        this.editingTextObject = null;
        this.textContent = '';
        this.textCursor = 0;
        this.render();
    }
    
    moveObject(obj, newX, newY) {
        this.saveState();
        
        switch (obj.type) {
            case 'rectangle':
            case 'circle':
            case 'diamond':
                obj.x = newX;
                obj.y = newY;
                break;
            case 'text':
                obj.x = newX;
                obj.y = newY;
                break;
            case 'arrow':
            case 'bi-arrow':
                const deltaX = newX - obj.startX;
                const deltaY = newY - obj.startY;
                obj.startX = newX;
                obj.startY = newY;
                obj.endX += deltaX;
                obj.endY += deltaY;
                break;
        }
    }
    
    moveObjectBy(obj, deltaX, deltaY) {
        switch (obj.type) {
            case 'rectangle':
            case 'circle':
            case 'diamond':
            case 'text':
                obj.x += deltaX;
                obj.y += deltaY;
                break;
            case 'arrow':
            case 'bi-arrow':
                obj.startX += deltaX;
                obj.startY += deltaY;
                obj.endX += deltaX;
                obj.endY += deltaY;
                break;
            case 'pen':
                obj.path.forEach(point => {
                    point.x += deltaX;
                    point.y += deltaY;
                });
                break;
        }
    }
    
    selectObjectsInRectangle() {
        const minX = Math.min(this.selectionStartX, this.currentX);
        const maxX = Math.max(this.selectionStartX, this.currentX);
        const minY = Math.min(this.selectionStartY, this.currentY);
        const maxY = Math.max(this.selectionStartY, this.currentY);
        
        this.selectedObjects = this.objects.filter(obj => {
            const bounds = this.getObjectBounds(obj);
            // Check if object is within selection rectangle
            return bounds.left < maxX && bounds.right > minX &&
                   bounds.top < maxY && bounds.bottom > minY;
        });
        
        this.selectedObject = this.selectedObjects.length > 0 ? this.selectedObjects[0] : null;
    }
    
    drawSelectionRectangle() {
        this.ctx.save();
        this.ctx.strokeStyle = this.getThemeColor('--accent-primary');
        
        // Create a semi-transparent version of the accent color
        const accentColor = this.getThemeColor('--accent-primary');
        let fillColor;
        if (this.currentTheme === 'dark') {
            fillColor = 'rgba(77, 166, 255, 0.1)';
        } else {
            fillColor = 'rgba(0, 122, 204, 0.1)';
        }
        this.ctx.fillStyle = fillColor;
        
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([3, 3]);
        
        const width = this.currentX - this.selectionStartX;
        const height = this.currentY - this.selectionStartY;
        
        this.ctx.fillRect(this.selectionStartX, this.selectionStartY, width, height);
        this.ctx.strokeRect(this.selectionStartX, this.selectionStartY, width, height);
        
        this.ctx.restore();
    }
    
    drawTextCursor() {
        if (!this.isEditingText || !this.editingTextObject) return;
        
        this.ctx.save();
        this.ctx.translate(this.panOffsetX, this.panOffsetY);
        this.ctx.font = `${this.editingTextObject.fontSize}px ${this.editingTextObject.fontFamily}`;
        
        // Calculate cursor position for multi-line text
        const textBeforeCursor = this.textContent.substring(0, this.textCursor);
        const lines = textBeforeCursor.split('\n');
        const currentLineIndex = lines.length - 1;
        const currentLineText = lines[currentLineIndex];
        const lineHeight = parseInt(this.editingTextObject.fontSize) * 1.2;
        
        const textWidth = this.ctx.measureText(currentLineText).width;
        const cursorX = this.editingTextObject.x + textWidth;
        const cursorY = this.editingTextObject.y + (currentLineIndex * lineHeight);
        
        // Draw a shorter cursor line (not the full font height)
        const cursorHeight = parseInt(this.editingTextObject.fontSize);
        
        this.ctx.strokeStyle = this.getThemeColor('--text-primary');
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(cursorX, cursorY);
        this.ctx.lineTo(cursorX, cursorY + cursorHeight);
        this.ctx.stroke();
        
        this.ctx.restore();
    }
    
    createShape() {
        const width = this.currentX - this.startX;
        const height = this.currentY - this.startY;
        
        if (Math.abs(width) < 5 || Math.abs(height) < 5) return;
        
        const shape = {
            type: this.currentTool,
            x: Math.min(this.startX, this.currentX),
            y: Math.min(this.startY, this.currentY),
            width: Math.abs(width),
            height: Math.abs(height),
            strokeColor: document.getElementById('stroke-color').value,
            fillColor: document.getElementById('fill-color').value,
            id: Date.now()
        };
        
        this.addObject(shape);
        
        // Auto-switch to select tool after creating a shape
        this.setTool('select');
    }
    
    createText(text, x, y) {
        const fontSize = document.getElementById('font-size').value;
        const fontFamily = document.getElementById('font-family').value;
        
        const textObj = {
            type: 'text',
            text: text,
            x: x,
            y: y,
            fontSize: fontSize,
            fontFamily: fontFamily,
            color: document.getElementById('stroke-color').value,
            id: Date.now()
        };
        
        this.addObject(textObj);
    }
    
    createArrow() {
        if (!this.arrowStart || !this.arrowEnd) return;
        
        const arrow = {
            type: this.currentTool,
            startX: this.arrowStart.x,
            startY: this.arrowStart.y,
            endX: this.arrowEnd.x,
            endY: this.arrowEnd.y,
            strokeColor: document.getElementById('stroke-color').value,
            curved: Math.random() > 0.5, // Random curve for demo
            id: Date.now()
        };
        
        this.addObject(arrow);
        
        // Auto-switch to select tool after creating an arrow
        this.setTool('select');
    }
    
    addObject(obj) {
        this.saveState();
        this.objects.push(obj);
        this.checkAndExpandCanvas();
        this.render();
    }
    
    checkAndExpandCanvas() {
        if (this.objects.length === 0) return;
        
        // Calculate the bounding box of all objects
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        
        this.objects.forEach(obj => {
            const bounds = this.getObjectBounds(obj);
            minX = Math.min(minX, bounds.left);
            minY = Math.min(minY, bounds.top);
            maxX = Math.max(maxX, bounds.right);
            maxY = Math.max(maxY, bounds.bottom);
        });
        
        // Add margin for comfortable drawing
        const requiredWidth = Math.max(this.minCanvasWidth, maxX + this.expandMargin);
        const requiredHeight = Math.max(this.minCanvasHeight, maxY + this.expandMargin);
        
        // Expand canvas if needed
        let needsResize = false;
        if (requiredWidth > this.canvasWidth) {
            this.canvasWidth = Math.ceil(requiredWidth / 500) * 500; // Round up to nearest 500px
            needsResize = true;
        }
        if (requiredHeight > this.canvasHeight) {
            this.canvasHeight = Math.ceil(requiredHeight / 500) * 500; // Round up to nearest 500px
            needsResize = true;
        }
        
        // Also check if we're drawing near the edges (for real-time expansion)
        if (this.currentX > this.canvasWidth - this.expandMargin) {
            this.canvasWidth = Math.ceil((this.currentX + this.expandMargin) / 500) * 500;
            needsResize = true;
        }
        if (this.currentY > this.canvasHeight - this.expandMargin) {
            this.canvasHeight = Math.ceil((this.currentY + this.expandMargin) / 500) * 500;
            needsResize = true;
        }
        
        if (needsResize) {
            this.resizeCanvas();
        }
    }
    
    resizeCanvas() {
        // Store current canvas content
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        
        // Resize the canvas
        const ratio = window.devicePixelRatio || 1;
        this.canvas.width = this.canvasWidth * ratio;
        this.canvas.height = this.canvasHeight * ratio;
        this.canvas.style.width = this.canvasWidth + 'px';
        this.canvas.style.height = this.canvasHeight + 'px';
        
        // Restore scaling for high DPI
        if (ratio > 1) {
            this.ctx.scale(ratio, ratio);
        }
        
        // Restore canvas content (this will only restore what fits)
        this.ctx.putImageData(imageData, 0, 0);
        
        console.log(`Canvas expanded to ${this.canvasWidth}x${this.canvasHeight}`);
    }
    
    handleWindowResize() {
        // Re-render to ensure proper scaling
        this.render();
    }
    
    deleteObject(obj) {
        this.saveState();
        const index = this.objects.indexOf(obj);
        if (index > -1) {
            this.objects.splice(index, 1);
            if (this.selectedObject === obj) {
                this.selectedObject = null;
            }
            // Remove from selected objects array
            this.selectedObjects = this.selectedObjects.filter(selectedObj => selectedObj !== obj);
            this.render();
        }
    }
    
    deleteSelectedObjects() {
        if (this.selectedObjects.length === 0) return;
        
        this.saveState();
        
        // Remove all selected objects
        this.selectedObjects.forEach(obj => {
            const index = this.objects.indexOf(obj);
            if (index > -1) {
                this.objects.splice(index, 1);
            }
        });
        
        this.selectedObject = null;
        this.selectedObjects = [];
        this.render();
    }
    
    copySelectedObjects() {
        if (this.selectedObjects.length === 0) return;
        
        // Deep copy selected objects to clipboard
        this.clipboard = this.selectedObjects.map(obj => this.cloneObject(obj));
        
        console.log(`Copied ${this.clipboard.length} object(s) to clipboard`);
    }
    
    cutSelectedObjects() {
        if (this.selectedObjects.length === 0) return;
        
        // Copy to clipboard first
        this.copySelectedObjects();
        
        // Then delete the selected objects
        this.deleteSelectedObjects();
        
        console.log(`Cut ${this.clipboard.length} object(s) to clipboard`);
    }
    
    pasteObjects() {
        if (this.clipboard.length === 0) return;
        
        this.saveState();
        
        // Find an open space for pasting
        const pastePosition = this.findOpenSpaceForPaste();
        
        // Clone objects from clipboard and add them to the canvas
        const pastedObjects = this.clipboard.map(obj => {
            const clonedObj = this.cloneObject(obj);
            
            // Offset the position to the open space
            this.offsetObject(clonedObj, pastePosition.x, pastePosition.y);
            
            // Give it a new ID
            clonedObj.id = Date.now() + Math.random();
            
            return clonedObj;
        });
        
        // Add pasted objects to the objects array
        this.objects.push(...pastedObjects);
        
        // Check if we need to expand canvas for pasted objects
        this.checkAndExpandCanvas();
        
        // Clear current selection and select the pasted objects
        this.selectedObjects = pastedObjects;
        this.selectedObject = pastedObjects.length > 0 ? pastedObjects[0] : null;
        
        this.markAsChanged();
        this.render();
        
        console.log(`Pasted ${pastedObjects.length} object(s)`);
    }
    
    cloneObject(obj) {
        // Create a deep copy of the object
        const cloned = JSON.parse(JSON.stringify(obj));
        return cloned;
    }
    
    findOpenSpaceForPaste() {
        if (this.clipboard.length === 0) return { x: 50, y: 50 };
        
        // Calculate the bounding box of the clipboard objects
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        
        this.clipboard.forEach(obj => {
            const bounds = this.getObjectBounds(obj);
            minX = Math.min(minX, bounds.left);
            minY = Math.min(minY, bounds.top);
            maxX = Math.max(maxX, bounds.right);
            maxY = Math.max(maxY, bounds.bottom);
        });
        
        const clipboardWidth = maxX - minX;
        const clipboardHeight = maxY - minY;
        
        // Try different positions to find an open space with more spacing
        const positions = [
            { x: 80, y: 80 },
            { x: 150, y: 80 },
            { x: 220, y: 80 },
            { x: 80, y: 150 },
            { x: 150, y: 150 },
            { x: 220, y: 150 },
            { x: 80, y: 220 },
            { x: 150, y: 220 },
            { x: 220, y: 220 },
            { x: 300, y: 100 },
            { x: 100, y: 300 },
            { x: 350, y: 150 },
            { x: 150, y: 350 },
            { x: 400, y: 200 },
            { x: 200, y: 400 }
        ];
        
        for (const pos of positions) {
            if (this.isAreaFree(pos.x, pos.y, clipboardWidth + 40, clipboardHeight + 40)) {
                // Calculate the offset needed to move clipboard objects to this position
                return {
                    x: pos.x - minX,
                    y: pos.y - minY
                };
            }
        }
        
        // If no free space found, use a progressive offset strategy
        let offsetMultiplier = 1;
        while (offsetMultiplier < 10) {
            const testX = 60 * offsetMultiplier;
            const testY = 60 * offsetMultiplier;
            
            if (this.isAreaFree(testX, testY, clipboardWidth + 40, clipboardHeight + 40)) {
                return {
                    x: testX - minX,
                    y: testY - minY
                };
            }
            offsetMultiplier++;
        }
        
        // Final fallback - guaranteed offset that's visually distinct
        return { x: 100, y: 100 };
    }
    
    isAreaFree(x, y, width, height) {
        const testBounds = {
            left: x,
            top: y,
            right: x + width,
            bottom: y + height
        };
        
        // Check if this area overlaps with any existing object
        return !this.objects.some(obj => {
            const objBounds = this.getObjectBounds(obj);
            return this.boundsOverlap(testBounds, objBounds);
        });
    }
    
    boundsOverlap(bounds1, bounds2) {
        return !(bounds1.right < bounds2.left || 
                bounds1.left > bounds2.right || 
                bounds1.bottom < bounds2.top || 
                bounds1.top > bounds2.bottom);
    }
    
    getObjectBounds(obj) {
        switch (obj.type) {
            case 'rectangle':
                return {
                    left: obj.x,
                    top: obj.y,
                    right: obj.x + obj.width,
                    bottom: obj.y + obj.height
                };
            case 'circle':
                return {
                    left: obj.x - obj.radius,
                    top: obj.y - obj.radius,
                    right: obj.x + obj.radius,
                    bottom: obj.y + obj.radius
                };
            case 'diamond':
                return {
                    left: obj.x - obj.size,
                    top: obj.y - obj.size,
                    right: obj.x + obj.size,
                    bottom: obj.y + obj.size
                };
            case 'text':
                const textWidth = obj.text.length * 10; // Rough estimate
                const textHeight = 20;
                return {
                    left: obj.x,
                    top: obj.y - textHeight,
                    right: obj.x + textWidth,
                    bottom: obj.y
                };
            case 'arrow':
            case 'bi-arrow':
                return {
                    left: Math.min(obj.startX, obj.endX),
                    top: Math.min(obj.startY, obj.endY),
                    right: Math.max(obj.startX, obj.endX),
                    bottom: Math.max(obj.startY, obj.endY)
                };
            case 'pen':
                if (obj.path.length === 0) return { left: 0, top: 0, right: 0, bottom: 0 };
                let minX = obj.path[0].x, minY = obj.path[0].y;
                let maxX = obj.path[0].x, maxY = obj.path[0].y;
                obj.path.forEach(point => {
                    minX = Math.min(minX, point.x);
                    minY = Math.min(minY, point.y);
                    maxX = Math.max(maxX, point.x);
                    maxY = Math.max(maxY, point.y);
                });
                return {
                    left: minX,
                    top: minY,
                    right: maxX,
                    bottom: maxY
                };
            default:
                return { left: 0, top: 0, right: 0, bottom: 0 };
        }
    }

    offsetObject(obj, deltaX, deltaY) {
        switch (obj.type) {
            case 'rectangle':
            case 'circle':
            case 'diamond':
            case 'text':
                obj.x += deltaX;
                obj.y += deltaY;
                break;
            case 'arrow':
            case 'bi-arrow':
                obj.startX += deltaX;
                obj.startY += deltaY;
                obj.endX += deltaX;
                obj.endY += deltaY;
                break;
            case 'pen':
                obj.path.forEach(point => {
                    point.x += deltaX;
                    point.y += deltaY;
                });
                break;
        }
    }
    
    getObjectAtPoint(x, y) {
        // Check in reverse order (top to bottom)
        for (let i = this.objects.length - 1; i >= 0; i--) {
            const obj = this.objects[i];
            if (this.isPointInObject(x, y, obj)) {
                return obj;
            }
        }
        return null;
    }
    
    isPointInObject(x, y, obj) {
        switch (obj.type) {
            case 'rectangle':
                return x >= obj.x && x <= obj.x + obj.width &&
                       y >= obj.y && y <= obj.y + obj.height;
            
            case 'circle':
                const centerX = obj.x + obj.width / 2;
                const centerY = obj.y + obj.height / 2;
                const radiusX = obj.width / 2;
                const radiusY = obj.height / 2;
                return ((x - centerX) ** 2) / (radiusX ** 2) + 
                       ((y - centerY) ** 2) / (radiusY ** 2) <= 1;
            
            case 'diamond':
                const dCenterX = obj.x + obj.width / 2;
                const dCenterY = obj.y + obj.height / 2;
                return Math.abs(x - dCenterX) / (obj.width / 2) + 
                       Math.abs(y - dCenterY) / (obj.height / 2) <= 1;
            
            case 'text':
                // Hit detection for multi-line text
                this.ctx.font = `${obj.fontSize}px ${obj.fontFamily}`;
                const lines = obj.text.split('\n');
                const lineHeight = parseInt(obj.fontSize) * 1.2;
                let maxWidth = 0;
                
                lines.forEach(line => {
                    const metrics = this.ctx.measureText(line);
                    maxWidth = Math.max(maxWidth, metrics.width);
                });
                
                return x >= obj.x && x <= obj.x + maxWidth &&
                       y >= obj.y && y <= obj.y + (lines.length * lineHeight);
            
            case 'arrow':
            case 'bi-arrow':
                // Simple line hit detection (within 5 pixels)
                const dist = this.distanceToLine(x, y, obj.startX, obj.startY, obj.endX, obj.endY);
                return dist <= 5;
            
            case 'pen':
                // Check if point is near any part of the pen path
                const threshold = Math.max(obj.size / 2 + 3, 5); // Minimum 5px threshold
                for (let i = 0; i < obj.path.length - 1; i++) {
                    const lineDist = this.distanceToLine(x, y, obj.path[i].x, obj.path[i].y, obj.path[i + 1].x, obj.path[i + 1].y);
                    if (lineDist <= threshold) {
                        return true;
                    }
                }
                return false;
            
            default:
                return false;
        }
    }
    
    distanceToLine(px, py, x1, y1, x2, y2) {
        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;
        
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        
        if (lenSq === 0) return Math.sqrt(A * A + B * B);
        
        let param = dot / lenSq;
        
        if (param < 0) {
            return Math.sqrt(A * A + B * B);
        } else if (param > 1) {
            const dx = px - x2;
            const dy = py - y2;
            return Math.sqrt(dx * dx + dy * dy);
        } else {
            const dx = px - (x1 + param * C);
            const dy = py - (y1 + param * D);
            return Math.sqrt(dx * dx + dy * dy);
        }
    }
    
    render() {
        // Clear the entire canvas
        this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
        
        // Fill canvas with theme-appropriate background
        this.ctx.fillStyle = this.getThemeColor('--bg-secondary');
        this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
        
        // Apply panning transformation
        this.ctx.save();
        this.ctx.translate(this.panOffsetX, this.panOffsetY);
        
        // Draw all objects
        this.objects.forEach(obj => this.drawObject(obj));
        
        // Draw current pen path while drawing
        if (this.isPenDrawing && this.currentPenPath.length > 1) {
            this.drawPenPath(this.currentPenPath, document.getElementById('stroke-color').value, parseInt(document.getElementById('brush-size').value) || 2);
        }
        
        // Draw selection indicators for all selected objects
        if (this.selectedObjects.length > 0) {
            this.selectedObjects.forEach(obj => this.drawSelection(obj));
        }
        
        this.ctx.restore();
    }
    
    drawObject(obj) {
        this.ctx.save();
        
        switch (obj.type) {
            case 'rectangle':
                this.drawRectangle(obj);
                break;
            case 'circle':
                this.drawCircle(obj);
                break;
            case 'diamond':
                this.drawDiamond(obj);
                break;
            case 'text':
                this.drawText(obj);
                break;
            case 'pen':
                this.drawPenPath(obj.path, obj.color, obj.size);
                break;
            case 'arrow':
                this.drawArrow(obj, false);
                break;
            case 'bi-arrow':
                this.drawArrow(obj, true);
                break;
        }
        
        this.ctx.restore();
    }
    
    drawRectangle(obj) {
        this.ctx.strokeStyle = obj.strokeColor;
        this.ctx.fillStyle = obj.fillColor;
        this.ctx.lineWidth = 2;
        
        this.ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
        this.ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
    }
    
    drawCircle(obj) {
        this.ctx.strokeStyle = obj.strokeColor;
        this.ctx.fillStyle = obj.fillColor;
        this.ctx.lineWidth = 2;
        
        this.ctx.beginPath();
        this.ctx.ellipse(
            obj.x + obj.width / 2,
            obj.y + obj.height / 2,
            obj.width / 2,
            obj.height / 2,
            0, 0, 2 * Math.PI
        );
        this.ctx.fill();
        this.ctx.stroke();
    }
    
    drawDiamond(obj) {
        this.ctx.strokeStyle = obj.strokeColor;
        this.ctx.fillStyle = obj.fillColor;
        this.ctx.lineWidth = 2;
        
        const centerX = obj.x + obj.width / 2;
        const centerY = obj.y + obj.height / 2;
        
        this.ctx.beginPath();
        this.ctx.moveTo(centerX, obj.y);
        this.ctx.lineTo(obj.x + obj.width, centerY);
        this.ctx.lineTo(centerX, obj.y + obj.height);
        this.ctx.lineTo(obj.x, centerY);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();
    }
    
    drawText(obj) {
        this.ctx.fillStyle = obj.color;
        this.ctx.font = `${obj.fontSize}px ${obj.fontFamily}`;
        this.ctx.textBaseline = 'top';
        
        // Split text into lines for multi-line support
        const lines = obj.text.split('\n');
        const lineHeight = parseInt(obj.fontSize) * 1.2; // 20% extra for line spacing
        
        lines.forEach((line, index) => {
            this.ctx.fillText(line, obj.x, obj.y + (index * lineHeight));
        });
    }
    
    drawPenPath(path, color, size) {
        if (path.length < 2) return;
        
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = size;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        this.ctx.beginPath();
        this.ctx.moveTo(path[0].x, path[0].y);
        
        for (let i = 1; i < path.length; i++) {
            this.ctx.lineTo(path[i].x, path[i].y);
        }
        
        this.ctx.stroke();
    }
    
    drawArrow(obj, bidirectional = false) {
        this.ctx.strokeStyle = obj.strokeColor;
        this.ctx.lineWidth = 2;
        
        if (obj.curved) {
            this.drawCurvedArrow(obj, bidirectional);
        } else {
            this.drawStraightArrow(obj, bidirectional);
        }
    }
    
    drawStraightArrow(obj, bidirectional) {
        // Draw line
        this.ctx.beginPath();
        this.ctx.moveTo(obj.startX, obj.startY);
        this.ctx.lineTo(obj.endX, obj.endY);
        this.ctx.stroke();
        
        // Draw arrowhead at end
        this.drawArrowHead(obj.endX, obj.endY, obj.startX, obj.startY);
        
        // Draw arrowhead at start if bidirectional
        if (bidirectional) {
            this.drawArrowHead(obj.startX, obj.startY, obj.endX, obj.endY);
        }
    }
    
    drawCurvedArrow(obj, bidirectional) {
        const dx = obj.endX - obj.startX;
        const dy = obj.endY - obj.startY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Control point for curve
        const controlX = (obj.startX + obj.endX) / 2 + dy * 0.2;
        const controlY = (obj.startY + obj.endY) / 2 - dx * 0.2;
        
        // Draw curved line
        this.ctx.beginPath();
        this.ctx.moveTo(obj.startX, obj.startY);
        this.ctx.quadraticCurveTo(controlX, controlY, obj.endX, obj.endY);
        this.ctx.stroke();
        
        // Calculate arrow direction at end
        const t = 0.9; // Point near the end for direction calculation
        const x = (1-t)*(1-t)*obj.startX + 2*(1-t)*t*controlX + t*t*obj.endX;
        const y = (1-t)*(1-t)*obj.startY + 2*(1-t)*t*controlY + t*t*obj.endY;
        
        this.drawArrowHead(obj.endX, obj.endY, x, y);
        
        if (bidirectional) {
            const t2 = 0.1;
            const x2 = (1-t2)*(1-t2)*obj.startX + 2*(1-t2)*t2*controlX + t2*t2*obj.endX;
            const y2 = (1-t2)*(1-t2)*obj.startY + 2*(1-t2)*t2*controlY + t2*t2*obj.endY;
            this.drawArrowHead(obj.startX, obj.startY, x2, y2);
        }
    }
    
    drawArrowHead(tipX, tipY, fromX, fromY) {
        const dx = tipX - fromX;
        const dy = tipY - fromY;
        const angle = Math.atan2(dy, dx);
        const headLength = 15;
        const headAngle = Math.PI / 6;
        
        this.ctx.beginPath();
        this.ctx.moveTo(tipX, tipY);
        this.ctx.lineTo(
            tipX - headLength * Math.cos(angle - headAngle),
            tipY - headLength * Math.sin(angle - headAngle)
        );
        this.ctx.moveTo(tipX, tipY);
        this.ctx.lineTo(
            tipX - headLength * Math.cos(angle + headAngle),
            tipY - headLength * Math.sin(angle + headAngle)
        );
        this.ctx.stroke();
    }
    
    drawArrowPreview() {
        if (!this.arrowStart) return;
        
        this.ctx.save();
        this.ctx.strokeStyle = '#007acc';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        
        // Draw preview line from arrow start to current mouse position
        this.ctx.beginPath();
        this.ctx.moveTo(this.arrowStart.x, this.arrowStart.y);
        this.ctx.lineTo(this.currentX, this.currentY);
        this.ctx.stroke();
        
        // Draw preview arrowhead
        this.drawArrowHead(this.currentX, this.currentY, this.arrowStart.x, this.arrowStart.y);
        
        // If it's a bi-directional arrow, draw arrowhead at start too
        if (this.currentTool === 'bi-arrow') {
            this.drawArrowHead(this.arrowStart.x, this.arrowStart.y, this.currentX, this.currentY);
        }
        
        this.ctx.restore();
    }
    
    drawPreview() {
        if (!this.isDrawing) return;
        
        this.ctx.save();
        this.ctx.strokeStyle = '#007acc';
        this.ctx.fillStyle = 'rgba(0, 122, 204, 0.1)';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        
        const width = this.currentX - this.startX;
        const height = this.currentY - this.startY;
        const x = Math.min(this.startX, this.currentX);
        const y = Math.min(this.startY, this.currentY);
        
        switch (this.currentTool) {
            case 'rectangle':
                this.ctx.fillRect(x, y, Math.abs(width), Math.abs(height));
                this.ctx.strokeRect(x, y, Math.abs(width), Math.abs(height));
                break;
            case 'circle':
                this.ctx.beginPath();
                this.ctx.ellipse(
                    x + Math.abs(width) / 2,
                    y + Math.abs(height) / 2,
                    Math.abs(width) / 2,
                    Math.abs(height) / 2,
                    0, 0, 2 * Math.PI
                );
                this.ctx.fill();
                this.ctx.stroke();
                break;
            case 'diamond':
                const centerX = x + Math.abs(width) / 2;
                const centerY = y + Math.abs(height) / 2;
                this.ctx.beginPath();
                this.ctx.moveTo(centerX, y);
                this.ctx.lineTo(x + Math.abs(width), centerY);
                this.ctx.lineTo(centerX, y + Math.abs(height));
                this.ctx.lineTo(x, centerY);
                this.ctx.closePath();
                this.ctx.fill();
                this.ctx.stroke();
                break;
        }
        
        this.ctx.restore();
    }
    
    drawSelection(obj) {
        this.ctx.save();
        this.ctx.strokeStyle = this.getThemeColor('--accent-primary');
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([3, 3]);
        
        let bounds = this.getObjectBounds(obj);
        if (bounds) {
            // Draw selection rectangle
            this.ctx.strokeRect(
                bounds.x - 5, 
                bounds.y - 5, 
                bounds.width + 10, 
                bounds.height + 10
            );
            
            // Draw resize handles
            this.drawResizeHandles(bounds);
        }
        
        this.ctx.restore();
    }
    
    drawResizeHandles(bounds) {
        const handleSize = 8;
        const halfHandle = handleSize / 2;
        
        this.ctx.save();
        this.ctx.fillStyle = this.getThemeColor('--accent-primary');
        this.ctx.strokeStyle = this.getThemeColor('--bg-secondary');
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([]);
        
        // Corner handles
        const handles = [
            { x: bounds.x - 5, y: bounds.y - 5, type: 'nw' }, // Northwest
            { x: bounds.x + bounds.width + 5, y: bounds.y - 5, type: 'ne' }, // Northeast
            { x: bounds.x - 5, y: bounds.y + bounds.height + 5, type: 'sw' }, // Southwest
            { x: bounds.x + bounds.width + 5, y: bounds.y + bounds.height + 5, type: 'se' }, // Southeast
            { x: bounds.x + bounds.width / 2, y: bounds.y - 5, type: 'n' }, // North
            { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height + 5, type: 's' }, // South
            { x: bounds.x - 5, y: bounds.y + bounds.height / 2, type: 'w' }, // West
            { x: bounds.x + bounds.width + 5, y: bounds.y + bounds.height / 2, type: 'e' } // East
        ];
        
        handles.forEach(handle => {
            this.ctx.fillRect(
                handle.x - halfHandle,
                handle.y - halfHandle,
                handleSize,
                handleSize
            );
            this.ctx.strokeRect(
                handle.x - halfHandle,
                handle.y - halfHandle,
                handleSize,
                handleSize
            );
        });
        
        this.ctx.restore();
    }
    
    getResizeHandle(obj, x, y) {
        const bounds = this.getObjectBounds(obj);
        if (!bounds) return null;
        
        const handleSize = 8;
        const halfHandle = handleSize / 2;
        
        const handles = [
            { x: bounds.x - 5, y: bounds.y - 5, type: 'nw' }, // Northwest
            { x: bounds.x + bounds.width + 5, y: bounds.y - 5, type: 'ne' }, // Northeast
            { x: bounds.x - 5, y: bounds.y + bounds.height + 5, type: 'sw' }, // Southwest
            { x: bounds.x + bounds.width + 5, y: bounds.y + bounds.height + 5, type: 'se' }, // Southeast
            { x: bounds.x + bounds.width / 2, y: bounds.y - 5, type: 'n' }, // North
            { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height + 5, type: 's' }, // South
            { x: bounds.x - 5, y: bounds.y + bounds.height / 2, type: 'w' }, // West
            { x: bounds.x + bounds.width + 5, y: bounds.y + bounds.height / 2, type: 'e' } // East
        ];
        
        for (let handle of handles) {
            if (x >= handle.x - halfHandle && x <= handle.x + halfHandle &&
                y >= handle.y - halfHandle && y <= handle.y + halfHandle) {
                return handle.type;
            }
        }
        
        return null;
    }
    
    getObjectBounds(obj) {
        switch (obj.type) {
            case 'rectangle':
            case 'circle':
            case 'diamond':
                return {
                    x: obj.x,
                    y: obj.y,
                    width: obj.width,
                    height: obj.height
                };
            case 'text':
                // Calculate bounds for multi-line text
                this.ctx.font = `${obj.fontSize}px ${obj.fontFamily}`;
                const lines = obj.text.split('\n');
                const lineHeight = parseInt(obj.fontSize) * 1.2;
                let maxWidth = 0;
                
                lines.forEach(line => {
                    const metrics = this.ctx.measureText(line);
                    maxWidth = Math.max(maxWidth, metrics.width);
                });
                
                return {
                    x: obj.x,
                    y: obj.y,
                    width: maxWidth,
                    height: lines.length * lineHeight
                };
            case 'arrow':
            case 'bi-arrow':
                return {
                    x: Math.min(obj.startX, obj.endX),
                    y: Math.min(obj.startY, obj.endY),
                    width: Math.abs(obj.endX - obj.startX),
                    height: Math.abs(obj.endY - obj.startY)
                };
            case 'pen':
                if (obj.path.length === 0) return null;
                
                let minX = obj.path[0].x;
                let minY = obj.path[0].y;
                let maxX = obj.path[0].x;
                let maxY = obj.path[0].y;
                
                obj.path.forEach(point => {
                    minX = Math.min(minX, point.x);
                    minY = Math.min(minY, point.y);
                    maxX = Math.max(maxX, point.x);
                    maxY = Math.max(maxY, point.y);
                });
                
                // Add some padding based on brush size
                const padding = obj.size / 2;
                return {
                    x: minX - padding,
                    y: minY - padding,
                    width: maxX - minX + (padding * 2),
                    height: maxY - minY + (padding * 2)
                };
            default:
                return null;
        }
    }
    
    saveState() {
        this.undoStack.push(JSON.stringify(this.objects));
        this.redoStack = []; // Clear redo stack when new action is performed
        this.hasUnsavedChanges = true;
        
        // Limit undo stack size
        if (this.undoStack.length > 50) {
            this.undoStack.shift();
        }
        
        this.updateUndoRedoButtons();
    }
    
    undo() {
        if (this.undoStack.length > 0) {
            this.redoStack.push(JSON.stringify(this.objects));
            const previousState = this.undoStack.pop();
            this.objects = JSON.parse(previousState);
            this.selectedObject = null;
            this.selectedObjects = [];
            this.render();
            this.updateUndoRedoButtons();
        }
    }
    
    redo() {
        if (this.redoStack.length > 0) {
            this.undoStack.push(JSON.stringify(this.objects));
            const nextState = this.redoStack.pop();
            this.objects = JSON.parse(nextState);
            this.selectedObject = null;
            this.selectedObjects = [];
            this.render();
            this.updateUndoRedoButtons();
        }
    }
    
    updateUndoRedoButtons() {
        document.getElementById('undo-btn').disabled = this.undoStack.length === 0;
        document.getElementById('redo-btn').disabled = this.redoStack.length === 0;
    }
    
    clearCanvas() {
        this.saveState();
        this.objects = [];
        this.selectedObject = null;
        this.selectedObjects = [];
        this.arrowStart = null;
        this.arrowEnd = null;
        this.render();
    }
    
    // Web-specific file management methods
    newFile() {
        if (this.hasUnsavedChanges) {
            this.showUnsavedChangesDialog().then(result => {
                if (result === 'save') {
                    this.saveFile().then(() => {
                        this.clearCanvas();
                        this.currentFileName = 'untitled.dd';
                        this.hasUnsavedChanges = false;
                        this.startAutoSave();
                    });
                } else if (result === 'discard') {
                    this.clearCanvas();
                    this.currentFileName = 'untitled.dd';
                    this.hasUnsavedChanges = false;
                    this.startAutoSave();
                }
                // If 'cancel', do nothing
            });
        } else {
            this.clearCanvas();
            this.currentFileName = 'untitled.dd';
            this.hasUnsavedChanges = false;
            this.startAutoSave();
        }
    }
    
    showUnsavedChangesDialog() {
        return new Promise((resolve) => {
            // Create modal overlay
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            
            // Create modal content
            const modal = document.createElement('div');
            modal.className = 'modal unsaved-changes-modal';
            
            const content = document.createElement('div');
            content.className = 'modal-content';
            content.innerHTML = `
                <h3>Unsaved Changes</h3>
                <p>You have unsaved changes. Do you want to save before creating a new file?</p>
                <div class="modal-buttons">
                    <button class="btn-save">Save</button>
                    <button class="btn-discard">Don't Save</button>
                    <button class="btn-cancel">Cancel</button>
                </div>
            `;
            
            modal.appendChild(content);
            overlay.appendChild(modal);
            document.body.appendChild(overlay);
            
            // Add event listeners
            const saveBtn = content.querySelector('.btn-save');
            const discardBtn = content.querySelector('.btn-discard');
            const cancelBtn = content.querySelector('.btn-cancel');
            
            function cleanup() {
                document.body.removeChild(overlay);
            }
            
            saveBtn.addEventListener('click', () => {
                cleanup();
                resolve('save');
            });
            
            discardBtn.addEventListener('click', () => {
                cleanup();
                resolve('discard');
            });
            
            cancelBtn.addEventListener('click', () => {
                cleanup();
                resolve('cancel');
            });
            
            // Close on overlay click
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    cleanup();
                    resolve('cancel');
                }
            });
        });
    }
    
    async openFile() {
        try {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.dd,.json';
            
            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (file) {
                    const text = await file.text();
                    const data = JSON.parse(text);
                    this.objects = data.objects || [];
                    this.currentFileName = file.name;
                    this.hasUnsavedChanges = false;
                    this.selectedObject = null;
                    this.selectedObjects = [];
                    this.render();
                    this.startAutoSave();
                }
            };
            
            input.click();
        } catch (error) {
            console.error('Error opening file:', error);
            alert('Failed to open file');
        }
    }
    
    async saveFile() {
        try {
            const data = {
                objects: this.objects,
                version: '1.0',
                created: new Date().toISOString()
            };
            
            // Create a save dialog by using HTML5 file API
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            
            // Create a download link that always prompts for save location
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = ''; // Empty download attribute forces "Save As" dialog
            
            // Prompt user for filename
            const filename = prompt('Enter filename (without extension):', this.currentFileName.replace('.dd', '') || 'drawing');
            if (filename) {
                a.download = filename.endsWith('.dd') ? filename : filename + '.dd';
                a.click();
                this.currentFileName = a.download;
                this.hasUnsavedChanges = false;
            }
            
            URL.revokeObjectURL(a.href);
        } catch (error) {
            console.error('Error saving file:', error);
            alert('Failed to save file');
        }
    }
    
    async saveAsPNG() {
        try {
            // Create a temporary canvas with white background
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = this.canvas.width;
            tempCanvas.height = this.canvas.height;
            const tempCtx = tempCanvas.getContext('2d');
            
            // Fill with white background
            tempCtx.fillStyle = '#ffffff';
            tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
            
            // Draw the current canvas content
            tempCtx.drawImage(this.canvas, 0, 0);
            
            // Create download
            const dataUrl = tempCanvas.toDataURL('image/png');
            const a = document.createElement('a');
            a.href = dataUrl;
            a.download = this.currentFileName.replace('.dd', '.png') || 'drawing.png';
            a.click();
        } catch (error) {
            console.error('Error exporting PNG:', error);
            alert('Failed to export PNG');
        }
    }
    
    startAutoSave() {
        if (!this.autoSaveEnabled) {
            this.autoSaveEnabled = true;
            // Web version auto-save to localStorage
            setInterval(() => {
                if (this.objects.length > 0) {
                    this.autoSave();
                }
            }, 10000); // Auto-save every 10 seconds
        }
    }
    
    autoSave() {
        try {
            const data = {
                objects: this.objects,
                version: '1.0',
                autoSaved: new Date().toISOString(),
                fileName: this.currentFileName
            };
            
            localStorage.setItem('designdraw-autosave', JSON.stringify(data));
        } catch (error) {
            console.error('Auto-save failed:', error);
        }
    }
    
    loadAutoSave() {
        try {
            const savedData = localStorage.getItem('designdraw-autosave');
            if (savedData) {
                const data = JSON.parse(savedData);
                if (confirm('Auto-saved data found. Load it?')) {
                    this.objects = data.objects || [];
                    this.currentFileName = data.fileName || 'recovered.dd';
                    this.hasUnsavedChanges = true;
                    this.selectedObject = null;
                    this.selectedObjects = [];
                    this.render();
                }
            }
        } catch (error) {
            console.error('Auto-save load failed:', error);
        }
    }

    // Theme system
    getThemeColor(cssVariable) {
        const themeColors = {
            light: {
                '--bg-primary': '#ffffff',
                '--bg-secondary': '#f5f5f5',
                '--text-primary': '#333333',
                '--text-secondary': '#666666',
                '--accent-primary': '#007acc',
                '--accent-secondary': '#005a9e',
                '--border-color': '#e0e0e0'
            },
            dark: {
                '--bg-primary': '#1e1e1e',
                '--bg-secondary': '#2d2d2d',
                '--text-primary': '#ffffff',
                '--text-secondary': '#cccccc',
                '--accent-primary': '#4da6ff',
                '--accent-secondary': '#3399ff',
                '--border-color': '#404040'
            }
        };
        
        return themeColors[this.currentTheme][cssVariable] || '#000000';
    }
    
    // Theme Management
    initializeTheme() {
        console.log('Initializing theme:', this.currentTheme);
        this.applyTheme(this.currentTheme);
    }
    
    toggleTheme() {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        console.log('Toggling to theme:', this.currentTheme);
        this.applyTheme(this.currentTheme);
        localStorage.setItem('designpad-theme', this.currentTheme);
    }
    
    applyTheme(theme) {
        console.log('Applying theme:', theme);
        const html = document.documentElement; // Use html element instead of body
        const body = document.body;
        const themeToggle = document.getElementById('theme-toggle');
        const themeText = document.getElementById('theme-text');
        
        // Apply theme to html element to override browser dark mode
        html.setAttribute('data-theme', theme);
        body.setAttribute('data-theme', theme); // Keep body for backward compatibility
        
        // Update theme toggle button
        if (themeToggle) {
            themeToggle.setAttribute('data-theme', theme);
        }
        if (themeText) {
            themeText.textContent = theme === 'light' ? 'Dark' : 'Light';
        }
        
        // Update form control defaults to match theme
        this.updateFormControlDefaults();
        
        // Force canvas re-render to apply new theme colors
        this.render();
    }
    
    updateFormControlDefaults() {
        const strokeColorInput = document.getElementById('stroke-color');
        const fillColorInput = document.getElementById('fill-color');
        
        if (strokeColorInput && fillColorInput) {
            if (this.currentTheme === 'dark') {
                // Dark theme: lighter colors for visibility
                if (strokeColorInput.value === '#000000') {
                    strokeColorInput.value = '#ffffff';
                }
            } else {
                // Light theme: darker colors for visibility
                if (strokeColorInput.value === '#ffffff') {
                    strokeColorInput.value = '#000000';
                }
            }
        }
    }
    
}

// Rolling tips functionality
class RollingTips {
    constructor() {
        this.tips = [
            "DesignPad - Use Ctrl+wheel to zoom, middle mouse to pan",
            "💡 Tip: Double-click inside any shape to add text instantly!",
            "💡 Tip: After drawing a shape, you'll automatically switch to Select tool",
            "💡 Tip: Use keyboard shortcuts - S (Select), P (Pen), R (Rectangle), C (Circle)",
            "💡 Tip: Copy shapes with Ctrl+C, paste with Ctrl+V for quick duplication",
            "💡 Tip: Use the Hand tool (H) to pan around your unlimited canvas",
            "💡 Tip: Export your work as PNG or save as .dd file to continue later",
            "💡 Tip: Hold Shift while drawing rectangles to create perfect squares",
            "💡 Tip: Use Ctrl+Z to undo and Ctrl+Y to redo your actions",
            "💡 Tip: Right-click and drag to resize selected shapes easily"
        ];
        this.currentTipIndex = 0;
        this.footerElement = document.getElementById('footer-tip');
        this.startRotation();
    }
    
    startRotation() {
        if (!this.footerElement) return;
        
        setInterval(() => {
            this.currentTipIndex = (this.currentTipIndex + 1) % this.tips.length;
            this.footerElement.textContent = this.tips[this.currentTipIndex];
        }, 10000); // Change tip every 10 seconds
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new DesignDrawApp();
    
    // Check for auto-saved data
    app.loadAutoSave();
    
    // Initialize rolling tips
    new RollingTips();
    
    // Make app globally available for debugging
    window.designDrawApp = app;
});
