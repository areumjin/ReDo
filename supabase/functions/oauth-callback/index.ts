// ─── OAuth Callback Edge Function ─────────────────────────────────────────────
// Pinterest / Notion / Instagram 인증 코드를 액세스 토큰으로 교환합니다.
// 팝업 창에서 실행되며, 완료 후 window.opener에 postMessage를 보냅니다.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const PLATFORM_CONFIG: Record<string, {
  tokenUrl: string;
  clientIdEnv: string;
  clientSecretEnv: string;
  method: "basic" | "form";
}> = {
  pinterest: {
    tokenUrl: "https://api.pinterest.com/v5/oauth/token",
    clientIdEnv: "PINTEREST_CLIENT_ID",
    clientSecretEnv: "PINTEREST_CLIENT_SECRET",
    method: "basic",
  },
  notion: {
    tokenUrl: "https://api.notion.com/v1/oauth/token",
    clientIdEnv: "NOTION_CLIENT_ID",
    clientSecretEnv: "NOTION_CLIENT_SECRET",
    method: "basic",
  },
  instagram: {
    tokenUrl: "https://api.instagram.com/oauth/access_token",
    clientIdEnv: "INSTAGRAM_APP_ID",
    clientSecretEnv: "INSTAGRAM_APP_SECRET",
    method: "form",
  },
};

function resultPage(platform: string, token?: string, error?: string): string {
  const msg = token
    ? JSON.stringify({ type: "oauth_success", platform, token })
    : JSON.stringify({ type: "oauth_error", platform, error: error ?? "알 수 없는 오류" });

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${token ? "연결 완료" : "연결 실패"}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #F8F7F4; }
    .box { text-align: center; padding: 32px; }
    .icon { font-size: 52px; margin-bottom: 16px; }
    .title { font-size: 16px; font-weight: 700; color: #1A1A2E; margin: 0 0 8px; }
    .desc { font-size: 13px; color: #888; margin: 0; }
  </style>
</head>
<body>
  <div class="box">
    <div class="icon">${token ? "✅" : "❌"}</div>
    <p class="title">${token ? "연결이 완료됐어요" : "연결에 실패했어요"}</p>
    <p class="desc">${token ? "창이 자동으로 닫힙니다." : (error ?? "")}</p>
  </div>
  <script>
    (function() {
      var data = ${msg};
      try { if (window.opener) window.opener.postMessage(data, "*"); } catch(e) {}
      setTimeout(function() { try { window.close(); } catch(e) {} }, 900);
    })();
  </script>
</body>
</html>`;
}

serve(async (req) => {
  const url = new URL(req.url);
  const platform = url.searchParams.get("platform") ?? "";
  const code = url.searchParams.get("code");
  const errorParam = url.searchParams.get("error");
  const errorDesc = url.searchParams.get("error_description");

  // User denied access
  if (errorParam) {
    return new Response(resultPage(platform, undefined, decodeURIComponent(errorDesc ?? errorParam)), {
      headers: { "Content-Type": "text/html" },
    });
  }

  if (!code || !platform) {
    return new Response(resultPage(platform, undefined, "인증 코드가 없어요."), {
      headers: { "Content-Type": "text/html" },
    });
  }

  const config = PLATFORM_CONFIG[platform];
  if (!config) {
    return new Response(resultPage(platform, undefined, `지원하지 않는 플랫폼: ${platform}`), {
      headers: { "Content-Type": "text/html" },
    });
  }

  const clientId = Deno.env.get(config.clientIdEnv) ?? "";
  const clientSecret = Deno.env.get(config.clientSecretEnv) ?? "";

  if (!clientId || !clientSecret) {
    return new Response(resultPage(platform, undefined, "서버에 앱 자격증명이 설정되지 않았어요."), {
      headers: { "Content-Type": "text/html" },
    });
  }

  try {
    // Reconstruct redirect_uri (same URL without code/state params)
    const redirectUri = `${url.origin}${url.pathname}?platform=${platform}`;
    let token: string | undefined;

    if (config.method === "basic") {
      const tokenRes = await fetch(config.tokenUrl, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ grant_type: "authorization_code", code, redirect_uri: redirectUri }),
      });
      const tokenData = await tokenRes.json() as Record<string, unknown>;
      token = tokenData.access_token as string;
    } else {
      // form method (Instagram)
      const tokenRes = await fetch(config.tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
          code,
        }),
      });
      const tokenData = await tokenRes.json() as Record<string, unknown>;
      token = tokenData.access_token as string;
    }

    if (!token) throw new Error("토큰을 받지 못했어요.");

    return new Response(resultPage(platform, token), {
      headers: { "Content-Type": "text/html" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "토큰 교환 중 오류가 발생했어요.";
    return new Response(resultPage(platform, undefined, msg), {
      headers: { "Content-Type": "text/html" },
    });
  }
});
