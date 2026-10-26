/**
 * YouTube Focus Mode — Popup Script (with password protection)
 *
 * Storage keys:
 *   ytfm_enabled   — boolean, whether focus mode is ON
 *   ytfm_pwd_hash  — string, SHA-256 hex hash of the password (empty = no password)
 *
 * Password is hashed with SHA-256 via the Web Crypto API before storage.
 * The plaintext password never leaves the popup's runtime memory.
 */

(function () {
  "use strict";

  /* ------------------------------------------------------------------
   * Constants & DOM refs
   * ------------------------------------------------------------------ */
  const STORAGE_KEY  = "ytfm_enabled";
  const PWD_HASH_KEY = "ytfm_pwd_hash";

  const toggle   = document.getElementById("toggle");
  const statusEl = document.getElementById("status");

  // Password badge
  const pwdBadge     = document.getElementById("pwd-badge");
  const pwdBadgeIcon = document.getElementById("pwd-badge-icon");
  const pwdBadgeText = document.getElementById("pwd-badge-text");

  // Set password section
  const setPwdSection = document.getElementById("set-pwd-section");
  const newPwdInput   = document.getElementById("new-pwd");
  const confirmInput  = document.getElementById("confirm-pwd");
  const btnSetPwd     = document.getElementById("btn-set-pwd");
  const setPwdMsg     = document.getElementById("set-pwd-msg");

  // Manage password section
  const managePwdSection = document.getElementById("manage-pwd-section");
  const btnShowChange    = document.getElementById("btn-show-change");
  const btnShowRemove    = document.getElementById("btn-show-remove");

  // Change password section
  const changePwdSection = document.getElementById("change-pwd-section");
  const changeCurrent    = document.getElementById("change-current");
  const changeNew        = document.getElementById("change-new");
  const changeConfirm    = document.getElementById("change-confirm");
  const btnChangePwd     = document.getElementById("btn-change-pwd");
  const btnCancelChange  = document.getElementById("btn-cancel-change");
  const changePwdMsg     = document.getElementById("change-pwd-msg");

  // Remove password section
  const removePwdSection = document.getElementById("remove-pwd-section");
  const removeCurrent    = document.getElementById("remove-current");
  const btnRemovePwd     = document.getElementById("btn-remove-pwd");
  const btnCancelRemove  = document.getElementById("btn-cancel-remove");
  const removePwdMsg     = document.getElementById("remove-pwd-msg");

  // Unlock modal
  const unlockModal  = document.getElementById("unlock-modal");
  const unlockPwd    = document.getElementById("unlock-pwd");
  const btnUnlock    = document.getElementById("btn-unlock");
  const btnCancelUnlock = document.getElementById("btn-cancel-unlock");
  const unlockMsg    = document.getElementById("unlock-msg");

  /* ------------------------------------------------------------------
   * Utility: SHA-256 hash a string → hex
   * ------------------------------------------------------------------ */
  async function sha256(text) {
    const encoder = new TextEncoder();
    const data    = encoder.encode(text);
    const hashBuf = await crypto.subtle.digest("SHA-256", data);
    const hashArr = Array.from(new Uint8Array(hashBuf));
    return hashArr.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  /* ------------------------------------------------------------------
   * Utility: show a message
   * ------------------------------------------------------------------ */
  function showMsg(el, text, type) {
    el.textContent = text;
    el.className = "msg " + type;
  }

  function clearMsg(el) {
    el.textContent = "";
    el.className = "msg";
  }

  /* ------------------------------------------------------------------
   * UI: Update status badge
   * ------------------------------------------------------------------ */
  function updateStatus(enabled) {
    if (enabled) {
      statusEl.textContent = "Focus Mode is ON — distractions hidden";
      statusEl.className   = "status on";
    } else {
      statusEl.textContent = "Focus Mode is OFF";
      statusEl.className   = "status off";
    }
  }

  /* ------------------------------------------------------------------
   * UI: Update password badge & sections
   * ------------------------------------------------------------------ */
  function updatePasswordUI(hasPassword) {
    if (hasPassword) {
      pwdBadge.className     = "password-badge";
      pwdBadgeIcon.textContent = "🔒";
      pwdBadgeText.textContent = "Password protected";
      setPwdSection.classList.add("hidden");
      managePwdSection.classList.remove("hidden");
    } else {
      pwdBadge.className     = "password-badge none";
      pwdBadgeIcon.textContent = "🔓";
      pwdBadgeText.textContent = "No password set";
      setPwdSection.classList.remove("hidden");
      managePwdSection.classList.add("hidden");
    }
    // Always hide sub-sections on refresh
    changePwdSection.classList.add("hidden");
    removePwdSection.classList.add("hidden");
  }

  /* ------------------------------------------------------------------
   * Stored password hash (cached in memory for this popup session)
   * ------------------------------------------------------------------ */
  let storedHash = "";

  /* ------------------------------------------------------------------
   * Initialise
   * ------------------------------------------------------------------ */
  chrome.storage.local.get(
    { [STORAGE_KEY]: true, [PWD_HASH_KEY]: "" },
    (result) => {
      const enabled = result[STORAGE_KEY];
      storedHash    = result[PWD_HASH_KEY] || "";

      toggle.checked = enabled;
      updateStatus(enabled);
      updatePasswordUI(!!storedHash);
    }
  );

  /* ------------------------------------------------------------------
   * Toggle handler (with password gate)
   * ------------------------------------------------------------------ */
  toggle.addEventListener("change", () => {
    if (!toggle.checked && storedHash) {
      // User is trying to turn OFF and a password is set → block & prompt
      toggle.checked = true; // revert the toggle visually
      showUnlockModal();
    } else {
      // No password or turning ON → apply immediately
      const enabled = toggle.checked;
      chrome.storage.local.set({ [STORAGE_KEY]: enabled });
      updateStatus(enabled);
    }
  });

  /* ------------------------------------------------------------------
   * Unlock modal
   * ------------------------------------------------------------------ */
  function showUnlockModal() {
    unlockPwd.value = "";
    clearMsg(unlockMsg);
    unlockModal.classList.remove("hidden");
    setTimeout(() => unlockPwd.focus(), 50);
  }

  function hideUnlockModal() {
    unlockModal.classList.add("hidden");
    unlockPwd.value = "";
    clearMsg(unlockMsg);
  }

  btnCancelUnlock.addEventListener("click", hideUnlockModal);

  btnUnlock.addEventListener("click", async () => {
    const pwd = unlockPwd.value;
    if (!pwd) {
      showMsg(unlockMsg, "Please enter your password.", "error");
      return;
    }

    const hash = await sha256(pwd);
    if (hash === storedHash) {
      // Correct password — disable focus mode
      toggle.checked = false;
      chrome.storage.local.set({ [STORAGE_KEY]: false });
      updateStatus(false);
      hideUnlockModal();
    } else {
      showMsg(unlockMsg, "Wrong password. Try again.", "error");
      unlockPwd.value = "";
      unlockPwd.focus();
    }
  });

  // Allow Enter key in unlock modal
  unlockPwd.addEventListener("keydown", (e) => {
    if (e.key === "Enter") btnUnlock.click();
  });

  /* ------------------------------------------------------------------
   * Set password (first time)
   * ------------------------------------------------------------------ */
  btnSetPwd.addEventListener("click", async () => {
    const pwd     = newPwdInput.value;
    const confirm = confirmInput.value;

    if (!pwd) {
      showMsg(setPwdMsg, "Password cannot be empty.", "error");
      return;
    }
    if (pwd.length < 4) {
      showMsg(setPwdMsg, "Use at least 4 characters.", "error");
      return;
    }
    if (pwd !== confirm) {
      showMsg(setPwdMsg, "Passwords do not match.", "error");
      return;
    }

    const hash = await sha256(pwd);
    storedHash = hash;
    chrome.storage.local.set({ [PWD_HASH_KEY]: hash });

    newPwdInput.value = "";
    confirmInput.value = "";
    showMsg(setPwdMsg, "Password set! ✓", "success");
    updatePasswordUI(true);
  });

  /* ------------------------------------------------------------------
   * Change password
   * ------------------------------------------------------------------ */
  btnShowChange.addEventListener("click", () => {
    changePwdSection.classList.remove("hidden");
    removePwdSection.classList.add("hidden");
    clearMsg(changePwdMsg);
    changeCurrent.value = "";
    changeNew.value = "";
    changeConfirm.value = "";
  });

  btnCancelChange.addEventListener("click", () => {
    changePwdSection.classList.add("hidden");
  });

  btnChangePwd.addEventListener("click", async () => {
    const current = changeCurrent.value;
    const newPwd  = changeNew.value;
    const confirm = changeConfirm.value;

    if (!current) {
      showMsg(changePwdMsg, "Enter your current password.", "error");
      return;
    }

    const currentHash = await sha256(current);
    if (currentHash !== storedHash) {
      showMsg(changePwdMsg, "Current password is wrong.", "error");
      return;
    }

    if (!newPwd) {
      showMsg(changePwdMsg, "New password cannot be empty.", "error");
      return;
    }
    if (newPwd.length < 4) {
      showMsg(changePwdMsg, "Use at least 4 characters.", "error");
      return;
    }
    if (newPwd !== confirm) {
      showMsg(changePwdMsg, "New passwords do not match.", "error");
      return;
    }

    const hash = await sha256(newPwd);
    storedHash = hash;
    chrome.storage.local.set({ [PWD_HASH_KEY]: hash });

    changeCurrent.value = "";
    changeNew.value = "";
    changeConfirm.value = "";
    showMsg(changePwdMsg, "Password updated! ✓", "success");
    setTimeout(() => changePwdSection.classList.add("hidden"), 1200);
  });

  /* ------------------------------------------------------------------
   * Remove password
   * ------------------------------------------------------------------ */
  btnShowRemove.addEventListener("click", () => {
    removePwdSection.classList.remove("hidden");
    changePwdSection.classList.add("hidden");
    clearMsg(removePwdMsg);
    removeCurrent.value = "";
  });

  btnCancelRemove.addEventListener("click", () => {
    removePwdSection.classList.add("hidden");
  });

  btnRemovePwd.addEventListener("click", async () => {
    const current = removeCurrent.value;

    if (!current) {
      showMsg(removePwdMsg, "Enter your current password.", "error");
      return;
    }

    const currentHash = await sha256(current);
    if (currentHash !== storedHash) {
      showMsg(removePwdMsg, "Wrong password.", "error");
      return;
    }

    storedHash = "";
    chrome.storage.local.set({ [PWD_HASH_KEY]: "" });
    removeCurrent.value = "";
    showMsg(removePwdMsg, "Password removed. ✓", "success");
    updatePasswordUI(false);
  });

  /* ------------------------------------------------------------------
   * Block paste, drop, and drag into the unlock password field
   * This forces the user to physically type the password every time.
   * ------------------------------------------------------------------ */
  const protectedInputs = [
    unlockPwd,        // modal when toggling OFF
    removeCurrent,    // "remove password" confirmation
    changeCurrent,    // "change password" current-password field
  ];

  protectedInputs.forEach((input) => {
    // Block Ctrl+V / right-click paste
    input.addEventListener("paste", (e) => {
      e.preventDefault();
    });

    // Block drag-and-drop (e.g. dragging text from Notepad)
    input.addEventListener("drop", (e) => {
      e.preventDefault();
    });

    // Prevent the dragover so the browser never shows a "drop here" cursor
    input.addEventListener("dragover", (e) => {
      e.preventDefault();
    });

    // Block cut (in case user tries cut→paste workarounds)
    input.addEventListener("cut", (e) => {
      e.preventDefault();
    });

    // Block copy from the field itself
    input.addEventListener("copy", (e) => {
      e.preventDefault();
    });

    // Disable the context menu (right-click → Paste)
    input.addEventListener("contextmenu", (e) => {
      e.preventDefault();
    });
  });

  /* ------------------------------------------------------------------
   * Show/hide password visibility toggles
   * ------------------------------------------------------------------ */
  document.querySelectorAll(".toggle-vis").forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-target");
      const input    = document.getElementById(targetId);
      if (input.type === "password") {
        input.type = "text";
        btn.textContent = "🙈";
      } else {
        input.type = "password";
        btn.textContent = "👁";
      }
    });
  });
})();
