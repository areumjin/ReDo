import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// ─── CORS Headers ─────────────────────────────────────────────────────────────

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface SummarizeRequest {
  url: string;
  title?: string;
  description?: string;
}

interface SummarizeResponse {
  summary: string;
  key_insights: string[];
  action_items: string[];
  error?: string;
}

const DEFAULT_RESPONSE: SummarizeResponse = {
  summary: "",
  key_insights: [],
  action_items: [],
};

// ─── Main handler ─────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify(DEFAULT_RESPONSE), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: SummarizeRequest = await req.json();
    const { url, title = "", description = "" } = body;

    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify(DEFAULT_RESPONSE), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Try to fetch full article content via jina.ai Reader API
    let content = description;
    try {
      const jinaRes = await fetch(`https://r.jina.ai/${url}`, {
        headers: { Accept: "text/plain" },
        signal: AbortSignal.timeout(12000),
      });
      if (jinaRes.ok) {
        const jinaText = await jinaRes.text();
        if (jinaText && jinaText.length > 100) {
          content = jinaText;
        }
      }
    } catch (jinaErr) {
      console.warn("[summarize-article] jina.ai fetch failed:", jinaErr);
      // Fall back to title + description
    }

    // Truncate content to 2000 characters
    const contentTruncated = content.slice(0, 2000);

    const prompt = `다음 콘텐츠를 분석해줘.\n제목: ${title}\n내용: ${contentTruncated}\n\nJSON으로만 응답: { "summary": "핵심 내용 2줄 요약", "key_insights": ["인사이트1", "인사이트2", "인사이트3"], "action_items": ["적용 포인트1", "적용 포인트2"] }`;

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 512,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!anthropicRes.ok) {
      console.warn("[summarize-article] Anthropic API error:", anthropicRes.status);
      return new Response(JSON.stringify(DEFAULT_RESPONSE), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anthropicData = await anthropicRes.json();
    const rawText: string = anthropicData?.content?.[0]?.text ?? "";

    let result: SummarizeResponse = DEFAULT_RESPONSE;
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        result = {
          summary: parsed.summary ?? "",
          key_insights: Array.isArray(parsed.key_insights) ? parsed.key_insights : [],
          action_items: Array.isArray(parsed.action_items) ? parsed.action_items : [],
        };
      }
    } catch {
      result = DEFAULT_RESPONSE;
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[summarize-article] Unexpected error:", err);
    return new Response(JSON.stringify(DEFAULT_RESPONSE), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
