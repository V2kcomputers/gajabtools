(() => {
    "use strict";

    // Prevent duplicate initialization
    if (window.__GAJAB_FILE_DRAGGER__) return;
    window.__GAJAB_FILE_DRAGGER__ = true;

    const link = document.querySelector("a.file-dragger");
    if (!link || !link.href) return;

    let redirected = false;

    function redirect() {
        if (redirected) return;
        redirected = true;

        if (link.target && link.target.toLowerCase() === "_blank") {
            window.open(link.href, "_blank", "noopener,noreferrer");
        } else {
            window.location.assign(link.href);
        }
    }

    function hasFiles(dataTransfer) {
        if (!dataTransfer || !dataTransfer.types) return false;
        return Array.from(dataTransfer.types).includes("Files");
    }

    // Drag & Drop Detection
    function onDrag(e) {
        if (hasFiles(e.dataTransfer)) {
            redirect();
        }
    }

    // Paste Detection (Ctrl+V)
    function onPaste(e) {
        const clipboard = e.clipboardData;
        if (!clipboard) return;

        if (clipboard.files && clipboard.files.length) {
            redirect();
            return;
        }

        for (const item of (clipboard.items || [])) {
            if (item.kind === "file") {
                redirect();
                return;
            }
        }
    }

    // Ctrl + Alt + O
    function onKeyDown(e) {
        if ((e.ctrlKey || e.metaKey) &&
            e.altKey &&
            e.key.toLowerCase() === "o") {

            e.preventDefault();
            e.stopPropagation();
            redirect();
        }
    }

    document.addEventListener("dragenter", onDrag, true);
    document.addEventListener("dragover", onDrag, true);
    document.addEventListener("paste", onPaste, true);
    document.addEventListener("keydown", onKeyDown, true);

})();