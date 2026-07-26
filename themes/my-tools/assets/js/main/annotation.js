/**
 * Live Annotation System v1.3.0
 */
(function (global) {
  'use strict';

  const AnnotationConfig = {
    enabled: true,
    defaultHighlight: "#FFE45C",
    defaultPen: "#ff0000",
    penWidth: 3,
    opacity: 0.8,
    autoSave: true,
    showToolbar: true
  };

  // --- STORAGE ENGINE ---
  class StorageEngine {
    constructor() {
      this.dbName = 'LAS_AnnotationDB';
      this.storeName = 'annotations';
      this.db = null;
    }

    async init() {
      if (!('indexedDB' in window)) return;
      return new Promise((resolve) => {
        const req = indexedDB.open(this.dbName, 1);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(this.storeName)) {
            db.createObjectStore(this.storeName, { keyPath: 'url' });
          }
        };
        req.onsuccess = (e) => { this.db = e.target.result; resolve(); };
        req.onerror = () => resolve();
      });
    }

    async save(url, data) {
      if (this.db) {
        const tx = this.db.transaction(this.storeName, 'readwrite');
        tx.objectStore(this.storeName).put({ url, data, timestamp: Date.now() });
      } else {
        localStorage.setItem(`LAS_${url}`, JSON.stringify(data));
      }
    }

    async load(url) {
      if (this.db) {
        return new Promise((resolve) => {
          const tx = this.db.transaction(this.storeName, 'readonly');
          const req = tx.objectStore(this.storeName).get(url);
          req.onsuccess = () => resolve(req.result ? req.result.data : null);
          req.onerror = () => resolve(null);
        });
      } else {
        const item = localStorage.getItem(`LAS_${url}`);
        return item ? JSON.parse(item) : null;
      }
    }

    async clear(url) {
      if (this.db) {
        const tx = this.db.transaction(this.storeName, 'readwrite');
        tx.objectStore(this.storeName).delete(url);
      } else {
        localStorage.removeItem(`LAS_${url}`);
      }
    }
  }

  // --- UTILS ---
  const Utils = {
    debounce(fn, delay) {
      let timeout;
      return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn.apply(this, args), delay);
      };
    },
    throttle(fn, limit) {
      let inThrottling;
      return function (...args) {
        if (!inThrottling) {
          fn.apply(this, args);
          inThrottling = true;
          setTimeout(() => inThrottling = false, limit);
        }
      };
    },
    getTextPath(node) {
      const path = [];
      while (node && node !== document.body) {
        const parent = node.parentNode;
        if (!parent) break;
        const index = Array.prototype.indexOf.call(parent.childNodes, node);
        path.push(index);
        node = parent;
      }
      return path;
    },
    getNodeFromPath(path) {
      let node = document.body;
      for (let i = path.length - 1; i >= 0; i--) {
        if (node && node.childNodes[path[i]]) {
          node = node.childNodes[path[i]];
        } else {
          return null;
        }
      }
      return node;
    }
  };

  // --- HIGHLIGHT ENGINE (WITH CLICK TO ERASE & UNDO SUPPORT) ---
  class HighlightEngine {
    constructor(system) {
      this.system = system;
      this.highlights = [];
      this.initEvents();
    }

    initEvents() {
      // Direct text highlight creation
      document.addEventListener('mouseup', Utils.debounce(() => {
        if (!this.system.config.enabled || this.system.state.activeTool !== 'highlight') return;
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed || !selection.rangeCount) return;

        const range = selection.getRangeAt(0);
        if (range.toString().trim().length > 0) {
          this.highlightRange(range, this.system.config.defaultHighlight);
          selection.removeAllRanges();
          this.system.autoSave();
        }
      }, 100));

      // TEXT SELECTION MITANE KA OPTION: Click on highlight to remove it
      document.addEventListener('click', (e) => {
        const mark = e.target.closest('mark.las-highlight');
        if (mark) {
          this.removeHighlightByElement(mark);
        }
      });
    }

    highlightRange(range, color) {
      const startNode = range.startContainer;
      const endNode = range.endContainer;

      const textNodes = [];
      if (startNode === endNode && startNode.nodeType === Node.TEXT_NODE) {
        textNodes.push(startNode);
      } else {
        const treeWalker = document.createTreeWalker(
          range.commonAncestorContainer,
          NodeFilter.SHOW_TEXT,
          {
            acceptNode: (node) => {
              const nodeRange = document.createRange();
              nodeRange.selectNodeContents(node);
              return range.compareBoundaryPoints(Range.END_TO_START, nodeRange) < 0 &&
                     range.compareBoundaryPoints(Range.START_TO_END, nodeRange) > 0
                ? NodeFilter.FILTER_ACCEPT
                : NodeFilter.FILTER_REJECT;
            }
          }
        );
        while (treeWalker.nextNode()) textNodes.push(treeWalker.currentNode);
      }

      const createdMarks = [];
      textNodes.forEach((node) => {
        const nodeRange = document.createRange();
        let startOffset = (node === startNode) ? range.startOffset : 0;
        let endOffset = (node === endNode) ? range.endOffset : node.nodeValue.length;

        if (startOffset >= endOffset) return;

        nodeRange.setStart(node, startOffset);
        nodeRange.setEnd(node, endOffset);

        const mark = document.createElement('mark');
        mark.className = 'las-highlight';
        mark.style.backgroundColor = color;

        try {
          nodeRange.surroundContents(mark);
          createdMarks.push(mark);
        } catch (e) {
          console.warn('LAS: Skipped complex partial element node.');
        }
      });

      if (createdMarks.length > 0) {
        this.highlights.push({
          marks: createdMarks,
          data: {
            startPath: Utils.getTextPath(startNode),
            startOffset: range.startOffset,
            endPath: Utils.getTextPath(endNode),
            endOffset: range.endOffset,
            color: color
          }
        });
      }
    }

    removeHighlightByElement(mark) {
      const index = this.highlights.findIndex(h => h.marks && h.marks.includes(mark));
      if (index !== -1) {
        const item = this.highlights[index];
        item.marks.forEach(m => this.unwrapMark(m));
        this.highlights.splice(index, 1);
        this.system.autoSave();
      }
    }

    unwrapMark(mark) {
      if (mark && mark.parentNode) {
        const parent = mark.parentNode;
        while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
        parent.removeChild(mark);
      }
    }

    // CTRL+Z SE HIGHLIGHT BACK / UNDO
    undo() {
      if (this.highlights.length > 0) {
        const lastHighlight = this.highlights.pop();
        if (lastHighlight && lastHighlight.marks) {
          lastHighlight.marks.forEach(m => this.unwrapMark(m));
        }
        this.system.autoSave();
      }
    }

    restore(highlightsData) {
      if (!Array.isArray(highlightsData)) return;
      highlightsData.forEach(item => {
        try {
          const startNode = Utils.getNodeFromPath(item.startPath);
          const endNode = Utils.getNodeFromPath(item.endPath);
          if (startNode && endNode) {
            const range = document.createRange();
            range.setStart(startNode, item.startOffset);
            range.setEnd(endNode, item.endOffset);
            this.highlightRange(range, item.color);
          }
        } catch (e) {
          console.warn('LAS: Restore highlight failed', e);
        }
      });
    }

    exportData() {
      return this.highlights.map(h => h.data);
    }

    clear() {
      this.highlights.forEach(h => {
        if (h.marks) {
          h.marks.forEach(m => this.unwrapMark(m));
        }
      });
      this.highlights = [];
    }
  }

  // --- DRAWING CANVAS ENGINE ---
  class DrawEngine {
    constructor(system) {
      this.system = system;
      this.canvas = null;
      this.ctx = null;
      this.isDrawing = false;
      this.paths = [];
      this.redoStack = [];
      this.currentPath = null;
    }

    init() {
      if (this.canvas) return;
      this.canvas = document.createElement('canvas');
      this.canvas.className = 'las-canvas-overlay';
      document.body.appendChild(this.canvas);
      this.ctx = this.canvas.getContext('2d');
      this.resize();

      window.addEventListener('resize', Utils.debounce(() => this.resize(), 150));
      
      // AUTO DELETE DRAWING ON SCROLL
      window.addEventListener('scroll', () => {
        if (this.paths.length > 0) {
          this.clear();
        }
      }, { passive: true });

      this.bindEvents();
    }

    resize() {
      if (!this.canvas) return;
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
      this.redraw();
    }

    bindEvents() {
      const start = (e) => {
        const isDrawMode = this.system.state.activeTool === 'draw';
        const isEraseMode = this.system.state.activeTool === 'eraser';
        if (!isDrawMode && !isEraseMode) return;

        this.isDrawing = true;
        const pt = this.getPoint(e);
        this.currentPath = {
          color: this.system.config.defaultPen,
          width: isEraseMode ? this.system.config.penWidth * 5 : this.system.config.penWidth,
          opacity: this.system.config.opacity,
          isEraser: isEraseMode,
          points: [pt]
        };
      };

      const move = Utils.throttle((e) => {
        if (!this.isDrawing) return;
        const pt = this.getPoint(e);
        this.currentPath.points.push(pt);
        this.redraw();
        this.drawPath(this.currentPath);
      }, 16);

      const stop = () => {
        if (!this.isDrawing) return;
        this.isDrawing = false;
        if (this.currentPath && this.currentPath.points.length > 0) {
          this.paths.push(this.currentPath);
          this.redoStack = [];
          this.system.autoSave();
        }
        this.currentPath = null;
      };

      this.canvas.addEventListener('mousedown', start);
      this.canvas.addEventListener('mousemove', move);
      window.addEventListener('mouseup', stop);

      this.canvas.addEventListener('touchstart', (e) => start(e.touches[0]), { passive: true });
      this.canvas.addEventListener('touchmove', (e) => move(e.touches[0]), { passive: true });
      window.addEventListener('touchend', stop);
    }

    getPoint(e) {
      return { x: e.clientX, y: e.clientY };
    }

    drawPath(path) {
      if (!path.points || path.points.length < 2) return;
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.moveTo(path.points[0].x, path.points[0].y);

      for (let i = 1; i < path.points.length; i++) {
        this.ctx.lineTo(path.points[i].x, path.points[i].y);
      }

      this.ctx.lineWidth = path.width;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';

      if (path.isEraser) {
        this.ctx.globalCompositeOperation = 'destination-out';
        this.ctx.strokeStyle = 'rgba(0,0,0,1)';
      } else {
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.globalAlpha = path.opacity;
        this.ctx.strokeStyle = path.color;
      }

      this.ctx.stroke();
      this.ctx.restore();
    }

    redraw() {
      if (!this.ctx) return;
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.paths.forEach(p => this.drawPath(p));
    }

    undo() {
      if (this.paths.length > 0) {
        this.redoStack.push(this.paths.pop());
        this.redraw();
        this.system.autoSave();
      }
    }

    clear() {
      this.paths = [];
      this.redoStack = [];
      this.redraw();
      this.system.autoSave();
    }

    exportData() { return this.paths; }
    restore(paths) { if (Array.isArray(paths)) { this.paths = paths; this.redraw(); } }
  }

  // --- MAIN SYSTEM CONTROLLER ---
  class LiveAnnotationSystem {
    constructor(config = {}) {
      this.config = Object.assign({}, AnnotationConfig, config);
      this.storage = new StorageEngine();
      this.state = {
        activeTool: null,
        panelOpen: false
      };

      this.highlighter = new HighlightEngine(this);
      this.drawer = new DrawEngine(this);
      this.autoSave = Utils.debounce(() => this.saveCurrentPage(), 500);
    }

    async init() {
      await this.storage.init();
      this.renderUI();
      this.bindShortcuts();
      await this.loadCurrentPage();
    }

    setActiveTool(toolName) {
      if (this.state.activeTool === toolName) {
        this.state.activeTool = null;
      } else {
        this.state.activeTool = toolName;
      }

      if (this.state.activeTool === 'draw' || this.state.activeTool === 'eraser') {
        this.drawer.init();
      }

      this.updateUIStates();
    }

    updateUIStates() {
      const hlActive = this.state.activeTool === 'highlight';
      const drawActive = this.state.activeTool === 'draw';
      const eraserActive = this.state.activeTool === 'eraser';

      const toggleHl = this.panel.querySelector('#las-toggle-hl');
      const toggleDraw = this.panel.querySelector('#las-toggle-draw');
      const toggleEraser = this.panel.querySelector('#las-toggle-eraser');

      if (toggleHl) toggleHl.checked = hlActive;
      if (toggleDraw) toggleDraw.checked = drawActive;
      if (toggleEraser) toggleEraser.checked = eraserActive;

      this.toolbar.querySelector('#las-tb-hl').classList.toggle('las-active', hlActive);
      this.toolbar.querySelector('#las-tb-draw').classList.toggle('las-active', drawActive);
      this.toolbar.querySelector('#las-tb-eraser').classList.toggle('las-eraser-active', eraserActive);

      if (this.drawer.canvas) {
        const needCanvas = drawActive || eraserActive;
        this.drawer.canvas.classList.toggle('las-active', needCanvas);
        this.drawer.canvas.classList.toggle('las-eraser-mode', eraserActive);
      }
    }

    renderUI() {
      // Floating Action Button
      this.fab = document.createElement('button');
      this.fab.className = 'las-element las-fab';
      this.fab.innerHTML = `<svg viewBox="0 0 24 24"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`;
      document.body.appendChild(this.fab);

      // Side Panel
      this.panel = document.createElement('div');
      this.panel.className = 'las-element las-panel';
      this.panel.innerHTML = `
        <div class="las-panel-header">
          <span class="las-panel-title">Annotation Controls</span>
          <button class="las-panel-close">&times;</button>
        </div>
        <div class="las-panel-content">
          <div class="las-section">
            <div class="las-section-title">Exclusive Tools</div>
            <div class="las-row">
              <span>Text Highlighter</span>
              <label class="las-switch"><input type="checkbox" id="las-toggle-hl"><span class="las-slider"></span></label>
            </div>
            <div class="las-row">
              <span>Drawing Canvas</span>
              <label class="las-switch"><input type="checkbox" id="las-toggle-draw"><span class="las-slider"></span></label>
            </div>
            <div class="las-row">
              <span>Rubber / Eraser</span>
              <label class="las-switch"><input type="checkbox" id="las-toggle-eraser"><span class="las-slider"></span></label>
            </div>
            <div class="las-row">
              <span>Show Toolbar</span>
              <label class="las-switch"><input type="checkbox" id="las-toggle-tb" ${this.config.showToolbar ? 'checked' : ''}><span class="las-slider"></span></label>
            </div>
          </div>

          <div class="las-section">
            <div class="las-section-title">Pen & Canvas Styling</div>
            <div class="las-row">
              <span>Color</span>
              <input type="color" id="las-picker-color" value="${this.config.defaultHighlight}">
            </div>
            <div class="las-row">
              <span>Thickness</span>
              <input type="range" id="las-pen-width" min="1" max="20" value="${this.config.penWidth}">
            </div>
            <div class="las-row">
              <span>Opacity</span>
              <input type="range" id="las-pen-opacity" min="0.1" max="1.0" step="0.1" value="${this.config.opacity}">
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(this.panel);

      // Mini Bottom Toolbar
      this.toolbar = document.createElement('div');
      this.toolbar.className = 'las-element las-toolbar';
      if (this.config.showToolbar) this.toolbar.classList.add('las-visible');
      this.toolbar.innerHTML = `
        <button class="las-tb-btn" id="las-tb-hl" title="Highlight"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 11-6 6v3h3l6-6m-3-3 3-3 3 3-3 3m0-6 2-2a2 2 0 0 1 3 3l-2 2"/></svg></button>
        <button class="las-tb-btn" id="las-tb-draw" title="Draw (Pencil Cursor)"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/></svg></button>
        <button class="las-tb-btn" id="las-tb-eraser" title="Rubber / Eraser"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m7 21-4-4 10-10 6 6-6 6z"/><path d="m18 11 3 3-4 4h-6"/></svg></button>
        <button class="las-tb-btn" id="las-tb-undo" title="Undo (Ctrl+Z)"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg></button>
        <button class="las-tb-btn" id="las-tb-clear" title="Clear Canvas"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
      `;
      document.body.appendChild(this.toolbar);

      this.bindUIEvents();
    }

    bindUIEvents() {
      this.fab.addEventListener('click', () => this.togglePanel());
      this.panel.querySelector('.las-panel-close').addEventListener('click', () => this.togglePanel(false));

      // Panel Tool Controls
      this.panel.querySelector('#las-toggle-hl').addEventListener('change', () => this.setActiveTool('highlight'));
      this.panel.querySelector('#las-toggle-draw').addEventListener('change', () => this.setActiveTool('draw'));
      this.panel.querySelector('#las-toggle-eraser').addEventListener('change', () => this.setActiveTool('eraser'));

      this.panel.querySelector('#las-toggle-tb').addEventListener('change', (e) => {
        this.config.showToolbar = e.target.checked;
        this.toolbar.classList.toggle('las-visible', this.config.showToolbar);
      });

      this.panel.querySelector('#las-picker-color').addEventListener('input', (e) => {
        this.config.defaultHighlight = e.target.value;
        this.config.defaultPen = e.target.value;
      });

      this.panel.querySelector('#las-pen-width').addEventListener('input', (e) => {
        this.config.penWidth = parseInt(e.target.value, 10);
      });

      this.panel.querySelector('#las-pen-opacity').addEventListener('input', (e) => {
        this.config.opacity = parseFloat(e.target.value);
      });

      // Toolbar Buttons
      this.toolbar.querySelector('#las-tb-hl').addEventListener('click', () => this.setActiveTool('highlight'));
      this.toolbar.querySelector('#las-tb-draw').addEventListener('click', () => this.setActiveTool('draw'));
      this.toolbar.querySelector('#las-tb-eraser').addEventListener('click', () => this.setActiveTool('eraser'));
      
      // SMART UNDO: Active mode ke according Drawing ya Highlight undo karega
      this.toolbar.querySelector('#las-tb-undo').addEventListener('click', () => {
        if (this.state.activeTool === 'highlight') {
          this.highlighter.undo();
        } else {
          this.drawer.undo();
        }
      });
      
      this.toolbar.querySelector('#las-tb-clear').addEventListener('click', () => this.drawer.clear());
    }

    togglePanel(open) {
      this.state.panelOpen = open !== undefined ? open : !this.state.panelOpen;
      this.panel.classList.toggle('las-open', this.state.panelOpen);
    }

    bindShortcuts() {
      window.addEventListener('keydown', (e) => {
        // SMART CTRL+Z UNDO
        if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'z') {
          e.preventDefault();
          if (this.state.activeTool === 'highlight') {
            this.highlighter.undo();
          } else {
            this.drawer.undo();
          }
        }

        if (e.ctrlKey && e.shiftKey) {
          switch (e.key.toUpperCase()) {
            case 'H':
              e.preventDefault();
              this.setActiveTool('highlight');
              break;
            case 'D':
              e.preventDefault();
              this.setActiveTool('draw');
              break;
            case 'S':
              e.preventDefault();
              this.togglePanel();
              break;
          }
        }
      });
    }

    async saveCurrentPage() {
      if (!this.config.autoSave) return;
      const data = {
        highlights: this.highlighter.exportData(),
        drawings: this.drawer.exportData()
      };
      await this.storage.save(window.location.pathname, data);
    }

    async loadCurrentPage() {
      const data = await this.storage.load(window.location.pathname);
      if (!data) return;
      if (data.highlights) this.highlighter.restore(data.highlights);
      if (data.drawings) {
        this.drawer.init();
        this.drawer.restore(data.drawings);
      }
    }
  }

  // Auto Init
  document.addEventListener('DOMContentLoaded', () => {
    global.LiveAnnotation = new LiveAnnotationSystem();
    global.LiveAnnotation.init();
  });

})(window);