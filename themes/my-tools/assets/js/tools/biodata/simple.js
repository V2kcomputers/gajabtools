let currentPageSize = 'auto';
let currentMarginSetting = 'normal';
let activePreviewUrl = null;
let data = null;

function toggleDownloadMenu(){
    document.getElementById("downloadOptions").classList.toggle("show");
}

window.onclick = function(e) {
    if (!e.target.matches('.download-menu button')) {
        document.getElementById("downloadOptions").classList.remove('show');
    }
}

// Database Engine Modules
async function openDB(){
    return new Promise((resolve,reject)=>{
        try {
            const request = indexedDB.open("BiodataDB", 2);
            request.onupgradeneeded = (e)=>{
                const db = e.target.result;
                if(!db.objectStoreNames.contains("photos")){
                    db.createObjectStore("photos", { keyPath:"id" });
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        } catch(err) { reject(err); }
    });
}

async function getPhoto(photoId){
    if(!photoId) return null;
    const db = await openDB();
    return new Promise((resolve,reject)=>{
        const tx = db.transaction("photos","readonly");
        const request = tx.objectStore("photos").get(photoId);
        request.onsuccess = () => resolve(request.result?.file);
        request.onerror = () => reject(request.error);
    });
}

// Original Hydration Flow
try {
    const token = new URLSearchParams(location.search).get("biodata_id");
    if(!token) throw new Error();
    const rawData = localStorage.getItem(token);
    if(!rawData) throw new Error();
    data = JSON.parse(rawData);
} catch {
    data = {
        fullName: "Rahul S. Sharma",
        about: "Simple and Family Oriented Person",
        religiousSymbol: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='50' height='50'><text y='35' font-size='35' fill='%23b38a24'>🕉</text></svg>",
        sections: {
            basicInfo: [{label:"Date of Birth", value:"15 August 1994"}, {label:"Birth Time", value:"10:20 AM"}],
            personalInfo: [{label:"Height", value:"5ft 10in"}, {label:"Complexion", value:"Fair"}],
            familyInfo: [{label:"Father's Name", value:"Suresh Sharma"}, {label:"Mother's Name", value:"Alka Sharma"}],
            contactInfo: [{label:"Mobile", value:"+91 9876543210"}, {label:"Address", value:"Mumbai, India"}]
        }
    };
}

function renderSection(containerId, fields){
    const container = document.getElementById(containerId);
    if(!container || !fields) return;
    container.innerHTML = "";
    fields.forEach(field=>{
        const label = document.createElement("div");
        label.className = "label";
        label.textContent = field.label;
        const value = document.createElement("div");
        value.className = "value";
        value.textContent = field.value;
        container.append(label, value);
    });
}

async function waitForImages() {
    const images = document.querySelectorAll("img");
    await Promise.all(Array.from(images).map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(res => { img.onload = res; img.onerror = res; });
    }));
}

