let db;
let cropper = null;
let currentCropFile = null;
let currentCropId = null;
let currentCropToken = null; 
let currentRotation = 0;

const objectUrlsMap = new Map();

// PIPELINE FILE QUEUE MANAGER
let incomingQueueFiles = [];

const req = indexedDB.open("ImageLibrary", 2);

req.onupgradeneeded = (e) => {
    const database = e.target.result;
    if (database.objectStoreNames.contains("images")) {
        database.deleteObjectStore("images");
    }
    const store = database.createObjectStore("images", {
        keyPath: "id",
        autoIncrement: true
    });
    store.createIndex("token", "token", { unique: true });
};

req.onsuccess = (e) => {
    db = e.target.result;
    load();
    checkUrlParameters();
    initGlobalDragAndPasteHandlers();
};

function checkUrlParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action');
    const token = urlParams.get('token');

    if (action && token) {
        const tx = db.transaction("images", "readonly");
        const idx = tx.objectStore("images").index("token");
        const query = idx.get(token);

        query.onsuccess = () => {
            const record = query.result;
            if (record) {
                if (action === 'edit') {
                    openImageEditor(record.id, record.token);
                } else if (action === 'crop') {
                    cropExisting(record.id);
                }
            } else {
                console.error("Deep link execution failed.");
            }
        };
    }
}

function handleEditorReturn() {
    const returnUrl = sessionStorage.getItem('passport_return_page');
    if (returnUrl) {
        sessionStorage.removeItem('passport_return_page');
        window.location.replace(returnUrl);
    }
}

function generateUniqueToken() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let token = 'IMG_';
    for (let i = 0; i < 8; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
}

function clearExistingObjectUrls() {
    for (const url of objectUrlsMap.values()) {
        URL.revokeObjectURL(url);
    }
    objectUrlsMap.clear();
}

function getImageMetadata(blob) {
    return new Promise((resolve) => {
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve({ width: img.naturalWidth, height: img.naturalHeight });
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            resolve({ width: null, height: null });
        };
        img.src = url;
    });
}

function dataURLtoBlob(dataurl) {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
}

document.getElementById("files").addEventListener("change", (e) => {
    save([...e.target.files]);
});

const drop = document.getElementById("drop");

drop.addEventListener("dragover", (e) => {
    e.preventDefault();
    drop.classList.add("dragover");
});

drop.addEventListener("dragleave", () => {
    drop.classList.remove("dragover");
});

drop.addEventListener("drop", (e) => {
    e.preventDefault();
    drop.classList.remove("dragover");
    const files = [...e.dataTransfer.files];
    save(files);
});

function save(files) {
    const validFiles = files.filter(file => file.type.startsWith("image/"));
    if (validFiles.length === 0) return;

    if (validFiles.length > 1) {
        let processCount = 0;
        validFiles.forEach(async (file) => {
            const meta = await getImageMetadata(file);
            const tx = db.transaction("images", "readwrite");
            
            tx.objectStore("images").add({
                token: generateUniqueToken(),
                name: file.name,
                blob: file,
                created: Date.now(),
                mime: file.type,
                width: meta.width,
                height: meta.height,
                size: file.size
            });

            tx.oncomplete = () => {
                processCount++;
                if (processCount === validFiles.length) {
                    load();
                }
            };
        });
        return;
    }

    const file = validFiles[0];
    const objectUrl = URL.createObjectURL(file);
    openCropper(objectUrl, file.name, null, null);
}

document.getElementById("cropSave").onclick = async () => {
    if (!cropper) return;
    const canvas = cropper.getCroppedCanvas({ imageSmoothingQuality: "high" });
    const dataUrl = canvas.toDataURL("image/png", 1);
    const blob = dataURLtoBlob(dataUrl);
    const meta = await getImageMetadata(blob);

    if (currentCropId && currentCropToken) {
        updateCroppedImage(currentCropId, currentCropToken, blob, meta);
    } else {
        const tx = db.transaction("images", "readwrite");
        tx.objectStore("images").add({
            token: generateUniqueToken(),
            name: currentCropFile || "cropped_image.png",
            blob: blob,
            created: Date.now(),
            mime: blob.type,
            width: meta.width,
            height: meta.height,
            size: blob.size
        });

        tx.oncomplete = () => {
            closeCropper();
            load();
            checkAndRunNextInQueue();
        };
    }
};

