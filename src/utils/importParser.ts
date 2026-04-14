// ─── Import Parser ─────────────────────────────────────────────────────────────
// CSV/JSON 파일을 파싱하여 카드 데이터로 변환합니다.

export interface ParsedCard {
  title: string;
  image: string;
  source: string;
  savedReason: string;
  chips: string[];
  urlValue?: string;
}

// ─── CSV 파싱 유틸 ─────────────────────────────────────────────────────────────

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, "_"));
  const rows = lines.slice(1).map((l) => parseCSVLine(l));

  return { headers, rows };
}

function getCol(row: string[], headers: string[], ...keys: string[]): string {
  for (const key of keys) {
    const idx = headers.indexOf(key);
    if (idx !== -1 && row[idx]) return row[idx];
  }
  return "";
}

// ─── Pinterest CSV ──────────────────────────────────────────────────────────────
// 컬럼: Title, Note, URL, Media URL, Board

export function parsePinterestCSV(text: string): ParsedCard[] {
  const { headers, rows } = parseCSV(text);

  return rows
    .map((row) => {
      const title = getCol(row, headers, "title", "제목");
      const note = getCol(row, headers, "note", "메모", "description");
      const url = getCol(row, headers, "url", "link");
      const mediaUrl = getCol(row, headers, "media_url", "image_url", "media");
      const board = getCol(row, headers, "board", "보드");

      if (!title && !mediaUrl) return null;

      return {
        title: title || "Pinterest 핀",
        image: mediaUrl,
        source: "Pinterest",
        savedReason: note || (board ? `${board} 보드에서 저장` : "Pinterest에서 저장한 핀"),
        chips: ["영감"],
        urlValue: url,
      } satisfies ParsedCard;
    })
    .filter((c) => c !== null) as ParsedCard[];
}

// ─── Notion CSV ────────────────────────────────────────────────────────────────
// 컬럼: Name, URL, Tags (or Properties)

export function parseNotionCSV(text: string): ParsedCard[] {
  const { headers, rows } = parseCSV(text);

  return rows
    .map((row) => {
      const name = getCol(row, headers, "name", "title", "제목", "이름");
      const url = getCol(row, headers, "url", "link", "링크");
      const tags = getCol(row, headers, "tags", "tag", "태그", "properties");
      const cover = getCol(row, headers, "cover", "image", "이미지");

      if (!name && !url) return null;

      const chipList = tags
        ? tags
            .split(/[,;|]/)
            .map((t) => t.trim())
            .filter(Boolean)
            .slice(0, 3)
        : ["레이아웃"];

      return {
        title: name || "Notion 페이지",
        image: cover,
        source: "Notion",
        savedReason: url ? `Notion 페이지 — ${url}` : "Notion에서 가져온 페이지",
        chips: chipList,
        urlValue: url,
      } satisfies ParsedCard;
    })
    .filter((c) => c !== null) as ParsedCard[];
}

// ─── Generic CSV ────────────────────────────────────────────────────────────────
// 컬럼: URL (필수), Title, Description/Note, Image/Thumbnail

export function parseGenericCSV(text: string): ParsedCard[] {
  const { headers, rows } = parseCSV(text);

  return rows
    .map((row) => {
      const url = getCol(row, headers, "url", "link", "링크", "주소");
      const title = getCol(
        row,
        headers,
        "title",
        "name",
        "제목",
        "이름",
        "title_text"
      );
      const description = getCol(
        row,
        headers,
        "description",
        "note",
        "memo",
        "desc",
        "설명",
        "메모"
      );
      const image = getCol(
        row,
        headers,
        "image",
        "image_url",
        "thumbnail",
        "cover",
        "media_url",
        "이미지"
      );
      const source = getCol(row, headers, "source", "platform", "출처");

      if (!url && !title) return null;

      let derivedSource = source;
      if (!derivedSource && url) {
        try {
          const hostname = new URL(url).hostname.replace("www.", "");
          derivedSource = hostname.split(".")[0];
          derivedSource =
            derivedSource.charAt(0).toUpperCase() + derivedSource.slice(1);
        } catch {
          derivedSource = "웹";
        }
      }

      return {
        title: title || url || "레퍼런스",
        image,
        source: derivedSource || "웹",
        savedReason: description || (url ? `${url}에서 저장` : "가져온 레퍼런스"),
        chips: ["영감"],
        urlValue: url,
      } satisfies ParsedCard;
    })
    .filter((c) => c !== null) as ParsedCard[];
}