// Fixed Calculations Height Metric Engines
async function buildDocumentPages() {
    await waitForImages();
    const container = document.getElementById('documentContainer');
    container.innerHTML = ""; 

    const hero = document.getElementById('heroBlueprint');
    const secBasic = document.getElementById('secBasic');
    const secFamily = document.getElementById('secFamily');
    const secContact = document.getElementById('secContact');

    // AUTO HEIGHT ENGINE FLOW
    if (currentPageSize === 'auto') {
        const pageNode = document.createElement('div');
        pageNode.className = 'document-page size-auto';
        
        const wrapper = document.createElement('div');
        wrapper.className = "page-content-wrapper";
        
        wrapper.appendChild(hero.cloneNode(true));
        wrapper.appendChild(secBasic.cloneNode(true));
        wrapper.appendChild(secFamily.cloneNode(true));
        wrapper.appendChild(secContact.cloneNode(true));
        
        pageNode.appendChild(wrapper);
        container.appendChild(pageNode);
        
        applyScaleResponsive();
        return;
    }

    // A4 / LETTER MULTI-PAGE ENGINE FLOW
    const isA4 = currentPageSize === 'a4';
    const totalHeightPx = isA4 ? 1122 : 1056;
    
    // Adjust height allocations natively depending on margin settings selected
    let paddingReduction = 150;
    if (currentMarginSetting === 'compact') paddingReduction = 90;
    if (currentMarginSetting === 'wide') paddingReduction = 210;

    const maxContentHeight = totalHeightPx - paddingReduction;

    let pagesData = [];
    let currentStack = [];
    let currentHeight = 0;

    function pushToPage(element) {
        const height = element.getBoundingClientRect().height;
        if (currentHeight + height > maxContentHeight && currentStack.length > 0) {
            pagesData.push(currentStack);
            currentStack = [];
            currentHeight = 0;
        }
        currentStack.push(element.cloneNode(true));
        currentHeight += height;
    }

    pushToPage(hero);
    pushToPage(secBasic);
    pushToPage(secFamily);
    pushToPage(secContact);

    if (currentStack.length > 0) {
        pagesData.push(currentStack);
    }

    pagesData.forEach((pageNodes, idx) => {
        const pageNode = document.createElement('div');
        pageNode.className = `document-page size-${currentPageSize}`;
        
        const wrapper = document.createElement('div');
        wrapper.className = "page-content-wrapper";
        
        pageNodes.forEach(node => wrapper.appendChild(node));
        pageNode.appendChild(wrapper);

        const footer = document.createElement('div');
        footer.className = "page-footer";
        footer.textContent = `Page ${idx + 1} of ${pagesData.length}`;
        pageNode.appendChild(footer);

        container.appendChild(pageNode);
    });

    applyScaleResponsive();
}

function applyScaleResponsive() {
    const pages = document.querySelectorAll('.document-page');
    const vw = window.innerWidth;
    const targetW = (currentPageSize === 'a4' || currentPageSize === 'auto') ? 794 : 816;
    
    pages.forEach(p => {
        p.style.transform = "none";
        p.style.margin = "0 auto 25px auto";
        if(vw < targetW + 40) {
            const scaleFactor = (vw - 20) / targetW;
            p.style.transform = `scale(${scaleFactor})`;
            p.style.marginBottom = `${-(targetW * (1 - scaleFactor)) + 20}px`;
        }
    });
}

function changePageSize(val) {
    currentPageSize = val;
    const bp = document.getElementById('blueprintContainer');
    if(val === 'letter') bp.className = "size-letter";
    else bp.className = "";
    buildDocumentPages();
}

function changeMargins(val) {
    currentMarginSetting = val;
    const root = document.documentElement;
    if(val === 'compact') root.style.setProperty('--page-internal-padding', '12mm');
    else if(val === 'wide') root.style.setProperty('--page-internal-padding', '26mm');
    else root.style.setProperty('--page-internal-padding', '20mm');
    
    buildDocumentPages();
}

// Hydrate elements safely layout execution hooks
if(data){
    if(data.religiousSymbol) document.getElementById("religiousSymbol").src = data.religiousSymbol;
    if(data.fullName) document.getElementById("fullName").textContent = data.fullName;
    if(data.about) document.getElementById("about").textContent = data.about;

    renderSection("basicInfo", data.sections?.basicInfo);
    renderSection("personalInfo", data.sections?.personalInfo);
    renderSection("familyInfo", data.sections?.familyInfo);
    renderSection("contactInfo", data.sections?.contactInfo);

    (async()=>{
        if(data.photoId){
            try{
                const file = await getPhoto(data.photoId);
                if(file){
                    if(activePreviewUrl) URL.revokeObjectURL(activePreviewUrl);
                    activePreviewUrl = URL.createObjectURL(file);
                    document.getElementById("photo").src = activePreviewUrl;
                    buildDocumentPages();
                }
            }catch(err){ console.error(err); }
        }
    })();
}

// Fixed HTML2PDF Native Multi-Page Compiler Engine
function generateCleanPDFWorkerElement() {
    const pages = document.querySelectorAll('.document-page');
    const workerWrapper = document.createElement('div');
    workerWrapper.style.background = "#ffffff";
    
    pages.forEach((p) => {
        const pageClone = p.cloneNode(true);
        pageClone.style.transform = "none";
        pageClone.style.margin = "0px";
        pageClone.style.boxShadow = "none";
        pageClone.style.display = "block";
        pageClone.style.position = "relative";
        workerWrapper.appendChild(pageClone);
    });
    return workerWrapper;
}

