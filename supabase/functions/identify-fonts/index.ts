import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// ─── CORS Headers ─────────────────────────────────────────────────────────────

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface FontEntry {
  name: string;
  usage: string;
  weight: string;
  similar_free: string;
}

interface FontsResponse {
  fonts: FontEntry[];
  error?: string;
}

const DEFAULT_RESPONSE: FontsResponse = { fonts: [] };

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

    const { imageUrl } = await req.json();

    if (!imageUrl || typeof imageUrl !== "string") {
      return new Response(JSON.stringify(DEFAULT_RESPONSE), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch image and convert to base64
    let imageBase64: string;
    let mediaType: string;

    try {
      const imageRes = await fetch(imageUrl, {
        signal: AbortSignal.timeout(10000),
      });
      if (!imageRes.ok) throw new Error(`Image fetch failed: ${imageRes.status}`);

      const contentType = imageRes.headers.get("content-type") || "image/jpeg";
      mediaType = contentType.split(";")[0].trim() || "image/jpeg";

      const buffer = await imageRes.arrayBuffer();
      const uint8 = new Uint8Array(buffer);
      let binary = "";
      for (let i = 0; i < uint8.length; i++) {
        binary += String.fromCharCode(uint8[i]);
      }
      imageBase64 = btoa(binary);
    } catch (fetchErr) {
      console.warn("[identify-fonts] Image fetch error:", fetchErr);
      return new Response(JSON.stringify(DEFAULT_RESPONSE), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Anthropic Messages API call with vision
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
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType,
                  data: imageBase64,
                },
              },
              {
                type: "text",
                text: '이 디자인 이미지에서 사용된 폰트를 분석해줘. JSON으로만 응답(설명 없이): { "fonts": [{ "name": "폰트명", "usage": "헤드라인|본문|캡션", "weight": "Regular|Medium|Bold", "similar_free": "유사 무료 폰트명" }] }',
              },
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!anthropicRes.ok) {
      console.warn("[identify-fonts] Anthropic API error:", anthropicRes.status);
      return new Response(JSON.stringify(DEFAULT_RESPONSE), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anthropicData = await anthropicRes.json();
    const rawText: string = anthropicData?.content?.[0]?.text ?? "";

    // Extract JSON from response
    let result: FontsResponse = DEFAULT_RESPONSE;
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed?.fonts)) {
          result = { fonts: parsed.fonts };
        }
      }
    } catch {
      result = DEFAULT_RESPONSE;
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[identify-fonts] Unexpected error:", err);
    return new Response(JSON.stringify(DEFAULT_RESPONSE), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
