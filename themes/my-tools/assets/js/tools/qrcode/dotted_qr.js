// Default QR instance
    let qrCode = new QRCodeStyling({
      width: 260,
      height: 260,
      type: "svg",
      data: "https://example.com",
      margin: 0,
      dotsOptions: {
        color: "#003a77",   // blue dots
        type: "dots"        // round dots like your sample
      },
      cornersSquareOptions: {
        color: "#003a77",
        type: "extra-rounded"  // गोल outer eye
      },
      cornersDotOptions: {
        color: "#003a77"
      },
      backgroundOptions: {
        color: "#ffffff"    // सफेद background
      }
    });

    const qrCanvas = document.getElementById("qr-canvas");
    const inputText = document.getElementById("qr-text");
    const inputSize = document.getElementById("qr-size");
    const inputColor = document.getElementById("qr-color");
    const btnGenerate = document.getElementById("btn-generate");
    const btnDownload = document.getElementById("btn-download");

    qrCode.append(qrCanvas);

    // Generate / Update QR
    function updateQR() {
      const data = inputText.value.trim() || "https://example.com";
      const size = parseInt(inputSize.value, 10) || 260;
      const color = inputColor.value || "#003a77";

      qrCode.update({
        data,
        width: size,
        height: size,
        dotsOptions: { color, type: "dots" },
        cornersSquareOptions: { color, type: "extra-rounded" },
        cornersDotOptions: { color }
      });
    }

    btnGenerate.addEventListener("click", updateQR);

    // Download PNG
    btnDownload.addEventListener("click", () => {
      qrCode.download({
        name: "dotted-qr-gajabtools",
        extension: "png"
      });
    });

    // First render
    updateQR();