document.getElementById("cropApplySelect").onclick = async () => {
    if (!cropper) return;
    const canvas = cropper.getCroppedCanvas({ imageSmoothingQuality: "high" });
    const dataUrl = canvas.toDataURL("image/png", 1);
    const blob = dataURLtoBlob(dataUrl);
    const meta = await getImageMetadata(blob);

    if (currentCropId && currentCropToken) {
        updateCroppedAndSelect(currentCropId, currentCropToken, blob, meta);
    } else {
        const tx = db.transaction("images", "readwrite");
        const token = generateUniqueToken();
        
        const reqAdd = tx.objectStore("images").add({
            token: token,
            name: currentCropFile || "cropped_image.png",
            blob: blob,
            created: Date.now(),
            mime: blob.type,
            width: meta.width,
            height: meta.height,
            size: blob.size
        });

        reqAdd.onsuccess = (e) => {
            closeCropper();
            load();
            selectImage(e.target.result);
            checkAndRunNextInQueue();
        };
    }
};

document.getElementById("cropCancel").onclick = () => {
    closeCropper();
    checkAndRunNextInQueue();
};

function closeCropper() {
    document.getElementById("cropModal").style.display = "none";
    if (cropper) {
        cropper.destroy();
        cropper = null;
    }
    currentCropFile = null;
    currentCropId = null;
    currentCropToken = null;
    
    if(sessionStorage.getItem('passport_return_page')) {
         handleEditorReturn();
    }
}

function openImageEditor(id, token) {
    const url = `/edit/?id=${id}&token=${encodeURIComponent(token)}`;
    const modal = document.getElementById("editModal");
    const iframe = document.getElementById("editIframe");
    
    iframe.src = url;
    modal.style.display = "flex";
}

function closeEditModal() {
    const modal = document.getElementById("editModal");
    const iframe = document.getElementById("editIframe");
    
    iframe.src = "";
    modal.style.display = "none";
    load();
    
    if(sessionStorage.getItem('passport_return_page')) {
         handleEditorReturn();
    }
}

window.addEventListener("message", (event) => {
    if (event.data && event.data.type === "edit_complete") {
        closeEditModal();
        if (event.data.id) {
            selectImage(event.data.id);
        }
    } else if (event.data === "edit_cancel") {
        closeEditModal();
    }
});

function load() {
    const gallery = document.getElementById("gallery");
    gallery.innerHTML = "";
    clearExistingObjectUrls();

    const search = document.getElementById("search").value.toLowerCase();
    const tx = db.transaction("images", "readonly");
    const store = tx.objectStore("images");

    store.openCursor(null, "prev").onsuccess = (e) => {
        const cursor = e.target.result;
        if (!cursor) return;

        const image = cursor.value;
        if (image.name.toLowerCase().includes(search) || image.token.toLowerCase().includes(search)) {
            const card = document.createElement("div");
            card.className = "card";

            const activeBlob = image.editedBlob ? image.editedBlob : image.blob;
            const blobUrl = URL.createObjectURL(activeBlob);
            objectUrlsMap.set(image.id, blobUrl);

            card.innerHTML = `
                <img src="${blobUrl}" draggable="true" id="img-item-${image.id}">
                <div class="card-body">
                    <p style="word-break: break-all; margin: 0 0 5px 0;"><strong>${image.token}</strong></p>
                    <p style="margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${image.name}</p>
                    <div class="actions">
                        <button class="primary-btn" id="btn-sel-${image.id}">Select</button>
                        <button class="warning-btn" id="btn-crp-${image.id}">Crop</button>
                        <button class="blue-gradient-btn" id="btn-edt-${image.id}"><span class="material-icons" style="font-size:14px;">edit</span>Edit</button>
                        <button class="success-btn" id="btn-ren-${image.id}">Rename</button>
                        <button class="danger-btn" id="btn-del-${image.id}">Delete</button>
                    </div>
                </div>
            `;

            gallery.appendChild(card);

            const imgEl = document.getElementById(`img-item-${image.id}`);
            imgEl.onclick = () => selectImage(image.id);
            imgEl.ondblclick = () => openImageEditor(image.id, image.token);

            document.getElementById(`btn-sel-${image.id}`).onclick = () => selectImage(image.id);
            document.getElementById(`btn-crp-${image.id}`).onclick = () => cropExisting(image.id);
            document.getElementById(`btn-edt-${image.id}`).onclick = () => openImageEditor(image.id, image.token);
            document.getElementById(`btn-ren-${image.id}`).onclick = () => renameImg(image.id);
            document.getElementById(`btn-del-${image.id}`).onclick = () => deleteImg(image.id);
            
            imgEl.addEventListener("dragstart", (ev) => {
                ev.dataTransfer.setData("text/plain", JSON.stringify({ token: image.token }));
            });
        }
        cursor.continue();
    };
}

