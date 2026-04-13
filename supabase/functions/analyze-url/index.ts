import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface AnalyzeRequest {
  url: string;
  // 프론트에서 이미 가져온 메타데이터 (선택)
  title?: string;
  description?: string;
}

interface AIAnalysis {
  suggested_reasons: string[];
  keywords: string[];
  category: string;
  summary: string;
}

interface AnalyzeResponse {
  ogImage: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  analysis: AIAnalysis | null;
  error?: string;
}

// ─── microlink.io 메타데이터 ──────────────────────────────────────────────────

async function fetchMicrolinkMeta(url: string): Promise<{ title: string | null; description: string | null; image: string | null }> {
  try {
    const endpoint = `https://api.microlink.io/?url=${encodeURIComponent(url)}&meta=true`;
    const res = await fetch(endpoint, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.status !== "success") throw new Error("not success");
    const d = json.data;
    const imageUrl = d.image?.url ?? d.og?.image ?? null;
    const absoluteImage = imageUrl && !imageUrl.startsWith("http")
      ? `${new URL(url).origin}${imageUrl}`
      : imageUrl;
    return {
      title: d.title ?? d.og?.title ?? null,
      description: d.description ?? d.og?.description ?? null,
      image: absoluteImage,
    };
  } catch {
    return { title: null, description: null, image: null };
  }
}

// ─── YouTube oEmbed ───────────────────────────────────────────────────────────

function getYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

async function fetchYouTubeMeta(url: string, videoId: string): Promise<{ title: string | null; description: string | null; image: string | null }> {
  try {
    const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`, {
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) throw new Error("oEmbed failed");
    const data = await res.json();
    return {
      title: data.title ?? null,
      description: `${data.author_name ?? ""}의 YouTube 영상`,
      image: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
    };
  } catch {
    return {
      title: null,
      description: "YouTube 영상",
      image: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    };
  }
}

// ─── Claude AI Analysis ───────────────────────────────────────────────────────

async function analyzeWithClaude(title: string | null, description: string | null, url: string): Promise<AIAnalysis> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");

  const defaultResult: AIAnalysis = {
    suggested_reasons: ["영감을 받아서", "구조가 마음에 들어서", "나중에 참고하려고"],
    keywords: ["디자인", "레퍼런스", "아이디어"],
    category: "기타",
    summary: "디자인 레퍼런스",
  };

  if (!apiKey) return defaultResult;

  const prompt = `다음 디자인 레퍼런스를 분석해줘.
제목: ${title || "제목 없음"}
설명: ${description || "설명 없음"}
URL: ${url}

JSON으로만 응답해 (설명 없이):
{
  "suggested_reasons": ["이유1", "이유2", "이유3"],
  "keywords": ["키워드1", "키워드2", "키워드3"],
  "category": "타이포그래피|레이아웃|컬러|브랜딩|UI|영상|기타",
  "summary": "한 줄 요약 (20자 이내)"
}`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 512,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return defaultResult;

    const data = await res.json();
    const text: string = data?.content?.[0]?.text ?? "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return defaultResult;

    const parsed = JSON.parse(jsonMatch[0]) as Partial<AIAnalysis>;
    return {
      suggested_reasons: Array.isArray(parsed.suggested_reasons) && parsed.suggested_reasons.length > 0
        ? parsed.suggested_reasons.slice(0, 3) : defaultResult.suggested_reasons,
      keywords: Array.isArray(parsed.keywords) && parsed.keywords.length > 0
        ? parsed.keywords.slice(0, 5) : defaultResult.keywords,
      category: typeof parsed.category === "string" ? parsed.category : "기타",
      summary: typeof parsed.summary === "string" && parsed.summary.length > 0
        ? parsed.summary : defaultResult.summary,
    };
  } catch {
    return defaultResult;
  }
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: AnalyzeRequest;
  try {
    body = await req.json() as AnalyzeRequest;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = body?.url?.trim() ?? "";
  if (!url || !url.startsWith("http")) {
    return new Response(JSON.stringify({ error: "Invalid URL", ogImage: null, ogTitle: null, ogDescription: null, analysis: null }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // 1. 메타데이터: 프론트에서 전달된 값 우선, 없으면 서버에서 직접 가져옴
  let ogTitle: string | null = body.title ?? null;
  let ogDescription: string | null = body.description ?? null;
  let ogImage: string | null = null;

  if (!ogTitle) {
    const videoId = getYouTubeVideoId(url);
    const meta = videoId
      ? await fetchYouTubeMeta(url, videoId)
      : await fetchMicrolinkMeta(url);
    ogTitle = meta.title;
    ogDescription = meta.description;
    ogImage = meta.image;
  }

  // 2. AI 분석
  const analysis = await analyzeWithClaude(ogTitle, ogDescription, url);

  return new Response(JSON.stringify({ ogImage, ogTitle, ogDescription, analysis } as AnalyzeResponse), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
