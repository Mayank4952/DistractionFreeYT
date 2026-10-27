/**
 * YouTube Focus Mode — Content Script
 *
 * Responsibilities:
 *   1. Read the stored focus-mode state and apply/remove the CSS class.
 *   2. Listen for storage changes so the popup toggle takes effect instantly.
 *   3. Use a MutationObserver to re-enforce hiding when YouTube's SPA
 *      navigation loads new content without a full page reload.
 */

(function () {
  "use strict";

  /* ------------------------------------------------------------------
   * Constants
   * ------------------------------------------------------------------ */
  const ACTIVE_CLASS = "ytfm-focus-active";
  const STORAGE_KEY  = "ytfm_enabled";

  /* ------------------------------------------------------------------
   * State helpers
   * ------------------------------------------------------------------ */

  /** Apply or remove the CSS activation class on <html>. */
  function setFocusMode(enabled) {
    if (enabled) {
      document.documentElement.classList.add(ACTIVE_CLASS);
    } else {
      document.documentElement.classList.remove(ACTIVE_CLASS);
    }
  }

  /** Read persisted state (defaults to ON). */
  function loadState(callback) {
    chrome.storage.local.get({ [STORAGE_KEY]: true }, (result) => {
      callback(result[STORAGE_KEY]);
    });
  }

  /* ------------------------------------------------------------------
   * Initialise
   * ------------------------------------------------------------------ */

  // Apply state as early as possible (script runs at document_start).
  loadState(setFocusMode);

  // React when the popup (or any other caller) flips the toggle.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes[STORAGE_KEY]) {
      setFocusMode(changes[STORAGE_KEY].newValue);
    }
  });

  /* ------------------------------------------------------------------
   * MutationObserver  — handle YouTube SPA navigation
   *
   * YouTube uses the History API to navigate between pages without a
   * full reload.  When this happens the <title> changes, new DOM is
   * injected, and our CSS rules need to match the freshly-created
   * elements.  Because the CSS selectors live on stable custom-element
   * tag names the rules re-apply automatically, but we also want to:
   *
   *   a. Re-check that our activation class is still present (YouTube
   *      occasionally replaces <html> attributes).
   *   b. Actively remove nodes that CSS :has() cannot reach on older
   *      Chromium builds (≤ 104).
   * ------------------------------------------------------------------ */

  let currentUrl = location.href;

  /**
   * Extra JS-based cleanup for elements that are hard to catch with
   * pure CSS selectors.  Called on initial load and on SPA navigations.
   */
  function enforceHiding() {
    // Only act when focus mode is on.
    if (!document.documentElement.classList.contains(ACTIVE_CLASS)) return;

    const noHasSupport =
      typeof CSS === "undefined" || !CSS.supports || !CSS.supports("selector(:has(*))");

    // --- Shorts shelf: remove if :has() isn't supported ---
    if (noHasSupport) {
      document.querySelectorAll("ytd-reel-shelf-renderer").forEach((el) => {
        el.style.display = "none";
      });
      document.querySelectorAll("ytd-rich-section-renderer").forEach((section) => {
        if (section.querySelector("ytd-reel-shelf-renderer")) {
          section.style.display = "none";
        }
      });
    }

    // --- Watch page: hide #secondary only if no playlist is present ---
    // (JS fallback for the CSS :has() rule)
    if (noHasSupport) {
      const secondary = document.querySelector("ytd-watch-flexy #secondary");
      if (secondary) {
        const hasPlaylist = !!secondary.querySelector("ytd-playlist-panel-renderer");
        secondary.style.display = hasPlaylist ? "" : "none";
      }
    }

    // --- Shorts links in guide sidebar ---
    document.querySelectorAll("ytd-guide-entry-renderer").forEach((entry) => {
      const anchor = entry.querySelector("a");
      if (anchor && anchor.getAttribute("title") === "Shorts") {
        entry.style.display = "none";
      }
    });

    // --- Rich shelf renderers flagged as Shorts ---
    document.querySelectorAll("ytd-rich-shelf-renderer").forEach((shelf) => {
      if (shelf.hasAttribute("is-shorts") || shelf.getAttribute("is-shorts") !== null) {
        shelf.style.display = "none";
      }
    });
  }

  /**
   * Observe DOM mutations.  We throttle our callback to avoid
   * performance issues on rapid DOM churn.
   */
  let throttleTimer = null;

  function onMutation() {
    // Detect SPA navigation via URL change.
    if (location.href !== currentUrl) {
      currentUrl = location.href;
      // Re-apply class in case YouTube swapped the attribute.
      loadState(setFocusMode);
    }

    // Throttle enforcement work to at most once every 300 ms.
    if (!throttleTimer) {
      throttleTimer = setTimeout(() => {
        throttleTimer = null;
        enforceHiding();
      }, 300);
    }
  }

  // Start observing once we have a <body>.
  function startObserver() {
    const observer = new MutationObserver(onMutation);
    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true,
    });
  }

  if (document.body) {
    startObserver();
    enforceHiding();
  } else {
    // document_start — body doesn't exist yet.
    document.addEventListener("DOMContentLoaded", () => {
      startObserver();
      enforceHiding();
    });
  }

  /* ------------------------------------------------------------------
   * Also listen for YouTube's own navigation events.
   * YouTube fires `yt-navigate-finish` on the document after each
   * SPA page transition.
   * ------------------------------------------------------------------ */
  document.addEventListener("yt-navigate-finish", () => {
    loadState(setFocusMode);
    enforceHiding();
  });
})();
