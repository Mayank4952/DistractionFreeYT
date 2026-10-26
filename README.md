# 🎯 YouTube Focus Mode

A lightweight Chrome / Brave extension (Manifest V3) that removes distracting recommendations from YouTube so you can focus on what you actually came to watch.

---

## What It Hides

| Surface                          | Behaviour                                                    |
| -------------------------------- | ------------------------------------------------------------ |
| **Homepage feed**                | Entire recommendation grid hidden; a calm message shown      |
| **Watch-page sidebar**           | "Up next", autoplay suggestions, entire `#secondary` column  |
| **End-screen cards**             | Overlay suggestions at the end of a video                    |
| **Shorts shelves**               | Reel shelves on home, subscriptions, and search pages        |
| **Shorts page**                  | `/shorts/*` content hidden                                   |
| **Shorts in search results**     | Individual Shorts results removed                            |
| **Shorts sidebar link**          | "Shorts" entry in the left-hand guide                        |

## What It Keeps

- ✅ Video player (the video you're watching)
- ✅ Search bar and search results
- ✅ Subscriptions page & feed
- ✅ Playlists & playlist playback
- ✅ Channel pages
- ✅ Comments section
- ✅ The toggle popup to turn it on/off any time

---

## Installation (Unpacked)

### Chrome

1. Open **chrome://extensions** in your address bar.
2. Enable **Developer mode** (toggle in the top-right corner).
3. Click **Load unpacked**.
4. Select the `DistractionFreeYT` folder (the one containing `manifest.json`).
5. The extension icon (🎯 red target) appears in your toolbar.
6. Pin it for easy access: click the puzzle-piece icon → pin **YouTube Focus Mode**.

### Brave

1. Open **brave://extensions** in your address bar.
2. Enable **Developer mode** (toggle in the top-right corner).
3. Click **Load unpacked**.
4. Select the `DistractionFreeYT` folder.
5. Pin the icon from the extensions menu.

> **Tip:** Both browsers support Manifest V3 identically. The same folder works in both.

---

## Usage

- Click the 🎯 icon in your toolbar to open the popup.
- Toggle **Focus Mode** on or off.
- The change takes effect instantly on any open YouTube tab — no reload needed.
- The setting persists across browser restarts.

---

## Project Structure

```
DistractionFreeYT/
├── manifest.json              # MV3 manifest
├── content/
│   ├── content.js             # Content script (MutationObserver, state management)
│   └── styles.css             # All hiding rules, activated by CSS class toggle
├── popup/
│   ├── popup.html             # Extension popup UI
│   └── popup.js               # Toggle logic using chrome.storage.local
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## How It Works

### CSS Class Toggle

All hiding rules are scoped under `html.ytfm-focus-active`. When Focus Mode is enabled, the content script adds this class to `<html>`; when disabled, it removes it. This means every rule is immediately active or inactive without injecting/removing stylesheets.

### Selectors

The CSS targets YouTube's **custom element tag names** (`ytd-rich-grid-renderer`, `ytd-reel-shelf-renderer`, etc.) rather than volatile class names. These are part of YouTube's web-component architecture and are far more stable than CSS classes.

### SPA Navigation

YouTube uses the History API for client-side navigation. The extension handles this with:
1. A **MutationObserver** on `<body>` that detects URL changes and re-enforces hiding.
2. A listener for YouTube's custom **`yt-navigate-finish`** event.
3. A throttled enforcement pass (≤ once per 300 ms) to avoid performance impact.

### Storage

A single boolean (`ytfm_enabled`) is stored in `chrome.storage.local`. The popup writes it; the content script reads it and listens for changes via `chrome.storage.onChanged`.

---

## Testing Guide

### ✅ Tests You Should Run

| # | Test                                  | Steps                                                                                                            | Expected                                                           |
|---|---------------------------------------|------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------|
| 1 | **Homepage hidden**                   | Go to `youtube.com`. Focus Mode is ON.                                                                           | Feed is gone. Focus message is visible.                            |
| 2 | **Search works**                      | Type a query in the search bar and press Enter.                                                                  | Search results appear normally.                                    |
| 3 | **Watch page — player visible**       | Click a search result or paste a video URL.                                                                      | Video plays. No sidebar recommendations.                          |
| 4 | **Subscriptions page**                | Click "Subscriptions" in the left sidebar.                                                                       | Subscription feed shows normally.                                  |
| 5 | **Playlists**                         | Open a playlist or go to Library → Playlists.                                                                    | Playlist contents visible and playable.                            |
| 6 | **Channel pages**                     | Visit any channel page.                                                                                          | Channel videos, tabs, and banner visible.                          |
| 7 | **Shorts hidden**                     | Search for something popular; look for Shorts shelves.                                                           | Shorts shelves and individual Shorts results are hidden.           |
| 8 | **Shorts page blocked**              | Navigate to `youtube.com/shorts/someId`.                                                                         | Shorts player is hidden.                                           |
| 9 | **SPA navigation**                    | From a watch page, click the YouTube logo to go home; then search; then open a video. Never do a full reload.    | Hiding is maintained on every transition.                          |
| 10 | **Toggle OFF**                       | Open popup → turn Focus Mode OFF.                                                                                | Homepage feed, sidebar, Shorts all reappear immediately.           |
| 11 | **Toggle ON again**                  | Turn Focus Mode back ON.                                                                                         | Everything is hidden again without needing a page reload.          |
| 12 | **Persistence across restart**       | Close and reopen the browser. Open YouTube.                                                                       | Focus Mode state matches what you last set.                        |

### 🔍 Troubleshooting

| Issue                                 | Likely Cause & Fix                                                                                                                               |
|---------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------|
| Nothing is hidden                     | Check that the extension is loaded and enabled at `chrome://extensions`. Click the toolbar icon — is the toggle ON?                              |
| Some recommendations still show       | YouTube may have updated their DOM structure. Open DevTools, inspect the visible element, and check if the tag name or attribute has changed.     |
| Extension won't load                  | Make sure you selected the folder containing `manifest.json`, not a parent folder. Check the console on `chrome://extensions` for errors.        |
| Popup doesn't open                    | Pin the extension. Right-click the icon → "Options" should be absent (no options page). Left-click should open the popup.                        |
| Shorts still visible in search        | The `:has()` selector requires Chromium ≥ 105. Update your browser. The JS fallback handles `ytd-reel-shelf-renderer` but not all search items. |

---

## Permissions Explained

| Permission    | Why                                                                 |
|---------------|---------------------------------------------------------------------|
| `storage`     | Save the on/off toggle state across sessions.                       |
| Host: `*.youtube.com` | Inject the content script and CSS only on YouTube pages.   |

No network requests, no analytics, no tracking. Fully local.

---

## Known Limitations

1. **YouTube DOM changes:** YouTube updates its frontend frequently. If a custom element name changes (e.g., `ytd-reel-shelf-renderer` is renamed), the corresponding CSS rule will stop working until updated.
2. **End-screen cards:** These use generic class names (`.ytp-ce-element`) which are less stable.
3. **Incognito mode:** You must explicitly allow the extension in incognito at `chrome://extensions` → Details → "Allow in Incognito".
4. **Shorts in recommendations:** Some Shorts may appear as regular videos (without `/shorts/` in the URL). These may not be caught.

---

## License

MIT — do whatever you want with it.
