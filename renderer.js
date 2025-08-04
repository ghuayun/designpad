class DesignDrawApp {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.currentTool = 'select';
        this.isDrawing = false;
        this.startX = 0;
        this.startY = 0;
        this.currentX = 0;
        this.currentY = 0;
        this.elements = [];
        this.selectedElements = [];
        this.history = [];
        this.historyIndex = -1;
        this.currentPath = [];
        this.filename = 'Untitled.draw';
        this.filePath = null;
        this.isDirty = false;
        
        this.initializeEventListeners();
        this.initializeMenuHandlers();
        this.initializeKeyboardShortcuts();
        this.render();
        this.saveState();
    }

    initializeEventListeners() {
        // Tool buttons
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setTool(e.target.dataset.tool);
            });
        });

        // Action buttons
        document.getElementById('undo-btn').addEventListener('click', () => this.undo());
        document.getElementById('redo-btn').addEventListener('click', () => this.redo());
        document.getElementById('clear-btn').addEventListener('click', () => this.clearCanvas());
        document.getElementById('export-btn').addEventListener('click', () => this.exportImage());

        // Canvas events
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('dblclick', (e) => this.handleDoubleClick(e));

        // Color and style changes
        document.getElementById('stroke-color').addEventListener('change', () => this.render());
        document.getElementById('fill-color').addEventListener('change', () => this.render());
        document.getElementById('stroke-width').addEventListener('change', () => this.render());
        document.getElementById('stroke-style').addEventListener('change', () => this.render());

        // Text modal events
        document.getElementById('text-ok').addEventListener('click', () => this.addTextElement());
        document.getElementById('text-cancel').addEventListener('click', () => this.closeTextModal());
        
        // Prevent context menu on canvas
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    initializeMenuHandlers() {
        // Handle menu commands from main process using secure IPC
        if (window.electronAPI) {
            window.electronAPI.onMenuNew(() => this.newFile());
            window.electronAPI.onMenuOpen((event, data, filePath) => {
                if (data && filePath) {
                    this.loadFileData(data, filePath);
                } else {
                    this.openFile();
                }
            });
            window.electronAPI.onMenuSave(() => this.saveFile());
            window.electronAPI.onMenuSaveAs(() => this.saveFileAs());
            window.electronAPI.onMenuExportPng(() => this.exportImage());
            window.electronAPI.onMenuUndo(() => this.undo());
            window.electronAPI.onMenuRedo(() => this.redo());
            window.electronAPI.onMenuClear(() => this.clearCanvas());
        }
    }

    initializeKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Tool shortcuts
            switch(e.key.toLowerCase()) {
                case 'v': if (!e.ctrlKey) this.setTool('select'); break;
                case 'r': if (!e.ctrlKey) this.setTool('rectangle'); break;
                case 'c': if (!e.ctrlKey) this.setTool('circle'); break;
                case 'l': if (!e.ctrlKey) this.setTool('line'); break;
                case 'a': if (!e.ctrlKey) this.setTool('arrow'); break;
                case 'p': if (!e.ctrlKey) this.setTool('pen'); break;
                case 't': if (!e.ctrlKey) this.setTool('text'); break;
                case 'e': if (!e.ctrlKey) this.setTool('eraser'); break;
            }

            // Action shortcuts
            if (e.ctrlKey || e.metaKey) {
                switch(e.key.toLowerCase()) {
                    case 'z':
                        e.preventDefault();
                        if (e.shiftKey) {
                            this.redo();
                        } else {
                            this.undo();
                        }
                        break;
                    case 'y':
                        e.preventDefault();
                        this.redo();
                        break;
                }
            }

            // Delete selected elements
            if (e.key === 'Delete' || e.key === 'Backspace') {
                this.deleteSelected();
            }

            // Escape to deselect
            if (e.key === 'Escape') {
                this.selectedElements = [];
                this.render();
            }
        });
    }

    setTool(tool) {
        this.currentTool = tool;
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tool === tool);
        });
        
        // Update cursor
        this.canvas.className = `${tool}-mode`;
    }

    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    handleMouseDown(e) {
        const pos = this.getMousePos(e);
        this.startX = pos.x;
        this.startY = pos.y;
        this.currentX = pos.x;
        this.currentY = pos.y;
        this.isDrawing = true;

        if (this.currentTool === 'select') {
            this.handleSelect(pos.x, pos.y);
        } else if (this.currentTool === 'pen') {
            this.currentPath = [{ x: pos.x, y: pos.y }];
        } else if (this.currentTool === 'text') {
            this.textX = pos.x;
            this.textY = pos.y;
            this.showTextModal();
        } else if (this.currentTool === 'eraser') {
            this.eraseAt(pos.x, pos.y);
        }
    }

    handleMouseMove(e) {
        if (!this.isDrawing) return;

        const pos = this.getMousePos(e);
        this.currentX = pos.x;
        this.currentY = pos.y;

        if (this.currentTool === 'pen') {
            this.currentPath.push({ x: pos.x, y: pos.y });
            this.render();
            this.drawCurrentPath();
        } else if (this.currentTool === 'eraser') {
            this.eraseAt(pos.x, pos.y);
        } else if (this.currentTool !== 'select' && this.currentTool !== 'text') {
            this.render();
            this.drawPreview();
        }
    }

    handleMouseUp(e) {
        if (!this.isDrawing) return;
        this.isDrawing = false;

        const pos = this.getMousePos(e);

        if (this.currentTool === 'rectangle') {
            this.addRectangle(this.startX, this.startY, pos.x - this.startX, pos.y - this.startY);
        } else if (this.currentTool === 'circle') {
            const radius = Math.sqrt(Math.pow(pos.x - this.startX, 2) + Math.pow(pos.y - this.startY, 2));
            this.addCircle(this.startX, this.startY, radius);
        } else if (this.currentTool === 'line') {
            this.addLine(this.startX, this.startY, pos.x, pos.y);
        } else if (this.currentTool === 'arrow') {
            this.addArrow(this.startX, this.startY, pos.x, pos.y);
        } else if (this.currentTool === 'pen' && this.currentPath.length > 1) {
            this.addPath(this.currentPath);
        }

        this.currentPath = [];
        this.render();
    }

    handleDoubleClick(e) {
        if (this.currentTool === 'select') {
            const pos = this.getMousePos(e);
            const element = this.getElementAt(pos.x, pos.y);
            if (element && element.type === 'text') {
                this.editTextElement(element);
            }
        }
    }

    handleSelect(x, y) {
        const element = this.getElementAt(x, y);
        if (element) {
            if (!this.selectedElements.includes(element)) {
                this.selectedElements = [element];
            }
        } else {
            this.selectedElements = [];
        }
        this.render();
    }

    getElementAt(x, y) {
        // Check elements in reverse order (top to bottom)
        for (let i = this.elements.length - 1; i >= 0; i--) {
            const element = this.elements[i];
            if (this.isPointInElement(x, y, element)) {
                return element;
            }
        }
        return null;
    }

    isPointInElement(x, y, element) {
        switch (element.type) {
            case 'rectangle':
                return x >= element.x && x <= element.x + element.width &&
                       y >= element.y && y <= element.y + element.height;
            case 'circle':
                const dx = x - element.x;
                const dy = y - element.y;
                return Math.sqrt(dx * dx + dy * dy) <= element.radius;
            case 'line':
            case 'arrow':
                // Simple line hit test (within 5 pixels)
                const dist = this.distanceToLine(x, y, element.x1, element.y1, element.x2, element.y2);
                return dist <= 5;
            case 'text':
                const metrics = this.ctx.measureText(element.text);
                return x >= element.x && x <= element.x + metrics.width &&
                       y >= element.y - 20 && y <= element.y + 5;
            case 'path':
                // Simple path hit test
                return element.points.some(point => {
                    const dx = x - point.x;
                    const dy = y - point.y;
                    return Math.sqrt(dx * dx + dy * dy) <= 5;
                });
        }
        return false;
    }

    distanceToLine(px, py, x1, y1, x2, y2) {
        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;
        if (lenSq !== 0) {
            param = dot / lenSq;
        }

        let xx, yy;
        if (param < 0) {
            xx = x1;
            yy = y1;
        } else if (param > 1) {
            xx = x2;
            yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }

        const dx = px - xx;
        const dy = py - yy;
        return Math.sqrt(dx * dx + dy * dy);
    }

    addRectangle(x, y, width, height) {
        const element = {
            type: 'rectangle',
            x: Math.min(x, x + width),
            y: Math.min(y, y + height),
            width: Math.abs(width),
            height: Math.abs(height),
            strokeColor: document.getElementById('stroke-color').value,
            fillColor: document.getElementById('fill-color').value,
            strokeWidth: parseInt(document.getElementById('stroke-width').value),
            strokeStyle: document.getElementById('stroke-style').value
        };
        this.elements.push(element);
        this.saveState();
        this.markDirty();
    }

    addCircle(x, y, radius) {
        const element = {
            type: 'circle',
            x: x,
            y: y,
            radius: radius,
            strokeColor: document.getElementById('stroke-color').value,
            fillColor: document.getElementById('fill-color').value,
            strokeWidth: parseInt(document.getElementById('stroke-width').value),
            strokeStyle: document.getElementById('stroke-style').value
        };
        this.elements.push(element);
        this.saveState();
        this.markDirty();
    }

    addLine(x1, y1, x2, y2) {
        const element = {
            type: 'line',
            x1: x1,
            y1: y1,
            x2: x2,
            y2: y2,
            strokeColor: document.getElementById('stroke-color').value,
            strokeWidth: parseInt(document.getElementById('stroke-width').value),
            strokeStyle: document.getElementById('stroke-style').value
        };
        this.elements.push(element);
        this.saveState();
        this.markDirty();
    }

    addArrow(x1, y1, x2, y2) {
        const element = {
            type: 'arrow',
            x1: x1,
            y1: y1,
            x2: x2,
            y2: y2,
            strokeColor: document.getElementById('stroke-color').value,
            strokeWidth: parseInt(document.getElementById('stroke-width').value),
            strokeStyle: document.getElementById('stroke-style').value
        };
        this.elements.push(element);
        this.saveState();
        this.markDirty();
    }

    addPath(points) {
        const element = {
            type: 'path',
            points: [...points],
            strokeColor: document.getElementById('stroke-color').value,
            strokeWidth: parseInt(document.getElementById('stroke-width').value),
            strokeStyle: document.getElementById('stroke-style').value
        };
        this.elements.push(element);
        this.saveState();
        this.markDirty();
    }

    showTextModal() {
        document.getElementById('text-modal').style.display = 'flex';
        document.getElementById('text-input').focus();
    }

    closeTextModal() {
        document.getElementById('text-modal').style.display = 'none';
        document.getElementById('text-input').value = '';
    }

    addTextElement() {
        const text = document.getElementById('text-input').value.trim();
        if (text) {
            const element = {
                type: 'text',
                x: this.textX,
                y: this.textY,
                text: text,
                strokeColor: document.getElementById('stroke-color').value,
                fontSize: 16,
                fontFamily: 'Arial, sans-serif'
            };
            this.elements.push(element);
            this.saveState();
            this.markDirty();
            this.render();
        }
        this.closeTextModal();
    }

    editTextElement(element) {
        document.getElementById('text-input').value = element.text;
        this.showTextModal();
        
        // Update the existing element when OK is clicked
        const originalOk = document.getElementById('text-ok').onclick;
        document.getElementById('text-ok').onclick = () => {
            const newText = document.getElementById('text-input').value.trim();
            if (newText) {
                element.text = newText;
                this.saveState();
                this.markDirty();
                this.render();
            }
            this.closeTextModal();
            document.getElementById('text-ok').onclick = originalOk;
        };
    }

    eraseAt(x, y) {
        const element = this.getElementAt(x, y);
        if (element) {
            const index = this.elements.indexOf(element);
            if (index > -1) {
                this.elements.splice(index, 1);
                this.selectedElements = this.selectedElements.filter(e => e !== element);
                this.saveState();
                this.markDirty();
                this.render();
            }
        }
    }

    deleteSelected() {
        if (this.selectedElements.length > 0) {
            this.selectedElements.forEach(element => {
                const index = this.elements.indexOf(element);
                if (index > -1) {
                    this.elements.splice(index, 1);
                }
            });
            this.selectedElements = [];
            this.saveState();
            this.markDirty();
            this.render();
        }
    }

    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Set canvas background
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw all elements
        this.elements.forEach(element => {
            this.drawElement(element);
        });

        // Draw selection indicators
        this.selectedElements.forEach(element => {
            this.drawSelectionBox(element);
        });
    }

    drawElement(element) {
        this.ctx.save();
        
        // Set styles
        this.ctx.strokeStyle = element.strokeColor;
        this.ctx.lineWidth = element.strokeWidth;
        if (element.strokeStyle === 'dashed') {
            this.ctx.setLineDash([5, 5]);
        } else if (element.strokeStyle === 'dotted') {
            this.ctx.setLineDash([2, 3]);
        } else {
            this.ctx.setLineDash([]);
        }

        switch (element.type) {
            case 'rectangle':
                if (element.fillColor && element.fillColor !== '#ffffff') {
                    this.ctx.fillStyle = element.fillColor;
                    this.ctx.fillRect(element.x, element.y, element.width, element.height);
                }
                this.ctx.strokeRect(element.x, element.y, element.width, element.height);
                break;

            case 'circle':
                this.ctx.beginPath();
                this.ctx.arc(element.x, element.y, element.radius, 0, 2 * Math.PI);
                if (element.fillColor && element.fillColor !== '#ffffff') {
                    this.ctx.fillStyle = element.fillColor;
                    this.ctx.fill();
                }
                this.ctx.stroke();
                break;

            case 'line':
                this.ctx.beginPath();
                this.ctx.moveTo(element.x1, element.y1);
                this.ctx.lineTo(element.x2, element.y2);
                this.ctx.stroke();
                break;

            case 'arrow':
                this.drawArrow(element.x1, element.y1, element.x2, element.y2);
                break;

            case 'path':
                if (element.points.length > 1) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(element.points[0].x, element.points[0].y);
                    for (let i = 1; i < element.points.length; i++) {
                        this.ctx.lineTo(element.points[i].x, element.points[i].y);
                    }
                    this.ctx.stroke();
                }
                break;

            case 'text':
                this.ctx.fillStyle = element.strokeColor;
                this.ctx.font = `${element.fontSize}px ${element.fontFamily}`;
                this.ctx.fillText(element.text, element.x, element.y);
                break;
        }

        this.ctx.restore();
    }

    drawArrow(x1, y1, x2, y2) {
        const headlen = 10;
        const dx = x2 - x1;
        const dy = y2 - y1;
        const angle = Math.atan2(dy, dx);

        // Draw line
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();

        // Draw arrowhead
        this.ctx.beginPath();
        this.ctx.moveTo(x2, y2);
        this.ctx.lineTo(x2 - headlen * Math.cos(angle - Math.PI / 6), y2 - headlen * Math.sin(angle - Math.PI / 6));
        this.ctx.moveTo(x2, y2);
        this.ctx.lineTo(x2 - headlen * Math.cos(angle + Math.PI / 6), y2 - headlen * Math.sin(angle + Math.PI / 6));
        this.ctx.stroke();
    }

    drawPreview() {
        this.ctx.save();
        this.ctx.strokeStyle = document.getElementById('stroke-color').value;
        this.ctx.fillStyle = document.getElementById('fill-color').value;
        this.ctx.lineWidth = parseInt(document.getElementById('stroke-width').value);
        
        const strokeStyle = document.getElementById('stroke-style').value;
        if (strokeStyle === 'dashed') {
            this.ctx.setLineDash([5, 5]);
        } else if (strokeStyle === 'dotted') {
            this.ctx.setLineDash([2, 3]);
        }

        this.ctx.globalAlpha = 0.7;

        switch (this.currentTool) {
            case 'rectangle':
                const width = this.currentX - this.startX;
                const height = this.currentY - this.startY;
                if (document.getElementById('fill-color').value !== '#ffffff') {
                    this.ctx.fillRect(Math.min(this.startX, this.currentX), Math.min(this.startY, this.currentY), Math.abs(width), Math.abs(height));
                }
                this.ctx.strokeRect(Math.min(this.startX, this.currentX), Math.min(this.startY, this.currentY), Math.abs(width), Math.abs(height));
                break;

            case 'circle':
                const radius = Math.sqrt(Math.pow(this.currentX - this.startX, 2) + Math.pow(this.currentY - this.startY, 2));
                this.ctx.beginPath();
                this.ctx.arc(this.startX, this.startY, radius, 0, 2 * Math.PI);
                if (document.getElementById('fill-color').value !== '#ffffff') {
                    this.ctx.fill();
                }
                this.ctx.stroke();
                break;

            case 'line':
                this.ctx.beginPath();
                this.ctx.moveTo(this.startX, this.startY);
                this.ctx.lineTo(this.currentX, this.currentY);
                this.ctx.stroke();
                break;

            case 'arrow':
                this.drawArrow(this.startX, this.startY, this.currentX, this.currentY);
                break;
        }

        this.ctx.restore();
    }

    drawCurrentPath() {
        if (this.currentPath.length > 1) {
            this.ctx.save();
            this.ctx.strokeStyle = document.getElementById('stroke-color').value;
            this.ctx.lineWidth = parseInt(document.getElementById('stroke-width').value);
            this.ctx.globalAlpha = 0.7;

            this.ctx.beginPath();
            this.ctx.moveTo(this.currentPath[0].x, this.currentPath[0].y);
            for (let i = 1; i < this.currentPath.length; i++) {
                this.ctx.lineTo(this.currentPath[i].x, this.currentPath[i].y);
            }
            this.ctx.stroke();
            this.ctx.restore();
        }
    }

    drawSelectionBox(element) {
        this.ctx.save();
        this.ctx.strokeStyle = '#007acc';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([3, 3]);
        this.ctx.globalAlpha = 0.8;

        let bounds = this.getElementBounds(element);
        const padding = 5;
        this.ctx.strokeRect(
            bounds.x - padding,
            bounds.y - padding,
            bounds.width + 2 * padding,
            bounds.height + 2 * padding
        );

        this.ctx.restore();
    }

    getElementBounds(element) {
        switch (element.type) {
            case 'rectangle':
                return {
                    x: element.x,
                    y: element.y,
                    width: element.width,
                    height: element.height
                };
            case 'circle':
                return {
                    x: element.x - element.radius,
                    y: element.y - element.radius,
                    width: element.radius * 2,
                    height: element.radius * 2
                };
            case 'line':
            case 'arrow':
                return {
                    x: Math.min(element.x1, element.x2),
                    y: Math.min(element.y1, element.y2),
                    width: Math.abs(element.x2 - element.x1),
                    height: Math.abs(element.y2 - element.y1)
                };
            case 'text':
                const metrics = this.ctx.measureText(element.text);
                return {
                    x: element.x,
                    y: element.y - 20,
                    width: metrics.width,
                    height: 25
                };
            case 'path':
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                element.points.forEach(point => {
                    minX = Math.min(minX, point.x);
                    minY = Math.min(minY, point.y);
                    maxX = Math.max(maxX, point.x);
                    maxY = Math.max(maxY, point.y);
                });
                return {
                    x: minX,
                    y: minY,
                    width: maxX - minX,
                    height: maxY - minY
                };
        }
        return { x: 0, y: 0, width: 0, height: 0 };
    }

    clearCanvas() {
        if (this.elements.length > 0 && confirm('Are you sure you want to clear the canvas?')) {
            this.elements = [];
            this.selectedElements = [];
            this.saveState();
            this.markDirty();
            this.render();
        }
    }

    saveState() {
        // Remove any states after current index
        this.history = this.history.slice(0, this.historyIndex + 1);
        
        // Add new state
        this.history.push(JSON.parse(JSON.stringify(this.elements)));
        this.historyIndex++;
        
        // Limit history size
        if (this.history.length > 50) {
            this.history.shift();
            this.historyIndex--;
        }
        
        this.updateUndoRedoButtons();
    }

    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.elements = JSON.parse(JSON.stringify(this.history[this.historyIndex]));
            this.selectedElements = [];
            this.markDirty();
            this.render();
            this.updateUndoRedoButtons();
        }
    }

    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.elements = JSON.parse(JSON.stringify(this.history[this.historyIndex]));
            this.selectedElements = [];
            this.markDirty();
            this.render();
            this.updateUndoRedoButtons();
        }
    }

    updateUndoRedoButtons() {
        document.getElementById('undo-btn').disabled = this.historyIndex <= 0;
        document.getElementById('redo-btn').disabled = this.historyIndex >= this.history.length - 1;
    }

    markDirty() {
        this.isDirty = true;
        this.updateFilename();
        this.updateAutosaveStatus('Modified');
    }

    updateFilename() {
        const filenameEl = document.getElementById('filename');
        filenameEl.textContent = this.filename + (this.isDirty ? ' *' : '');
    }

    updateAutosaveStatus(status) {
        document.getElementById('autosave-status').textContent = status;
    }

    // File operations
    newFile() {
        if (this.isDirty && !confirm('You have unsaved changes. Create new file anyway?')) {
            return;
        }
        this.elements = [];
        this.selectedElements = [];
        this.history = [];
        this.historyIndex = -1;
        this.filename = 'Untitled.draw';
        this.filePath = null;
        this.isDirty = false;
        this.updateFilename();
        this.updateAutosaveStatus('Ready');
        this.render();
        this.saveState();
    }

    async openFile() {
        if (!window.electronAPI) {
            alert('File operations not available');
            return;
        }

        try {
            const result = await window.electronAPI.showOpenDialog();
            if (!result.canceled && result.filePaths.length > 0) {
                const filePath = result.filePaths[0];
                const fileResult = await window.electronAPI.readFile(filePath);
                
                if (fileResult.success) {
                    this.loadFileData(fileResult.data, filePath);
                } else {
                    alert('Error opening file: ' + fileResult.error);
                }
            }
        } catch (error) {
            alert('Error opening file: ' + error.message);
        }
    }

    loadFileData(data, filePath) {
        try {
            const parsed = JSON.parse(data);
            this.elements = parsed.elements || [];
            this.selectedElements = [];
            this.history = [];
            this.historyIndex = -1;
            this.filename = this.getFilenameFromPath(filePath);
            this.filePath = filePath;
            this.isDirty = false;
            this.updateFilename();
            this.updateAutosaveStatus('Loaded');
            this.render();
            this.saveState();
        } catch (error) {
            alert('Error parsing file: ' + error.message);
        }
    }

    getFilenameFromPath(filePath) {
        return filePath.split(/[\\/]/).pop();
    }

    async saveFile() {
        if (!this.filePath) {
            return this.saveFileAs();
        }

        if (!window.electronAPI) {
            alert('File operations not available');
            return;
        }

        try {
            const data = JSON.stringify({
                version: '1.0',
                elements: this.elements
            }, null, 2);
            
            const result = await window.electronAPI.saveFile(this.filePath, data);
            if (result.success) {
                this.isDirty = false;
                this.updateFilename();
                this.updateAutosaveStatus('Saved');
            } else {
                alert('Error saving file: ' + result.error);
            }
        } catch (error) {
            alert('Error saving file: ' + error.message);
        }
    }

    async saveFileAs() {
        if (!window.electronAPI) {
            alert('File operations not available');
            return;
        }

        try {
            const result = await window.electronAPI.showSaveDialog({
                defaultPath: this.filename,
                filters: [
                    { name: 'DesignDraw Files', extensions: ['draw'] }
                ]
            });
            
            if (!result.canceled) {
                const data = JSON.stringify({
                    version: '1.0',
                    elements: this.elements
                }, null, 2);
                
                const saveResult = await window.electronAPI.saveFile(result.filePath, data);
                if (saveResult.success) {
                    this.filename = this.getFilenameFromPath(result.filePath);
                    this.filePath = result.filePath;
                    this.isDirty = false;
                    this.updateFilename();
                    this.updateAutosaveStatus('Saved');
                } else {
                    alert('Error saving file: ' + saveResult.error);
                }
            }
        } catch (error) {
            alert('Error saving file: ' + error.message);
        }
    }

    async exportImage() {
        if (!window.electronAPI) {
            // Fallback to browser download
            this.exportImageBrowser();
            return;
        }

        try {
            const result = await window.electronAPI.showSaveDialog({
                defaultPath: this.filename.replace('.draw', '.png'),
                filters: [
                    { name: 'PNG Images', extensions: ['png'] },
                    { name: 'JPEG Images', extensions: ['jpg', 'jpeg'] }
                ]
            });
            
            if (!result.canceled) {
                const canvas = this.canvas;
                const dataURL = canvas.toDataURL('image/png');
                const base64Data = dataURL.replace(/^data:image\/png;base64,/, '');
                
                const saveResult = await window.electronAPI.saveFile(result.filePath, base64Data);
                
                if (saveResult.success) {
                    this.updateAutosaveStatus('Exported');
                    setTimeout(() => {
                        this.updateAutosaveStatus(this.isDirty ? 'Modified' : 'Ready');
                    }, 2000);
                } else {
                    alert('Error exporting image: ' + saveResult.error);
                }
            }
        } catch (error) {
            alert('Error exporting image: ' + error.message);
        }
    }

    exportImageBrowser() {
        const canvas = this.canvas;
        const dataURL = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = this.filename.replace('.draw', '.png');
        link.href = dataURL;
        link.click();
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.designDrawApp = new DesignDrawApp();
});

// Handle window resize
window.addEventListener('resize', () => {
    if (window.designDrawApp) {
        window.designDrawApp.render();
    }
});