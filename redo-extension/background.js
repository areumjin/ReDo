// ─── ReDo Collector — Background Service Worker ───────────────────────────────

const REDO_APP_URL = "https://re-do-nine.vercel.app";

// ─── Context Menu Setup ───────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  // Page-level context menu
  chrome.contextMenus.create({
    id: "redo-save-page",
    title: "ReDo에 저장",
    contexts: ["page", "link"],
  });

  // Image-level context menu
  chrome.contextMenus.create({
    id: "redo-save-image",
    title: "이 이미지를 ReDo에 저장",
    contexts: ["image"],
  });
});

// ─── Context Menu Click Handler ───────────────────────────────────────────────

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "redo-save-page" || info.menuItemId === "redo-save-image") {
    const targetUrl = info.linkUrl ?? info.pageUrl ?? tab?.url ?? "";
    const saveUrl = `${REDO_APP_URL}/save?url=${encodeURIComponent(targetUrl)}`;
    chrome.tabs.create({ url: saveUrl });
  }
});

// ─── Message Handler (from content script) ───────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "SAVE_IMAGE") {
    const { imageUrl, pageUrl } = message;
    const params = new URLSearchParams({
      url: imageUrl || pageUrl || "",
    });
    if (pageUrl) params.set("text", pageUrl);
    chrome.tabs.create({ url: `${REDO_APP_URL}/save?${params.toString()}` });
    sendResponse({ ok: true });
  }
  return true;
});
