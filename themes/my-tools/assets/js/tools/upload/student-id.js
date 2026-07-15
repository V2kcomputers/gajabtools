  let cardCounter = 0;
let studentsData = [];
let editingStudentId = null;
let currentUploadField = "";
let selectedTemplate = "/school-id-generated/";

const activeObjectURLs = new Set();

// Default hardcoded token fallback system assets path configuration
const defaultSchoolLogo = "/svg/school.svg";
const defaultSignature = "/svg/signature.svg";
const defaultStudentPhoto = "/svg/student-person-3.svg";

// High-fidelity scalable default vector fallback structure mapping components
const defaultSvgMarkups = {
  schoolLogo: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z"/></svg>`,
  principalSignature: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"/></svg>`,
  studentPhoto: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z"/></svg>`
};

/* DOM ELEMENT CACHE OBJECT INDEX FOR PERFORMANCE OPTIMIZATION */
const DOM = {
  schoolName: document.getElementById("schoolName"),
  schoolType: document.getElementById("schoolType"),
  schoolAddress: document.getElementById("schoolAddress"),
  principalName: document.getElementById("principalName"),
  principalMobile: document.getElementById("principalMobile"),
  schoolLogo: document.getElementById("schoolLogo"),
  principalSignature: document.getElementById("principalSignature"),
  studentName: document.getElementById("studentName"),
  fatherName: document.getElementById("fatherName"),
  dob: document.getElementById("dob"),
  className: document.getElementById("className"),
  mobileNumber: document.getElementById("mobileNumber"),
  address: document.getElementById("address"),
  studentPhoto: document.getElementById("studentPhoto"),
  studentTableBody: document.getElementById("studentTableBody"),
  stickyCounter: document.getElementById("stickyCounterDisplay"),
  idCardForm: document.getElementById("idCardForm"),
  uploadModal: document.getElementById("uploadModal"),
  uploadFrame: document.getElementById("uploadFrame"),
  previewModal: document.getElementById("previewCardModal"),
  previewInjectTarget: document.getElementById("popupCardInjectTarget"),
  toastContainer: document.getElementById("toastContainer"),
  btnBulkExportTrigger: document.getElementById("btnBulkExportTrigger")
};

