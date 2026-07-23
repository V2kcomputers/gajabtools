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
            // अगर सेक्शन में कुछ नहीं है तो उस सेक्शन को छुपाएं
            container.parentElement.style.display = "none";
            return;
        }

        items.forEach(item => {
            if (item.value && item.value.trim() !== "") {
                const itemDiv = document.createElement("div");
                // अगर टेक्स्ट लंबा है (जैसे पता या विवरण), तो उसे पूरी चौड़ाई (Full-width) दें
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