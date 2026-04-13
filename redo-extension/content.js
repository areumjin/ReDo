// ─── ReDo Collector — Content Script ──────────────────────────────────────────

let currentOverlay = null;
let currentTarget = null;

function createSaveButton(imgEl) {
  const btn = document.createElement("button");
  btn.className = "redo-save-btn";
  btn.innerHTML = `
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 1v10M1 6h10" stroke="white" stroke-width="1.8" stroke-linecap="round"/>
    </svg>
    <span>ReDo</span>
  `;

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    e.preventDefault();
    const imageUrl = imgEl.src || imgEl.currentSrc;
    const pageUrl = window.location.href;
    chrome.runtime.sendMessage({
      type: "SAVE_IMAGE",
      imageUrl,
      pageUrl,
    });
    removeOverlay();
  });

  return btn;
}

function showOverlay(imgEl) {
  if (currentTarget === imgEl) return;
  removeOverlay();

  const rect = imgEl.getBoundingClientRect();
  if (rect.width < 48 || rect.height < 48) return; // Skip tiny images

  currentTarget = imgEl;

  const btn = createSaveButton(imgEl);

  // Position: top-right of image
  btn.style.position = "fixed";
  btn.style.top = `${rect.top + 8}px`;
  btn.style.right = `${window.innerWidth - rect.right + 8}px`;
  btn.style.zIndex = "2147483647";

  document.body.appendChild(btn);
  currentOverlay = btn;
}

function removeOverlay() {
  if (currentOverlay) {
    currentOverlay.remove();
    currentOverlay = null;
  }
  currentTarget = null;
}

// ─── Event Listeners ──────────────────────────────────────────────────────────

document.addEventListener(
  "mouseover",
  (e) => {
    const target = e.target;
    if (target && target.tagName === "IMG") {
      showOverlay(target);
    }
  },
  { passive: true }
);

document.addEventListener(
  "mouseleave",
  (e) => {
    // If mouse leaves the image (not entering the button), remove
    if (e.target && e.target.tagName === "IMG" && e.relatedTarget !== currentOverlay) {
      // Give a small delay so user can move to the button
      setTimeout(() => {
        if (currentOverlay && !currentOverlay.matches(":hover")) {
          removeOverlay();
        }
      }, 200);
    }
  },
  { passive: true }
);

document.addEventListener("mouseleave", (e) => {
  if (e.target === document.documentElement) {
    removeOverlay();
  }
});
