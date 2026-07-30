 // Set PDF.js Worker Path
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    // Application State
    const state = {
      file: null,
      pdfBytes: null,
      pdfJsDoc: null,
      pageCount: 0,
      originalSizeKB: 0,
      preset: 'target',
      compressedPdfBytes: null,
      isCompressing: false
    };

    // DOM Elements
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const filePreview = document.getElementById('filePreview');
    const fileName = document.getElementById('fileName');
    const fileOriginalSize = document.getElementById('fileOriginalSize');
    const filePages = document.getElementById('filePages');
    const fileDimensions = document.getElementById('fileDimensions');
    const fileImageCount = document.getElementById('fileImageCount');
    const startCompressBtn = document.getElementById('startCompressBtn');
    const statusLog = document.getElementById('statusLog');
    const progressCircle = document.getElementById('progressCircle');
    const progressPct = document.getElementById('progressPct');
    const statOrigSize = document.getElementById('statOrigSize');
    const statCompSize = document.getElementById('statCompSize');
    const statRatio = document.getElementById('statRatio');
    const statIteration = document.getElementById('statIteration');
    const exportActions = document.getElementById('exportActions');
    const downloadBtn = document.getElementById('downloadBtn');
    const previewBtn = document.getElementById('previewBtn');

    // Theme Toggle
    document.getElementById('themeToggleBtn').addEventListener('click', () => {
      const isDark = document.body.getAttribute('data-theme') === 'dark';
      document.body.setAttribute('data-theme', isDark ? 'light' : 'dark');
    });

    // Preset Switching
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        state.preset = e.target.dataset.preset;

        document.getElementById('targetModeControls').classList.toggle('hidden', state.preset !== 'target');
        document.getElementById('rangeModeControls').classList.toggle('hidden', state.preset !== 'range');
        document.getElementById('customParams').classList.toggle('hidden', state.preset !== 'custom');
      });
    });

    function setTarget(val, unit) {
      document.getElementById('targetSizeVal').value = val;
      document.getElementById('targetSizeUnit').value = unit;
    }

    // Drag & Drop Handlers
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      if (e.dataTransfer.files.length) handleFileSelect(e.dataTransfer.files[0]);
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length) handleFileSelect(e.target.files[0]);
    });

    // UI Log Utility
    function logStatus(msg) {
      statusLog.innerHTML += `<div>> ${msg}</div>`;
      statusLog.scrollTop = statusLog.scrollHeight;
    }

    function updateProgress(percent) {
      const circumference = 314;
      const offset = circumference - (percent / 100) * circumference;
      progressCircle.style.strokeDashoffset = offset;
      progressPct.textContent = `${Math.round(percent)}%`;
    }

    // Process Selected File
    async function handleFileSelect(file) {
      if (file.type !== 'application/pdf') {
        alert('Please upload a valid PDF file.');
        return;
      }
      if (file.size > 500 * 1024 * 1024) {
        alert('File exceeds the 500MB maximum limit.');
        return;
      }

      state.file = file;
      state.originalSizeKB = file.size / 1024;
      fileName.textContent = file.name;
      fileOriginalSize.textContent = formatBytes(file.size);
      statOrigSize.textContent = formatBytes(file.size);

      logStatus(`Loaded file: ${file.name}`);
      logStatus('Parsing PDF structure...');

      const arrayBuffer = await file.arrayBuffer();
      state.pdfBytes = new Uint8Array(arrayBuffer);

      try {
        state.pdfJsDoc = await pdfjsLib.getDocument({ data: state.pdfBytes.slice(0) }).promise;
        state.pageCount = state.pdfJsDoc.numPages;
        filePages.textContent = state.pageCount;

        // First page preview & dimensions
        const page1 = await state.pdfJsDoc.getPage(1);
        const viewport = page1.getViewport({ scale: 0.3 });
        const canvas = document.getElementById('pdfCanvas');
        const ctx = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page1.render({ canvasContext: ctx, viewport }).promise;

        const origViewport = page1.getViewport({ scale: 1.0 });
        fileDimensions.textContent = `${Math.round(origViewport.width)}x${Math.round(origViewport.height)}pt`;

        filePreview.classList.remove('hidden');
        startCompressBtn.disabled = false;
        logStatus(`PDF Ready: ${state.pageCount} page(s).`);

        // Quick Image Scan
        countPdfImages();

      } catch (err) {
        logStatus(`Error parsing PDF: ${err.message}`);
        alert('Could not open PDF file. It might be encrypted or corrupted.');
      }
    }

    async function countPdfImages() {
      let totalImages = 0;
      for (let i = 1; i <= Math.min(state.pageCount, 10); i++) {
        const page = await state.pdfJsDoc.getPage(i);
        const operatorList = await page.getOperatorList();
        const validObjs = [pdfjsLib.SVGGraphics.paintImageXObject, pdfjsLib.SVGGraphics.paintInlineImageXObject];
        totalImages += operatorList.fnArray.filter(fn => validObjs.includes(fn)).length;
      }
      fileImageCount.textContent = totalImages > 0 ? `~${totalImages}` : 'Vector/Text heavy';
    }

    // Binary Search Iterative Engine
    startCompressBtn.addEventListener('click', async () => {
      if (state.isCompressing) return;
      state.isCompressing = true;
      startCompressBtn.disabled = true;
      exportActions.classList.add('hidden');
      statusLog.innerHTML = '';

      let minKB = 0;
      let maxKB = 0;

      // Determine Target Range
      if (state.preset === 'target') {
        const targetVal = parseFloat(document.getElementById('targetSizeVal').value);
        const unit = document.getElementById('targetSizeUnit').value;
        const targetKB = unit === 'MB' ? targetVal * 1024 : targetVal;
        minKB = targetKB * 0.98;
        maxKB = targetKB * 1.02;
      } else if (state.preset === 'range') {
        minKB = parseFloat(document.getElementById('minSizeVal').value);
        maxKB = parseFloat(document.getElementById('maxSizeVal').value);
      } else if (state.preset === 'recommended') {
        minKB = state.originalSizeKB * 0.4;
        maxKB = state.originalSizeKB * 0.5;
      } else if (state.preset === 'max') {
        minKB = 10;
        maxKB = state.originalSizeKB * 0.3;
      }

      logStatus('Starting Smart Iterative Compression...');

      // Binary Search Bounds for Compression Parameters (0 = min compression, 1 = max compression)
      let low = 0.0;
      let high = 1.0;
      let bestResult = null;
      let closestDiff = Infinity;
      const MAX_ITERATIONS = state.preset === 'custom' ? 1 : 15;

      for (let iter = 1; iter <= MAX_ITERATIONS; iter++) {
        statIteration.textContent = `${iter} / ${MAX_ITERATIONS}`;
        updateProgress((iter / MAX_ITERATIONS) * 100);

        let mid = (low + high) / 2;
        
        // Derive Parameters from Binary Search Position
        let quality, scale, removeMeta;
        if (state.preset === 'custom') {
          quality = parseFloat(document.getElementById('imgQualitySlider').value) / 100;
          scale = parseFloat(document.getElementById('dpiSelect').value);
          removeMeta = document.getElementById('removeMetaToggle').checked;
        } else {
          quality = Math.max(0.1, 0.95 - (mid * 0.85)); // Range: 95% down to 10%
          scale = Math.max(0.2, 1.0 - (mid * 0.75));    // Range: 100% down to 25%
          removeMeta = mid > 0.3;
        }

        logStatus(`Iter ${iter}: Quality=${Math.round(quality*100)}%, Scale=${Math.round(scale*100)}%`);

        const compressedBytes = await compressPdfPass(quality, scale, removeMeta);
        const currentSizeKB = compressedBytes.length / 1024;
        
        statCompSize.textContent = formatBytes(compressedBytes.length);
        const savedRatio = Math.max(0, ((state.originalSizeKB - currentSizeKB) / state.originalSizeKB) * 100);
        statRatio.textContent = `${savedRatio.toFixed(1)}%`;

        updateQualityMeter(quality);

        const diff = Math.abs(currentSizeKB - ((minKB + maxKB) / 2));
        if (diff < closestDiff) {
          closestDiff = diff;
          bestResult = compressedBytes;
        }

        // Check if within acceptable target bounds
        if (state.preset !== 'custom') {
          if (currentSizeKB >= minKB && currentSizeKB <= maxKB) {
            logStatus(`Success! Target size reached: ${formatBytes(compressedBytes.length)}`);
            bestResult = compressedBytes;
            break;
          }

          if (currentSizeKB > maxKB) {
            low = mid; // Need higher compression
          } else {
            high = mid; // Compressed too much, relax settings
          }
        }
      }

      state.compressedPdfBytes = bestResult;
      updateProgress(100);
      logStatus('Compression Complete!');
      
      exportActions.classList.remove('hidden');
      state.isCompressing = false;
      startCompressBtn.disabled = false;
    });

    // Core PDF Re-rendering & Reconstruction Engine
    async function compressPdfPass(quality, scale, removeMetadata) {
      // Create fresh PDF document using PDF-Lib
      const newPdfDoc = await PDFLib.PDFDocument.create();

      for (let pageNum = 1; pageNum <= state.pageCount; pageNum++) {
        const page = await state.pdfJsDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: scale });

        // Render page directly to offscreen HTML5 canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({ canvasContext: ctx, viewport }).promise;

        // Apply Grayscale Conversion if selected
        const colorMode = document.getElementById('colorModeSelect').value;
        if (colorMode === 'grayscale') {
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imgData.data;
          for (let i = 0; i < data.length; i += 4) {
            const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
            data[i] = avg;     // R
            data[i + 1] = avg; // G
            data[i + 2] = avg; // B
          }
          ctx.putImageData(imgData, 0, 0);
        }

        // Compress canvas to JPEG Blob
        const jpegUrl = canvas.toDataURL('image/jpeg', quality);
        const jpegBytes = await fetch(jpegUrl).then(res => res.arrayBuffer());

        // Embed JPEG back into PDF-Lib Document
        const embeddedImg = await newPdfDoc.embedJpg(jpegBytes);
        const origViewport = page.getViewport({ scale: 1.0 });

        const newPage = newPdfDoc.addPage([origViewport.width, origViewport.height]);
        newPage.drawImage(embeddedImg, {
          x: 0,
          y: 0,
          width: origViewport.width,
          height: origViewport.height
        });
      }

      if (removeMetadata) {
        newPdfDoc.setTitle('');
        newPdfDoc.setAuthor('');
        newPdfDoc.setProducer('');
        newPdfDoc.setCreator('');
      }

      return await newPdfDoc.save();
    }

    // Visual Meter Updater
    function updateQualityMeter(quality) {
      const fill = document.getElementById('qualityMeterFill');
      const label = document.getElementById('qualityLabel');
      const pct = quality * 100;

      fill.style.width = `${pct}%`;
      if (pct > 80) {
        fill.style.background = '#10b981';
        label.textContent = 'Excellent';
      } else if (pct > 60) {
        fill.style.background = '#3b82f6';
        label.textContent = 'Good';
      } else if (pct > 40) {
        fill.style.background = '#f59e0b';
        label.textContent = 'Average';
      } else {
        fill.style.background = '#ef4444';
        label.textContent = 'Low Quality';
      }
    }

    // Helper: Byte Formatter
    function formatBytes(bytes) {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Export Handlers
    downloadBtn.addEventListener('click', () => {
      if (!state.compressedPdfBytes) return;
      const blob = new Blob([state.compressedPdfBytes], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `compressed_${state.file.name}`;
      link.click();
    });

    previewBtn.addEventListener('click', () => {
      if (!state.compressedPdfBytes) return;
      const blob = new Blob([state.compressedPdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    });

    document.getElementById('imgQualitySlider').addEventListener('input', (e) => {
      document.getElementById('qualityValDisplay').textContent = e.target.value;
    });