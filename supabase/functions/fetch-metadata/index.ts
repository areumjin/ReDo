// ─── fetch-metadata Edge Function ─────────────────────────────────────────────
// 서버 사이드에서 OG 메타데이터 + 이미지를 가져옵니다.
// Instagram: /embed/ 엔드포인트 사용 (공개 게시물 전용)
// Pinterest/기타: 브라우저 헤더 위장 fetch

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// 최신 Android Chrome UA
const BROWSER_UA =
  "Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.144 Mobile Safari/537.36";

const BROWSER_HEADERS = {
  "User-Agent": BROWSER_UA,
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
  "Cache-Control": "no-cache",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Upgrade-Insecure-Requests": "1",
};

// ─── HTML → OG 태그 파싱 ──────────────────────────────────────────────────────

function getMeta(html: string, ...props: string[]): string {
  for (const prop of props) {
    const patterns = [
      new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"'>{]+)["']`, "i"),
      new RegExp(`<meta[^>]+content=["']([^"'>{]+)["'][^>]+(?:property|name)=["']${prop}["']`, "i"),
    ];
    for (const re of patterns) {
      const m = html.match(re);
      if (m?.[1]?.trim()) return m[1].trim();
    }
  }
  return "";
}

function extractOG(html: string, baseUrl: string) {
  const title =
    getMeta(html, "og:title", "twitter:title") ||
    html.match(/<title[^>]*>([^<]{1,200})<\/title>/i)?.[1]?.trim() ||
    "";
  const description = getMeta(html, "og:description", "twitter:description", "description");
  const siteName = getMeta(html, "og:site_name");
  let image = getMeta(html, "og:image", "og:image:secure_url", "twitter:image");

  if (image && !image.startsWith("http")) {
    try { image = new URL(image, baseUrl).href; } catch { image = ""; }
  }

  return { title, description, image, siteName };
}

// ─── 이미지 → base64 ──────────────────────────────────────────────────────────

async function imageToBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": BROWSER_UA, "Referer": "https://www.instagram.com/" },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return null;

    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const buf = await res.arrayBuffer();
    const bytes = new Uint8Array(buf);

    // Deno btoa는 Uint8Array를 직접 못 받으므로 binary string으로 변환
    let binary = "";
    const chunk = 8192;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return `data:${contentType};base64,${btoa(binary)}`;
  } catch {
    return null;
  }
}

// ─── Instagram /embed/ ────────────────────────────────────────────────────────

async function fetchInstagram(url: string) {
  // shortcode 추출
  const m = url.match(/instagram\.com\/(?:p|reel|tv|stories\/[^/]+)\/([A-Za-z0-9_-]+)/);
  if (!m) throw new Error("Instagram URL을 파싱할 수 없어요.");

  const code = m[1];
  const embedUrl = `https://www.instagram.com/p/${code}/embed/captioned/`;

  const res = await fetch(embedUrl, {
    headers: {
      ...BROWSER_HEADERS,
      "Referer": "https://www.instagram.com/",
      "Sec-Fetch-Site": "same-origin",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(12000),
  });

  const html = await res.text();

  // 이미지 URL 추출 시도 (여러 패턴)
  const imagePatterns = [
    /src="(https:\/\/[^"]*(?:cdninstagram|fbcdn|instagram)[^"]*\.(?:jpg|webp|png)[^"]*?)"/gi,
    /"display_url":"([^"]+)"/i,
    /background-image:url\('?(https:\/\/[^'")]+)'?\)/i,
  ];

  let imageUrl = "";
  for (const pattern of imagePatterns) {
    const imgMatch = html.match(pattern);
    if (imgMatch) {
      // src 패턴은 그룹 1, 나머지는 그룹 1
      const rawUrl = imgMatch[1] ?? imgMatch[0];
      // JSON 이스케이프 해제
      imageUrl = rawUrl.replace(/\\u0026/g, "&").replace(/\\/g, "");
      if (imageUrl.startsWith("http")) break;
    }
  }

  // username, caption
  const usernameMatch = html.match(/class="[^"]*UsernameText[^"]*"[^>]*>([^<]+)/i) ||
    html.match(/@([A-Za-z0-9_.]{1,30})/);
  const username = usernameMatch?.[1]?.trim() ?? "";

  const captionMatch = html.match(/class="[^"]*Caption[^"]*"[\s\S]*?<span[^>]*>([\s\S]{0,200}?)<\/span>/i);
  const caption = captionMatch?.[1]?.replace(/<[^>]+>/g, "")?.trim() ?? "";

  return {
    title: username ? `@${username}의 Instagram 게시물` : "Instagram 게시물",
    description: caption || "Instagram 공개 게시물",
    imageUrl: imageUrl || null,
    siteName: "Instagram",
  };
}

// ─── Pinterest ────────────────────────────────────────────────────────────────

async function fetchPinterest(url: string) {
  const res = await fetch(url, {
    headers: BROWSER_HEADERS,
    redirect: "follow",
    signal: AbortSignal.timeout(12000),
  });
  const html = await res.text();
  const og = extractOG(html, url);

  // Pinterest OG image가 없으면 JSON-LD에서 시도
  let imageUrl = og.image;
  if (!imageUrl) {
    const jsonLd = html.match(/"image":\s*"(https:[^"]+)"/i);
    if (jsonLd?.[1]) imageUrl = jsonLd[1];
  }

  return {
    title: og.title || "Pinterest 핀",
    description: og.description || "Pinterest에서 저장한 핀",
    imageUrl,
    siteName: "Pinterest",
  };
}

// ─── 일반 URL ─────────────────────────────────────────────────────────────────

async function fetchGeneral(url: string) {
  const res = await fetch(url, {
    headers: BROWSER_HEADERS,
    redirect: "follow",
    signal: AbortSignal.timeout(12000),
  });
  const html = await res.text();
  const og = extractOG(html, url);
  const host = new URL(url).hostname.replace("www.", "");

  return {
    title: og.title,
    description: og.description,
    imageUrl: og.image || null,
    siteName: og.siteName || host,
  };
}

// ─── Main handler ──────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { url } = await req.json() as { url: string };
    if (!url || typeof url !== "string") {
      return new Response(
        JSON.stringify({ error: "url 파라미터가 필요해요." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const host = new URL(url).hostname.replace("www.", "");
    let result: { title: string; description: string; imageUrl: string | null; siteName: string };

    if (host === "instagram.com" || host === "instagr.am") {
      result = await fetchInstagram(url);
    } else if (host === "pinterest.com" || host === "pin.it" || host.endsWith("pinterest.co.kr")) {
      result = await fetchPinterest(url);
    } else {
      result = await fetchGeneral(url);
    }

    // 이미지 base64 변환 (클라이언트 CORS 우회)
    let imageBase64: string | null = null;
    if (result.imageUrl) {
      imageBase64 = await imageToBase64(result.imageUrl);
    }

    return new Response(
      JSON.stringify({
        title: result.title,
        description: result.description,
        imageBase64,           // data:image/...;base64,... 형식
        imageUrl: result.imageUrl,  // 원본 URL (백업)
        siteName: result.siteName,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
