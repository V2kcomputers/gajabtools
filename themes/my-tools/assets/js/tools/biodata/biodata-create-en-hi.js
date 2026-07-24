// ==========================================
// ACCORDION TOGGLE HANDLER
// ==========================================
function toggleSection(headerEl) {
    // Prevent event bubbling if clicked on internal buttons
    if (event.target.tagName === 'BUTTON' || event.target.closest('button')) return;
    
    const section = headerEl.closest('.biodata-section');
    if (section) {
        section.classList.toggle('collapsed');
    }
}

function removeField(btn){
    btn.closest(".form-group").remove();
}

[
"basicInfoContainer",
"personalInfoContainer",
"educationContainer",
"familyInfoContainer",
"contactInfoContainer"
].forEach(id=>{
    const el = document.getElementById(id);
    if(el) {
        new Sortable(el, {
            animation:150,
            handle:".drag-handle"
        });
    }
});

// ==========================================
// PURE INDEXEDDB PHOTO & SYMBOL STORAGE MODULE
// ==========================================

let uploadedPhoto = null;
let activePreviewUrl = null;
let activeSymbolPreviewUrl = null;

async function openDB(){
    return new Promise((resolve,reject)=>{
        try {
            const request = indexedDB.open("BiodataDB", 2);
            request.onupgradeneeded = function(e){
                const db = e.target.result;
                if(!db.objectStoreNames.contains("photos")){
                    db.createObjectStore("photos", { keyPath: "id" });
                }
            };
            request.onsuccess = function(){
                resolve(request.result);
            };
            request.onerror = function(){
                reject(request.error || new Error("IndexedDB connection blocked."));
            };
        } catch(err) {
            reject(err);
        }
    });
}

