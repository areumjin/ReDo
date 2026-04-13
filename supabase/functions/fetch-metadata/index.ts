// ─── fetch-metadata Edge Function ─────────────────────────────────────────────
// 서버 사이드에서 OG 메타데이터 + 이미지를 가져옵니다.
// Instagram: /embed/ 엔드포인트 사용 (공개 게시물 전용)
// Pinterest/기타: 브라우저 헤더 위장 fetch

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
};

// ─── HTML 엔티티 디코딩 ────────────────────────────────────────────────────────

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\\u0026/g, "&")
    .replace(/\\\//g, "/");
}

// ─── regex 첫 번째 캡처 그룹 추출 (g 플래그 없이) ──────────────────────────────

function firstMatch(html: string, pattern: RegExp): string {
  const m = pattern.exec(html);
  return m ? decodeHtmlEntities(m[1] ?? "") : "";
}

// ─── HTML → OG 태그 파싱 ──────────────────────────────────────────────────────

function getMeta(html: string, ...props: string[]): string {
  for (const prop of props) {
    const v =
      firstMatch(html, new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"'>{]+)["']`, "i")) ||
      firstMatch(html, new RegExp(`<meta[^>]+content=["']([^"'>{]+)["'][^>]+(?:property|name)=["']${prop}["']`, "i"));
    if (v) return v;
  }
  return "";
}

function extractOG(html: string, baseUrl: string) {
  const title =
    getMeta(html, "og:title", "twitter:title") ||
    firstMatch(html, /<title[^>]*>([^<]{1,200})<\/title>/i);
  const description = getMeta(html, "og:description", "twitter:description", "description");
  const siteName = getMeta(html, "og:site_name");
  let image = getMeta(html, "og:image", "og:image:secure_url", "twitter:image");

  if (image && !image.startsWith("http")) {
    try { image = new URL(image, baseUrl).href; } catch { image = ""; }
  }

  return { title, description, image, siteName };
}

// ─── 이미지 URL → base64 (작은 이미지만, 최대 600KB) ─────────────────────────

async function imageToBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": BROWSER_UA,
        "Referer": "https://www.instagram.com/",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;

    const contentType = res.headers.get("content-type") ?? "image/jpeg";

    // 큰 이미지는 base64 건너뜀 (600KB 초과)
    const contentLength = res.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > 600_000) return null;

    const buf = await res.arrayBuffer();
    if (buf.byteLength > 600_000) return null;

    const bytes = new Uint8Array(buf);
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

// ─── Instagram embed 파싱 ─────────────────────────────────────────────────────

function extractInstagramImage(html: string): string {
  // 1. JSON-LD 또는 인라인 데이터에서 display_url 추출
  const displayUrl = firstMatch(html, /"display_url"\s*:\s*"([^"]+)"/i);
  if (displayUrl) return displayUrl;

  // 2. __additionalData / shared_data JSON에서 이미지 추출
  const jsonData = firstMatch(html, /window\.__additionalDataLoaded\('[^']*',\s*(\{.{0,5000}\})\)/i);
  if (jsonData) {
    const imgInJson = firstMatch(jsonData, /"display_url"\s*:\s*"([^"]+)"/i);
    if (imgInJson) return imgInJson;
  }

  // 3. <img> 태그 중 cdninstagram 도메인이고 프로필 사진(t51.2885-19)이 아닌 것
  // Instagram 포스트 이미지는 t51.29350 또는 t51.2885-15 등
  const imgPattern = /src="(https:\/\/[^"]*(?:cdninstagram|fbcdn)[^"]*(?:t51\.(?:2885-1[^9]|293|29[0-9])[^"]*)[^"]*)"/i;
  const m = imgPattern.exec(html);
  if (m?.[1]) return decodeHtmlEntities(m[1]);

  // 4. 모든 cdninstagram 이미지 중 가장 큰 것 (프로필 제외)
  const allImgs: string[] = [];
  const globalPattern = /src="(https:\/\/[^"]*cdninstagram[^"]*)"/gi;
  let match;
  while ((match = globalPattern.exec(html)) !== null) {
    const url = decodeHtmlEntities(match[1]);
    // 프로필 사진(t51.2885-19, 150x150) 제외
    if (!url.includes("t51.2885-19") && !url.includes("s150x150")) {
      allImgs.push(url);
    }
  }
  if (allImgs.length > 0) return allImgs[0];

  // 5. og:image 폴백
  const og = getMeta(html, "og:image", "twitter:image");
  return og;
}

// ─── Instagram 전용 핸들러 ────────────────────────────────────────────────────

async function fetchInstagram(url: string) {
  const m = url.match(/instagram\.com\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/);
  if (!m) throw new Error("Instagram URL을 파싱할 수 없어요.");

  const code = m[1];

  // embed/captioned/ 엔드포인트 시도
  const embedUrl = `https://www.instagram.com/p/${code}/embed/captioned/`;
  const res = await fetch(embedUrl, {
    headers: {
      ...BROWSER_HEADERS,
      "Referer": "https://www.instagram.com/",
      "Cookie": "", // 쿠키 없이 공개 게시물 접근
    },
    redirect: "follow",
    signal: AbortSignal.timeout(12000),
  });

  const html = await res.text();

  const imageUrl = extractInstagramImage(html);

  // username
  const username =
    firstMatch(html, /class="[^"]*UsernameText[^"]*"[^>]*>([^<]+)/i) ||
    firstMatch(html, /"username"\s*:\s*"([^"]+)"/i);

  // caption
  const caption =
    firstMatch(html, /"edge_media_to_caption".*?"text"\s*:\s*"([^"]{0,300})"/is) ||
    firstMatch(html, /class="[^"]*Caption[^"]*"[^>]*>[\s\S]{0,20}<span[^>]*>([\s\S]{0,200}?)<\/span>/i)
      .replace(/<[^>]+>/g, "").trim();

  // 게시물 타입 판별
  const isReel = url.includes("/reel/") || html.includes('"product_type":"clips"');
  const postType = isReel ? "릴스" : "게시물";

  return {
    title: username ? `@${username}의 Instagram ${postType}` : `Instagram ${postType}`,
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

  // Pinterest OG image 없으면 JSON-LD에서 시도
  let imageUrl = og.image;
  if (!imageUrl) {
    imageUrl = firstMatch(html, /"image"\s*:\s*"(https:[^"]+)"/i);
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
        JSON.stringify({ error: "url이 필요해요." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const host = new URL(url).hostname.replace("www.", "");
    let result: { title: string; description: string; imageUrl: string | null; siteName: string };

    if (host === "instagram.com" || host === "instagr.am") {
      result = await fetchInstagram(url);
    } else if (
      host === "pinterest.com" ||
      host === "pin.it" ||
      host.endsWith("pinterest.co.kr")
    ) {
      result = await fetchPinterest(url);
    } else {
      result = await fetchGeneral(url);
    }

    // 이미지 base64 변환 시도 (실패하면 imageUrl만 반환)
    let imageBase64: string | null = null;
    if (result.imageUrl) {
      imageBase64 = await imageToBase64(result.imageUrl);
    }

    return new Response(
      JSON.stringify({
        title: result.title,
        description: result.description,
        imageBase64,              // data:image/...;base64,... (CORS 완전 우회)
        imageUrl: result.imageUrl, // 백업 URL (클라이언트에서 직접 로드)
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
