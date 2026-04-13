// ─── Color Extractor ──────────────────────────────────────────────────────────
// Uses Canvas API to extract dominant colors from an image.

export interface ExtractedColor {
  hex: string;
  rgb: [number, number, number];
  percentage: number;
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  );
}

// Quantize a channel value to nearest multiple of `step`
function quantize(value: number, step: number): number {
  return Math.round(value / step) * step;
}

function getLuminance(r: number, g: number, b: number): number {
  // Simple perceived luminance (0–1)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

export async function extractColors(imageUrl: string): Promise<ExtractedColor[]> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    const onError = () => resolve([]);
    img.onerror = onError;

    img.onload = () => {
      try {
        const SIZE = 80; // Resize small for speed
        const canvas = document.createElement("canvas");
        canvas.width = SIZE;
        canvas.height = SIZE;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve([]);
          return;
        }

        ctx.drawImage(img, 0, 0, SIZE, SIZE);

        let imageData: ImageData;
        try {
          imageData = ctx.getImageData(0, 0, SIZE, SIZE);
        } catch {
          // CORS taint error — silently fail
          resolve([]);
          return;
        }

        const pixels = imageData.data;
        const STEP = 20; // Quantization step (20 = better color precision)
        const buckets = new Map<string, number>();
        const totalPixels = SIZE * SIZE;

        for (let i = 0; i < pixels.length; i += 4) {
          const r = pixels[i];
          const g = pixels[i + 1];
          const b = pixels[i + 2];
          const a = pixels[i + 3];

          // Skip transparent pixels
          if (a < 128) continue;

          const luminance = getLuminance(r, g, b);
          // Skip near-white (lum > 0.92) and near-black (lum < 0.08)
          if (luminance > 0.92 || luminance < 0.08) continue;

          // Quantize to reduce bucket count
          const qr = quantize(r, STEP);
          const qg = quantize(g, STEP);
          const qb = quantize(b, STEP);

          const key = `${qr},${qg},${qb}`;
          buckets.set(key, (buckets.get(key) ?? 0) + 1);
        }

        // Sort by saturation-boosted frequency (vivid/saturated colors get up to 4x weight)
        function getRGBSaturation(r: number, g: number, b: number): number {
          const max = Math.max(r, g, b) / 255;
          const min = Math.min(r, g, b) / 255;
          return max === 0 ? 0 : (max - min) / max;
        }

        const sorted = Array.from(buckets.entries()).sort((a, b) => {
          const [ar, ag, ab] = a[0].split(",").map(Number);
          const [br, bg, bb] = b[0].split(",").map(Number);
          const satA = getRGBSaturation(ar, ag, ab);
          const satB = getRGBSaturation(br, bg, bb);
          // Saturated colors get boosted weight (up to 4x for fully saturated)
          const weightA = a[1] * (1 + satA * 3);
          const weightB = b[1] * (1 + satB * 3);
          return weightB - weightA;
        });

        // Take top 5, compute percentage from total non-transparent pixels
        const nonTransparentCount = Array.from(buckets.values()).reduce(
          (acc, v) => acc + v,
          0
        );
        const denominator = nonTransparentCount || totalPixels;

        const results: ExtractedColor[] = sorted.slice(0, 6).map(([key, count]) => {
          const [r, g, b] = key.split(",").map(Number) as [number, number, number];
          return {
            hex: rgbToHex(r, g, b),
            rgb: [r, g, b],
            percentage: Math.round((count / denominator) * 100),
          };
        });

        resolve(results);
      } catch {
        resolve([]);
      }
    };

    img.src = imageUrl;
  });
}
