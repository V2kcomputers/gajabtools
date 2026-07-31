 (function() {
  'use strict';

  const state = {
    originalFile: null,
    baseImage: null,
    originalWidth: 0,
    originalHeight: 0,
    aspectRatio: 1,
    aspectRatioLocked: true,
    currentZoom: 1,
    outputBlob: null,
    outputCanvas: null,
    outputDimensions: { width: 0, height: 0 },
    debounceTimer: null,
    rotation: 0,
    flipH: false,
    flipV: false,
    cropRatio: 'free'
  };

  const $ = id => document.getElementById(id);

  const dropzone = $('img-comp-dropzone');
  const globalOverlay = $('img-comp-global-overlay');
  const fileInput = $('img-comp-file-input');
  const cameraInput = $('img-comp-camera-input');
  
  const browseBtn = $('img-comp-browse-btn');
  const cameraBtn = $('img-comp-camera-btn');
  const pasteBtn = $('img-comp-paste-btn');
  const workspace = $('img-comp-workspace');

  const widthInput = $('img-comp-width');
  const heightInput = $('img-comp-height');
  const aspectBtn = $('img-comp-aspect-btn');

  const minTargetSizeSelect = $('img-comp-min-target-size');
  const minCustomSizeBox = $('img-comp-min-custom-box');
  const minCustomValInput = $('img-comp-min-custom-val');
  const minCustomUnitSelect = $('img-comp-min-custom-unit');

  const targetSizeSelect = $('img-comp-target-size');
  const customSizeBox = $('img-comp-custom-size-box');
  const customValInput = $('img-comp-custom-val');
  const customUnitSelect = $('img-comp-custom-unit');

  const formatSelect = $('img-comp-format');
  const qualityInput = $('img-comp-quality');
  const qualityValDisplay = $('img-comp-quality-val');
  const pngWarning = $('img-comp-png-warning');

  const previewImg = $('img-comp-preview-img');
  const origImg = $('img-comp-orig-img');
  const outImg = $('img-comp-out-img');
  const comparisonBox = $('img-comp-comparison-box');
  const toggleCompare = $('img-comp-toggle-compare');
  const loader = $('img-comp-loader');

  const filenameInput = $('img-comp-filename');
  const downloadBtn = $('img-comp-download-btn');
  const replaceBtn = $('img-comp-replace-btn');
  const removeBtn = $('img-comp-remove-btn');
  const resetBtn = $('img-comp-reset-btn');
  const msgBox = $('img-comp-msg');

  const cropModal = $('img-crop-modal');
  const cropViewport = $('img-crop-viewport');
  const cropTargetImg = $('img-crop-target-img');
  const cropBoxEl = $('img-crop-box');
  const openCropBtn = $('img-comp-open-crop-btn');
  const closeCropBtn = $('img-crop-close-btn');
  const cancelCropBtn = $('img-crop-cancel-btn');
  const applyCropBtn = $('img-crop-apply-btn');

  const fxModal = $('img-fx-modal');
  const fxPreviewImg = $('img-fx-preview-img');
  const openFxBtn = $('img-comp-open-fx-btn');
  const closeFxBtn = $('img-fx-close-btn');
  const applyFxBtn = $('img-fx-apply-btn');
  const resetFxBtn = $('img-fx-reset-btn');

  function getFormatDetails() {
    const formatValue = formatSelect.value;
    let mimeType;
    let fileExtension;

    if (formatValue.includes("|")) {
      [mimeType, fileExtension] = formatValue.split("|");
    } else {
      mimeType = formatValue;
      if (mimeType === "application/pdf") {
        fileExtension = "pdf";
      } else {
        fileExtension = mimeType.split("/")[1];
      }
    }

    return { mimeType, fileExtension };
  }

  function initModule() {
    dropzone.addEventListener('click', () => fileInput.click());

    browseBtn.addEventListener('click', e => { e.stopPropagation(); fileInput.click(); });
    cameraBtn.addEventListener('click', e => { e.stopPropagation(); cameraInput.click(); });
    pasteBtn.addEventListener('click', e => { e.stopPropagation(); triggerClipboardRead(); });

    replaceBtn.addEventListener('click', () => fileInput.click());
    removeBtn.addEventListener('click', resetModule);
    resetBtn.addEventListener('click', resetSettings);

    fileInput.addEventListener('change', e => handleFiles(e.target.files));
    cameraInput.addEventListener('change', e => handleFiles(e.target.files));

    let dragCounter = 0;
    window.addEventListener('dragenter', e => {
      e.preventDefault();
      dragCounter++;
      if (e.dataTransfer.types && e.dataTransfer.types.includes('Files')) {
        globalOverlay.classList.add('active');
      }
    });

    window.addEventListener('dragleave', e => {
      e.preventDefault();
      dragCounter--;
      if (dragCounter === 0) globalOverlay.classList.remove('active');
    });

    window.addEventListener('dragover', e => e.preventDefault());

    window.addEventListener('drop', e => {
      e.preventDefault();
      dragCounter = 0;
      globalOverlay.classList.remove('active');
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
    });

    window.addEventListener('paste', e => {
      const items = (e.clipboardData || e.originalEvent.clipboardData).items;
      for (let item of items) {
        if (item.type.indexOf('image') !== -1) {
          handleFiles([item.getAsFile()]);
          break;
        }
      }
    });

    $('img-comp-rot-left').addEventListener('click', () => { state.rotation = (state.rotation - 90) % 360; triggerProcessDebounced(); });
    $('img-comp-rot-right').addEventListener('click', () => { state.rotation = (state.rotation + 90) % 360; triggerProcessDebounced(); });
    $('img-comp-flip-h').addEventListener('click', () => { state.flipH = !state.flipH; triggerProcessDebounced(); });
    $('img-comp-flip-v').addEventListener('click', () => { state.flipV = !state.flipV; triggerProcessDebounced(); });

    openFxBtn.addEventListener('click', openFxModal);
    closeFxBtn.addEventListener('click', () => fxModal.style.display = 'none');
    applyFxBtn.addEventListener('click', () => { fxModal.style.display = 'none'; triggerProcessDebounced(); });
    resetFxBtn.addEventListener('click', resetFxControls);

    ['brightness', 'contrast', 'saturation', 'grayscale', 'sepia', 'blur'].forEach(fx => {
      $(`img-fx-${fx}`).addEventListener('input', e => {
        const unit = fx === 'blur' ? 'px' : '%';
        $(`img-fx-${fx}-val`).innerText = `${e.target.value}${unit}`;
        updateFxLivePreview();
      });
    });

    openCropBtn.addEventListener('click', openCropModal);
    closeCropBtn.addEventListener('click', closeCropModal);
    cancelCropBtn.addEventListener('click', closeCropModal);
    applyCropBtn.addEventListener('click', applyCrop);

    document.querySelectorAll('.img-crop-ratio-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.img-crop-ratio-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.cropRatio = btn.dataset.ratio;
        alignCropBoxToRatio();
      });
    });

    widthInput.addEventListener('input', () => {
      if (state.aspectRatioLocked && state.aspectRatio) {
        heightInput.value = Math.round(widthInput.value / state.aspectRatio);
      }
      triggerProcessDebounced();
    });

    heightInput.addEventListener('input', () => {
      if (state.aspectRatioLocked && state.aspectRatio) {
        widthInput.value = Math.round(heightInput.value * state.aspectRatio);
      }
      triggerProcessDebounced();
    });

    aspectBtn.addEventListener('click', () => {
      state.aspectRatioLocked = !state.aspectRatioLocked;
      aspectBtn.classList.toggle('img-comp-aspect-active', state.aspectRatioLocked);
      aspectBtn.innerText = state.aspectRatioLocked ? '🔒' : '🔓';
    });

    document.querySelectorAll('.img-comp-preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        widthInput.value = parseInt(btn.dataset.w);
        heightInput.value = parseInt(btn.dataset.h);
        if (btn.dataset.name) filenameInput.value = `${btn.dataset.name}-photo`;
        triggerProcessDebounced();
      });
    });

    minTargetSizeSelect.addEventListener('change', () => {
      minCustomSizeBox.style.display = minTargetSizeSelect.value === 'custom' ? 'flex' : 'none';
      triggerProcessDebounced();
    });
    minCustomValInput.addEventListener('input', triggerProcessDebounced);
    minCustomUnitSelect.addEventListener('change', triggerProcessDebounced);

    targetSizeSelect.addEventListener('change', () => {
      customSizeBox.style.display = targetSizeSelect.value === 'custom' ? 'flex' : 'none';
      triggerProcessDebounced();
    });
    customValInput.addEventListener('input', triggerProcessDebounced);
    customUnitSelect.addEventListener('change', triggerProcessDebounced);

    formatSelect.addEventListener('change', () => {
      const { mimeType } = getFormatDetails();
      pngWarning.style.display = mimeType === 'image/png' ? 'block' : 'none';
      triggerProcessDebounced();
    });

    qualityInput.addEventListener('input', () => {
      qualityValDisplay.innerText = `${qualityInput.value}%`;
      triggerProcessDebounced();
    });

    ['img-comp-opt-sharpen', 'img-comp-opt-transparency', 'img-comp-opt-hq', 'img-comp-opt-fast'].forEach(id => {
      $(id).addEventListener('change', triggerProcessDebounced);
    });

    $('img-comp-zoom-in').addEventListener('click', () => setZoom(state.currentZoom + 0.15));
    $('img-comp-zoom-out').addEventListener('click', () => setZoom(state.currentZoom - 0.15));
    $('img-comp-zoom-fit').addEventListener('click', () => setZoom(1));
    $('img-comp-zoom-100').addEventListener('click', () => setZoom(1));

    toggleCompare.addEventListener('change', () => {
      comparisonBox.style.display = toggleCompare.checked ? 'grid' : 'none';
    });

    downloadBtn.addEventListener('click', downloadOutput);
    initCropDragAndResize();
  }

  function openFxModal() {
    if (!state.baseImage) return;
    fxPreviewImg.src = previewImg.src;
    updateFxLivePreview();
    fxModal.style.display = 'flex';
  }

  function updateFxLivePreview() {
    const brightness = $('img-fx-brightness').value;
    const contrast = $('img-fx-contrast').value;
    const saturation = $('img-fx-saturation').value;
    const grayscale = $('img-fx-grayscale').value;
    const sepia = $('img-fx-sepia').value;
    const blur = $('img-fx-blur').value;

    fxPreviewImg.style.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) grayscale(${grayscale}%) sepia(${sepia}%) blur(${blur}px)`;
  }

  function resetFxControls() {
    ['brightness', 'contrast', 'saturation'].forEach(fx => { $(`img-fx-${fx}`).value = 100; $(`img-fx-${fx}-val`).innerText = '100%'; });
    ['grayscale', 'sepia', 'blur'].forEach(fx => { $(`img-fx-${fx}`).value = 0; $(`img-fx-${fx}-val`).innerText = fx === 'blur' ? '0px' : '0%'; });
    updateFxLivePreview();
    triggerProcessDebounced();
  }

  function openCropModal() {
    if (!state.baseImage) return;
    cropTargetImg.src = previewImg.src;
    cropModal.style.display = 'flex';
    setTimeout(() => {
      alignCropBoxToRatio();
    }, 50);
  }

  function closeCropModal() { cropModal.style.display = 'none'; }

  function alignCropBoxToRatio() {
    const vRect = cropViewport.getBoundingClientRect();
    const iRect = cropTargetImg.getBoundingClientRect();

    let targetW = iRect.width * 0.7;
    let targetH = iRect.height * 0.7;

    if (state.cropRatio !== 'free') {
      const r = parseFloat(state.cropRatio);
      if (targetW / targetH > r) {
        targetW = targetH * r;
      } else {
        targetH = targetW / r;
      }
    }

    const left = (iRect.left - vRect.left) + (iRect.width - targetW) / 2;
    const top = (iRect.top - vRect.top) + (iRect.height - targetH) / 2;

    cropBoxEl.style.width = `${targetW}px`;
    cropBoxEl.style.height = `${targetH}px`;
    cropBoxEl.style.left = `${left}px`;
    cropBoxEl.style.top = `${top}px`;
  }

  function initCropDragAndResize() {
    let mode = null;
    let startX, startY, startL, startT, startW, startH;

    cropBoxEl.addEventListener('pointerdown', e => {
      e.preventDefault();
      if (e.target.classList.contains('img-crop-handle')) {
        mode = e.target.dataset.handle;
      } else {
        mode = 'move';
      }

      startX = e.clientX;
      startY = e.clientY;
      startL = cropBoxEl.offsetLeft;
      startT = cropBoxEl.offsetTop;
      startW = cropBoxEl.offsetWidth;
      startH = cropBoxEl.offsetHeight;

      cropBoxEl.setPointerCapture(e.pointerId);
    });

    cropBoxEl.addEventListener('pointermove', e => {
      if (!mode) return;
      e.preventDefault();

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const vRect = cropViewport.getBoundingClientRect();
      const iRect = cropTargetImg.getBoundingClientRect();

      const minL = iRect.left - vRect.left;
      const minT = iRect.top - vRect.top;
      const maxR = minL + iRect.width;
      const maxB = minT + iRect.height;

      if (mode === 'move') {
        let newL = Math.max(minL, Math.min(startL + dx, maxR - startW));
        let newT = Math.max(minT, Math.min(startT + dy, maxB - startH));
        cropBoxEl.style.left = `${newL}px`;
        cropBoxEl.style.top = `${newT}px`;
      } else {
        let newL = startL, newT = startT, newW = startW, newH = startH;

        if (mode.includes('r')) newW = Math.min(maxR - startL, Math.max(30, startW + dx));
        if (mode.includes('b')) newH = Math.min(maxB - startT, Math.max(30, startH + dy));
        if (mode.includes('l')) {
          const possibleW = Math.max(30, startW - dx);
          newL = Math.max(minL, startL + (startW - possibleW));
          newW = startW + (startL - newL);
        }
        if (mode.includes('t')) {
          const possibleH = Math.max(30, startH - dy);
          newT = Math.max(minT, startT + (startH - possibleH));
          newH = startH + (startT - newT);
        }

        if (state.cropRatio !== 'free') {
          const r = parseFloat(state.cropRatio);
          newH = newW / r;
        }

        cropBoxEl.style.left = `${newL}px`;
        cropBoxEl.style.top = `${newT}px`;
        cropBoxEl.style.width = `${newW}px`;
        cropBoxEl.style.height = `${newH}px`;
      }
    });

    const stopAction = e => {
      if (mode) {
        cropBoxEl.releasePointerCapture(e.pointerId);
        mode = null;
      }
    };

    cropBoxEl.addEventListener('pointerup', stopAction);
    cropBoxEl.addEventListener('pointercancel', stopAction);
  }

  function applyCrop() {
    const vRect = cropViewport.getBoundingClientRect();
    const box = cropBoxEl.getBoundingClientRect();
    const iRect = cropTargetImg.getBoundingClientRect();

    const scaleX = state.originalWidth / iRect.width;
    const scaleY = state.originalHeight / iRect.height;

    const cropX = Math.max(0, (box.left - iRect.left) * scaleX);
    const cropY = Math.max(0, (box.top - iRect.top) * scaleY);
    const cropW = Math.min(state.originalWidth - cropX, box.width * scaleX);
    const cropH = Math.min(state.originalHeight - cropY, box.height * scaleY);

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, cropW);
    canvas.height = Math.max(1, cropH);
    const ctx = canvas.getContext('2d');

    ctx.drawImage(state.baseImage, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

    const croppedImg = new Image();
    croppedImg.onload = () => {
      state.baseImage = croppedImg;
      state.originalWidth = croppedImg.width;
      state.originalHeight = croppedImg.height;
      state.aspectRatio = croppedImg.width / croppedImg.height;
      widthInput.value = croppedImg.width;
      heightInput.value = croppedImg.height;
      closeCropModal();
      processImage();
    };
    croppedImg.src = canvas.toDataURL();
  }

  async function triggerClipboardRead() {
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        const imageType = item.types.find(type => type.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          handleFiles([new File([blob], "pasted-image.png", { type: imageType })]);
          return;
        }
      }
      showError("Clipboard me koi image nahi mili.");
    } catch (err) {
      showError("Clipboard permission allow nahi hui. Direct (Ctrl + V) daba kar paste karein.");
    }
  }

  function handleFiles(files) {
    if (!files || !files.length) return;
    const file = files[0];
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      showError('Unsupported format. Only JPG, PNG, WEBP are supported.');
      return;
    }
    state.originalFile = file;
    clearError();

    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        state.baseImage = img;
        setupLoadedImage(img.width, img.height);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function setupLoadedImage(w, h) {
    state.originalWidth = w;
    state.originalHeight = h;
    state.aspectRatio = w / h;
    widthInput.value = w;
    heightInput.value = h;

    const nameWithoutExt = state.originalFile.name.substring(0, state.originalFile.name.lastIndexOf('.')) || 'image';
    filenameInput.value = `${nameWithoutExt}-resized`;

    origImg.src = URL.createObjectURL(state.originalFile);
    dropzone.style.display = 'none';
    workspace.style.display = 'block';

    processImage();
  }

  function triggerProcessDebounced() {
    clearTimeout(state.debounceTimer);
    state.debounceTimer = setTimeout(processImage, 200);
  }

  function renderCanvasAtSize(targetW, targetH) {
    const isFast = $('img-comp-opt-fast').checked;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(targetW));
    canvas.height = Math.max(1, Math.round(targetH));
    const ctx = canvas.getContext('2d', { alpha: $('img-comp-opt-transparency').checked });

    const brightness = $('img-fx-brightness').value;
    const contrast = $('img-fx-contrast').value;
    const saturation = $('img-fx-saturation').value;
    const grayscale = $('img-fx-grayscale').value;
    const sepia = $('img-fx-sepia').value;
    const blur = $('img-fx-blur').value;

    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) grayscale(${grayscale}%) sepia(${sepia}%) blur(${blur}px)`;

    if ($('img-comp-opt-hq').checked && !isFast) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
    } else {
      ctx.imageSmoothingEnabled = !isFast;
    }

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((state.rotation * Math.PI) / 180);
    ctx.scale(state.flipH ? -1 : 1, state.flipV ? -1 : 1);

    const isRotated90 = Math.abs(state.rotation % 180) === 90;
    const drawW = isRotated90 ? canvas.height : canvas.width;
    const drawH = isRotated90 ? canvas.width : canvas.height;

    ctx.drawImage(state.baseImage, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();

    if ($('img-comp-opt-sharpen').checked) {
      applySharpenFilter(ctx, canvas.width, canvas.height);
    }

    return canvas;
  }

  async function processImage() {
    if (!state.baseImage) return;

    showLoader(true);
    clearError();

    try {
      const initialWidth = parseInt(widthInput.value) || state.originalWidth;
      const initialHeight = parseInt(heightInput.value) || state.originalHeight;
      const { mimeType, fileExtension } = getFormatDetails();

      const minTargetBytes = getMinTargetSizeBytes();
      let maxTargetBytes = getMaxTargetSizeBytes();

      let internalMime = mimeType;
      let pdfOverheadEstimate = 0;
      if (mimeType === 'application/pdf') {
        internalMime = 'image/jpeg';
        pdfOverheadEstimate = 2000;
      }

      let initialQuality = parseInt(qualityInput.value) / 100;
      let finalBlob = null;
      let finalCanvas = null;

      const hasMax = maxTargetBytes > 0;
      const hasMin = minTargetBytes > 0;

      if ((hasMax || hasMin) && internalMime !== 'image/png') {
        let targetMaxImgBytes = hasMax ? Math.max(1024, maxTargetBytes - pdfOverheadEstimate) : Infinity;
        let targetMinImgBytes = hasMin ? Math.max(0, minTargetBytes - pdfOverheadEstimate) : 0;

        const compressedResult = await compressToTargetRange(
          initialWidth, 
          initialHeight, 
          internalMime, 
          targetMinImgBytes, 
          targetMaxImgBytes,
          initialQuality,
          mimeType === 'application/pdf'
        );
        
        finalBlob = compressedResult.blob;
        finalCanvas = compressedResult.canvas;
      } else {
        finalCanvas = renderCanvasAtSize(initialWidth, initialHeight);
        finalBlob = await canvasToBlobAsync(finalCanvas, internalMime, initialQuality);
      }

      let previewBlob = finalBlob;

      if (mimeType === 'application/pdf') {
        const pdfBlob = await createPdfBlobFromImageBlob(finalBlob, finalCanvas.width, finalCanvas.height);
        finalBlob = pdfBlob;
      }

      state.outputCanvas = finalCanvas;
      state.outputBlob = finalBlob;
      state.outputDimensions = { width: finalCanvas.width, height: finalCanvas.height };

      const previewUrl = URL.createObjectURL(previewBlob);
      previewImg.src = previewUrl;
      outImg.src = previewUrl;

      updateMetricsTable(finalBlob.size, finalCanvas.width, finalCanvas.height, minTargetBytes, maxTargetBytes);
    } catch (err) {
      showError("Processing failed: " + err.message);
    } finally {
      showLoader(false);
    }
  }

  async function compressToTargetRange(startW, startH, mimeType, minBytes, maxBytes, preferredQuality, isPdf) {
    let curW = startW;
    let curH = startH;
    let scaleStep = 0.88;
    let absoluteMinQuality = 0.01;
    
    let bestBlob = null;
    let bestCanvas = null;
    let bestDiff = Infinity;

    for (let attempt = 0; attempt < 25; attempt++) {
      let canvas = renderCanvasAtSize(curW, curH);

      let qMin = absoluteMinQuality, qMax = 1.0;
      let qBest = Math.min(Math.max(preferredQuality, qMin), qMax);
      let passBlob = await canvasToBlobAsync(canvas, mimeType, qBest);

      for (let i = 0; i < 9; i++) {
        let testBlobSize = passBlob.size;
        if (isPdf) testBlobSize += 2000;

        if (maxBytes !== Infinity && testBlobSize > maxBytes) {
          qMax = qBest;
          qBest = (qMin + qMax) / 2;
        } else if (minBytes > 0 && testBlobSize < minBytes && qBest < 0.99) {
          qMin = qBest;
          qBest = (qMin + qMax) / 2;
        } else {
          break;
        }
        passBlob = await canvasToBlobAsync(canvas, mimeType, qBest);
      }

      let checkSize = passBlob.size + (isPdf ? 2000 : 0);
      const isWithinRange = (maxBytes === Infinity || checkSize <= maxBytes) && (minBytes === 0 || checkSize >= minBytes);

      let centerTarget = maxBytes !== Infinity ? (minBytes > 0 ? (minBytes + maxBytes) / 2 : maxBytes) : minBytes;
      let diff = Math.abs(checkSize - centerTarget);
      if (isWithinRange || diff < bestDiff) {
        bestDiff = diff;
        bestBlob = passBlob;
        bestCanvas = canvas;
      }

      if (isWithinRange) {
        return { blob: bestBlob, canvas: bestCanvas };
      }

      if (maxBytes !== Infinity && checkSize > maxBytes) {
        curW = Math.round(curW * scaleStep);
        curH = Math.round(curH * scaleStep);
        if (curW < 5 || curH < 5) break;
      } 
      else if (minBytes > 0 && checkSize < minBytes) {
        if (curW < startW) {
          curW = Math.min(startW, Math.round(curW * 1.15));
          curH = Math.min(startH, Math.round(curH * 1.15));
        } else {
          break;
        }
      } else {
        break;
      }
    }

    return { blob: bestBlob, canvas: bestCanvas };
  }

  async function createPdfBlobFromImageBlob(imageBlob, width, height) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      throw new Error("jsPDF library load nahi hui hai. Kripya internet connection check karein.");
    }
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
      orientation: width > height ? 'l' : 'p',
      unit: 'px',
      format: [width, height]
    });

    const base64Data = await blobToBase64(imageBlob);
    pdf.addImage(base64Data, 'JPEG', 0, 0, width, height);
    
    return pdf.output('blob');
  }

  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  function canvasToBlobAsync(canvas, mimeType, quality) {
    return new Promise(resolve => canvas.toBlob(blob => resolve(blob), mimeType, quality));
  }

  function applySharpenFilter(ctx, width, height) {
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;
    const mix = 0.2;
    for (let i = 0; i < data.length; i += 4) {
      data[i]     = Math.min(255, data[i] + (data[i] - (data[i - 4] || data[i])) * mix);
      data[i + 1] = Math.min(255, data[i + 1] + (data[i + 1] - (data[i - 3] || data[i + 1])) * mix);
      data[i + 2] = Math.min(255, data[i + 2] + (data[i + 2] - (data[i - 2] || data[i + 2])) * mix);
    }
    ctx.putImageData(imgData, 0, 0);
  }

  function getMinTargetSizeBytes() {
    const val = minTargetSizeSelect.value;
    if (val === '0') return 0;
    if (val === 'custom') {
      const num = parseFloat(minCustomValInput.value) || 0;
      return minCustomUnitSelect.value === 'MB' ? num * 1024 * 1024 : num * 1024;
    }
    return parseFloat(val) * 1024;
  }

  function getMaxTargetSizeBytes() {
    const val = targetSizeSelect.value;
    if (val === '0') return 0;
    if (val === 'custom') {
      const num = parseFloat(customValInput.value) || 0;
      return customUnitSelect.value === 'MB' ? num * 1024 * 1024 : num * 1024;
    }
    return parseFloat(val) * 1024;
  }

  function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024, sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function updateMetricsTable(outSize, outW, outH, minBytes, maxBytes) {
    const origSize = state.originalFile.size;
    $('img-comp-info-orig-dim').innerText = `${state.originalWidth} × ${state.originalHeight} px`;
    $('img-comp-info-out-dim').innerText = `${outW} × ${outH} px`;
    $('img-comp-info-diff-dim').innerText = `${outW - state.originalWidth} × ${outH - state.originalHeight} px`;

    $('img-comp-info-orig-size').innerText = formatBytes(origSize);
    $('img-comp-info-out-size').innerText = formatBytes(outSize);

    const percentChange = (((outSize - origSize) / origSize) * 100).toFixed(1);
    const label = percentChange <= 0 ? `${Math.abs(percentChange)}% Reduction` : `+${percentChange}% Larger`;
    $('img-comp-info-diff-size').innerText = label;

    $('img-comp-info-target-min').innerText = minBytes > 0 ? formatBytes(minBytes) : 'Auto';
    $('img-comp-info-target-max').innerText = maxBytes > 0 ? formatBytes(maxBytes) : 'Auto';

    const statusCell = $('img-comp-info-status');
    const withinMax = maxBytes === 0 || outSize <= maxBytes;
    const withinMin = minBytes === 0 || outSize >= minBytes;

    if (withinMax && withinMin) {
      statusCell.innerHTML = '<span style="color:#276749; font-weight:600;">✔ Within Target Range</span>';
    } else if (!withinMax) {
      statusCell.innerHTML = '<span style="color:#c53030; font-weight:600;">⚠ Slightly Above Target</span>';
    } else {
      statusCell.innerHTML = '<span style="color:#dd6b20; font-weight:600;">⚠ Slightly Below Target</span>';
    }

    $('img-comp-info-orig-format').innerText = state.originalFile.type.split('/')[1].toUpperCase();
    const { fileExtension } = getFormatDetails();
    $('img-comp-info-out-format').innerText = fileExtension.toUpperCase();
  }

  function setZoom(val) {
    state.currentZoom = Math.max(0.2, Math.min(3, val));
    previewImg.style.transform = `scale(${state.currentZoom})`;
    $('img-comp-zoom-level').innerText = `${Math.round(state.currentZoom * 100)}%`;
  }

  function downloadOutput() {
    if (!state.outputBlob) return;

    const rawName = filenameInput.value.trim() || 'resized-image';
    const { fileExtension } = getFormatDetails();
    const finalName = rawName.endsWith(`.${fileExtension}`) ? rawName : `${rawName}.${fileExtension}`;

    const link = document.createElement('a');
    link.href = URL.createObjectURL(state.outputBlob);
    link.download = finalName;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function resetSettings() {
    if (!state.originalFile) return;
    state.rotation = 0;
    state.flipH = false;
    state.flipV = false;
    resetFxControls();

    widthInput.value = state.originalWidth;
    heightInput.value = state.originalHeight;
    state.aspectRatioLocked = true;
    aspectBtn.classList.add('img-comp-aspect-active');
    aspectBtn.innerText = '🔒';
    
    minTargetSizeSelect.value = '0';
    minCustomSizeBox.style.display = 'none';
    targetSizeSelect.value = '100';
    customSizeBox.style.display = 'none';

    qualityInput.value = 90;
    qualityValDisplay.innerText = '90%';
    formatSelect.value = 'image/jpeg|jpg';
    processImage();
  }

  function resetModule() {
    state.originalFile = null;
    state.baseImage = null;
    state.outputBlob = null;
    state.outputCanvas = null;
    fileInput.value = '';
    cameraInput.value = '';
    dropzone.style.display = 'block';
    workspace.style.display = 'none';
    clearError();
  }

  function showLoader(show) { loader.style.display = show ? 'flex' : 'none'; }
  function showError(text) { msgBox.className = 'img-comp-msg error'; msgBox.innerText = text; msgBox.style.display = 'block'; }
  function clearError() { msgBox.style.display = 'none'; }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initModule);
  } else {
    initModule();
  }
})();