document.getElementById("search").addEventListener("input", load);

function deleteImg(id) {
    if (!confirm("Delete image permanently from Library?")) return;
    const tx = db.transaction("images", "readwrite");
    tx.objectStore("images").delete(id);
    tx.oncomplete = load;
}

function renameImg(id) {
    const newName = prompt("Enter new name");
    if (!newName) return;

    const tx = db.transaction("images", "readwrite");
    const store = tx.objectStore("images");
    const reqGet = store.get(id);

    reqGet.onsuccess = () => {
        const image = reqGet.result;
        if(image) {
            image.name = newName;
            store.put(image);
        }
    };
    tx.oncomplete = load;
}

function selectImage(id) {
    const tx = db.transaction("images", "readonly");
    const reqGet = tx.objectStore("images").get(id);

    reqGet.onsuccess = () => {
        const image = reqGet.result;
        if (!image) {
            alert("Image not found.");
            return;
        }

        const messagePayload = { token: image.token };

        if (window.self !== window.top) {
            window.parent.postMessage(messagePayload, "*");
            return;
        }

        if (window.opener) {
            window.opener.postMessage(messagePayload, "*");
            window.close();
            return;
        }

        localStorage.setItem("selectedImageToken", image.token);
        alert("Image Selected! "  + image.token);
    };
}

function openCropper(imageData, fileName, imageId = null, token = null) {
    currentCropFile = fileName;
    currentCropId = imageId;
    currentCropToken = token;

    const modal = document.getElementById("cropModal");
    const image = document.getElementById("cropImage");
    currentRotation = 0;

    document.getElementById("rotationSlider").value = 0;
    document.getElementById("rotationValue").innerText = "0°";
    image.src = imageData;
    modal.style.display = "block";

    image.onload = () => {
        if (cropper) cropper.destroy();
        cropper = new Cropper(image, {
            viewMode: 1,
            autoCropArea: 0.9,
            responsive: true,
            restore: false,
            guides: true,
            center: true,
            background: true,
            highlight: true,
            movable: true,
            zoomable: true,
            scalable: true,
            rotatable: true
        });
    };
}

function cropExisting(id) {
    const tx = db.transaction("images", "readonly");
    const reqGet = tx.objectStore("images").get(id);

    reqGet.onsuccess = () => {
        const image = reqGet.result;
        if (image) {
            const activeBlob = image.editedBlob ? image.editedBlob : image.blob;
            const blobUrl = URL.createObjectURL(activeBlob);
            openCropper(blobUrl, image.name, id, image.token);
        }
    };
}

function updateCroppedImage(id, token, newBlob, meta) {
    const tx = db.transaction("images", "readwrite");
    const store = tx.objectStore("images");
    const reqGet = store.get(id);

    reqGet.onsuccess = () => {
        const image = reqGet.result;
        if (image) {
            image.editedBlob = newBlob; 
            image.mime = newBlob.type;
            image.size = newBlob.size;
            image.width = meta.width;
            image.height = meta.height;
            store.put(image);
        }
    };

    tx.oncomplete = () => {
        closeCropper();
        load();
        handleEditorReturn();
        checkAndRunNextInQueue();
    };
}

function updateCroppedAndSelect(id, token, newBlob, meta) {
    const tx = db.transaction("images", "readwrite");
    const store = tx.objectStore("images");
    const reqGet = store.get(id);

    reqGet.onsuccess = () => {
        const image = reqGet.result;
        if (image) {
            image.editedBlob = newBlob;
            image.mime = newBlob.type;
            image.size = newBlob.size;
            image.width = meta.width;
            image.height = meta.height;
            store.put(image);
        }
    };

    tx.oncomplete = () => {
        closeCropper();
        load();
        if(sessionStorage.getItem('passport_return_page')) {
            handleEditorReturn();
        } else {
            selectImage(id);
        }
        checkAndRunNextInQueue();
    };
}

const rotationSlider = document.getElementById("rotationSlider");
rotationSlider.addEventListener("input", function() {
    currentRotation = parseInt(this.value);
    document.getElementById("rotationValue").innerText = currentRotation + "°";
    if (cropper) {
        cropper.rotateTo(currentRotation);
    }
});

document.getElementById("rotateLeft").onclick = () => {
    currentRotation -= 5;
    if (currentRotation < -180) currentRotation = -180;
    cropper.rotateTo(currentRotation);
    rotationSlider.value = currentRotation;
    document.getElementById("rotationValue").innerText = currentRotation + "°";
};

