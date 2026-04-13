// ─── ReDo Share Target Level 2 Handler ────────────────────────────────────────
// vite-plugin-pwa(generateSW)가 이 파일을 importScripts로 불러옵니다.
// Workbox fetch 리스너보다 먼저 등록되어 POST /save를 가로챕니다.

const SHARE_CACHE = "redo-share-v1";

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Share Target POST /save 만 처리
  if (url.pathname !== "/save" || event.request.method !== "POST") return;

  event.respondWith(
    (async () => {
      try {
        const formData = await event.request.formData();

        const title  = String(formData.get("title") ?? "");
        const text   = String(formData.get("text")  ?? "");
        const urlVal = String(formData.get("url")   ?? text ?? "");
        const image  = formData.get("image"); // File | null (Level 2)

        const cache = await caches.open(SHARE_CACHE);

        const meta = {
          title,
          text,
          url: urlVal,
          hasImage: false,
          ts: Date.now(),
        };

        if (image && image instanceof File && image.size > 0) {
          // 이미지 파일을 캐시에 저장
          const imgRes = new Response(image, {
            headers: { "Content-Type": image.type || "image/jpeg" },
          });
          await cache.put("/redo-share-image", imgRes);
          meta.hasImage = true;
        } else {
          // 이전 이미지 삭제
          await cache.delete("/redo-share-image");
        }

        // 메타데이터 저장
        await cache.put(
          "/redo-share-meta",
          new Response(JSON.stringify(meta), {
            headers: { "Content-Type": "application/json" },
          })
        );

        // 앱으로 리다이렉트
        return Response.redirect("/?fromShare=1", 303);
      } catch (err) {
        console.error("[SW Share Target]", err);
        return Response.redirect("/?fromShare=1", 303);
      }
    })()
  );
});
