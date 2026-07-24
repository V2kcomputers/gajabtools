/**
 * Global Browser Storage Manager
 * Single lightweight script to monitor and protect Browser Storage (LocalStorage + IndexedDB).
 */
const StorageManager = (() => {
  // Configurable Application Prefixes (Only keys with these prefixes will be cleared)
  const DRAFT_PREFIXES = ['bio_', 'resume_', 'idcard_', 'image_', 'qr_', 'draft_'];

  // Application-specific IndexedDB Database names (Add your DB names here)
  const APP_INDEXED_DBS = ['AppDraftsDB', 'AppPhotosDB'];

  // Threshold Constants
  const WARNING_THRESHOLD = 0.80; // 80%
  const BLOCK_THRESHOLD = 0.98;   // 98%

  // Cached State
  let cachedUsage = {
    percent: 0,
    usedMB: 0,
    totalMB: 0,
    saveAllowed: true
  };

  let bannerElement = null;

  /**
   * Estimates total browser storage usage (LocalStorage + IndexedDB).
   * Falls back gracefully if navigator.storage.estimate is unavailable.
   * @returns {Promise<{percent: number, usedMB: number, totalMB: number, saveAllowed: boolean}>}
   */
  async function getUsage() {
    if (navigator.storage && navigator.storage.estimate) {
      try {
        const { quota, usage } = await navigator.storage.estimate();
        const totalMB = quota ? (quota / (1024 * 1024)).toFixed(2) : 0;
        const usedMB = usage ? (usage / (1024 * 1024)).toFixed(2) : 0;
        const percent = quota ? usage / quota : 0;

        cachedUsage = {
          percent: parseFloat((percent * 100).toFixed(1)),
          usedMB: parseFloat(usedMB),
          totalMB: parseFloat(totalMB),
          saveAllowed: percent < BLOCK_THRESHOLD
        };

        return cachedUsage;
      } catch (err) {
        console.warn('[StorageManager] Could not estimate storage:', err);
      }
    }

    // Fallback if Storage API is unavailable or fails
    cachedUsage = { percent: 0, usedMB: 0, totalMB: 0, saveAllowed: true };
    return cachedUsage;
  }

  /**
   * Clears LocalStorage keys and IndexedDB databases matching application prefixes.
   * @returns {Promise<boolean>}
   */
  async function clearDrafts() {
    // 1. Clear LocalStorage keys matching prefixes
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && DRAFT_PREFIXES.some(prefix => key.startsWith(prefix))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (err) {
      console.error('[StorageManager] Error clearing LocalStorage:', err);
    }

    // 2. Clear application IndexedDB databases
    if (window.indexedDB) {
      const deletePromises = APP_INDEXED_DBS.map(dbName => {
        return new Promise((resolve) => {
          const req = window.indexedDB.deleteDatabase(dbName);
          req.onsuccess = () => resolve(true);
          req.onerror = () => resolve(false);
          req.onblocked = () => resolve(false);
        });
      });
      await Promise.all(deletePromises);
    }

    // 3. Re-check storage status & update UI
    await check();
    return true;
  }

  /**
   * Evaluates current storage and manages visual warnings or block conditions.
   * @returns {Promise<boolean>} Whether draft saving is permitted.
   */
  async function check() {
    const usage = await getUsage();

    // Render/update notification UI based on status
    if (usage.percent >= WARNING_THRESHOLD * 100) {
      renderUI(usage);
    } else {
      removeUI();
    }

    return usage.saveAllowed;
  }

  /**
   * Helper to verify save permission programmatically.
   * Call this prior to executing auto-saves or draft writes.
   * @returns {boolean}
   */
  function canSave() {
    return cachedUsage.saveAllowed;
  }

  /**
   * Inject or update visual status notification banner directly into DOM.
   */
  function renderUI(usage) {
    if (!bannerElement) {
      bannerElement = document.createElement('div');
      bannerElement.id = 'storage-manager-banner';
      bannerElement.setAttribute('role', 'alert');
      
      // Inject inline minimal styling to ensure zero CSS file dependency
      Object.assign(bannerElement.style, {
        position: 'fixed',
        bottom: '16px',
        right: '16px',
        maxWidth: '380px',
        zIndex: '999999',
        padding: '12px 16px',
        borderRadius: '8px',
        fontSize: '13px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        display: 'flex',
        alignItems: 'center',
        justify: 'space-between',
        gap: '12px',
        transition: 'all 0.2s ease-in-out'
      });

      document.body.appendChild(bannerElement);
    }

    const isBlocked = !usage.saveAllowed;

    bannerElement.style.backgroundColor = isBlocked ? '#fef2f2' : '#fffbe2';
    bannerElement.style.color = isBlocked ? '#991b1b' : '#723b13';
    bannerElement.style.border = `1px solid ${isBlocked ? '#fca5a5' : '#fde047'}`;

    const textContent = isBlocked
      ? `<strong>Storage Nearly Full (${usage.percent}%)</strong><br>Saving disabled to prevent loss.`
      : `<strong>Storage Low (${usage.percent}%)</strong><br>Consider cleaning old draft files.`;

    bannerElement.innerHTML = `
      <div>${textContent}</div>
      <button id="storage-manager-clear-btn" style="
        background: ${isBlocked ? '#dc2626' : '#d97706'};
        color: #fff;
        border: none;
        padding: 6px 10px;
        border-radius: 4px;
        font-weight: 600;
        cursor: pointer;
        white-space: nowrap;
        font-size: 12px;
      ">🧹 Clear Drafts</button>
    `;

    // Attach click event dynamically
    document.getElementById('storage-manager-clear-btn')?.addEventListener('click', clearDrafts, { once: true });
  }

  /**
   * Remove visual status element if present.
   */
  function removeUI() {
    if (bannerElement) {
      bannerElement.remove();
      bannerElement = null;
    }
  }

  /**
   * Initialize StorageManager on document readiness.
   */
  function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => check());
    } else {
      check();
    }
  }

  // Public API surface
  return {
    init,
    check,
    canSave,
    clearDrafts,
    getUsage
  };
})();

// Auto-initialize when included in base html
StorageManager.init();