document.getElementById("rotateRight").onclick = () => {
    currentRotation += 5;
    if (currentRotation > 180) currentRotation = 180;
    cropper.rotateTo(currentRotation);
    rotationSlider.value = currentRotation;
    document.getElementById("rotationValue").innerText = currentRotation + "°";
};

document.getElementById("resetCrop").onclick = () => {
    if (cropper) {
        cropper.reset();
        rotationSlider.value = 0;
        document.getElementById("rotationValue").innerText = "0°";
        currentRotation = 0;
    }
};

document.getElementById("zoomIn").onclick = () => {
    if (cropper) cropper.zoom(0.1);
};

document.getElementById("zoomOut").onclick = () => {
    if (cropper) cropper.zoom(-0.1);
};

document.getElementById("zoomReset").onclick = () => {
    if (cropper) cropper.zoomTo(1);
};


// =====================================================================================
// DRAG & DROP + CLIPBOARD DIRECT INGESTION TO CROPPER PIPELINE MECHANICS
// =====================================================================================

let activePopupObjectUrl = null;
let dragCounter = 0; 

function initGlobalDragAndPasteHandlers() {
    const overlay = document.getElementById("globalDragOverlay");
    
    window.addEventListener("dragenter", (e) => {
        e.preventDefault();
        if (e.dataTransfer.types.includes("text/plain")) {
            const dragDataStr = e.dataTransfer.getData("text/plain");
            if (dragDataStr && dragDataStr.includes("IMG_")) return;
        }
        dragCounter++;
        overlay.style.display = "flex";
        setTimeout(() => overlay.classList.add("active"), 10);
    });

    window.addEventListener("dragover", (e) => {
        e.preventDefault();
    });

    window.addEventListener("dragleave", (e) => {
        e.preventDefault();
        dragCounter--;
        if (dragCounter <= 0) {
            dragCounter = 0;
            hideDragOverlay();
        }
    });

    window.addEventListener("drop", (e) => {
        e.preventDefault();
        dragCounter = 0;
        hideDragOverlay();
        
        const files = [...e.dataTransfer.files];
        if (files && files.length > 0) {
            handleIncomingFilesPipeline(files);
        }
    });

    window.addEventListener("paste", (e) => {
        handleClipboardPaste(e);
    });

    document.getElementById("popupCloseBtn").onclick = hideUploadPopup;
    document.getElementById("popupCancelBtn").onclick = hideUploadPopup;
    document.getElementById("popupOrigBtn").onclick = processOriginalUpload;
    document.getElementById("popupCropBtn").onclick = processCropUpload;

    makePopupDraggable(document.getElementById("globalUploadPopup"), document.getElementById("popupHeader"));

    const popupEl = document.getElementById("globalUploadPopup");
    popupEl.addEventListener("dragover", (e) => e.preventDefault());
    popupEl.addEventListener("drop", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const files = [...e.dataTransfer.files];
        if (files && files.length > 0) {
            handleIncomingFilesPipeline(files);
        }
    });

    window.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            const popup = document.getElementById("globalUploadPopup");
            if (popup.style.display === "flex") {
                hideUploadPopup();
            }
        }
    });
}

function hideDragOverlay() {
    const overlay = document.getElementById("globalDragOverlay");
    overlay.classList.remove("active");
    setTimeout(() => {
        if (!overlay.classList.contains("active")) {
            overlay.style.display = "none";
        }
    }, 300);
}

function handleIncomingFilesPipeline(files) {
    const validFiles = validateImageFiles(files);
    if (validFiles.length === 0) return;

    incomingQueueFiles = validFiles;

    // DIRECT INTERCEPT ROUTE: Als er 1 enkele afbeelding is gedropt of geplakt, open de cropper meteen direct!
    if (incomingQueueFiles.length === 1) {
        checkAndRunNextInQueue();
        return;
    }

    // Als er meerdere afbeeldingen zijn, toon dan de pop-up om de bulk-modus te kiezen
    showUploadPopup();
    previewIncomingImages();
}

function validateImageFiles(files) {
    const output = [];
    let standardFailureCount = 0;
    
    for (let i = 0; i < files.length; i++) {
        if (files[i].type.startsWith("image/")) {
            output.push(files[i]);
        } else {
            standardFailureCount++;
        }
    }
    if (standardFailureCount > 0 && output.length === 0) {
        alert("This file is not an image.");
    }
    return output;
}

function handleClipboardPaste(e) {
    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    const extractedFiles = [];
    
    for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
            const file = items[i].getAsFile();
            if (file) {
                if (!file.name || file.name === "image.png" || file.name === "blob") {
                    const timestampId = new Date().toISOString().replace(/[:.]/g, "-");
                    Object.defineProperty(file, 'name', {
                        writable: true,
                        value: `Clipboard-${timestampId}.png`
                    });
                }
                extractedFiles.push(file);
            }
        }
    }
    if (extractedFiles.length > 0) {
        handleIncomingFilesPipeline(extractedFiles);
    }
}