// ─── JSON ───────────────────────────────────────────────────────────────────────
// [{ url, title, description, image, source, chips }] 형식

export function parseJSON(text: string): ParsedCard[] {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("JSON 파일 형식이 올바르지 않아요.");
  }

  const items = Array.isArray(data) ? data : [data];

  return items
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const obj = item as Record<string, unknown>;

      const url = String(obj.url ?? obj.link ?? obj.href ?? "");
      const title = String(
        obj.title ?? obj.name ?? obj.headline ?? url ?? ""
      );
      const description = String(
        obj.description ?? obj.desc ?? obj.note ?? obj.memo ?? obj.body ?? ""
      );
      const image = String(
        obj.image ?? obj.image_url ?? obj.thumbnail ?? obj.cover ?? obj.media_url ?? ""
      );
      const source = String(obj.source ?? obj.platform ?? obj.origin ?? "");
      const chipsRaw = obj.chips ?? obj.tags ?? obj.labels ?? [];
      const chips = Array.isArray(chipsRaw)
        ? chipsRaw.map(String).slice(0, 3)
        : [String(chipsRaw)].filter(Boolean);

      if (!url && !title) return null;

      let derivedSource = source;
      if (!derivedSource && url) {
        try {
          const hostname = new URL(url).hostname.replace("www.", "");
          derivedSource = hostname.split(".")[0];
          derivedSource =
            derivedSource.charAt(0).toUpperCase() + derivedSource.slice(1);
        } catch {
          derivedSource = "웹";
        }
      }

      return {
        title: title || url || "레퍼런스",
        image,
        source: derivedSource || "웹",
        savedReason: description || (url ? `${url}에서 저장` : "가져온 레퍼런스"),
        chips: chips.length > 0 ? chips : ["영감"],
        urlValue: url,
      } satisfies ParsedCard;
    })
    .filter((c) => c !== null) as ParsedCard[];
}

// ─── contentType 자동 감지 (URL 기반) ─────────────────────────────────────────
// URL을 분석해 레퍼런스의 contentType을 추론합니다.
// App.tsx의 handleSave, ImportScreen 등에서 공통 사용.

export type ContentType = "font" | "color" | "layout" | "article" | "mood" | "general";

export function detectContentType(url: string): ContentType {
  if (!url) return "general";
  const lower = url.toLowerCase();
  if (
    lower.includes("fonts.google") ||
    lower.includes("myfonts.com") ||
    lower.includes("noonnu.cc")
  )
    return "font";
  if (
    lower.includes("coolors.co") ||
    lower.includes("color.adobe.com") ||
    lower.includes("colorhunt.co")
  )
    return "color";
  if (
    lower.includes("figma.com/community") ||
    lower.includes("behance.net") ||
    lower.includes("dribbble.com")
  )
    return "layout";
  if (
    lower.includes("medium.com") ||
    lower.includes("brunch.co.kr") ||
    lower.includes("velog.io") ||
    lower.includes("notion.so")
  )
    return "article";
  if (
    lower.includes("pinterest.") ||
    lower.includes("unsplash.com") ||
    lower.includes("instagram.com")
  )
    return "mood";
  return "general";
}

// ─── 자동 감지 + 파싱 ──────────────────────────────────────────────────────────

export type PlatformHint = "pinterest" | "notion" | "generic" | "json" | "html" | "unknown";

export function detectPlatform(text: string, filename: string): PlatformHint {
  const ext = filename.split(".").pop()?.toLowerCase();

  if (ext === "json") return "json";

  if (ext === "csv") {
    const firstLine = text.split(/\r?\n/)[0].toLowerCase();
    if (firstLine.includes("board") || firstLine.includes("media_url")) {
      return "pinterest";
    }
    if (firstLine.includes("notion") || (firstLine.includes("name") && firstLine.includes("url"))) {
      return "notion";
    }
    return "generic";
  }

  return "unknown";
}

export function autoDetectAndParse(text: string, filename: string): ParsedCard[] {
  const platform = detectPlatform(text, filename);

  switch (platform) {
    case "pinterest":
      return parsePinterestCSV(text);
    case "notion":
      return parseNotionCSV(text);
    case "json":
      return parseJSON(text);
    case "generic":
    default:
      return parseGenericCSV(text);
  }
}