function getPDFOptions() {
    if (currentPageSize === 'auto') {
        const pageEl = document.querySelector('.document-page');
        const pxWidth = pageEl ? pageEl.offsetWidth : 794;
        const pxHeight = pageEl ? pageEl.offsetHeight : 1122;
        const mmWidth = 210;
        const mmHeight = (pxHeight / pxWidth) * mmWidth;

        return {
            margin: [0, 0, 0, 0],
            filename: `${(data.fullName || "biodata").replace(/\s+/g, "-")}.pdf`,
            image: { type: "jpeg", quality: 1.0 },
            html2canvas: { scale: 2, useCORS: true, letterRendering: true },
            jsPDF: { unit: "mm", format: [mmWidth, mmHeight], orientation: "portrait" }
        };
    }

    return {
        margin: [0, 0, 0, 0],
        filename: `${(data.fullName || "biodata").replace(/\s+/g, "-")}.pdf`,
        image: { type: "jpeg", quality: 1.0 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: "mm", format: currentPageSize === 'a4' ? 'a4' : 'letter', orientation: "portrait" }
    };
}

// Stabilized Downloader Pipeline Functions
async function downloadPDF() {
    const btn = document.getElementById("pdfBtn");
    btn.innerHTML = "Processing...";
    try {
        const element = generateCleanPDFWorkerElement();
        const opt = getPDFOptions();
        await html2pdf().set(opt).from(element).save();
    } catch(err) {
        console.error("PDF generation failed:", err);
    } finally {
        btn.innerHTML = "📄 PDF Biodata";
    }
}

async function savePDF() {
    try {
        const element = generateCleanPDFWorkerElement();
        const opt = getPDFOptions();
        html2pdf().set(opt).from(element).output('blob').then(function(blob) {
            const blobUrl = URL.createObjectURL(blob);
            window.open(blobUrl, "_blank");
        });
    } catch(err) {
        console.error(err);
    }
}

async function sharePDF() {
    try {
        const element = generateCleanPDFWorkerElement();
        const opt = getPDFOptions();
        html2pdf().set(opt).from(element).output('blob').then(async function(blob) {
            const file = new File([blob], (data.fullName || "biodata") + ".pdf", { type: "application/pdf" });
            if(navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({ title: "Biodata", text: "My Biodata Document", files: [file] });
            } else {
                window.open(URL.createObjectURL(blob), "_blank");
            }
        });
    } catch(err) {
        console.error(err);
    }
}

async function saveImage(){
    const btn = document.getElementById("imgBtn");
    btn.innerHTML = "Processing...";
    const pages = document.querySelectorAll('.document-page');

    try {
        if (currentPageSize === 'auto') {
            const p = pages[0];
            const origTransform = p.style.transform;
            const origMargin = p.style.margin;
            p.style.transform = "none";
            p.style.margin = "0";

            const canvas = await html2canvas(p, { scale: 2, useCORS: true });

            p.style.transform = origTransform;
            p.style.margin = origMargin;

            const link = document.createElement("a");
            link.href = canvas.toDataURL("image/jpeg", 1.0);
            link.download = `${(data.fullName || "biodata").replace(/\s+/g, "-")}.jpg`;
            link.click();
        } else {
            const zip = new JSZip();
            for(let i=0; i<pages.length; i++) {
                const p = pages[i];
                const origTransform = p.style.transform;
                const origMargin = p.style.margin;
                p.style.transform = "none";
                p.style.margin = "0";

                const canvas = await html2canvas(p, { scale: 2, useCORS: true });
                
                p.style.transform = origTransform;
                p.style.margin = origMargin;

                const base64Str = canvas.toDataURL("image/jpeg", 1.0).split(',')[1]; 
                zip.file(`biodata-page-${i+1}.jpg`, base64Str, { base64: true });
            }
            const blobContent = await zip.generateAsync({ type: "blob" });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blobContent);
            link.download = `${(data.fullName || "biodata").replace(/\s+/g, "-")}-biodatas.zip`;
            link.click();
        }
    } finally {
        btn.innerHTML = "🖼️ JPG Biodata";
    }
}

window.onresize = applyScaleResponsive;
window.onload = () => { buildDocumentPages(); };