async function savePhoto(photoId, file){
    if(!photoId || !file) return;
    try {
        const db = await openDB();
        return new Promise((resolve,reject)=>{
            const tx = db.transaction("photos", "readwrite");
            const store = tx.objectStore("photos");
            
            store.put({
                id: photoId,
                file: file,
                name: file.name || "upload",
                type: file.type || "image/jpeg",
                size: file.size || 0,
                createdAt: Date.now()
            });

            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    } catch(err) {
        console.error("IndexedDB write failed:", err);
        throw err;
    }
}

async function getPhoto(photoId){
    if(!photoId) return null;
    try {
        const db = await openDB();
        return new Promise((resolve,reject)=>{
            const tx = db.transaction("photos", "readonly");
            const store = tx.objectStore("photos");
            const request = store.get(photoId);

            request.onsuccess = () => resolve(request.result ? request.result.file : null);
            request.onerror = () => reject(request.error);
        });
    } catch(err) {
        console.error("IndexedDB read failed:", err);
        return null;
    }
}

async function deletePhoto(photoId){
    if(!photoId) return;
    try {
        const db = await openDB();
        return new Promise((resolve,reject)=>{
            const tx = db.transaction("photos", "readwrite");
            const store = tx.objectStore("photos");
            store.delete(photoId);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    } catch(err) {
        console.error("IndexedDB drop failed:", err);
    }
}

async function updatePhoto(oldPhotoId, newPhotoId, file) {
    if(oldPhotoId && oldPhotoId !== newPhotoId) {
        await deletePhoto(oldPhotoId);
    }
    await savePhoto(newPhotoId, file);
}

async function restorePhoto() {
    const draftPhotoId = localStorage.getItem("draftPhotoId");
    if(!draftPhotoId) return;
    try {
        const file = await getPhoto(draftPhotoId);
        if(file) {
            uploadedPhoto = file;
            if(activePreviewUrl) {
                URL.revokeObjectURL(activePreviewUrl);
            }
            activePreviewUrl = URL.createObjectURL(file);
            document.getElementById("preview").style.display = "block";
            document.getElementById("previewImg").src = activePreviewUrl;
        } else {
            localStorage.removeItem("draftPhotoId");
        }
    } catch(err) {
        console.error("Failed executing restore photo mapping setup:", err);
    }
}

async function clearPhoto() {
    const draftPhotoId = localStorage.getItem("draftPhotoId");
    if(draftPhotoId) {
        await deletePhoto(draftPhotoId);
        localStorage.removeItem("draftPhotoId");
    }
    if(activePreviewUrl) {
        URL.revokeObjectURL(activePreviewUrl);
        activePreviewUrl = null;
    }
    uploadedPhoto = null;
    document.getElementById("preview").style.display = "none";
    document.getElementById("previewImg").src = "";
}

// ==========================================
// MODAL CONTROLLERS & MESSAGE LISTENERS
// ==========================================

function openUploadModal(target) {
    const modal = document.getElementById("universalUploadModal");
    const iframe = document.getElementById("universalUploadFrame");
    iframe.src = "/upload/?target=" + encodeURIComponent(target);
    modal.style.display = "block";
}

function closeUploadModal() {
    const modal = document.getElementById("universalUploadModal");
    const iframe = document.getElementById("universalUploadFrame");
    modal.style.display = "none";
    iframe.src = "";
}

async function handleUploadedImage(data) {
    if (!data) return;
    const target = data.target || "photo";

    if (data.blob) {
        const file = data.blob instanceof File ? data.blob : new File([data.blob], data.image?.name || "uploaded_image.png", { type: data.blob.type || "image/png" });

        if (target === "photo") {
            uploadedPhoto = file;
            const photoId = "photo_draft_" + Date.now();
            await savePhoto(photoId, file);
            localStorage.setItem("draftPhotoId", photoId);

            if (activePreviewUrl) {
                URL.revokeObjectURL(activePreviewUrl);
            }
            activePreviewUrl = URL.createObjectURL(file);
            document.getElementById("preview").style.display = "block";
            document.getElementById("previewImg").src = activePreviewUrl;
        } else if (target === "symbol") {
            const symbolId = "symbol_" + Date.now();

            await savePhoto(symbolId, file);
            localStorage.setItem("customSymbolId", symbolId);
            localStorage.setItem("selectedSymbol", symbolId);

            if (activeSymbolPreviewUrl) {
                URL.revokeObjectURL(activeSymbolPreviewUrl);
            }
            activeSymbolPreviewUrl = URL.createObjectURL(file);

            document.getElementById("selectedSymbol").value = symbolId;
            document.getElementById("selectedSymbolPreview").src = activeSymbolPreviewUrl;
            
            const thumb = document.getElementById("customSymbolThumb");
            if (thumb) {
                thumb.src = activeSymbolPreviewUrl;
                thumb.style.display = "block";
            }
            const txt = document.getElementById("customSymbolText");
            if (txt) txt.textContent = "बदलें ✏️";
        }
    } else if (data.token || data.imageUrl || data.url) {
        const urlVal = data.imageUrl || data.url || data.token;
        if (target === "symbol") {
            localStorage.setItem("selectedSymbol", urlVal);
            localStorage.removeItem("customSymbolId");
            document.getElementById("selectedSymbol").value = urlVal;
            document.getElementById("selectedSymbolPreview").src = urlVal;

            const thumb = document.getElementById("customSymbolThumb");
            if(thumb) {
                thumb.src = urlVal;
                thumb.style.display = "block";
            }
            const txt = document.getElementById("customSymbolText");
            if(txt) txt.textContent = "बदलें ✏️";
        }
    }

    closeUploadModal();
}

// Global Message Listener
window.addEventListener("message", function(e) {
    if (!e.data) return;

    if (e.data.type === "uploaded-image") {
        handleUploadedImage(e.data);
    } else if (e.data.type === "selected-symbol") {
        const symbolUrl = e.data.url;
        if (symbolUrl) {
            localStorage.setItem("selectedSymbol", symbolUrl);
            localStorage.removeItem("customSymbolId");

            document.getElementById("selectedSymbol").value = symbolUrl;
            document.getElementById("selectedSymbolPreview").src = symbolUrl;

            const thumb = document.getElementById("customSymbolThumb");
            if (thumb) {
                thumb.src = symbolUrl;
                thumb.style.display = "block";
            }
            const txt = document.getElementById("customSymbolText");
            if (txt) txt.textContent = "बदलें ✏️";

            document.getElementById("symbolLibraryModal").style.display = "none";
            document.getElementById("symbolLibraryFrame").src = "";
        }
    }
});

// ===========================
// ADD / REMOVE DYNAMIC FIELDS
// ===========================

function addField(containerId){
    const row = document.createElement("div");
    row.className = "dynamic-field";
    row.innerHTML = `
        <span class="drag-handle">☰</span>
        <input type="text" class="field-label" placeholder="फील्ड का नाम">
        <input type="text" class="field-value" placeholder="विवरण">
        <button type="button" onclick="removeDynamicField(this)">✖</button>
    `;
    document.getElementById(containerId).appendChild(row);
}

function removeDynamicField(btn){
    btn.closest(".dynamic-field").remove();
}

function collectFields(containerId){
    const fields = [];
    document.querySelectorAll(`#${containerId} .dynamic-field`).forEach(row=>{
        const label = row.querySelector(".field-label")?.value.trim();
        const value = row.querySelector(".field-value")?.value.trim();
        if(label || value){
            fields.push({ label, value });
        }
    });
    return fields;
}

function getSectionData(containerId){
    const fields = [];
    document.querySelectorAll(`#${containerId} .form-group`).forEach(item=>{
        const label = item.querySelector("label")?.innerText?.trim();
        const input = item.querySelector("input:not([type='file']), textarea, select");
        if(!label || !input) return;
        fields.push({
            label: label,
            value: input.value
        });
    });
    return fields;
}

// ===========================
// FORM SUBMIT HANDLER
// ===========================

document.getElementById("biodataForm").addEventListener("submit", async function(e){
    e.preventDefault();

    const biodata_id = "bio_" + Date.now();

    const personalInfo = getSectionData("personalInfoContainer");
    personalInfo.push(...collectFields("personalContainer"));

    const familyInfo = getSectionData("familyInfoContainer");
    familyInfo.push(...collectFields("familyContainer"));

    const contactInfo = getSectionData("contactInfoContainer");
    contactInfo.push(...collectFields("contactContainer"));

    const about = document.getElementById("aboutSelect").value === "custom"
        ? document.getElementById("aboutCustom").value
        : document.getElementById("aboutSelect").value;

    const religion = document.getElementById("religion").value === "custom"
        ? document.getElementById("religionCustom").value
        : document.getElementById("religion").value;

    const complexion = document.getElementById("complexion").value === "custom"
        ? document.getElementById("complexionCustom").value
        : document.getElementById("complexion").value;

    const rashi = document.getElementById("rashi").value === "custom"
        ? document.getElementById("rashiCustom").value
        : document.getElementById("rashi").value;

    let finalPhotoId = localStorage.getItem("draftPhotoId") || "";

    try{
        if(uploadedPhoto){
            if(!finalPhotoId || finalPhotoId.startsWith("photo_draft_")) {
                const runtimePhotoId = "photo_" + Date.now();
                await updatePhoto(finalPhotoId, runtimePhotoId, uploadedPhoto);
                finalPhotoId = runtimePhotoId;
                localStorage.setItem("draftPhotoId", finalPhotoId);
            }
        }
    }catch(err){
        console.error(err);
    }

    const selectedSymbol = document.getElementById("selectedSymbol").value;

    const biodata = {
        biodata_id,
        photoId: finalPhotoId,
        religiousSymbol: selectedSymbol,
        fullName: document.getElementById("fullName").value,
        about,
        religion,
        complexion,
        rashi,
        sections:{
            basicInfo: getSectionData("basicInfoContainer"),
            personalInfo,
            familyInfo,
            contactInfo,
            educationInfo: getSectionData("educationContainer")
        }
    };

    localStorage.setItem(biodata_id, JSON.stringify(biodata));
    
    const selectedTemplateUrl = document.querySelector('input[name="template"]:checked').value;
    location.href = selectedTemplateUrl + "?biodata_id=" + encodeURIComponent(biodata_id);
});

const AUTOSAVE_KEY = "biodataDraft";

function saveDraft(){
    const data = {};
    document.querySelectorAll("input, textarea, select").forEach(el=>{
        if(el.type === "file" || el.type === "radio") return;
        data[el.id || el.name] = el.value;
    });
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(data));
}

document.addEventListener("input", saveDraft);

// DOM Content Loaded Handler
window.addEventListener("DOMContentLoaded", async ()=>{
    const savedSymbol = localStorage.getItem("selectedSymbol");
    if(savedSymbol){
        if(savedSymbol.startsWith("symbol_")){
            const file = await getPhoto(savedSymbol);
            if(file){
                if(activeSymbolPreviewUrl) URL.revokeObjectURL(activeSymbolPreviewUrl);
                activeSymbolPreviewUrl = URL.createObjectURL(file);

                document.getElementById("selectedSymbol").value = savedSymbol;
                document.getElementById("selectedSymbolPreview").src = activeSymbolPreviewUrl;

                const thumb = document.getElementById("customSymbolThumb");
                if(thumb) {
                    thumb.src = activeSymbolPreviewUrl;
                    thumb.style.display = "block";
                }
                const txt = document.getElementById("customSymbolText");
                if(txt) txt.textContent = "बदलें ✏️";
            }
        }else{
            document.getElementById("selectedSymbol").value = savedSymbol;
            document.getElementById("selectedSymbolPreview").src = savedSymbol;
        }
    }

    await restorePhoto();

    const saved = localStorage.getItem(AUTOSAVE_KEY);
    if(!saved) return;

    const data = JSON.parse(saved);
    document.querySelectorAll("input, textarea, select").forEach(el=>{
        if(el.type==="file") return;
        const key = el.id || el.name;
        if(data[key]!==undefined){
            el.value = data[key];
        }
    });
});

async function clearFormData(){
    if(!confirm("क्या आप निश्चित हैं कि आप सारा डेटा साफ़ करना चाहते हैं?")) return;
    await clearPhoto();
    localStorage.removeItem(AUTOSAVE_KEY);
    localStorage.removeItem("draftPhotoId");
    localStorage.removeItem("selectedSymbol");
    localStorage.removeItem("customSymbolId");
    location.reload();
}

function toggleAboutCustom(){
    const select = document.getElementById("aboutSelect");
    const custom = document.getElementById("aboutCustom");
    custom.style.display = select.value === "custom" ? "block" : "none";
}

function toggleReligionCustom(){
    const select = document.getElementById("religion");
    const custom = document.getElementById("religionCustom");
    custom.style.display = select.value === "custom" ? "block" : "none";
}

function toggleComplexionCustom(){
    const select = document.getElementById("complexion");
    const custom = document.getElementById("complexionCustom");
    custom.style.display = select.value === "custom" ? "block" : "none";
}

function toggleRashiCustom(){
    const select = document.getElementById("rashi");
    const custom = document.getElementById("rashiCustom");
    custom.style.display = select.value === "custom" ? "block" : "none";
}

document.querySelectorAll('input[name="template"]').forEach(radio=>{
    radio.addEventListener("change",function(){
        const url = new URL(location.href);
        url.searchParams.set("template", this.dataset.slug);
        history.replaceState({}, "", url);
    });
});

const currentTemplate = new URLSearchParams(location.search).get("template");
if(currentTemplate){
    const radio = document.querySelector(`input[data-slug="${currentTemplate}"]`);
    if(radio){
        radio.checked = true;
    }
}

const selectedBox = document.getElementById("selectedSymbolBox");
const picker = document.getElementById("symbolPicker");

selectedBox.onclick=()=>{
    picker.style.display = picker.style.display==="none" ? "grid" : "none";
};

document.querySelectorAll(".symbol-item:not(.custom-upload)").forEach(item=>{
    item.addEventListener("click", function(){
        const symbol = this.dataset.symbol;
        if(!symbol) return;

        localStorage.removeItem("customSymbolId");
        document.getElementById("selectedSymbol").value = symbol;
        document.getElementById("selectedSymbolPreview").src = symbol;
        localStorage.setItem("selectedSymbol", symbol);
        picker.style.display = "none";
    });
});

const popup = document.getElementById("customSymbolPopup");

document.getElementById("openCustomPopup").onclick = () => {
    popup.style.display = "flex";
};

document.getElementById("closePopupBtn").onclick = () => {
    popup.style.display = "none";
};

document.getElementById("uploadDirectBtn").onclick = () => {
    popup.style.display = "none";
    picker.style.display = "none";
    openUploadModal("symbol");
};

document.getElementById("uploadLibraryBtn").onclick = () => {
    popup.style.display = "none";
    picker.style.display = "none";
    
    document.getElementById("symbolLibraryModal").style.display = "block";
    document.getElementById("symbolLibraryFrame").src = "/symbol-library/";
};

document.getElementById("closeLibraryModal").onclick = () => {
    document.getElementById("symbolLibraryModal").style.display = "none";
    document.getElementById("symbolLibraryFrame").src = "";
};

function fillExampleBiodata(){
    document.getElementById("fullName").value = "राहुल शर्मा";
    document.getElementById("dob").value = "15-05-1998";
    document.getElementById("timeBirth").value = "08:30 PM";
    document.getElementById("placeBirth").value = "भोपाल, मध्य प्रदेश";
    document.getElementById("aboutSelect").value = "Traditional with Modern Values";
    document.getElementById("height").value = "5 फीट 8 इंच";
    document.getElementById("weight").value = "70 Kg";
    document.getElementById("complexion").value = "Fair";
    document.getElementById("religion").value = "Hindu";
    document.getElementById("caste").value = "ब्राह्मण";
    document.getElementById("gotra").value = "भारद्वाज";
    document.getElementById("rashi").value = "Mesh (Aries)";
    document.getElementById("nakshatra").value = "अश्विनी";
    document.getElementById("manglik").value = "नहीं (No)";
    document.getElementById("education").value = "बी.टेक कंप्यूटर साइंस";
    document.getElementById("occupation").value = "सॉफ्टवेयर इंजीनियर";
    document.getElementById("fatherName").value = "महेश शर्मा";
    document.getElementById("fatherOccupation").value = "व्यवसायी";
    document.getElementById("motherName").value = "सुनीता शर्मा";
    document.getElementById("motherOccupation").value = "गृहणी";
    document.getElementById("siblings").value = "1 भाई";
    document.getElementById("mobile").value = "9876543210";
    document.getElementById("address").value = "भोपाल, मध्य प्रदेश";

    saveDraft();
    alert("उदाहरण डेटा सफलतापूर्वक भर दिया गया है!");
}

/* ==========================================
   HOOKS: DRAGENTER & PASTE AUTO-OPEN WORKFLOW
   ========================================== */

function autoOpenUploadModal() {
    const modal = document.getElementById("universalUploadModal");
    if (modal && modal.style.display !== "block") {
        openUploadModal('photo');
    }
}

function setupDragAndDropAutoOpen() {
    window.addEventListener('dragover', (e) => {
        e.preventDefault();
    });

    window.addEventListener('drop', (e) => {
        e.preventDefault();
    });

    window.addEventListener('dragenter', (e) => {
        e.preventDefault();
        if (e.dataTransfer && e.dataTransfer.types && e.dataTransfer.types.includes('Files')) {
            autoOpenUploadModal();
        }
    });
}

function setupClipboardPasteAutoOpen() {
    window.addEventListener('paste', (e) => {
        const clipboardItems = e.clipboardData || window.clipboardData;
        if (!clipboardItems || !clipboardItems.items) return;

        const hasImage = Array.from(clipboardItems.items).some(item => item.type.startsWith('image/'));
        if (hasImage) {
            autoOpenUploadModal();
        }
    });
}

window.addEventListener('DOMContentLoaded', () => {
    setupDragAndDropAutoOpen();
    setupClipboardPasteAutoOpen();
});