// ─── Platform Import Edge Function ────────────────────────────────────────────
// Pinterest, Notion, Instagram에서 저장된 레퍼런스를 가져옵니다.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ImportedCard {
  title: string;
  image: string;
  source: string;
  savedReason: string;
  chips: string[];
}

// ─── Pinterest ─────────────────────────────────────────────────────────────────

async function importPinterest(token: string): Promise<ImportedCard[]> {
  // Validate token via user_account endpoint
  const userRes = await fetch("https://api.pinterest.com/v5/user_account", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!userRes.ok) {
    const err = await userRes.json().catch(() => ({}));
    throw new Error(`Pinterest 토큰이 유효하지 않아요. (${(err as { message?: string }).message ?? userRes.status})`);
  }

  // Fetch saved pins
  const pinsRes = await fetch(
    "https://api.pinterest.com/v5/pins?page_size=25&ad_account_id=",
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const pinsData = await pinsRes.json() as { items?: Record<string, unknown>[] };
  const items = pinsData.items ?? [];

  return items.map((pin) => {
    const media = (pin.media as Record<string, unknown>) ?? {};
    const images = (media.images as Record<string, Record<string, string>>) ?? {};
    const image =
      images["600x"]?.url ??
      images["400x"]?.url ??
      images["200x"]?.url ??
      "";

    return {
      title: (pin.title as string) || (pin.description as string) || "Pinterest 핀",
      image,
      source: "Pinterest",
      savedReason: (pin.description as string) || "Pinterest에서 저장한 핀",
      chips: ["영감"],
    };
  }).filter((c) => c.title || c.image);
}

// ─── Notion ───────────────────────────────────────────────────────────────────

async function importNotion(token: string): Promise<ImportedCard[]> {
  const notionVersion = "2022-06-28";

  // Validate token
  const meRes = await fetch("https://api.notion.com/v1/users/me", {
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": notionVersion,
    },
  });
  if (!meRes.ok) {
    throw new Error("Notion 토큰이 유효하지 않아요. 통합 토큰을 다시 확인해 주세요.");
  }

  // Search all pages accessible to this integration
  const searchRes = await fetch("https://api.notion.com/v1/search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": notionVersion,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      filter: { value: "page", property: "object" },
      page_size: 25,
    }),
  });
  const searchData = await searchRes.json() as { results?: Record<string, unknown>[] };
  const pages = searchData.results ?? [];

  return pages.map((page) => {
    const props = (page.properties as Record<string, Record<string, unknown>>) ?? {};
    const titleArr = (props.Name?.title ?? props.title?.title ?? []) as Array<{ text?: { content?: string } }>;
    const title = titleArr.map((t) => t.text?.content ?? "").join("") || "Notion 페이지";

    const cover = page.cover as Record<string, Record<string, string>> | null;
    const image = cover?.external?.url ?? cover?.file?.url ?? "";

    const pageUrl = (page.url as string) ?? "";

    return {
      title,
      image,
      source: "Notion",
      savedReason: `Notion 페이지 — ${pageUrl}`,
      chips: ["레이아웃"],
    };
  });
}

// ─── Instagram ─────────────────────────────────────────────────────────────────

async function importInstagram(token: string): Promise<ImportedCard[]> {
  // Validate token via basic user info
  const meRes = await fetch(
    `https://graph.instagram.com/me?fields=id,username&access_token=${token}`
  );
  if (!meRes.ok) {
    throw new Error("Instagram 토큰이 유효하지 않아요. Meta 개발자 포털에서 발급한 액세스 토큰을 확인해 주세요.");
  }
  const me = await meRes.json() as { username?: string };

  // Fetch media
  const mediaRes = await fetch(
    `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,permalink,thumbnail_url&access_token=${token}&limit=25`
  );
  const mediaData = await mediaRes.json() as { data?: Record<string, unknown>[] };
  const items = mediaData.data ?? [];

  return items
    .filter((item) => item.media_type === "IMAGE" || item.media_type === "CAROUSEL_ALBUM")
    .map((item) => {
      const caption = ((item.caption as string) ?? "").trim();
      const firstLine = caption.split("\n")[0].substring(0, 60);
      return {
        title: firstLine || `@${me.username ?? "instagram"} 게시물`,
        image: (item.media_url as string) ?? (item.thumbnail_url as string) ?? "",
        source: "Instagram",
        savedReason: caption.substring(0, 120) || "Instagram 저장 게시물",
        chips: ["사진"],
      };
    });
}

// ─── Main handler ──────────────────────────────────────────────────────────────

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { platform, token } = await req.json() as { platform: string; token: string };

    if (!token || typeof token !== "string" || token.trim().length < 5) {
      return new Response(
        JSON.stringify({ success: false, error: "토큰을 입력해 주세요." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let cards: ImportedCard[];

    if (platform === "pinterest") {
      cards = await importPinterest(token.trim());
    } else if (platform === "notion") {
      cards = await importNotion(token.trim());
    } else if (platform === "instagram") {
      cards = await importInstagram(token.trim());
    } else {
      return new Response(
        JSON.stringify({ success: false, error: `지원하지 않는 플랫폼: ${platform}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, cards, count: cards.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류가 발생했어요.";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
