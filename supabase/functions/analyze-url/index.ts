import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// ─── CORS Headers ─────────────────────────────────────────────────────────────

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface AnalyzeRequest {
  url: string;
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

// ─── OG Metadata Extraction ───────────────────────────────────────────────────

function extractOGMeta(
  html: string,
  baseUrl: string
): { title: string | null; description: string | null; image: string | null } {
  const getContent = (property: string): string | null => {
    const patterns = [
      new RegExp(
        `<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`,
        "i"
      ),
      new RegExp(
        `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`,
        "i"
      ),
      new RegExp(
        `<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["']`,
        "i"
      ),
      new RegExp(
        `<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${property}["']`,
        "i"
      ),
    ];
    for (const re of patterns) {
      const m = html.match(re);
      if (m?.[1]) return m[1].trim();
    }
    return null;
  };

  const title =
    getContent("og:title") ||
    getContent("twitter:title") ||
    html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ||
    null;

  const description =
    getContent("og:description") ||
    getContent("twitter:description") ||
    getContent("description") ||
    null;

  let image = getContent("og:image") || getContent("twitter:image");

  // Resolve relative image URLs
  if (image && !image.startsWith("http")) {
    try {
      image = new URL(image, baseUrl).href;
    } catch {
      image = null;
    }
  }

  return { title, description, image: image || null };
}

// ─── Claude AI Analysis ───────────────────────────────────────────────────────

async function analyzeWithClaude(
  title: string | null,
  description: string | null,
  url: string
): Promise<AIAnalysis> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");

  const defaultResult: AIAnalysis = {
    suggested_reasons: ["영감을 받아서", "구조가 마음에 들어서", "나중에 참고하려고"],
    keywords: ["디자인", "레퍼런스", "아이디어"],
    category: "기타",
    summary: "디자인 레퍼런스",
  };

  if (!apiKey) {
    console.warn("ANTHROPIC_API_KEY not set, returning defaults");
    return defaultResult;
  }

  const prompt = `다음 디자인 레퍼런스를 분석해줘.
제목: ${title || "제목 없음"}
설명: ${description || "설명 없음"}
URL: ${url}

JSON으로만 응답해 (설명 없이):
{
  "suggested_reasons": ["이유1", "이유2", "이유3"],
  "keywords": ["키워드1", "키워드2", "키워드3"],
  "category": "타이포그래피|레이아웃|컬러|브랜딩|UI|기타",
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

    if (!res.ok) {
      const errText = await res.text();
      console.error("Claude API error:", res.status, errText);
      return defaultResult;
    }

    const data = await res.json();
    const text: string = data?.content?.[0]?.text ?? "";

    // Extract JSON from response (may have trailing text)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return defaultResult;

    const parsed = JSON.parse(jsonMatch[0]) as Partial<AIAnalysis>;

    return {
      suggested_reasons:
        Array.isArray(parsed.suggested_reasons) && parsed.suggested_reasons.length > 0
          ? parsed.suggested_reasons.slice(0, 3)
          : defaultResult.suggested_reasons,
      keywords:
        Array.isArray(parsed.keywords) && parsed.keywords.length > 0
          ? parsed.keywords.slice(0, 5)
          : defaultResult.keywords,
      category: typeof parsed.category === "string" ? parsed.category : "기타",
      summary:
        typeof parsed.summary === "string" && parsed.summary.length > 0
          ? parsed.summary
          : defaultResult.summary,
    };
  } catch (err) {
    console.error("Error calling Claude API:", err);
    return defaultResult;
  }
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let url = "";

  try {
    const body = (await req.json()) as AnalyzeRequest;
    url = body?.url?.trim() ?? "";
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" } as AnalyzeResponse),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!url || !url.startsWith("http")) {
    return new Response(
      JSON.stringify({ error: "Invalid URL", ogImage: null, ogTitle: null, ogDescription: null, analysis: null } as AnalyzeResponse),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // ── 1. Fetch OG metadata ──
  let ogTitle: string | null = null;
  let ogDescription: string | null = null;
  let ogImage: string | null = null;

  try {
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    const fetchRes = await fetch(proxyUrl, { signal: AbortSignal.timeout(10000) });
    if (fetchRes.ok) {
      const json = await fetchRes.json();
      const meta = extractOGMeta(json.contents ?? "", url);
      ogTitle = meta.title;
      ogDescription = meta.description;
      ogImage = meta.image;
    }
  } catch (err) {
    console.warn("OG fetch failed:", err);
    // Continue without OG data
  }

  // ── 2. AI Analysis ──
  const analysis = await analyzeWithClaude(ogTitle, ogDescription, url);

  const response: AnalyzeResponse = {
    ogImage,
    ogTitle,
    ogDescription,
    analysis,
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
