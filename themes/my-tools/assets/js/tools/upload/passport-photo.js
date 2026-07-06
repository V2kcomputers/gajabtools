let db;
        let uploadModal;
        let activeReplacementBlockId = null; 
        let configItems = []; 

        const req = indexedDB.open("ImageLibrary", 2);
        req.onupgradeneeded = (e) => {
            let database = e.target.result;
            if(!database.objectStoreNames.contains("images")) {
                let store = database.createObjectStore("images", { keyPath: "id", autoIncrement: true });
                store.createIndex("token", "token", { unique: true });
            }
        };
        req.onsuccess = (e) => {
            db = e.target.result;
            init();
        };

        function init() {
            uploadModal = new bootstrap.Modal(document.getElementById('uploadModal'));
            document.getElementById('addPhotoBtn').addEventListener('click', () => { activeReplacementBlockId = null; uploadModal.show(); });
            document.getElementById('generateLayoutBtn').addEventListener('click', generateLayout);

            window.addEventListener('message', (e) => { if (e.data && e.data.token) handleSelectedToken(e.data.token); });
            window.addEventListener('pageshow', (e) => { loadFromStorageAndDB(); }); 
            loadFromStorageAndDB();
        }

        // Auto format date fields securely to dd-mm-yyyy format if structured as yyyy-mm-dd
        function formatDisplayDate(dateString) {
            if (!dateString) return '';
            const cleanStr = dateString.trim();
            if (/^\d{4}-\d{2}-\d{2}$/.test(cleanStr)) {
                const parts = cleanStr.split('-');
                return `${parts[2]}-${parts[1]}-${parts[0]}`;
            }
            return cleanStr;
        }

        function loadFromStorageAndDB() {
            const stored = sessionStorage.getItem('passport_config_items');
            if (stored) {
                configItems = JSON.parse(stored);
                const tx = db.transaction("images", "readonly");
                const store = tx.objectStore("images");
                let loadedCount = 0;
                if(configItems.length === 0) { renderBlocks(); return; }
                
                configItems.forEach((item, index) => {
                    const idx = store.index("token");
                    const query = idx.get(item.token);
                    query.onsuccess = () => {
                        const res = query.result;
                        if(res) {
                            const activeBlob = res.editedBlob ? res.editedBlob : res.blob;
                            if(activeBlob) {
                                item.blobUrl = URL.createObjectURL(activeBlob);
                            }
                        }
                        // Normalize the date stored inside state configurations to match input demands
                        item.date = formatDisplayDate(item.date);
                        loadedCount++;
                        if(loadedCount === configItems.length) { 
                            renderBlocks(); 
                            restoreInterfaceContext();
                        }
                    };
                });
            } else {
                renderBlocks();
            }
        }

        function saveConfigState() {
            sessionStorage.setItem('passport_config_items', JSON.stringify(configItems));
        }

        function handleSelectedToken(token) {
            const tx = db.transaction("images", "readwrite");
            const store = tx.objectStore("images");
            const idx = store.index("token");
            const query = idx.get(token);

            query.onsuccess = () => {
                const item = query.result;
                if (!item) return;
                
                if(!item.originalBlob) {
                    item.originalBlob = item.blob;
                    store.put(item);
                }

                const displayBlob = item.editedBlob ? item.editedBlob : item.blob;
                const blobUrl = URL.createObjectURL(displayBlob);

                if (activeReplacementBlockId !== null) {
                    const target = configItems.find(x => x.id === activeReplacementBlockId);
                    if (target) { target.blobUrl = blobUrl; target.token = token; }
                    activeReplacementBlockId = null;
                } else {
                    configItems.push({
                        id: Date.now() + Math.floor(Math.random() * 1000),
                        token: token,
                        blobUrl: blobUrl,
                        name: item.name.split('.')[0] || "Passport Photo",
                        date: formatDisplayDate(new Date().toISOString().split('T')[0]),
                        copies: 6
                    });
                }
                uploadModal.hide();
                saveConfigState();
                renderBlocks();
            };
        }

        function renderBlocks() {
            const container = document.getElementById('photoBlocksContainer');
            const emptyState = document.getElementById('emptyState');
            container.querySelectorAll('.photo-block-item').forEach(el => el.remove());

            if (configItems.length === 0) emptyState.classList.remove('d-none');
            else emptyState.classList.add('d-none');

            configItems.forEach(item => {
                const block = document.createElement('div');
                block.className = 'photo-block-item p-3 mb-3 border bg-white';
                block.id = `photo-block-${item.id}`;
                block.innerHTML = `
                    <div class="row align-items-center g-3">
                        <div class="col-md-auto text-center">
                            <img src="${item.blobUrl}" class="preview-thumbnail mb-2" title="Click to Edit Image" onclick="navigateToEditor(${item.id}, '${item.token}', 'edit')">
                            <div class="d-flex gap-1 justify-content-center">
                                <button class="btn btn-sm btn-outline-secondary py-1 px-2" onclick="replacePhoto(${item.id})"><span class="material-icons align-middle fs-6">sync</span> Replace</button>
                                <button class="btn btn-sm btn-outline-success py-1 px-2" onclick="navigateToEditor(${item.id}, '${item.token}', 'crop')"><span class="material-icons align-middle fs-6">crop</span> Crop</button>
                                <button class="btn btn-sm btn-outline-warning text-dark btn-edit-custom py-1 px-2" title="Click to Edit Image" onclick="navigateToEditor(${item.id}, '${item.token}', 'edit')"><span class="material-icons align-middle fs-6">edit</span> Edit</button>
                            </div>
                        </div>
                        <div class="col-md">
                            <div class="row g-2">
                                <div class="col-sm-6">
                                    <label class="form-label small fw-bold text-muted text-uppercase">Full Name</label>
                                    <input type="text" class="form-control" value="${item.name}" oninput="updateItemData(${item.id}, 'name', this.value)">
                                </div>
                                <div class="col-sm-6">
                                    <label class="form-label small fw-bold text-muted text-uppercase">Date</label>
                                    <input type="text" class="form-control" id="date-input-${item.id}" value="${item.date}" oninput="handleDateInput(${item.id}, this)">
                                </div>
                                <div class="col-12 mt-3">
                                    <label class="form-label small fw-bold text-muted text-uppercase me-3">Number of Copies</label>
                                    <div class="d-flex flex-wrap gap-1 align-items-center">
                                        ${[1, 2, 3, 4, 6, 8, 12, 16, 20].map(c => `<button class="btn btn-sm ${item.copies == c ? 'btn-primary' : 'btn-outline-primary'} preset-btn px-2 py-1" onclick="setCopies(${item.id}, ${c})">${c}</button>`).join('')}
                                        <input type="number" class="form-control form-control-sm ms-2" style="width: 70px;" min="1" value="${item.copies}" oninput="setCopiesCustom(${item.id}, this.value)">
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-auto text-end d-flex flex-md-column gap-2 justify-content-center">
                            <button class="btn btn-outline-info d-flex align-items-center gap-1 justify-content-center py-2 px-3" onclick="duplicateBlock(${item.id})"><span class="material-icons fs-5">content_copy</span> Duplicate</button>
                            <button class="btn btn-outline-danger d-flex align-items-center gap-1 justify-content-center py-2 px-3" onclick="deleteBlock(${item.id})"><span class="material-icons fs-5">delete</span> Delete</button>
                        </div>
                    </div>`;
                container.appendChild(block);
            });
            renderLivePreview();
        }

        window.handleDateInput = (id, element) => {
            // Check and clean if the incoming value comes via standard date pickers formatted as yyyy-mm-dd
            const formatted = formatDisplayDate(element.value);
            if (formatted !== element.value) {
                element.value = formatted; 
            }
            updateItemData(id, 'date', formatted);
        };

        window.navigateToEditor = (blockId, token, action) => {
            sessionStorage.setItem('passport_return_page', window.location.href);
            sessionStorage.setItem('passport_return_block', blockId.toString());
            sessionStorage.setItem('passport_scroll_position', window.scrollY.toString());
            window.location.href = `/upload/?action=${action}&token=${encodeURIComponent(token)}`;
        };

        function restoreInterfaceContext() {
            const targetBlockId = sessionStorage.getItem('passport_return_block');
            const scrollPos = sessionStorage.getItem('passport_scroll_position');
            
            if (targetBlockId) {
                const blockEl = document.getElementById(`photo-block-${targetBlockId}`);
                if (blockEl) {
                    blockEl.classList.add('highlight-selected-block');
                }
                sessionStorage.removeItem('passport_return_block');
            }
            if (scrollPos) {
                window.scrollTo(0, parseInt(scrollPos));
                sessionStorage.removeItem('passport_scroll_position');
            }
        }

        window.replacePhoto = (id) => { activeReplacementBlockId = id; uploadModal.show(); };
        window.updateItemData = (id, field, value) => { const item = configItems.find(x => x.id === id); if (item) { item[field] = value; saveConfigState(); renderLivePreview(); } };
        window.setCopies = (id, count) => { const item = configItems.find(x => x.id === id); if (item) { item.copies = parseInt(count) || 1; saveConfigState(); renderBlocks(); } };
        window.setCopiesCustom = (id, count) => { const item = configItems.find(x => x.id === id); if (item) { item.copies = parseInt(count) || 1; saveConfigState(); renderLivePreview(); } };
        window.duplicateBlock = (id) => { const match = configItems.find(x => x.id === id); if (match) { configItems.push({ ...match, id: Date.now() + Math.floor(Math.random() * 1000), name: match.name + " (Copy)" }); saveConfigState(); renderBlocks(); } };
        window.deleteBlock = (id) => { configItems = configItems.filter(x => x.id !== id); saveConfigState(); renderBlocks(); };

        function renderLivePreview() {
            const grid = document.getElementById('liveGridPreview');
            grid.innerHTML = '';
            
            configItems.forEach(item => {
                const total = parseInt(item.copies) || 0;
                const displayName = (item.name || '').trim();
                const displayDate = formatDisplayDate(item.date);

                for (let i = 0; i < total; i++) {
                    const card = document.createElement('div');
                    card.className = 'passport-preview-card';
                    
                    let infoHtml = '';
                    if (displayName || displayDate) {
                        infoHtml = `<div class="passport-preview-info">
                            ${displayName ? `<div class="passport-preview-name">${displayName}</div>` : ''}
                            ${displayDate ? `<div class="passport-preview-date">${displayDate}</div>` : ''}
                        </div>`;
                    }

                    card.innerHTML = `
                        <img src="${item.blobUrl}" class="passport-preview-img" alt="Passport View">
                        ${infoHtml}
                    `;
                    grid.appendChild(card);
                }
            });
        }

        function generateLayout() {
            if (configItems.length === 0) { alert("Please add at least one photo configuration block."); return; }
            const serializedData = configItems.map(item => ({ token: item.token, name: item.name, date: item.date, copies: item.copies }));
            sessionStorage.setItem('passport_print_payload', JSON.stringify(serializedData));
            window.location.href = '/passport-photo-generated/';
        }