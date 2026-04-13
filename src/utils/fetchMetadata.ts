export interface LinkMetadata {
  title: string;
  description: string;
  imageUrl: string | null;
  siteName: string;
  favicon: string | null;
}

// ─── YouTube URL 감지 ────────────────────────────────────────────────────────
function getYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

// ─── YouTube oEmbed ───────────────────────────────────────────────────────────
async function fetchYouTubeMeta(url: string, videoId: string): Promise<LinkMetadata> {
  const oEmbedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
  const res = await fetch(oEmbedUrl, { signal: AbortSignal.timeout(6000) });
  if (!res.ok) throw new Error("oEmbed failed");
  const data = await res.json();

  // maxresdefault → hqdefault 순으로 썸네일 시도
  const thumbnail = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

  return {
    title: data.title ?? "",
    description: `${data.author_name ?? ""}의 YouTube 영상`,
    imageUrl: thumbnail,
    siteName: "YouTube",
    favicon: "https://www.youtube.com/favicon.ico",
  };
}

// ─── microlink.io (일반 URL) ──────────────────────────────────────────────────
async function fetchMicrolinkMeta(url: string): Promise<LinkMetadata> {
  const endpoint = `https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=false&meta=true`;
  const res = await fetch(endpoint, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`microlink HTTP ${res.status}`);
  const json = await res.json();
  if (json.status !== "success") throw new Error("microlink not success");

  const d = json.data;
  const imageUrl: string | null =
    d.image?.url ?? d.og?.image ?? null;

  // 상대경로 → 절대 URL
  const absoluteImage = imageUrl
    ? imageUrl.startsWith("http")
      ? imageUrl
      : (() => { try { return `${new URL(url).origin}${imageUrl}`; } catch { return null; } })()
    : null;

  return {
    title: d.title ?? d.og?.title ?? "",
    description: d.description ?? d.og?.description ?? "",
    imageUrl: absoluteImage,
    siteName: d.publisher ?? d.og?.site_name ?? (() => { try { return new URL(url).hostname.replace("www.", ""); } catch { return url; } })(),
    favicon: d.logo?.url ?? null,
  };
}

// ─── allorigins 폴백 ──────────────────────────────────────────────────────────
async function fetchAlloriginsMeta(url: string): Promise<LinkMetadata> {
  const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
  const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(8000) });
  const data = await res.json();
  const html: string = data.contents ?? "";

  const doc = new DOMParser().parseFromString(html, "text/html");
  const getMeta = (names: string[]): string => {
    for (const name of names) {
      const el = doc.querySelector(`meta[property="${name}"], meta[name="${name}"]`);
      if (el?.getAttribute("content")) return el.getAttribute("content")!;
    }
    return "";
  };

  const rawImage = getMeta(["og:image", "twitter:image"]) || null;
  const imageUrl = rawImage
    ? rawImage.startsWith("http") ? rawImage
      : (() => { try { return `${new URL(url).origin}${rawImage.startsWith("/") ? "" : "/"}${rawImage}`; } catch { return null; } })()
    : null;

  return {
    title: getMeta(["og:title", "twitter:title"]) || doc.querySelector("title")?.textContent?.trim() || "",
    description: getMeta(["og:description", "twitter:description", "description"]) || "",
    imageUrl,
    siteName: getMeta(["og:site_name"]) || (() => { try { return new URL(url).hostname.replace("www.", ""); } catch { return url; } })(),
    favicon: null,
  };
}

// ─── 소셜 플랫폼 감지 + 브랜드 메타 즉시 반환 ───────────────────────────────────

interface SocialPlatform {
  name: string;
  color: string;       // 브랜드 컬러 (hex)
  label: string;       // 게시물 유형 라벨
  emoji: string;
}

function detectSocialPlatform(url: string): SocialPlatform | null {
  try {
    const { hostname, pathname } = new URL(url);
    const host = hostname.replace("www.", "");

    if (host === "instagram.com" || host === "instagr.am") {
      const isReel = pathname.includes("/reel/");
      const isStory = pathname.includes("/stories/");
      return {
        name: "Instagram",
        color: "#E1306C",
        label: isReel ? "Instagram 릴스" : isStory ? "Instagram 스토리" : "Instagram 게시물",
        emoji: "📸",
      };
    }
    if (host === "pinterest.com" || host === "pin.it" || host === "pinterest.co.kr") {
      return { name: "Pinterest", color: "#E60023", label: "Pinterest 핀", emoji: "📌" };
    }
    if (host === "tiktok.com" || host === "vm.tiktok.com") {
      return { name: "TikTok", color: "#010101", label: "TikTok 영상", emoji: "🎵" };
    }
    if (host === "twitter.com" || host === "x.com" || host === "t.co") {
      return { name: "X (Twitter)", color: "#000000", label: "X 게시물", emoji: "🐦" };
    }
    if (host === "threads.net") {
      return { name: "Threads", color: "#101010", label: "Threads 게시물", emoji: "🧵" };
    }
    if (host === "behance.net") {
      return { name: "Behance", color: "#1769FF", label: "Behance 프로젝트", emoji: "🎨" };
    }
    if (host === "dribbble.com") {
      return { name: "Dribbble", color: "#EA4C89", label: "Dribbble 샷", emoji: "🏀" };
    }
  } catch {
    // ignore
  }
  return null;
}

// ─── 메인 함수 ────────────────────────────────────────────────────────────────
export async function fetchLinkMetadata(url: string): Promise<LinkMetadata> {
  // 0. 소셜 플랫폼 → 프록시 없이 즉시 브랜드 메타 반환
  const social = detectSocialPlatform(url);
  if (social) {
    return {
      title: social.label,
      description: `${social.name}에서 공유된 콘텐츠`,
      imageUrl: null,           // 이미지 없음 — ThumbnailPreview에서 브랜드 플레이스홀더 표시
      siteName: social.name,
      favicon: null,
      _socialColor: social.color,
      _socialEmoji: social.emoji,
    } as LinkMetadata & { _socialColor: string; _socialEmoji: string };
  }

  // 1. YouTube → 공식 oEmbed
  const videoId = getYouTubeVideoId(url);
  if (videoId) {
    return fetchYouTubeMeta(url, videoId).catch(() => ({
      title: "YouTube 영상",
      description: "",
      imageUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      siteName: "YouTube",
      favicon: "https://www.youtube.com/favicon.ico",
    }));
  }

  // 2. microlink.io (일반 URL, 가장 안정적)
  try {
    return await fetchMicrolinkMeta(url);
  } catch {
    // 3. allorigins 폴백
    try {
      return await fetchAlloriginsMeta(url);
    } catch {
      return {
        title: "",
        description: "",
        imageUrl: null,
        siteName: (() => { try { return new URL(url).hostname.replace("www.", ""); } catch { return url; } })(),
        favicon: null,
      };
    }
  }
}

// ─── 설명에서 키워드 칩 자동 추출 ─────────────────────────────────────────────
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
    layout: "레이아웃",
    font: "폰트",
    video: "영상",
    design: "디자인",
  };

  for (const [eng, kor] of Object.entries(designKeywords)) {
    if (text.includes(eng)) keywords.push(kor);
  }

  return keywords.slice(0, 4);
}
