// ==========================================
    // LANGUAGE TOGGLE FUNCTIONALITY
    // ==========================================
    function changeLanguage() {
        const selectedLang = document.getElementById("languageSelect").value;
        
        const languageContent = {
            hi: {
                title: "|| विवाह बायोडाटा ||",
                basic: "👤 सामान्य जानकारी",
                personal: "📜 व्यक्तिगत विवरण",
                education: "🎓 शिक्षा एवं व्यवसाय",
                family: "👨‍👩‍👧‍👦 पारिवारिक विवरण",
                contact: "📞 संपर्क विवरण"
            },
            en: {
                title: "|| Marriage Biodata ||",
                basic: "👤 Basic Information",
                personal: "📜 Personal Details",
                education: "🎓 Education & Occupation",
                family: "👨‍👩‍👧‍👦 Family Details",
                contact: "📞 Contact Details"
            },
            both: {
                title: "|| विवाह बायोडाटा / Marriage Biodata ||",
                basic: "👤 सामान्य जानकारी / Basic Information",
                personal: "📜 व्यक्तिगत विवरण / Personal Details",
                education: "🎓 शिक्षा एवं व्यवसाय / Education & Occupation",
                family: "👨‍👩‍👧‍👦 पारिवारिक विवरण / Family Details",
                contact: "📞 संपर्क विवरण / Contact Details"
            }
        };

        const content = languageContent[selectedLang] || languageContent.hi;

        document.getElementById("biodataTitle").innerText = content.title;
        document.getElementById("titleBasic").innerText = content.basic;
        document.getElementById("titlePersonal").innerText = content.personal;
        document.getElementById("titleEducation").innerText = content.education;
        document.getElementById("titleFamily").innerText = content.family;
        document.getElementById("titleContact").innerText = content.contact;
    }

    // ==========================================
    // INDEXEDDB फ़ोटो लोड करने का फ़ंक्शन
    // ==========================================
    async function loadPhotoFromDB(photoId) {
        if (!photoId) return;
        try {
            const request = indexedDB.open("BiodataDB", 2);
            request.onsuccess = function (e) {
                const db = e.target.result;
                if (!db.objectStoreNames.contains("photos")) return;
                const tx = db.transaction("photos", "readonly");
                const store = tx.objectStore("photos");
                const getReq = store.get(photoId);

                getReq.onsuccess = function () {
                    if (getReq.result && getReq.result.file) {
                        const imgUrl = URL.createObjectURL(getReq.result.file);
                        const photoEl = document.getElementById("displayPhoto");
                        photoEl.src = imgUrl;
                        photoEl.style.display = "block";
                    }
                };
            };
        } catch (err) {
            console.error("फ़ोटो लोड नहीं हो सकी:", err);
        }
    }

    // ==========================================
    // फ़ील्ड्स को HTML में रेंडर करने का फ़ंक्शन
    // ==========================================
    function renderSection(containerId, items) {
        const container = document.getElementById(containerId);
        container.innerHTML = "";

        if (!items || items.length === 0) {
            container.parentElement.style.display = "none";
            return;
        }

        items.forEach(item => {
            if (item.value && item.value.trim() !== "") {
                const itemDiv = document.createElement("div");
                const isLongText = item.value.length > 35 || item.label.includes("पता") || item.label.includes("शिक्षा");
                itemDiv.className = `info-item ${isLongText ? 'full-width' : ''}`;
                
                itemDiv.innerHTML = `
                    <span class="info-label">${item.label}:</span>
                    <span class="info-value">${item.value}</span>
                `;
                container.appendChild(itemDiv);
            }
        });

        if (container.children.length === 0) {
            container.parentElement.style.display = "none";
        }
    }

    // ==========================================
    // डेटा लोड करने का मुख्य लॉजिक
    // ==========================================
    window.addEventListener("DOMContentLoaded", () => {
        const urlParams = new URLSearchParams(window.location.search);
        const biodataId = urlParams.get("biodata_id");

        if (!biodataId) {
            alert("बायोडाटा डेटा नहीं मिला!");
            return;
        }

        const rawData = localStorage.getItem(biodataId);
        if (!rawData) {
            alert("डेटा लोड करने में त्रुटि हुई!");
            return;
        }

        const data = JSON.parse(rawData);

        // 1. नाम और परिचय
        document.getElementById("displayName").innerText = data.fullName || "बायोडाटा";
        document.getElementById("displayAbout").innerText = data.about || "";

        // 2. धार्मिक प्रतीक
        if (data.religiousSymbol) {
            document.getElementById("displaySymbol").src = data.religiousSymbol;
        }

        // 3. फ़ोटो लोड करें
        if (data.photoId) {
            loadPhotoFromDB(data.photoId);
        }

        // 4. सभी सेक्शन्स का डेटा भरें
        if (data.sections) {
            renderSection("basicInfoGrid", data.sections.basicInfo);
            renderSection("personalInfoGrid", data.sections.personalInfo);
            renderSection("educationInfoGrid", data.sections.educationInfo);
            renderSection("familyInfoGrid", data.sections.familyInfo);
            renderSection("contactInfoGrid", data.sections.contactInfo);
        }
    });

    // ==========================================
    // File Name Utility
    // ==========================================
    function getFileName() {
        const nameEl = document.getElementById("displayName");
        let name = nameEl ? nameEl.innerText.trim() : "";

        if (!name || name === "-") {
            name = "Biodata";
        }

        return name.replace(/[\\/:*?"<>|]/g, "_");
    }

    // ==========================================
    // Core PDF Generator (Respects Dropdown Size Option)
    // ==========================================
    async function createPDFObject() {
        const element = document.querySelector(".biodata-card");
        if (!element) return null;

        const sizeType = document.getElementById("pageSizeSelect").value;

        // Create Canvas from HTML
        const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            backgroundColor: "#ffffff"
        });

        const imgData = canvas.toDataURL("image/jpeg", 1.0);
        const { jsPDF } = window.jspdf;

        if (sizeType === "auto") {
            // Single continuous long page
            const pageWidth = 210; // mm
            const calculatedHeight = (canvas.height * pageWidth) / canvas.width;

            const pdf = new jsPDF({
                orientation: "portrait",
                unit: "mm",
                format: [pageWidth, calculatedHeight]
            });

            pdf.addImage(imgData, "JPEG", 0, 0, pageWidth, calculatedHeight);
            return pdf;

        } else {
            // Fixed page sizes: A4 or Letter with proper multipage overflow
            let pageWidth = 210;
            let pageHeight = 297;

            if (sizeType === "letter") {
                pageWidth = 216;
                pageHeight = 279;
            }

            const pdf = new jsPDF("p", "mm", sizeType === "letter" ? "letter" : "a4");

            const imgWidth = pageWidth;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;

            while (heightLeft > 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }

            return pdf;
        }
    }

    // Download PDF Button Handler
    async function downloadPDF() {
        const pdf = await createPDFObject();
        if (pdf) {
            pdf.save(getFileName() + " Biodata -GajabTools.pdf");
        }
    }

    // Open PDF Blob Button Handler
    async function openPDFBlob() {
        const pdf = await createPDFObject();
        if (pdf) {
            const blob = pdf.output("blob");
            window.open(URL.createObjectURL(blob), "_blank");
        }
    }

    // ==========================================
    // Save JPG Handler
    // ==========================================
    async function saveAsJPG() {
        const card = document.querySelector(".biodata-card");
        if (!card) return;

        const canvas = await html2canvas(card, {
            scale: 3,
            useCORS: true,
            backgroundColor: "#ffffff"
        });

        canvas.toBlob(function (blob) {
            if (!blob) return;
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = getFileName() + " Biodata -GajabTools.jpg";
            a.click();
            URL.revokeObjectURL(a.href);
        }, "image/jpeg", 1.0);
    }
// ==========================================
    // Downlaod Toggles
    // ==========================================
    function toggleDownloadMenu() {

    const menu = document.getElementById("downloadOptions");

    menu.style.display =
        menu.style.display === "block" ? "none" : "block";
}

document.addEventListener("click", function(e){

    const menu = document.querySelector(".download-menu");

    if(!menu.contains(e.target)){
        document.getElementById("downloadOptions").style.display="none";
    }

});