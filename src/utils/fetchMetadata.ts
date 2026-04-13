export interface LinkMetadata {
  title: string;
  description: string;
  imageUrl: string | null;
  siteName: string;
  favicon: string | null;
}

export async function fetchLinkMetadata(url: string): Promise<LinkMetadata> {
  const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;

  const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(8000) });
  const data = await res.json();
  const html: string = data.contents;

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const getMeta = (names: string[]): string => {
    for (const name of names) {
      const el = doc.querySelector(
        `meta[property="${name}"], meta[name="${name}"]`
      );
      if (el?.getAttribute("content")) return el.getAttribute("content")!;
    }
    return "";
  };

  const title =
    getMeta(["og:title", "twitter:title"]) ||
    doc.querySelector("title")?.textContent?.trim() ||
    "";

  const description =
    getMeta(["og:description", "twitter:description", "description"]) || "";

  const rawImageUrl = getMeta(["og:image", "twitter:image"]) || null;
  // 상대 경로 → 절대 URL 변환
  const imageUrl = rawImageUrl
    ? rawImageUrl.startsWith("http")
      ? rawImageUrl
      : (() => {
          try { return `${new URL(url).origin}${rawImageUrl.startsWith("/") ? "" : "/"}${rawImageUrl}`; }
          catch { return null; }
        })()
    : null;

  const siteName =
    getMeta(["og:site_name"]) ||
    (() => {
      try {
        return new URL(url).hostname.replace("www.", "");
      } catch {
        return url;
      }
    })();

  const faviconEl = doc.querySelector('link[rel*="icon"]');
  const faviconHref = faviconEl?.getAttribute("href") || null;
  const favicon = faviconHref
    ? faviconHref.startsWith("http")
      ? faviconHref
      : (() => {
          try {
            return `${new URL(url).origin}${faviconHref}`;
          } catch {
            return null;
          }
        })()
    : null;

  return { title, description, imageUrl, siteName, favicon };
}

// 설명에서 키워드 칩 자동 추출
export function extractChipsFromMeta(meta: LinkMetadata): string[] {
  const keywords: string[] = [];
  const text = `${meta.title} ${meta.description}`.toLowerCase();

  const designKeywords: Record<string, string> = {
    typography: "타이포그래피",
    minimal: "미니멀",
    grid: "그리드",
    color: "컬러",
    branding: "브랜딩",
    logo: "로고",
    ui: "UI",
    ux: "UX",
    poster: "포스터",
    illustration: "일러스트",
    motion: "모션",
    identity: "아이덴티티",
  };

  for (const [eng, kor] of Object.entries(designKeywords)) {
    if (text.includes(eng)) keywords.push(kor);
  }

  return keywords.slice(0, 4);
}