function showUploadPopup() {
    const popup = document.getElementById("globalUploadPopup");
    popup.style.display = "flex";
    popup.style.top = "15%";
    popup.style.left = "calc(50% - 325px)";
    
    setTimeout(() => {
        popup.classList.add("visible");
    }, 5);
}

function hideUploadPopup() {
    const popup = document.getElementById("globalUploadPopup");
    popup.classList.remove("visible");
    if (activePopupObjectUrl) {
        URL.revokeObjectURL(activePopupObjectUrl);
        activePopupObjectUrl = null;
    }
    setTimeout(() => {
        if (!popup.classList.contains("visible")) {
            popup.style.display = "none";
            document.getElementById("popupProgressIndicator").style.display = "none";
        }
    }, 300);
}

async function previewIncomingImages() {
    const singleView = document.getElementById("popupSingleView");
    const multiView = document.getElementById("popupMultipleView");
    const cropBtn = document.getElementById("popupCropBtn");
    const origBtn = document.getElementById("popupOrigBtn");

    if (activePopupObjectUrl) {
        URL.revokeObjectURL(activePopupObjectUrl);
        activePopupObjectUrl = null;
    }

    if (incomingQueueFiles.length > 1) {
        singleView.style.display = "none";
        multiView.style.display = "block";
        document.getElementById("popupMultipleBadge").innerText = `${incomingQueueFiles.length} Images Detected`;
        cropBtn.innerText = "Crop One By One";
        origBtn.innerText = "Upload All Original";
    } else {
        multiView.style.display = "none";
        singleView.style.display = "block";
        cropBtn.innerText = "Crop & Upload";
        origBtn.innerText = "Upload Original";

        const targetFile = incomingQueueFiles[0];
        activePopupObjectUrl = URL.createObjectURL(targetFile);
        
        document.getElementById("popupPreviewImage").src = activePopupObjectUrl;
        document.getElementById("metaName").innerText = targetFile.name;
        document.getElementById("metaType").innerText = targetFile.type || "image/unknown";
        document.getElementById("metaSize").innerText = (targetFile.size / 1024).toFixed(1) + " KB";
        
        document.getElementById("metaRes").innerText = "Reading...";
        const dimensions = await getImageMetadata(targetFile);
        if (dimensions.width) {
            document.getElementById("metaRes").innerText = `${dimensions.width} x ${dimensions.height} px`;
        } else {
            document.getElementById("metaRes").innerText = "Unknown resolution";
        }
    }
}

async function processOriginalUpload() {
    const progress = document.getElementById("popupProgressIndicator");
    progress.style.display = "flex";
    
    for (let i = 0; i < incomingQueueFiles.length; i++) {
        const file = incomingQueueFiles[i];
        const dimensions = await getImageMetadata(file);
        
        await new Promise((resolve) => {
            const tx = db.transaction("images", "readwrite");
            tx.objectStore("images").add({
                token: generateUniqueToken(),
                name: file.name,
                blob: file,
                created: Date.now(),
                mime: file.type,
                width: dimensions.width,
                height: dimensions.height,
                size: file.size
            });
            tx.oncomplete = () => resolve();
        });
    }
    
    progress.style.display = "none";
    hideUploadPopup();
    load();
}

function processCropUpload() {
    if (incomingQueueFiles.length > 1) {
        const selectedMode = document.querySelector('input[name="multiUploadMode"]:checked').value;
        if (selectedMode === "original") {
            processOriginalUpload();
            return;
        }
    }
    hideUploadPopup();
    checkAndRunNextInQueue();
}

function checkAndRunNextInQueue() {
    if (incomingQueueFiles.length === 0) return;
    
    const nextFile = incomingQueueFiles.shift();
    const objectUrl = URL.createObjectURL(nextFile);
    openCropper(objectUrl, nextFile.name, null, null);
}

function makePopupDraggable(popupEl, headerEl) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    headerEl.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
        e = e || window.event;
        if (e.target.closest('button')) return;
        
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        
        popupEl.style.top = (popupEl.offsetTop - pos2) + "px";
        popupEl.style.left = (popupEl.offsetLeft - pos1) + "px";
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
    }
}

window.cropExisting = cropExisting;
window.renameImg = renameImg;
window.deleteImg = deleteImg;
window.selectImage = selectImage;
window.openImageEditor = openImageEditor;
window.closeEditModal = closeEditModal;