function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast-card ${type === "danger" ? "toast-danger" : ""}`;
  toast.innerHTML = `<span>${type === "danger" ? "⚠️" : "✔"}</span> <span>${message}</span>`;
  DOM.toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-10px)";
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function openImageDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("ImageLibrary", 2);
        request.onsuccess = (e) => resolve(e.target.result);
        request.onerror = (e) => reject(e.target.error);
        request.onupgradeneeded = (e) => {
            const database = e.target.result;
            if (!database.objectStoreNames.contains("images")) {
                const store = database.createObjectStore("images", { keyPath: "id", autoIncrement: true });
                store.createIndex("token", "token", { unique: true });
            }
        };
    });
}

// Global cached image repository mapping object layer
const imageCacheMap = new Map();

async function getImageByToken(token) {
    if (!token) return null;
    if (imageCacheMap.has(token)) return imageCacheMap.get(token);
    try {
        const db = await openImageDB();
        const tx = db.transaction("images", "readonly");
        const store = tx.objectStore("images");
        const index = store.index("token");
        return new Promise(resolve => {
            index.get(token).onsuccess = (e) => {
                const res = e.target.result || null;
                if(res) imageCacheMap.set(token, res);
                resolve(res);
            };
        });
    } catch (err) {
        console.error("IndexedDB Cache Lookup Failure Error:", err);
        return null;
    }
}

async function getObjectURL(token, fallbackPath) {
    if (!token) return fallbackPath;
    const imageRecord = await getImageByToken(token);
    
    // Debug log integrated for active record mapping validation
    console.log("IndexedDB Record", imageRecord);
    
    if (imageRecord && imageRecord.blob) {
        const url = URL.createObjectURL(imageRecord.blob);
        activeObjectURLs.add(url);
        
        // Debug log tracking dynamic instance setup
        console.log("Object URL Created");
        return url;
    }
    return fallbackPath;
}

function revokeUnusedURLs() {
    activeObjectURLs.forEach(url => URL.revokeObjectURL(url));
    activeObjectURLs.clear();
}

async function setPreview(field, token) {
    const hiddenInput = DOM[field] || document.getElementById(field);
    const previewContainer = document.getElementById(field + "Preview");
    if (!hiddenInput || !previewContainer) return;
    
    hiddenInput.value = token || "";
    
    if (token) {
        let fallback = defaultStudentPhoto;
        if (field === "schoolLogo") fallback = defaultSchoolLogo;
        if (field === "principalSignature") fallback = defaultSignature;

        const url = await getObjectURL(token, fallback);
        previewContainer.innerHTML = `<img src="${url}" alt="Realtime Engine Preview Content Frame">`;
    } else {
        previewContainer.innerHTML = defaultSvgMarkups[field] || defaultSvgMarkups['studentPhoto'];
    }
    
    if (field === "schoolLogo" || field === "principalSignature") {
        autoSaveSchoolProfileSilent();
    }
}

function openUploader(field) {
    currentUploadField = field;
    DOM.uploadFrame.src = "/upload/";
    DOM.uploadModal.style.display = "flex";
}

function closeUploader() {
    DOM.uploadModal.style.display = "none";
    DOM.uploadFrame.src = "";
}

window.addEventListener("message", async function(e) {
    if (!e.data || !e.data.token) return;
    if (currentUploadField) {
        await setPreview(currentUploadField, e.data.token);
        showToast("Asset uploaded and linked successfully");
    }
    closeUploader();
});

function updateTemplateState(formatCode, fallbackValue) {
    localStorage.setItem("selected-template", formatCode);
    const radio = document.querySelector(`input[data-format="${formatCode}"]`);
    if (radio) {
        radio.checked = true;
        selectedTemplate = radio.value;
    } else if (fallbackValue) {
        selectedTemplate = fallbackValue;
    }
    const url = new URL(window.location.href);
    url.searchParams.set("format", formatCode);
    history.replaceState({}, '', url.toString());
}

// UNIFIED SYSTEM INITIALIZATION CONTEXT ENGINE
window.addEventListener("DOMContentLoaded", async () => {
    const inputsToTrack = ['schoolName', 'schoolType', 'schoolAddress', 'principalName', 'principalMobile', 'studentName', 'fatherName', 'dob', 'className', 'mobileNumber', 'address'];
    inputsToTrack.forEach(id => {
      const el = DOM[id] || document.getElementById(id);
      if(el) {
        el.addEventListener('blur', () => el.classList.add('touched'));
        el.addEventListener('input', () => { if(el.checkValidity()) el.classList.remove('touched'); });
      }
    });

    const storedProfile = localStorage.getItem("school-profile");
    if (storedProfile) {
        try {
            const profile = JSON.parse(storedProfile);
            DOM.schoolName.value = profile.schoolName || "";
            DOM.schoolType.value = profile.schoolType || "";
            DOM.schoolAddress.value = profile.schoolAddress || "";
            DOM.principalName.value = profile.principalName || "";
            DOM.principalMobile.value = profile.principalMobile || "";
            
            // Normalized key loading system to safeguard old and new naming patterns
            DOM.schoolLogo.value = profile.schoolLogo || profile.logoToken || "";
            DOM.principalSignature.value = profile.principalSignature || profile.signatureToken || "";
        } catch(e) {
            console.error("School configuration restore load error log:", e);
        }
    }

    const params = new URLSearchParams(window.location.search);
    const urlFormat = params.get("format");
    const localFormat = localStorage.getItem("selected-template");

    if (urlFormat && ["simple-degine", "curve-degine", "simple-curve-degine", "vertical-degine"].includes(urlFormat)) {
        updateTemplateState(urlFormat);
    } else if (localFormat && ["simple-degine", "curve-degine", "simple-curve-degine", "fvertical-degine"].includes(localFormat)) {
        updateTemplateState(localFormat);
    } else {
        updateTemplateState("simple-degine", "/school-id-generated/");
    }

    const saved = JSON.parse(localStorage.getItem("school-id-list"));
    if (saved) {
        const hours = (Date.now() - saved.savedAt) / (1000 * 60 * 60);
        if (hours < 24) {
            studentsData = saved.students || [];
        } else {
            localStorage.removeItem("school-id-list");
            studentsData = [];
        }
    } else {
        studentsData = [];
    }

    await setPreview("schoolLogo", DOM.schoolLogo.value);
    await setPreview("principalSignature", DOM.principalSignature.value);
    await setPreview("studentPhoto", DOM.studentPhoto.value);

    if (studentsData.length > 0) {
        let maxIdNum = 0;
        studentsData.forEach(s => {
            const num = parseInt(s.id.replace("card-", ""), 10);
            if (!isNaN(num) && num > maxIdNum) maxIdNum = num;
        });
        cardCounter = maxIdNum + 1;
    }

    updateTable();

    document.querySelectorAll('input[name="template"]').forEach(radio => {
        radio.addEventListener("change", function() {
            if (this.checked) {
                updateTemplateState(this.dataset.format);
                showToast("Template updated successfully");
            }
        });
    });
});

function getSchoolProfileObject() {
    return {
        schoolName: DOM.schoolName.value,
        schoolType: DOM.schoolType.value,
        schoolAddress: DOM.schoolAddress.value,
        principalName: DOM.principalName.value,
        principalMobile: DOM.principalMobile.value,
        // Double field export mapping eliminates all property name mismatches permanently
        schoolLogo: DOM.schoolLogo.value,
        logoToken: DOM.schoolLogo.value,
        principalSignature: DOM.principalSignature.value,
        signatureToken: DOM.principalSignature.value
    };
}

function saveSchoolProfile() {
    const profile = getSchoolProfileObject();
    localStorage.setItem("school-profile", JSON.stringify(profile));
    
    // Debug log mapping current profile structural data
    console.log("School Profile", profile);
    showToast("School Profile saved successfully");
}

function autoSaveSchoolProfileSilent() {
    const profile = getSchoolProfileObject();
    localStorage.setItem("school-profile", JSON.stringify(profile));
}

function syncStudentsToLocalStorage() {
    const data = {
        savedAt: Date.now(),
        students: studentsData
    };
    localStorage.setItem("school-id-list", JSON.stringify(data));
    DOM.stickyCounter.textContent = `Cards Registered: ${studentsData.length} / 100`;
}

async function getThumbnailSrcByToken(token, fallback) {
  if(!token) return fallback;
  const item = await getImageByToken(token);
  if(item && item.blob) {
    return URL.createObjectURL(item.blob);
  }
  return fallback;
}

async function generateCard() {
  if (studentsData.length >= 100 && !editingStudentId) {
      showToast("Maximum registration payload limit reached (100 Allowed)", "danger");
      return;
  }

  const fieldsToValidate = [DOM.studentName, DOM.fatherName, DOM.dob, DOM.className, DOM.mobileNumber, DOM.address];
  let isFormValid = true;
  fieldsToValidate.forEach(el => {
    if(!el.checkValidity()) {
      el.classList.add('touched');
      isFormValid = false;
    }
  });

  if (!isFormValid) {
    showToast("Please fix the validation parameters highlighted in red.", "danger");
    return;
  }

  const studentPhotoUrl = DOM.studentPhoto.value;

  if (editingStudentId) {
      const index = studentsData.findIndex(s => s.id === editingStudentId);
      if (index !== -1) {
          studentsData[index] = {
              id: editingStudentId,
              studentName: DOM.studentName.value,
              fatherName: DOM.fatherName.value,
              dob: DOM.dob.value,
              className: DOM.className.value,
              mobileNumber: DOM.mobileNumber.value,
              address: DOM.address.value,
              studentPhotoUrl: studentPhotoUrl,
              photoToken: studentPhotoUrl // Mirror property mapping added
          };
      }
      editingStudentId = null;
      showToast("Card data update synchronization complete.");
  } else {
      const studentData = {
        id: `card-${cardCounter++}`,
        studentName: DOM.studentName.value,
        fatherName: DOM.fatherName.value,
        dob: DOM.dob.value,
        className: DOM.className.value,
        mobileNumber: DOM.mobileNumber.value,
        address: DOM.address.value,
        studentPhotoUrl: studentPhotoUrl,
        photoToken: studentPhotoUrl // Mirror property mapping added
      };
      studentsData.push(studentData);
      showToast("New card record injected into local registry session context.");
  }

  syncStudentsToLocalStorage();
  updateTable();
  clearForm();
}

async function updateTable() {
  DOM.studentTableBody.innerHTML = '';
  DOM.stickyCounter.textContent = `Cards Registered: ${studentsData.length} / 100`;

  for (const student of studentsData) {
    const row = document.createElement('tr');
    const photoThumb = await getThumbnailSrcByToken(student.studentPhotoUrl, defaultStudentPhoto);
    
    row.innerHTML = `
      <td>
        <div class="table-avatar-cell">
          <img src="${photoThumb}" class="table-thumbnail" alt="Identity Preview">
          <span>${student.studentName}</span>
        </div>
      </td>
      <td>${student.fatherName}</td>
      <td>${student.dob}</td>
      <td><span style="background: #e0f2fe; color: #0369a1; padding: 2px 8px; font-weight:600; border-radius:12px; font-size:12px;">${student.className}</span></td>
      <td>${student.mobileNumber}</td>
      <td><span style="color: var(--text-muted); font-size:13px;">${student.address}</span></td>
      <td>
        <div class="table-actions">
          <button class="btn btn-secondary btn-icon-only" title="Preview Artifact Layout" onclick="previewSingleCard('${student.id}')">👁</button>
          <button class="btn btn-primary btn-icon-only" style="background:#28a745;" title="Edit Context Registry Entry" onclick="editCard('${student.id}')">✏️</button>
          <button class="btn btn-danger btn-icon-only" title="Delete Data Record Map" onclick="deleteCard('${student.id}')">🗑</button>
        </div>
      </td>
    `;
    DOM.studentTableBody.appendChild(row);
  }
}

async function previewSingleCard(cardId) {
    const student = studentsData.find(s => s.id === cardId);
    if (!student) return;

    const profile = getSchoolProfileObject();

    revokeUnusedURLs();
    DOM.previewInjectTarget.innerHTML = "<p style='color:white;text-align:center;'>Loading Embedded Structural Identification Assets...</p>";
    DOM.previewModal.style.display = "flex";

    const logoUrl = await getObjectURL(profile.schoolLogo, defaultSchoolLogo);
    const signUrl = await getObjectURL(profile.principalSignature, defaultSignature);
    const photoUrl = await getObjectURL(student.studentPhotoUrl, defaultStudentPhoto);

    DOM.previewInjectTarget.innerHTML = `
      <div class="id-card">
        <div class="id-card-header">
          <img src="${logoUrl}" alt="School System Official Logo Identification Graph">
          <div>
            <h3 style="margin:0; font-size:16px;">${profile.schoolName || "---"}</h3>
            <p style="margin:2px 0 0 0; font-size:12px;">(${profile.schoolType || "---"})</p>
            <p style="margin:2px 0 0 0; font-size:11px;">${profile.schoolAddress || "---"}</p>
          </div>
        </div>
        <div class="id-card-content">
          <img src="${photoUrl}" alt="Student Realtime Verification Snapshot View" style="width:100px; height:100px; border-radius: 8px; margin-bottom: 10px; object-fit:cover; display:block; background:#f0f0f0;">
          <p><strong>Student's Name:</strong> ${student.studentName}</p>
          <p><strong>Father's Name:</strong> ${student.fatherName}</p>
          <p><strong>Date of Birth:</strong> ${student.dob}</p>
          <p><strong>Class:</strong> ${student.className}</p>
          <p><strong>Mobile Number:</strong> ${student.mobileNumber}</p>
          <p><strong>Address:</strong> ${student.address}</p>
        </div>
        <div class="id-card-footer">
          <p><img src="${signUrl}" alt="Verified System Signature Instance" style="width: 70px; height: 25px; vertical-align: middle; object-fit:contain; margin-right:5px;"> ${profile.principalName || "---"}</p>
          <p style="margin:4px 0 0 0;">Mo. ${profile.principalMobile || "---"}</p>
        </div>
      </div>
    `;
}

function closePreviewModal() {
    DOM.previewModal.style.display = "none";
    DOM.previewInjectTarget.innerHTML = "";
    revokeUnusedURLs();
}

function clearForm() {
  DOM.idCardForm.reset();
  editingStudentId = null;
  const fields = ['studentName', 'fatherName', 'dob', 'className', 'mobileNumber', 'address'];
  fields.forEach(id => { if(DOM[id]) DOM[id].classList.remove('touched'); });
  setPreview("studentPhoto", "");
}

function deleteCard(cardId) {
  if (confirm('Are you sure you want to delete this student record?')) {
    studentsData = studentsData.filter(student => student.id !== cardId);
    syncStudentsToLocalStorage();
    updateTable();
    showToast("Record removed from local database segment mapping", "danger");
  }
}

async function editCard(cardId) {
  const student = studentsData.find(student => student.id === cardId);
  if (student) {
    editingStudentId = cardId;
    
    DOM.studentName.value = student.studentName;
    DOM.fatherName.value = student.fatherName;
    DOM.dob.value = student.dob;
    DOM.className.value = student.className;
    DOM.mobileNumber.value = student.mobileNumber;
    DOM.address.value = student.address;

    await setPreview("studentPhoto", student.studentPhotoUrl || student.photoToken || "");
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast("Loaded entry state data back into editing channels.");
  }
}

function addNewCard() {
  clearForm();
  DOM.studentName.focus();
}

function generateAllCardsPage() {
    if (!DOM.schoolName.value.trim()) {
        showToast("Export Denied: School Name definition missing.", "danger");
        DOM.schoolName.focus();
        DOM.schoolName.classList.add('touched');
        return;
    }
    if (studentsData.length === 0) {
        showToast("Please inject or record at least one student identity before generating.", "danger");
        return;
    }
    if (studentsData.length > 100) {
        showToast("Maximum data limits violated (100 Student identity limits maximum block)", "danger");
        return;
    }

    DOM.btnBulkExportTrigger.classList.add('is-loading');

    autoSaveSchoolProfileSilent();
    syncStudentsToLocalStorage();

    // Export mapping unified across all tokens to guarantee standard processing
    const finalExportPayload = {
        version: 2,
        createdAt: new Date().toISOString(),
        template: selectedTemplate,
        defaults: {
            logo: defaultSchoolLogo,
            signature: defaultSignature,
            student: defaultStudentPhoto
        },
        schoolProfile: {
            schoolName: DOM.schoolName.value,
            schoolType: DOM.schoolType.value,
            schoolAddress: DOM.schoolAddress.value,
            principalName: DOM.principalName.value,
            principalMobile: DOM.principalMobile.value,
            schoolLogo: DOM.schoolLogo.value || null,
            logoToken: DOM.schoolLogo.value || null,
            logoDefault: defaultSchoolLogo,
            principalSignature: DOM.principalSignature.value || null,
            signatureToken: DOM.principalSignature.value || null,
            signatureDefault: defaultSignature
        },
        students: studentsData.map(s => ({
            ...s,
            studentPhotoUrl: s.studentPhotoUrl || null,
            photoToken: s.studentPhotoUrl || null,
            photoDefault: defaultStudentPhoto
        }))
    };

    // Mandatory payload tracking validation log trace logic entry
    console.log("Export Payload", finalExportPayload);

    try {
        const token = crypto.randomUUID();
        localStorage.setItem("school-id-" + token, JSON.stringify(finalExportPayload));
        showToast("Export Ready! Dispatching processing payload token...");
        
        setTimeout(() => {
          DOM.btnBulkExportTrigger.classList.remove('is-loading');
          window.location.href = selectedTemplate + "?id_card=" + token;
        }, 800);
    } catch (err) {
        DOM.btnBulkExportTrigger.classList.remove('is-loading');
        alert(err.message);
    }
}

function clearAllLocalStorage() {
    if (!confirm("⚠️ This will permanently delete ALL local records for this app session.\n\nDo you wish to continue?")) {
        return;
    }
    localStorage.clear();
    showToast("Storage cleared out completely.", "danger");
    setTimeout(() => location.reload(), 500);
}