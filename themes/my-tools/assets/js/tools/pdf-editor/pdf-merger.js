  if (window.pdfjsLib) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }

        const PAGE_SIZES = {
            A4: { width: 1240, height: 1754 },
            LETTER: { width: 1275, height: 1650 },
            LEGAL: { width: 1275, height: 2100 }
        };

        let targetCanvasWidth = PAGE_SIZES.A4.width;
        let targetCanvasHeight = PAGE_SIZES.A4.height;

        const state = {
            pages: [], 
            activePageIndex: -1,
            selectedElementIndex: -1, // -1 means Page/Global is selected
            zoom: 1.0,
            cropper: null,
            firstFileName: 'Document'
        };

        let pendingPastedFiles = []; // Temporary holding area for pasted files

        const imageCache = new Map();

        function getCachedImage(src, callback) {
            if (imageCache.has(src)) {
                callback(imageCache.get(src));
            } else {
                const img = new Image();
                img.onload = () => {
                    imageCache.set(src, img);
                    callback(img);
                };
                img.src = src;
            }
        }

        const fileListEl = document.getElementById('file-list');
        new Sortable(fileListEl, {
            animation: 150,
            handle: '.handle',
            onEnd: function (evt) {
                const movedItem = state.pages.splice(evt.oldIndex, 1)[0];
                state.pages.splice(evt.newIndex, 0, movedItem);
                renderPageList();
            }
        });

        function toggleTheme() {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            document.getElementById('theme-icon').className = newTheme === 'dark' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
        }

        function toggleNamingInput() {
            const mode = document.getElementById('naming-mode').value;
            const customGroup = document.getElementById('custom-name-group');
            customGroup.style.display = mode === 'first' ? 'none' : 'flex';
        }

        function updateCanvasDimension() {
            const sizeKey = document.getElementById('layout-size').value;
            const orientation = document.getElementById('layout-orientation').value;
            let dims = PAGE_SIZES[sizeKey] || PAGE_SIZES.A4;

            if (orientation === 'landscape') {
                targetCanvasWidth = dims.height;
                targetCanvasHeight = dims.width;
            } else {
                targetCanvasWidth = dims.width;
                targetCanvasHeight = dims.height;
            }
        }

        async function processFilesArray(files, forceOverlay = false) {
            if (!files || !files.length) return;

            if (state.pages.length === 0 && files.length > 0 && !forceOverlay) {
                state.firstFileName = files[0].name ? files[0].name.replace(/\.[^/.]+$/, "") : 'Pasted_Image';
            }

            showProgress("Processing Image...", 5);
            updateCanvasDimension();

            try {
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    
                    if (!forceOverlay && ((file.type && file.type.includes('pdf')) || (file.name && file.name.toLowerCase().endsWith('.pdf')))) {
                        const arrayBuffer = await file.arrayBuffer();
                        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                        
                        for (let p = 1; p <= pdf.numPages; p++) {
                            const page = await pdf.getPage(p);
                            const viewport = page.getViewport({ scale: 2.0 });
                            
                            const canvas = document.createElement('canvas');
                            const ctx = canvas.getContext('2d');
                            canvas.width = viewport.width;
                            canvas.height = viewport.height;

                            await page.render({ canvasContext: ctx, viewport: viewport }).promise;
                            
                            const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
                            state.pages.push(createNewPageObject(`${file.name || 'Document'} (Pg ${p})`, dataUrl, viewport.width, viewport.height));
                        }
                    } else if (file.type && file.type.includes('image')) {
                        const imgUrl = URL.createObjectURL(file);
                        const img = new Image();
                        await new Promise(r => { img.onload = r; img.src = imgUrl; });
                        
                        if (forceOverlay && state.activePageIndex !== -1) {
                            // Add directly as overlay element
                            const pg = state.pages[state.activePageIndex];
                            const w = Math.min(400, img.width);
                            const h = (img.height / img.width) * w;
                            const newElem = {
                                id: 'el_' + Date.now(),
                                type: 'overlay',
                                src: imgUrl,
                                x: (targetCanvasWidth - w) / 2,
                                y: (targetCanvasHeight - h) / 2,
                                width: w, height: h,
                                filters: { brightness: 100, contrast: 100, saturation: 100, grayscale: 0, sepia: 0, invert: 0 }
                            };
                            pg.elements.push(newElem);
                            state.selectedElementIndex = pg.elements.length - 1;
                            updateEffectTargetUI();
                        } else {
                            // Add as new layout page
                            state.pages.push(createNewPageObject(file.name || 'Pasted Image', imgUrl, img.width, img.height));
                        }
                    }
                    updateProgress(Math.round(((i + 1) / files.length) * 100));
                }

                renderPageList();
                if (state.pages.length > 0 && state.activePageIndex === -1) {
                    setActivePage(0);
                } else if (forceOverlay) {
                    renderCanvasPreview();
                }
            } catch (err) {
                console.error("Error loading files:", err);
                alert("Error loading file: " + err.message);
            } finally {
                hideProgress();
            }
        }

        async function handleFileSelect(e) {
            const rawFiles = e.target.files;
            if (!rawFiles || !rawFiles.length) return;
            await processFilesArray(Array.from(rawFiles));
            e.target.value = '';
        }

        function createNewPageObject(name, imgUrl, origW, origH) {
            const ratio = Math.min((targetCanvasWidth - 80) / origW, (targetCanvasHeight - 80) / origH);
            const w = origW * ratio;
            const h = origH * ratio;
            const x = (targetCanvasWidth - w) / 2;
            const y = (targetCanvasHeight - h) / 2;

            return {
                id: 'pg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
                name: name,
                rotation: 0,
                globalFilters: { brightness: 100, contrast: 100, saturation: 100, grayscale: 0, sepia: 0, invert: 0 },
                elements: [
                    {
                        id: 'el_' + Date.now(),
                        type: 'base',
                        src: imgUrl,
                        x: x, y: y, width: w, height: h,
                        filters: { brightness: 100, contrast: 100, saturation: 100, grayscale: 0, sepia: 0, invert: 0 }
                    }
                ]
            };
        }

        function handleAddOverlayImage(e) {
            if (state.activePageIndex === -1) {
                alert("Please select or add a page layout first.");
                return;
            }
            const file = e.target.files[0];
            if (!file) return;

            processFilesArray([file], true);
            e.target.value = '';
        }

        function renderPageList() {
            fileListEl.innerHTML = '';
            state.pages.forEach((pg, index) => {
                const card = document.createElement('div');
                card.className = `file-card ${index === state.activePageIndex ? 'active' : ''}`;
                card.onclick = () => setActivePage(index);

                const thumbSrc = pg.elements[0] ? pg.elements[0].src : '';

                card.innerHTML = `
                    <i class="fa-solid fa-grip-vertical handle"></i>
                    <div class="file-thumb"><img src="${thumbSrc}"></div>
                    <div class="file-info">
                        <div class="file-name">${pg.name}</div>
                        <div class="file-details">Page ${index + 1} (${pg.elements.length} Items)</div>
                    </div>
                    <button class="btn btn-sm btn-icon" onclick="event.stopPropagation(); deletePage(${index})"><i class="fa-solid fa-xmark"></i></button>
                `;
                fileListEl.appendChild(card);
            });
            document.getElementById('file-count').innerText = `${state.pages.length} Pages`;
            document.getElementById('status-right').innerText = `${state.pages.length} Total Pages`;
        }

        function setActivePage(index) {
            if (index < 0 || index >= state.pages.length) return;
            state.activePageIndex = index;
            state.selectedElementIndex = -1; // Default to Full Page Selection
            renderPageList();
            updateEffectTargetUI();
            renderCanvasPreview();
        }

        function updateEffectTargetUI() {
            if (state.activePageIndex === -1) return;
            const pg = state.pages[state.activePageIndex];
            const labelEl = document.getElementById('effect-target-label');

            let activeFilters;
            if (state.selectedElementIndex >= 0 && pg.elements[state.selectedElementIndex]) {
                activeFilters = pg.elements[state.selectedElementIndex].filters;
                labelEl.querySelector('span').innerText = `Target: Selected Image #${state.selectedElementIndex + 1}`;
            } else {
                activeFilters = pg.globalFilters;
                labelEl.querySelector('span').innerText = `Target: Full Page Canvas`;
            }

            document.getElementById('adj-brightness').value = activeFilters.brightness;
            document.getElementById('adj-contrast').value = activeFilters.contrast;
            document.getElementById('adj-saturation').value = activeFilters.saturation;
            document.getElementById('adj-grayscale').value = activeFilters.grayscale;
            document.getElementById('adj-sepia').value = activeFilters.sepia;
            document.getElementById('adj-invert').value = activeFilters.invert;

            document.getElementById('val-brightness').innerText = activeFilters.brightness + '%';
            document.getElementById('val-contrast').innerText = activeFilters.contrast + '%';
            document.getElementById('val-saturation').innerText = activeFilters.saturation + '%';
        }

        function deselectElement() {
            state.selectedElementIndex = -1;
            updateEffectTargetUI();
            renderCanvasPreview();
        }

        // Render Canvas with Layers + Handles
        function renderCanvasPreview() {
            if (state.activePageIndex === -1) return;
            updateCanvasDimension();

            const pg = state.pages[state.activePageIndex];
            const canvas = document.getElementById('main-canvas');
            const ctx = canvas.getContext('2d');

            canvas.width = targetCanvasWidth;
            canvas.height = targetCanvasHeight;

            const bgColor = document.getElementById('layout-bg-color').value;
            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Apply Global Filter to the entire Canvas Page
            ctx.save();
            ctx.filter = `brightness(${pg.globalFilters.brightness}%) contrast(${pg.globalFilters.contrast}%) saturate(${pg.globalFilters.saturation}%) grayscale(${pg.globalFilters.grayscale}%) sepia(${pg.globalFilters.sepia}%) invert(${pg.globalFilters.invert}%)`;

            pg.elements.forEach((elem, idx) => {
                getCachedImage(elem.src, (img) => {
                    ctx.save();
                    // Apply individual element filter
                    ctx.filter = `brightness(${elem.filters.brightness}%) contrast(${elem.filters.contrast}%) saturate(${elem.filters.saturation}%) grayscale(${elem.filters.grayscale}%) sepia(${elem.filters.sepia}%) invert(${elem.filters.invert}%)`;
                    ctx.drawImage(img, elem.x, elem.y, elem.width, elem.height);
                    ctx.restore();

                    // Draw Bounding Box & Handles if selected
                    if (idx === state.selectedElementIndex) {
                        drawTransformBoundingBox(ctx, elem);
                    }
                });
            });

            ctx.restore();

            const stage = document.getElementById('page-stage');
            stage.style.transform = `scale(${state.zoom}) rotate(${pg.rotation}deg)`;
        }

        function drawTransformBoundingBox(ctx, elem) {
            ctx.save();
            ctx.strokeStyle = '#6366f1';
            ctx.lineWidth = 4;
            ctx.setLineDash([8, 8]);
            ctx.strokeRect(elem.x, elem.y, elem.width, elem.height);

            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#6366f1';
            ctx.lineWidth = 3;
            ctx.setLineDash([]);

            const handleSize = 18;
            const corners = [
                { id: 'tl', x: elem.x, y: elem.y },
                { id: 'tr', x: elem.x + elem.width, y: elem.y },
                { id: 'bl', x: elem.x, y: elem.y + elem.height },
                { id: 'br', x: elem.x + elem.width, y: elem.y + elem.height }
            ];

            corners.forEach(c => {
                ctx.beginPath();
                ctx.arc(c.x, c.y, handleSize / 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            });

            ctx.restore();
        }

        // Mouse Engine: Dragging, Resizing & Dynamic Cursor Logic
        let isDragging = false;
        let isResizing = false;
        let activeHandle = null;
        let dragStartX = 0, dragStartY = 0;

        const mainCanvas = document.getElementById('main-canvas');

        function getCanvasCoordinates(e) {
            const rect = mainCanvas.getBoundingClientRect();
            const scaleX = mainCanvas.width / rect.width;
            const scaleY = mainCanvas.height / rect.height;
            return {
                x: (e.clientX - rect.left) * scaleX,
                y: (e.clientY - rect.top) * scaleY
            };
        }

        function getHitHandle(pos, elem) {
            const handleRadius = 24;
            const corners = {
                tl: { x: elem.x, y: elem.y },
                tr: { x: elem.x + elem.width, y: elem.y },
                bl: { x: elem.x, y: elem.y + elem.height },
                br: { x: elem.x + elem.width, y: elem.y + elem.height }
            };

            for (let key in corners) {
                if (Math.hypot(pos.x - corners[key].x, pos.y - corners[key].y) <= handleRadius) {
                    return key;
                }
            }
            return null;
        }

        // Dynamic Cursor Handler
        mainCanvas.addEventListener('mousemove', (e) => {
            if (state.activePageIndex === -1) return;
            const pos = getCanvasCoordinates(e);
            const pg = state.pages[state.activePageIndex];

            let cursorStyle = 'default';

            if (isDragging) {
                cursorStyle = 'grabbing';
            } else if (isResizing) {
                cursorStyle = (activeHandle === 'tl' || activeHandle === 'br') ? 'nwse-resize' : 'nesw-resize';
            } else {
                if (state.selectedElementIndex >= 0 && pg.elements[state.selectedElementIndex]) {
                    const elem = pg.elements[state.selectedElementIndex];
                    const handle = getHitHandle(pos, elem);
                    if (handle) {
                        cursorStyle = (handle === 'tl' || handle === 'br') ? 'nwse-resize' : 'nesw-resize';
                    } else if (pos.x >= elem.x && pos.x <= elem.x + elem.width &&
                               pos.y >= elem.y && pos.y <= elem.y + elem.height) {
                        cursorStyle = 'grab';
                    }
                }

                if (cursorStyle === 'default') {
                    for (let i = pg.elements.length - 1; i >= 0; i--) {
                        const elem = pg.elements[i];
                        if (pos.x >= elem.x && pos.x <= elem.x + elem.width &&
                            pos.y >= elem.y && pos.y <= elem.y + elem.height) {
                            cursorStyle = 'grab';
                            break;
                        }
                    }
                }
            }

            mainCanvas.style.cursor = cursorStyle;

            if (isDragging && state.selectedElementIndex >= 0) {
                const elem = pg.elements[state.selectedElementIndex];
                elem.x = pos.x - dragStartX;
                elem.y = pos.y - dragStartY;
                renderCanvasPreview();
            } else if (isResizing && state.selectedElementIndex >= 0) {
                const elem = pg.elements[state.selectedElementIndex];
                const dx = pos.x - dragStartX;
                const dy = pos.y - dragStartY;

                if (activeHandle === 'br') {
                    elem.width = Math.max(40, elem.width + dx);
                    elem.height = Math.max(40, elem.height + dy);
                } else if (activeHandle === 'tl') {
                    const newW = Math.max(40, elem.width - dx);
                    const newH = Math.max(40, elem.height - dy);
                    elem.x += (elem.width - newW);
                    elem.y += (elem.height - newH);
                    elem.width = newW;
                    elem.height = newH;
                } else if (activeHandle === 'tr') {
                    elem.width = Math.max(40, elem.width + dx);
                    const newH = Math.max(40, elem.height - dy);
                    elem.y += (elem.height - newH);
                    elem.height = newH;
                } else if (activeHandle === 'bl') {
                    const newW = Math.max(40, elem.width - dx);
                    elem.x += (elem.width - newW);
                    elem.width = newW;
                    elem.height = Math.max(40, elem.height + dy);
                }

                dragStartX = pos.x;
                dragStartY = pos.y;
                renderCanvasPreview();
            }
        });

        mainCanvas.addEventListener('mousedown', (e) => {
            if (state.activePageIndex === -1) return;
            const pos = getCanvasCoordinates(e);
            const pg = state.pages[state.activePageIndex];

            if (state.selectedElementIndex >= 0) {
                const elem = pg.elements[state.selectedElementIndex];
                const handle = getHitHandle(pos, elem);
                if (handle) {
                    isResizing = true;
                    activeHandle = handle;
                    dragStartX = pos.x;
                    dragStartY = pos.y;
                    return;
                }
            }

            let foundIndex = -1;
            for (let i = pg.elements.length - 1; i >= 0; i--) {
                const elem = pg.elements[i];
                if (pos.x >= elem.x && pos.x <= elem.x + elem.width &&
                    pos.y >= elem.y && pos.y <= elem.y + elem.height) {
                    foundIndex = i;
                    break;
                }
            }

            state.selectedElementIndex = foundIndex;
            updateEffectTargetUI();

            if (foundIndex >= 0) {
                isDragging = true;
                const elem = pg.elements[foundIndex];
                dragStartX = pos.x - elem.x;
                dragStartY = pos.y - elem.y;
                mainCanvas.style.cursor = 'grabbing';
            }

            renderCanvasPreview();
        });

        window.addEventListener('mouseup', () => {
            isDragging = false;
            isResizing = false;
            activeHandle = null;
        });

        function applyFilters() {
            if (state.activePageIndex === -1) return;
            const pg = state.pages[state.activePageIndex];

            let activeFilters;
            if (state.selectedElementIndex >= 0 && pg.elements[state.selectedElementIndex]) {
                activeFilters = pg.elements[state.selectedElementIndex].filters;
            } else {
                activeFilters = pg.globalFilters;
            }

            activeFilters.brightness = document.getElementById('adj-brightness').value;
            activeFilters.contrast = document.getElementById('adj-contrast').value;
            activeFilters.saturation = document.getElementById('adj-saturation').value;
            activeFilters.grayscale = document.getElementById('adj-grayscale').value;
            activeFilters.sepia = document.getElementById('adj-sepia').value;
            activeFilters.invert = document.getElementById('adj-invert').value;

            document.getElementById('val-brightness').innerText = activeFilters.brightness + '%';
            document.getElementById('val-contrast').innerText = activeFilters.contrast + '%';
            document.getElementById('val-saturation').innerText = activeFilters.saturation + '%';

            renderCanvasPreview();
        }

        function resetFilters() {
            document.getElementById('adj-brightness').value = 100;
            document.getElementById('adj-contrast').value = 100;
            document.getElementById('adj-saturation').value = 100;
            document.getElementById('adj-grayscale').value = 0;
            document.getElementById('adj-sepia').value = 0;
            document.getElementById('adj-invert').value = 0;
            applyFilters();
        }

        function startCropping() {
            const canvas = document.getElementById('main-canvas');
            if (state.cropper) state.cropper.destroy();
            state.cropper = new Cropper(canvas, { aspectRatio: NaN, viewMode: 1 });
        }

        function changeCropRatio() {
            const ratio = parseFloat(document.getElementById('crop-aspect').value);
            if (state.cropper) state.cropper.setAspectRatio(ratio);
        }

        function applyCrop() {
            if (!state.cropper || state.activePageIndex === -1) return;
            const croppedCanvas = state.cropper.getCroppedCanvas();
            const croppedUrl = croppedCanvas.toDataURL();
            
            const pg = state.pages[state.activePageIndex];
            if (state.selectedElementIndex >= 0 && pg.elements[state.selectedElementIndex]) {
                pg.elements[state.selectedElementIndex].src = croppedUrl;
            } else if (pg.elements[0]) {
                pg.elements[0].src = croppedUrl;
            }
            
            state.cropper.destroy();
            state.cropper = null;
            renderPageList();
            renderCanvasPreview();
        }

        function rotateCurrentItem(deg) {
            if (state.activePageIndex === -1) return;
            const pg = state.pages[state.activePageIndex];
            pg.rotation = (pg.rotation + deg) % 360;
            renderCanvasPreview();
        }

        function deletePage(index) {
            state.pages.splice(index, 1);
            if (state.pages.length === 0) {
                state.activePageIndex = -1;
                state.selectedElementIndex = -1;
                state.firstFileName = 'Document';
                const canvas = document.getElementById('main-canvas');
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            } else {
                setActivePage(Math.min(index, state.pages.length - 1));
            }
            renderPageList();
        }

        function deleteCurrentItem() {
            if (state.activePageIndex === -1) return;
            const pg = state.pages[state.activePageIndex];

            if (state.selectedElementIndex >= 0 && pg.elements.length > 1) {
                pg.elements.splice(state.selectedElementIndex, 1);
                state.selectedElementIndex = -1;
                updateEffectTargetUI();
                renderCanvasPreview();
            } else {
                deletePage(state.activePageIndex);
            }
        }

        function clearAll() {
            state.pages = [];
            state.activePageIndex = -1;
            state.selectedElementIndex = -1;
            state.firstFileName = 'Document';
            imageCache.clear();
            renderPageList();
            const canvas = document.getElementById('main-canvas');
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        function zoomPreview(val) {
            state.zoom = Math.max(0.2, Math.min(4.0, state.zoom + val));
            renderCanvasPreview();
            document.getElementById('zoom-level').innerText = Math.round(state.zoom * 100) + '%';
        }

        function resetZoom() {
            state.zoom = 1.0;
            renderCanvasPreview();
            document.getElementById('zoom-level').innerText = '100%';
        }

        function switchTab(tabId) {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            event.target.classList.add('active');
            document.getElementById('tab-' + tabId).classList.add('active');
        }

        async function generateMergedPDF(openInBrowser = false) {
            if (!state.pages.length) {
                alert("Please add at least one page or file.");
                return;
            }

            showProgress("Building Interactive A4 PDF...", 0);
            updateCanvasDimension();

            try {
                const pdfDoc = await PDFLib.PDFDocument.create();
                
                const namingMode = document.getElementById('naming-mode').value;
                let exportFileName = 'Edited_Document';
                if (namingMode === 'first') {
                    exportFileName = state.firstFileName || 'Document';
                } else {
                    exportFileName = document.getElementById('pdf-meta-title').value.trim() || 'Edited_Document';
                }

                pdfDoc.setTitle(exportFileName);

                const total = state.pages.length;
                const quality = parseFloat(document.getElementById('pdf-compression').value);

                for (let i = 0; i < total; i++) {
                    const pg = state.pages[i];
                    updateProgress(Math.round(((i + 1) / total) * 100));

                    const tempCanvas = document.createElement('canvas');
                    const ctx = tempCanvas.getContext('2d');

                    tempCanvas.width = targetCanvasWidth;
                    tempCanvas.height = targetCanvasHeight;

                    const bgColor = document.getElementById('layout-bg-color').value;
                    ctx.fillStyle = bgColor;
                    ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

                    ctx.save();
                    ctx.filter = `brightness(${pg.globalFilters.brightness}%) contrast(${pg.globalFilters.contrast}%) saturate(${pg.globalFilters.saturation}%) grayscale(${pg.globalFilters.grayscale}%) sepia(${pg.globalFilters.sepia}%) invert(${pg.globalFilters.invert}%)`;

                    for (let j = 0; j < pg.elements.length; j++) {
                        const elem = pg.elements[j];
                        const img = new Image();
                        await new Promise(resolve => {
                            img.onload = resolve;
                            img.src = elem.src;
                        });

                        ctx.save();
                        ctx.filter = `brightness(${elem.filters.brightness}%) contrast(${elem.filters.contrast}%) saturate(${elem.filters.saturation}%) grayscale(${elem.filters.grayscale}%) sepia(${elem.filters.sepia}%) invert(${elem.filters.invert}%)`;
                        ctx.drawImage(img, elem.x, elem.y, elem.width, elem.height);
                        ctx.restore();
                    }

                    ctx.restore();

                    const finalDataUrl = tempCanvas.toDataURL('image/jpeg', quality);
                    const embeddedImg = await pdfDoc.embedJpg(finalDataUrl);

                    const page = pdfDoc.addPage([embeddedImg.width, embeddedImg.height]);
                    page.setRotation(PDFLib.degrees(pg.rotation || 0));
                    page.drawImage(embeddedImg, {
                        x: 0,
                        y: 0,
                        width: embeddedImg.width,
                        height: embeddedImg.height,
                    });
                }

                const pdfBytes = await pdfDoc.save();
const blob = new Blob([pdfBytes], {
    type: "application/pdf"
});

const blobUrl = URL.createObjectURL(blob);

if (openInBrowser) {

    // Open PDF in new tab
    window.open(blobUrl, "_blank");

} else {

    // Download PDF
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = `${exportFileName}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
    }, 5000);
}
            } catch (err) {
                console.error("Export Error:", err);
                alert("Failed to export PDF: " + err.message);
            } finally {
                hideProgress();
            }
        }

        function showProgress(title, fill) {
            document.getElementById('progress-overlay').style.display = 'flex';
            document.getElementById('progress-title').innerText = title;
            document.getElementById('progress-fill').style.width = fill + '%';
        }

        function updateProgress(fill) {
            document.getElementById('progress-fill').style.width = fill + '%';
        }

        function hideProgress() {
            document.getElementById('progress-overlay').style.display = 'none';
        }

        /* PASTE SELECTION MODAL LOGIC */
        const pasteModalOverlay = document.getElementById('paste-modal-overlay');
        const pasteOverlayBtn = document.getElementById('paste-overlay-btn');

        function openPasteModal(files) {
            pendingPastedFiles = files;
            // Disable 'Overlay' option if no active page exists
            if (state.activePageIndex === -1) {
                pasteOverlayBtn.style.display = 'none';
            } else {
                pasteOverlayBtn.style.display = 'inline-flex';
            }
            pasteModalOverlay.style.display = 'flex';
        }

        function closePasteModal() {
            pendingPastedFiles = [];
            pasteModalOverlay.style.display = 'none';
        }

        function confirmPasteOption(option) {
            const files = [...pendingPastedFiles];
            closePasteModal();
            if (option === 'new') {
                processFilesArray(files, false);
            } else if (option === 'current') {
                processFilesArray(files, true);
            }
        }

        /* GLOBAL FULL SCREEN DRAG-AND-DROP OVERLAY */
        const globalDropOverlay = document.getElementById('global-drop-overlay');
        let dragTimer = null;

        window.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            globalDropOverlay.classList.add('active');
            clearTimeout(dragTimer);
        });

        window.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dragTimer = setTimeout(() => {
                globalDropOverlay.classList.remove('active');
            }, 100);
        });

        window.addEventListener('drop', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            globalDropOverlay.classList.remove('active');
            
            const files = e.dataTransfer && e.dataTransfer.files;
            if (files && files.length > 0) {
                await processFilesArray(Array.from(files));
            }
        });

        /* CLIPBOARD PASTE (CTRL+V) WITH OPTION DIALOG */
        window.addEventListener('paste', async (e) => {
            const items = (e.clipboardData || e.originalEvent.clipboardData).items;
            const filesToProcess = [];
            for (let item of items) {
                if (item.kind === 'file') {
                    const blob = item.getAsFile();
                    if (blob) filesToProcess.push(blob);
                }
            }
            if (filesToProcess.length > 0) {
                // If there are no existing pages, directly add as a new page
                if (state.pages.length === 0) {
                    await processFilesArray(filesToProcess, false);
                } else {
                    // Open choice modal
                    openPasteModal(filesToProcess);
                }
            }
        });

        /* MOUSE WHEEL ZOOMING IN WORKSPACE AREA */
        const previewContainer = document.getElementById('preview-container');
        previewContainer.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY < 0 ? 0.08 : -0.08;
            zoomPreview(delta);
        }, { passive: false });