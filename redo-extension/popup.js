// ─── ReDo Collector — Popup ───────────────────────────────────────────────────

const REDO_APP_URL = "https://re-do-nine.vercel.app";
const STORAGE_KEY = "redo_recent_cards";

// ─── Save current page ────────────────────────────────────────────────────────

document.getElementById("saveCurrentPage").addEventListener("click", async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.url) {
      const saveUrl = `${REDO_APP_URL}/save?url=${encodeURIComponent(tab.url)}${tab.title ? `&title=${encodeURIComponent(tab.title)}` : ""}`;
      chrome.tabs.create({ url: saveUrl });
      window.close();
    }
  } catch (err) {
    console.error("[ReDo popup] Save error:", err);
  }
});

// ─── Load recent cards from chrome.storage ────────────────────────────────────

async function loadRecentCards() {
  const container = document.getElementById("recentCards");
  if (!container) return;

  try {
    const result = await chrome.storage.local.get([STORAGE_KEY]);
    const cards = result[STORAGE_KEY] ?? [];

    if (!Array.isArray(cards) || cards.length === 0) {
      container.innerHTML = '<p class="popup-empty">저장된 레퍼런스가 없어요</p>';
      return;
    }

    container.innerHTML = "";

    const recent = cards.slice(0, 5);
    for (const card of recent) {
      const cardEl = document.createElement("a");
      cardEl.className = "popup-card";
      cardEl.href = card.url || REDO_APP_URL;
      cardEl.target = "_blank";

      if (card.image) {
        const img = document.createElement("img");
        img.className = "popup-card-thumb";
        img.src = card.image;
        img.alt = card.title || "";
        img.onerror = () => {
          img.style.display = "none";
          const placeholder = document.createElement("div");
          placeholder.className = "popup-card-thumb-placeholder";
          placeholder.textContent = "🔗";
          cardEl.insertBefore(placeholder, cardEl.firstChild);
        };
        cardEl.appendChild(img);
      } else {
        const placeholder = document.createElement("div");
        placeholder.className = "popup-card-thumb-placeholder";
        placeholder.textContent = "🔗";
        cardEl.appendChild(placeholder);
      }

      const info = document.createElement("div");
      info.className = "popup-card-info";

      const title = document.createElement("p");
      title.className = "popup-card-title";
      title.textContent = card.title || card.url || "레퍼런스";
      info.appendChild(title);

      if (card.projectTag) {
        const tag = document.createElement("p");
        tag.className = "popup-card-tag";
        tag.textContent = card.projectTag;
        info.appendChild(tag);
      }

      cardEl.appendChild(info);
      container.appendChild(cardEl);
    }
  } catch (err) {
    console.error("[ReDo popup] Load error:", err);
    container.innerHTML = '<p class="popup-empty">불러오는 중 오류가 발생했어요</p>';
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────

loadRecentCards();
