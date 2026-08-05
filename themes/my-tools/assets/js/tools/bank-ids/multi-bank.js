// ----------------------------------------------------
    // BANK DATABASE
    // ----------------------------------------------------
    const banks = {
      sbi: {
        id: "sbi",
        name: "STATE BANK OF INDIA",
        logo: "https://upload.wikimedia.org/wikipedia/commons/c/cc/SBI-logo.svg?utm_source=commons.wikimedia.org&utm_campaign=index&utm_content=original",
        ifsc: "SBIN0000001",
        theme: "#0A5AA1"
      },
      pnb: {
        id: "pnb",
        name: "PUNJAB NATIONAL BANK",
        logo: "https://static.vecteezy.com/system/resources/previews/020/336/282/non_2x/punjab-national-bank-pnb-bank-logo-free-free-vector.jpg",
        ifsc: "PUNB0000100",
        theme: "#A20A3C"
      },
      bob: {
        id: "bob",
        name: "BANK OF BARODA",
        logo: "https://images.seeklogo.com/logo-png/19/2/bank-of-baroda-logo-png_seeklogo-195534.png",
        ifsc: "BARB0MUMBAI",
        theme: "#F26522"
      },
      canara: {
        id: "canara",
        name: "CANARA BANK",
        logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR9PtVqFAvg6llErFrHViq87RF4jSwq6hDELYKJrwrUcQ&s",
        ifsc: "CNRB0000001",
        theme: "#0083CA"
      },
      union: {
        id: "union",
        name: "UNION BANK OF INDIA",
        logo: "https://content.jdmagicbox.com/v2/comp/delhi/17/011p66717/catalogue/union-bank-of-india-rajouri-garden-delhi-banks-1vu2xic-250.jpg",
        ifsc: "UBIN0530001",
        theme: "#D32F2F"
      },
      cbi: {
        id: "cbi",
        name: "CENTRAL BANK OF INDIA",
        logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRAwUz1GSlXwFTBlg_MH5wzDcr1hP-oLuSW3-4AnSKbSQ&s",
        ifsc: "CBIN0280001",
        theme: "#00529B"
      },
      indian: {
        id: "indian",
        name: "INDIAN BANK",
        logo: "https://companieslogo.com/img/orig/INDIANB.NS-a686632c.png?t=1746790300",
        ifsc: "IDIB000M001",
        theme: "#003366"
      },
      iob: {
        id: "iob",
        name: "INDIAN OVERSEAS BANK",
        logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ76nFvUXm-UmR1k27NhkKE50W1I_I5MEooChZEuYe8UA&s=10",
        ifsc: "IOBA0000001",
        theme: "#004B87"
      },
      boi: {
        id: "boi",
        name: "BANK OF INDIA",
        logo: "https://companieslogo.com/img/orig/BANKINDIA.NS-e3d88e01.png?t=1720244490",
        ifsc: "BKID0000001",
        theme: "#E31837"
      },
      uco: {
        id: "uco",
        name: "UCO BANK",
        logo: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhySQIz1PgG6D21JJHDgdw2u4HYCmjIdqySri_y41rP_HpnmXikLmmiQ8DNXX1Y0Vfui3qopelJ-rLFw4VtUiTCPlyGvOIt347ZqE1HjVic4Nz6CLK9AFZRk3PaUa_AAcaxMer18UtZdmKjekcoexx8r3FRFwRlqmAS96-fFRVi76POFnb_xRhfkTrIsQ/s1600/UCO%20BANK.png",
        ifsc: "UCBA0003148",
        theme: "#003A8C"
      },
      psb: {
        id: "psb",
        name: "PUNJAB & SIND BANK",
        logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRUjC7-nJAjDbFB0k0YsjwWnfysisj0cd6joMms_wqwCw&s=10",
        ifsc: "PSIB0000001",
        theme: "#FF9933"
      },
      idbi: {
        id: "idbi",
        name: "IDBI BANK",
        logo: "https://1000logos.net/wp-content/uploads/2021/05/IDBI-Bank-emblem.png",
        ifsc: "IBKL0000001",
        theme: "#006837"
      },
      axis: {
        id: "axis",
        name: "AXIS BANK",
        logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQsnxY-BPaZiF1N3HX8kGskj0olgG2KGTHYys8lifGvrQ&s=10",
        ifsc: "UTIB0000001",
        theme: "#97123A"
      },
      icici: {
        id: "icici",
        name: "ICICI BANK",
        logo: "https://companieslogo.com/img/orig/IBN-af38b5c0.png?t=1720244492",
        ifsc: "ICIC0000001",
        theme: "#B22222"
      },
      hdfc: {
        id: "hdfc",
        name: "HDFC BANK",
        logo: "https://companieslogo.com/img/orig/HDB-bb6241fe.png?t=1720244492",
        ifsc: "HDFC0000001",
        theme: "#004C8F"
      },
      kotak: {
        id: "kotak",
        name: "KOTAK MAHINDRA BANK",
        logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT-f8SrpZZsJ6w8UH44cfmAqFa3Z8sd_2DR7Elhn-alVw&s=10",
        ifsc: "KKBK0000001",
        theme: "#ED1C24"
      },
      yes: {
        id: "yes",
        name: "YES BANK",
        logo: "https://companieslogo.com/img/orig/YESBANK.NS-a31ff15a.png?t=1720244494",
        ifsc: "YESB0000001",
        theme: "#005A9C"
      },
      au: {
        id: "au",
        name: "AU SMALL FINANCE BANK",
        logo: "https://storage.googleapis.com/assets.cdp.blinkx.in/Blinkx_Website/icons/au-small-finance-bank-ltd.png",
        ifsc: "AUBL0000001",
        theme: "#6F2C91"
      },
      custom: {
        id: "custom",
        name: "CUSTOM BANK",
        logo: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhySQIz1PgG6D21JJHDgdw2u4HYCmjIdqySri_y41rP_HpnmXikLmmiQ8DNXX1Y0Vfui3qopelJ-rLFw4VtUiTCPlyGvOIt347ZqE1HjVic4Nz6CLK9AFZRk3PaUa_AAcaxMer18UtZdmKjekcoexx8r3FRFwRlqmAS96-fFRVi76POFnb_xRhfkTrIsQ/s1600/UCO%20BANK.png",
        ifsc: "CUSTOM00001",
        theme: "#003A8C"
      }
    };

    let customLogoDataUrl = null;

    window.addEventListener('DOMContentLoaded', () => {
      readQuery();
    });

    function toggleBankControls() {
      const content = document.getElementById('bankControlsContent');
      const icon = document.getElementById('accordionIcon');
      if (content.style.display === "block") {
        content.style.display = "none";
        icon.className = "fa fa-chevron-down";
      } else {
        content.style.display = "block";
        icon.className = "fa fa-chevron-up";
      }
    }

    function onBankChange() {
      const selectedId = document.getElementById('bankSelect').value;
      const customSection = document.getElementById('customBankSection');
      
      if (selectedId === 'custom') {
        customSection.style.display = 'block';
        applyCustomBank();
      } else {
        customSection.style.display = 'none';
        loadBank(selectedId);
      }
      updateQuery();
    }

    function loadBank(bankId, customIfscOverride = null) {
      const bank = banks[bankId] || banks['uco'];
      
      document.getElementById('ifsc').value = customIfscOverride || bank.ifsc;
      document.getElementById('previewBankName').innerText = bank.name;
      
      const logoSrc = customLogoDataUrl || bank.logo;
      updateLogo(logoSrc);

      // Header is White, Header Text color is set to bank theme color
      updateTheme("#ffffff", bank.theme);
      
      updateHeaderNames(bank.name);
    }

    function applyCustomBank() {
      const name = document.getElementById('customBankName').value.trim() || 'CUSTOM BANK';
      const ifsc = document.getElementById('customIfsc').value.trim() || 'CUSTOM0001';
      
      document.getElementById('ifsc').value = ifsc;
      document.getElementById('previewBankName').innerText = name.toUpperCase();
      
      const logoSrc = customLogoDataUrl || banks.custom.logo;
      updateLogo(logoSrc);
      
      updateHeaderNames(name);
      updateQuery();
    }

    function updateLogo(logoUrl) {
      const mainLogo = document.getElementById('previewLogo');
      const bgLogo = document.getElementById('previewWatermark');
      if (mainLogo) mainLogo.src = logoUrl;
      if (bgLogo) bgLogo.src = logoUrl;
    }

    function updateTheme(headerBg, textColor) {
      document.documentElement.style.setProperty('--header-bg', headerBg);
      document.documentElement.style.setProperty('--header-text-color', textColor);
      document.documentElement.style.setProperty('--theme-color', textColor);
      
      document.getElementById('headerBgPicker').value = headerBg;
      document.getElementById('headerTextColorPicker').value = textColor;
    }

    function updateThemeColors() {
      const bg = document.getElementById('headerBgPicker').value;
      const txt = document.getElementById('headerTextColorPicker').value;
      
      document.documentElement.style.setProperty('--header-bg', bg);
      document.documentElement.style.setProperty('--header-text-color', txt);
      document.documentElement.style.setProperty('--theme-color', txt);
    }

    function updateHeaderNames(bankName) {
      const titleElem = document.getElementById('title');
      const formTitleText = `${bankName} Identity card`;
      titleElem.innerText = formTitleText;
      document.getElementById('headerTitleInput').value = formTitleText;
    }

    function updateHeader() {
      const headerTitle = document.getElementById('headerTitleInput').value;
      const cardTitle = document.getElementById('cardTitleInput').value;
      
      document.getElementById('title').innerText = headerTitle;
      document.getElementById('previewCardTitle').innerText = cardTitle;
    }

    function handleCustomLogoUpload(e) {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
          customLogoDataUrl = event.target.result;
          updateLogo(customLogoDataUrl);
        };
        reader.readAsDataURL(file);
      }
    }

    document.querySelectorAll('#resumeForm input').forEach(input => {
      input.addEventListener('input', () => {
        if (document.getElementById('previewSection').style.display === 'block') {
          updateLiveTable();
        }
      });
    });

    function updateLiveTable() {
      const previewTable = document.getElementById('previewTable');
      previewTable.innerHTML = `
        <tr><td id="Number">Customer ID:</td><th>${document.getElementById('CifNumber').value}</th></tr>
        <tr><td>Account Number:</td><th>${document.getElementById('account').value}</th></tr>
        <tr><td>IFSC Code:</td><th>${document.getElementById('ifsc').value}</th></tr>
        <tr><td>Customer Name:</td><th>${document.getElementById('Customer').value}</th></tr>
        <tr><td>Father/Husband:</td><th>${document.getElementById('Perent').value}</th></tr>
        <tr><td>Address:</td><th rowspan="2">${document.getElementById('Address').value}</th></tr>
        <tr><td><br></td><th></th></tr>
        <tr><td>Pin Code:</td><th>${document.getElementById('Pincode').value}</th></tr>
        <tr><td>Kiosk Name:</td><th>${document.getElementById('KoName').value}</th></tr>
        <tr><td>Kiosk Location:</td><th>${document.getElementById('Location').value}</th></tr>
      `;
    }

    function readQuery() {
      const params = new URLSearchParams(window.location.search);
      const bankParam = params.get('bank');
      const bankNameParam = params.get('bankname');
      const ifscParam = params.get('ifsc');

      if (bankParam) {
        const selector = document.getElementById('bankSelect');
        if (banks[bankParam.toLowerCase()]) {
          selector.value = bankParam.toLowerCase();
          if (bankParam.toLowerCase() === 'custom') {
            document.getElementById('customBankSection').style.display = 'block';
            if (bankNameParam) document.getElementById('customBankName').value = decodeURIComponent(bankNameParam);
            if (ifscParam) document.getElementById('customIfsc').value = decodeURIComponent(ifscParam);
            applyCustomBank();
          } else {
            document.getElementById('customBankSection').style.display = 'none';
            loadBank(bankParam.toLowerCase(), ifscParam);
          }
        } else if (bankParam === 'custom' || bankNameParam) {
          selector.value = 'custom';
          document.getElementById('customBankSection').style.display = 'block';
          if (bankNameParam) document.getElementById('customBankName').value = decodeURIComponent(bankNameParam);
          if (ifscParam) document.getElementById('customIfsc').value = decodeURIComponent(ifscParam);
          applyCustomBank();
        }
      } else {
        loadBank('uco');
      }
    }

    function updateQuery() {
      const bankId = document.getElementById('bankSelect').value;
      const params = new URLSearchParams();

      params.set('bank', bankId);

      if (bankId === 'custom') {
        const cName = document.getElementById('customBankName').value;
        const cIfsc = document.getElementById('customIfsc').value;
        if (cName) params.set('bankname', cName);
        if (cIfsc) params.set('ifsc', cIfsc);
      } else {
        const currentIfsc = document.getElementById('ifsc').value;
        if (currentIfsc && currentIfsc !== banks[bankId].ifsc) {
          params.set('ifsc', currentIfsc);
        }
      }

      const newUrl = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState({}, '', newUrl);
    }

    function generateShareLink() {
      updateQuery();
      const shareableUrl = window.location.href;
      
      navigator.clipboard.writeText(shareableUrl).then(() => {
        alert("Share Link Copied to Clipboard:\n" + shareableUrl);
      }).catch(err => {
        prompt("Copy this URL:", shareableUrl);
      });
    }

    function preview(event) {
      event.preventDefault();

      const formData = {
        CifNumber: document.getElementById('CifNumber').value,
        account: document.getElementById('account').value,
        ifsc: document.getElementById('ifsc').value,
        Customer: document.getElementById('Customer').value,
        Perent: document.getElementById('Perent').value,
        Address: document.getElementById('Address').value,
        Pincode: document.getElementById('Pincode').value,
        KoName: document.getElementById('KoName').value,
        Location: document.getElementById('Location').value,
        photo: document.getElementById('photo').files[0]
      };

      document.getElementById('previewSection').classList.add('active');

      if (formData.photo) {
        const reader = new FileReader();
        reader.onload = function(event) {
          const img = document.getElementById('previewPhoto');
          img.src = event.target.result;
        };
        reader.readAsDataURL(formData.photo);
      }

      updateLiveTable();

      document.getElementById('previewSection').style.display = 'block';
      document.getElementById('resumeForm').style.display = 'none';
    }
    
    function editInfo() {
      document.getElementById('previewSection').style.display = 'none';
      document.getElementById('resumeForm').style.display = 'block';
    }
    
    function formatNumber(input) {
      var cleanInput = input.value.replace(/\D/g, '');
      var formattedInput = cleanInput.replace(/(\d{4})/g, '$1 ').trim();
      input.value = formattedInput;
    }