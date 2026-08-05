 /**
     * OmniQR Studio - Core Application Controller
     */
    class QRStudio {
      constructor() {
        this.config = {
          width: 300,
          height: 300,
          type: "canvas",
          data: "https://example.com",
          image: "",
          dotsOptions: { color: "#0f172a", type: "square" },
          backgroundOptions: { color: "#ffffff" },
          imageOptions: { hideBackgroundDots: true, imageSize: 0.2, margin: 5 },
          cornersSquareOptions: { type: "square", color: "#0f172a" },
          cornersDotOptions: { type: "square", color: "#0f172a" },
          qrOptions: { errorCorrectionLevel: "M" }
        };

        this.qrEngine = new QRCodeStyling(this.config);
        this.history = JSON.parse(localStorage.getItem('omni_qr_history') || '[]');
        
        this.initDOM();
        this.bindEvents();
        this.renderQR();
        this.updateHistoryUI();
      }

      initDOM() {
        this.container = document.getElementById('canvas-container');
        this.container.innerHTML = '';
        this.qrEngine.append(this.container);
      }

      bindEvents() {
        // Tab Switching
        document.querySelectorAll('#content-tabs .tab-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            document.querySelectorAll('#content-tabs .tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            const target = btn.dataset.tab;
            document.getElementById(`tab-${target}`).classList.add('active');
            this.computeInputData();
          });
        });

        // Live Inputs Detection
        ['input-text', 'wifi-ssid', 'wifi-pass', 'wifi-type', 'v-fn', 'v-ln', 'v-tel', 'v-email', 'upi-id', 'upi-name', 'upi-amount', 'social-user', 'social-platform']
          .forEach(id => {
            const el = document.getElementById(id);
            if(el) el.addEventListener('input', () => this.computeInputData());
          });

        // Module Style Picker
        this.setupStylePicker('module-styles-grid', (val) => {
          this.config.dotsOptions.type = val;
          this.updateQR();
        });

        // Eye Frame Picker
        this.setupStylePicker('eye-frame-grid', (val) => {
          this.config.cornersSquareOptions.type = val;
          this.updateQR();
        });

        // Eye Center Picker
        this.setupStylePicker('eye-center-grid', (val) => {
          this.config.cornersDotOptions.type = val;
          this.updateQR();
        });

        // Color Mode Switching
        document.getElementById('color-mode').addEventListener('change', (e) => {
          const mode = e.target.value;
          document.getElementById('single-color-box').style.display = mode === 'single' ? 'block' : 'none';
          document.getElementById('gradient-color-box').style.display = mode === 'gradient' ? 'block' : 'none';
          this.applyColors();
        });

        // Color Inputs
        ['fg-color', 'bg-color', 'grad-color-1', 'grad-color-2', 'grad-type'].forEach(id => {
          document.getElementById(id).addEventListener('input', () => this.applyColors());
        });

        // Logo Handler
        document.getElementById('logo-file').addEventListener('change', (e) => {
          const file = e.target.files[0];
          if(file) {
            const reader = new FileReader();
            reader.onload = (evt) => {
              this.config.image = evt.target.result;
              this.updateQR();
            };
            reader.readAsDataURL(file);
          }
        });

        document.getElementById('btn-clear-logo').addEventListener('click', () => {
          this.config.image = "";
          document.getElementById('logo-file').value = "";
          this.updateQR();
        });

        document.getElementById('logo-size').addEventListener('input', (e) => {
          this.config.imageOptions.imageSize = parseFloat(e.target.value);
          this.updateQR();
        });

        document.getElementById('logo-margin').addEventListener('input', (e) => {
          this.config.imageOptions.margin = parseInt(e.target.value);
          this.updateQR();
        });

        // Advanced Params
        document.getElementById('qr-ecl').addEventListener('change', (e) => {
          this.config.qrOptions.errorCorrectionLevel = e.target.value;
          this.updateQR();
          this.assessQuality();
        });

        document.getElementById('qr-margin').addEventListener('input', (e) => {
          this.config.margin = parseInt(e.target.value);
          this.updateQR();
        });

        // Preset Chips
        document.querySelectorAll('.preset-chip').forEach(chip => {
          chip.addEventListener('click', () => this.applyPreset(chip.dataset.preset));
        });

        // Downloads
        document.getElementById('btn-download-png').addEventListener('click', () => this.download('png'));
        document.getElementById('btn-download-svg').addEventListener('click', () => this.download('svg'));

        // Theme Toggle
        document.getElementById('btn-theme').addEventListener('click', () => {
          const current = document.documentElement.getAttribute('data-theme');
          document.documentElement.setAttribute('data-theme', current === 'dark' ? 'light' : 'dark');
        });

        // Fullscreen Modal
        document.getElementById('btn-fullscreen').addEventListener('click', () => {
          const modal = document.getElementById('fs-modal');
          const target = document.getElementById('modal-target');
          target.innerHTML = '';
          const tempEngine = new QRCodeStyling({...this.config, width: 450, height: 450});
          tempEngine.append(target);
          modal.classList.add('active');
        });

        document.getElementById('btn-close-modal').addEventListener('click', () => {
          document.getElementById('fs-modal').classList.remove('active');
        });

        // Batch CSV Processing
        document.getElementById('btn-process-batch').addEventListener('click', () => this.processBatch());
      }

      setupStylePicker(gridId, callback) {
        document.querySelectorAll(`#${gridId} .style-card`).forEach(card => {
          card.addEventListener('click', () => {
            document.querySelectorAll(`#${gridId} .style-card`).forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            callback(card.dataset.value);
          });
        });
      }

      computeInputData() {
        const activeTab = document.querySelector('#content-tabs .tab-btn.active').dataset.tab;
        let finalData = "";

        switch(activeTab) {
          case 'text':
            finalData = document.getElementById('input-text').value || "https://example.com";
            break;
          case 'wifi':
            const ssid = document.getElementById('wifi-ssid').value;
            const pass = document.getElementById('wifi-pass').value;
            const type = document.getElementById('wifi-type').value;
            finalData = `WIFI:S:${ssid};T:${type};P:${pass};;`;
            break;
          case 'vcard':
            const fn = document.getElementById('v-fn').value;
            const ln = document.getElementById('v-ln').value;
            const tel = document.getElementById('v-tel').value;
            const email = document.getElementById('v-email').value;
            finalData = `BEGIN:VCARD\nVERSION:3.0\nN:${ln};${fn}\nTEL:${tel}\nEMAIL:${email}\nEND:VCARD`;
            break;
          case 'upi':
            const id = document.getElementById('upi-id').value;
            const name = document.getElementById('upi-name').value;
            const amt = document.getElementById('upi-amount').value;
            finalData = `upi://pay?pa=${id}&pn=${encodeURIComponent(name)}&am=${amt}&cu=INR`;
            break;
          case 'social':
            const platform = document.getElementById('social-platform').value;
            const user = document.getElementById('social-user').value;
            finalData = `${platform}${user}`;
            break;
          default:
            finalData = this.config.data;
        }

        this.config.data = finalData;
        this.updateQR();
      }

      applyColors() {
        const mode = document.getElementById('color-mode').value;
        const bg = document.getElementById('bg-color').value;
        
        this.config.backgroundOptions.color = bg;

        if (mode === 'single') {
          const fg = document.getElementById('fg-color').value;
          this.config.dotsOptions = { ...this.config.dotsOptions, color: fg, gradient: null };
          this.config.cornersSquareOptions = { ...this.config.cornersSquareOptions, color: fg };
          this.config.cornersDotOptions = { ...this.config.cornersDotOptions, color: fg };
        } else {
          const c1 = document.getElementById('grad-color-1').value;
          const c2 = document.getElementById('grad-color-2').value;
          const gType = document.getElementById('grad-type').value;

          const gradientSpec = {
            type: gType,
            rotation: 0,
            colorStops: [{ offset: 0, color: c1 }, { offset: 1, color: c2 }]
          };

          this.config.dotsOptions.gradient = gradientSpec;
          delete this.config.dotsOptions.color;
        }

        this.updateQR();
      }

      applyPreset(name) {
        if(name === 'classic') {
          this.config.dotsOptions = { color: "#000000", type: "square" };
          this.config.backgroundOptions.color = "#ffffff";
        } else if(name === 'modern-purple') {
          this.config.dotsOptions = { color: "#8b5cf6", type: "rounded" };
          this.config.cornersSquareOptions = { type: "extra-rounded", color: "#6366f1" };
          this.config.backgroundOptions.color = "#ffffff";
        } else if(name === 'ocean-gradient') {
          this.config.dotsOptions = {
            type: "classy-rounded",
            gradient: { type: "linear", colorStops: [{offset: 0, color: "#06b6d4"}, {offset: 1, color: "#3b82f6"}]}
          };
          this.config.backgroundOptions.color = "#f8fafc";
        } else if(name === 'luxury-gold') {
          this.config.dotsOptions = { color: "#d97706", type: "classy" };
          this.config.backgroundOptions.color = "#0f172a";
        } else if(name === 'emerald-dots') {
          this.config.dotsOptions = { color: "#10b981", type: "dots" };
          this.config.cornersSquareOptions = { type: "dot", color: "#059669" };
        }
        this.updateQR();
      }

      updateQR() {
        this.qrEngine.update(this.config);
        this.assessQuality();
        this.saveToHistoryDebounced();
      }

      renderQR() {
        this.qrEngine.update(this.config);
      }

      assessQuality() {
        // Quick scanning reliability calculation algorithm
        let score = 100;
        if(this.config.image) score -= 15;
        if(this.config.data.length > 150) score -= 20;
        if(this.config.qrOptions.errorCorrectionLevel === 'L' && this.config.image) score -= 30;

        const meter = document.getElementById('quality-fill');
        const val = document.getElementById('quality-val');

        score = Math.max(20, Math.min(100, score));
        meter.style.width = `${score}%`;

        if(score > 80) {
          meter.style.background = '#10b981';
          val.innerText = `High (${score}%)`;
        } else if(score > 50) {
          meter.style.background = '#f59e0b';
          val.innerText = `Medium (${score}%)`;
        } else {
          meter.style.background = '#ef4444';
          val.innerText = `Low Scan Risk (${score}%)`;
        }
      }

      download(extension) {
        this.qrEngine.download({ name: "omni-qr-code", extension: extension });
      }

      saveToHistoryDebounced() {
        clearTimeout(this.historyTimer);
        this.historyTimer = setTimeout(() => {
          if(!this.config.data) return;
          
          this.qrEngine.getRawData('png').then(blob => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64 = reader.result;
              this.history.unshift({ data: this.config.data, img: base64 });
              this.history = this.history.slice(0, 6);
              localStorage.setItem('omni_qr_history', JSON.stringify(this.history));
              this.updateHistoryUI();
            };
            reader.readAsDataURL(blob);
          });
        }, 1200);
      }

      updateHistoryUI() {
        const container = document.getElementById('history-container');
        container.innerHTML = '';
        this.history.forEach(item => {
          const div = document.createElement('div');
          div.className = 'history-item';
          div.innerHTML = `<img src="${item.img}" /><div style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${item.data}</div>`;
          div.addEventListener('click', () => {
            document.getElementById('input-text').value = item.data;
            this.config.data = item.data;
            this.updateQR();
          });
          container.appendChild(div);
        });
      }

      processBatch() {
        const fileInput = document.getElementById('batch-file');
        if(!fileInput.files.length) return alert('Please attach a CSV file first.');

        const file = fileInput.files[0];
        const reader = new FileReader();

        reader.onload = async (e) => {
          const lines = e.target.result.split('\n').map(l => l.trim()).filter(l => l);
          const zip = new JSZip();

          for(let i = 0; i < lines.length; i++) {
            const dataStr = lines[i];
            const tempEngine = new QRCodeStyling({ ...this.config, data: dataStr });
            const blob = await tempEngine.getRawData('png');
            zip.file(`qr_code_${i+1}.png`, blob);
          }

          zip.generateAsync({ type: "blob" }).then(content => {
            saveAs(content, "omni_qr_batch.zip");
          });
        };

        reader.readAsText(file);
      }
    }

    // Initialize App Core
    window.addEventListener('DOMContentLoaded', () => {
      window.app = new QRStudio();
    });