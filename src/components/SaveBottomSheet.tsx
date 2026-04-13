import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { fetchLinkMetadata, extractChipsFromMeta } from "../utils/fetchMetadata";

const FONT =
  "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Noto Sans KR', system-ui, sans-serif";

const PROJECTS = ["영감", "작업", "학습", "아이디어", "기타"];

const FOLDER_PRESET_COLORS = [
  "#6A70FF", // brand
  "#22C55E", // green
  "#F59E0B", // amber
  "#EC4899", // pink
  "#EF4444", // red
  "#8B5CF6", // purple
  "#06B6D4", // cyan
  "#F97316", // orange
];

// 고정 태그 풀 — AI도 여기서만 추천, 사용자도 여기서만 선택
const ALL_TAGS = [
  "타이포그래피", "레이아웃", "컬러", "브랜딩", "로고",
  "UI", "모션", "일러스트", "포스터", "아이덴티티",
  "그리드", "미니멀", "패키징", "웹디자인", "영상",
  "공간", "전시", "패턴", "사진", "폰트",
];

// AI가 반환한 키워드를 고정 태그 풀에 매핑
function mapToAllTags(keywords: string[]): string[] {
  const result: string[] = [];
  for (const kw of keywords) {
    const kwLower = kw.toLowerCase();
    // 완전 일치 또는 부분 포함 매핑
    const matched = ALL_TAGS.find(
      (tag) => tag.toLowerCase() === kwLower ||
               tag.toLowerCase().includes(kwLower) ||
               kwLower.includes(tag.toLowerCase())
    );
    if (matched && !result.includes(matched)) result.push(matched);
  }
  return result;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type FetchState = "idle" | "loading" | "success" | "error";

interface AIAnalysis {
  suggested_reasons: string[];
  keywords: string[];
  category: string;
  summary: string;
}

type AIState = "idle" | "loading" | "done" | "error";

interface OGMeta {
  image: string | null;
  title: string | null;
  domain: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function isValidUrl(str: string): boolean {
  try {
    const u = new URL(str.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function parseOGMeta(html: string, baseUrl: string): OGMeta {
  const getContent = (property: string): string | null => {
    // Match both property= and name= variants
    const patterns = [
      new RegExp(
        `<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`,
        "i"
      ),
      new RegExp(
        `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`,
        "i"
      ),
    ];
    for (const re of patterns) {
      const m = html.match(re);
      if (m?.[1]) return m[1].trim();
    }
    return null;
  };

  let image = getContent("og:image") || getContent("twitter:image");
  const title =
    getContent("og:title") ||
    getContent("twitter:title") ||
    html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ||
    null;

  // Resolve relative image URLs
  if (image && !image.startsWith("http")) {
    try {
      image = new URL(image, baseUrl).href;
    } catch {
      image = null;
    }
  }

  return { image, title, domain: extractDomain(baseUrl) };
}

async function fetchOGMeta(url: string): Promise<OGMeta> {
  const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
  const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error("fetch failed");
  const json = await res.json();
  return parseOGMeta(json.contents || "", url);
}

// ─── Keyframe injection ───────────────────────────────────────────────────────

const STYLE_ID = "redo-sheet-keyframes";
if (typeof document !== "undefined" && !document.getElementById(STYLE_ID)) {
  const s = document.createElement("style");
  s.id = STYLE_ID;
  s.textContent = `
    @keyframes redo-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.45; }
    }
    @keyframes redo-shimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(200%); }
    }
    @keyframes redo-fadein {
      from { opacity: 0; transform: translateY(4px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes redo-scalein {
      from { opacity: 0; transform: scale(0.78); }
      to   { opacity: 1; transform: scale(1); }
    }
    @keyframes redo-expandin {
      from { opacity: 0; width: 72px; }
      to   { opacity: 1; width: 148px; }
    }
    @keyframes redo-dot-bounce {
      0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
      40% { transform: scale(1); opacity: 1; }
    }
  `;
  document.head.appendChild(s);
}

// ─── Section Label ────────────────────────────────────────────────────────────

function SectionLabel({
  children,
  color,
}: {
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <p
      style={{
        fontSize: "var(--text-context-label)",
        fontWeight: "var(--font-weight-medium)",
        color: color ?? "var(--redo-text-tertiary)",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        margin: 0,
        marginBottom: 8,
        lineHeight: 1.3,
        fontFamily: FONT,
      }}
    >
      {children}
    </p>
  );
}

// ─── Thumbnail Preview ────────────────────────────────────────────────────────

function ThumbnailPreview({
  fetchState,
  meta,
  onClear,
}: {
  fetchState: FetchState;
  meta: OGMeta | null;
  onClear: () => void;
}) {
  if (fetchState === "idle") return null;

  // ── Loading ──
  if (fetchState === "loading") {
    return (
      <div
        style={{
          marginTop: 10,
          borderRadius: 10,
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Pulsing skeleton */}
        <div
          style={{
            width: "100%",
            height: 80,
            background: "var(--redo-bg-secondary)",
            borderRadius: 10,
            border: "0.5px solid var(--redo-border)",
            position: "relative",
            overflow: "hidden",
            animation: "redo-pulse 1.4s ease-in-out infinite",
          }}
        >
          {/* Shimmer sweep */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "40%",
              height: "100%",
              background:
                "linear-gradient(90deg, transparent, rgba(106,112,255,0.08), transparent)",
              animation: "redo-shimmer 1.6s ease-in-out infinite",
            }}
          />
        </div>
        {/* Text skeleton row */}
        <div
          style={{
            marginTop: 8,
            display: "flex",
            flexDirection: "column",
            gap: 5,
          }}
        >
          <div
            style={{
              height: 11,
              width: "75%",
              borderRadius: 6,
              background: "var(--redo-bg-secondary)",
              animation: "redo-pulse 1.4s ease-in-out infinite 0.1s",
            }}
          />
          <div
            style={{
              height: 11,
              width: "45%",
              borderRadius: 6,
              background: "var(--redo-bg-secondary)",
              animation: "redo-pulse 1.4s ease-in-out infinite 0.2s",
            }}
          />
        </div>
      </div>
    );
  }

  // ── Error ──
  if (fetchState === "error" || (fetchState === "success" && !meta?.image)) {
    return (
      <div
        style={{
          marginTop: 10,
          width: "100%",
          height: 68,
          borderRadius: 10,
          background: "var(--redo-bg-secondary)",
          border: "0.5px solid var(--redo-border)",
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "0 14px",
          position: "relative",
          animation: "redo-fadein 0.2s ease",
        }}
      >
        {/* Generic link icon */}
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: "rgba(106,112,255,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"
              stroke="var(--redo-brand)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontSize: "var(--text-micro)",
              fontWeight: "var(--font-weight-medium)",
              color: "var(--redo-text-secondary)",
              margin: 0,
              lineHeight: 1.4,
              fontFamily: FONT,
            }}
          >
            {meta?.title || "미리보기를 불러올 수 없어요"}
          </p>
          {meta?.domain && (
            <span
              style={{
                display: "inline-block",
                marginTop: 4,
                fontSize: 9,
                color: "var(--redo-text-tertiary)",
                background: "var(--redo-bg-input)",
                borderRadius: "var(--radius-chip)",
                padding: "2px 7px",
                fontFamily: FONT,
              }}
            >
              {meta.domain}
            </span>
          )}
        </div>
        {/* Clear button */}
        <ClearButton onClear={onClear} />
      </div>
    );
  }

  // ── Success with image ──
  if (fetchState === "success" && meta?.image) {
    return (
      <div
        style={{
          marginTop: 10,
          borderRadius: 10,
          border: "0.5px solid var(--redo-border)",
          overflow: "hidden",
          background: "var(--redo-bg-secondary)",
          position: "relative",
          animation: "redo-fadein 0.22s ease",
        }}
      >
        {/* Hero thumbnail */}
        <div
          style={{
            width: "100%",
            height: 80,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <img
            src={meta.image}
            alt={meta.title || ""}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
          {/* Clear X button top-right */}
          <div style={{ position: "absolute", top: 6, right: 6 }}>
            <ClearButton onClear={onClear} dark />
          </div>
        </div>

        {/* Meta row below image */}
        <div style={{ padding: "8px 10px 10px" }}>
          {meta.title && (
            <p
              style={{
                fontSize: "var(--text-caption)",
                fontWeight: "var(--font-weight-medium)",
                color: "var(--redo-text-primary)",
                margin: 0,
                marginBottom: 5,
                lineHeight: 1.4,
                fontFamily: FONT,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {meta.title}
            </p>
          )}
          {/* Domain chip */}
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: 9,
              color: "var(--redo-text-tertiary)",
              background: "var(--redo-bg-input)",
              borderRadius: "var(--radius-chip)",
              padding: "2px 8px",
              fontFamily: FONT,
              border: "0.5px solid var(--redo-border)",
            }}
          >
            {/* Globe dot */}
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: "var(--redo-brand)",
                flexShrink: 0,
              }}
            />
            {meta.domain}
          </span>
        </div>
      </div>
    );
  }

  return null;
}

// ─── Clear button ─────────────────────────────────────────────────────────────

function ClearButton({
  onClear,
  dark,
}: {
  onClear: () => void;
  dark?: boolean;
}) {
  return (
    <button
      onClick={onClear}
      style={{
        width: 22,
        height: 22,
        minWidth: 36,
        minHeight: 36,
        borderRadius: "50%",
        background: dark ? "rgba(0,0,0,0.45)" : "var(--redo-bg-input)",
        border: "none",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none">
        <path
          d="M18 6L6 18M6 6l12 12"
          stroke={dark ? "#fff" : "var(--redo-text-secondary)"}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}

// ─── URL Input Row ────────────────────────────────────────────────────────────

function UrlInputRow({
  urlValue,
  setUrlValue,
  fetchState,
  onPaste,
  onClear,
}: {
  urlValue: string;
  setUrlValue: (v: string) => void;
  fetchState: FetchState;
  onPaste: (url: string) => void;
  onClear: () => void;
}) {
  const isActive = fetchState !== "idle";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        height: 40,
        background: "var(--redo-bg-input)",
        borderRadius: "var(--radius-button)",
        border: isActive
          ? "0.5px solid var(--redo-brand-mid)"
          : "0.5px solid var(--redo-border)",
        paddingLeft: 10,
        paddingRight: 8,
        gap: 8,
        transition: "border-color 0.2s ease",
      }}
    >
      {/* Link icon — spins slightly while loading */}
      <div
        style={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          opacity: isActive ? 1 : 0.38,
          transition: "opacity 0.2s",
        }}
      >
        {fetchState === "loading" ? (
          // Spinner
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            style={{ animation: "spin 0.9s linear infinite" }}
          >
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <circle
              cx="12"
              cy="12"
              r="9"
              stroke="var(--redo-brand)"
              strokeWidth="2.5"
              strokeDasharray="40 20"
              strokeLinecap="round"
            />
          </svg>
        ) : (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path
              d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"
              stroke={isActive ? "var(--redo-brand)" : "var(--redo-text-primary)"}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>

      <input
        type="url"
        value={urlValue}
        onChange={(e) => setUrlValue(e.target.value)}
        onPaste={(e) => {
          const pasted = e.clipboardData.getData("text").trim();
          if (isValidUrl(pasted)) {
            e.preventDefault();
            setUrlValue(pasted);
            onPaste(pasted);
          }
        }}
        placeholder="URL을 붙여넣거나 이미지를 첨부하세요"
        style={{
          flex: 1,
          border: "none",
          background: "transparent",
          outline: "none",
          fontSize: "var(--text-caption)",
          fontWeight: "var(--font-weight-regular)",
          color: "var(--redo-text-primary)",
          fontFamily: FONT,
          lineHeight: 1.4,
          minWidth: 0,
        }}
      />

      {/* Clear or image-attach button */}
      {isActive ? (
        <button
          onClick={onClear}
          style={{
            flexShrink: 0,
            width: 22,
            height: 22,
            minWidth: 32,
            minHeight: 32,
            borderRadius: "50%",
            background: "var(--redo-bg-secondary)",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none">
            <path
              d="M18 6L6 18M6 6l12 12"
              stroke="var(--redo-text-secondary)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      ) : (
        <button
          style={{
            flexShrink: 0,
            width: 28,
            height: 28,
            minWidth: 36,
            minHeight: 36,
            borderRadius: 8,
            background: "rgba(106,112,255,0.10)",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <rect
              x="3"
              y="3"
              width="18"
              height="18"
              rx="3"
              stroke="var(--redo-brand)"
              strokeWidth="1.8"
            />
            <circle
              cx="8.5"
              cy="8.5"
              r="1.5"
              stroke="var(--redo-brand)"
              strokeWidth="1.8"
            />
            <path
              d="M3 15l5-5 4 4 3-3 6 5"
              stroke="var(--redo-brand)"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}
    </div>
  );
}

// ─── Project Chips Row ────────────────────────────────────────────────────────

interface ProjectChipsRowProps {
  projects: string[];
  activeProject: string;
  newProject: string | null;
  onSelect: (proj: string) => void;
  onAdd: (name: string, color: string) => void;
  folderColors?: Record<string, string>;
}

function ProjectChipsRow({
  projects,
  activeProject,
  newProject,
  onSelect,
  onAdd,
  folderColors,
}: ProjectChipsRowProps) {
  const [adding, setAdding] = useState(false);
  const [inputVal, setInputVal] = useState("");
  const [selectedColor, setSelectedColor] = useState(FOLDER_PRESET_COLORS[0]);
  const inputRef = useRef<HTMLInputElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);

  const openInput = () => {
    setAdding(true);
    // Focus after animation frame so the element is mounted
    requestAnimationFrame(() => {
      requestAnimationFrame(() => inputRef.current?.focus());
    });
  };

  const confirm = () => {
    const name = inputVal.trim();
    setInputVal("");
    setAdding(false);
    if (name) {
      onAdd(name, selectedColor);
      // Scroll to end to reveal new chip
      setTimeout(() => {
        if (rowRef.current) {
          rowRef.current.scrollLeft = rowRef.current.scrollWidth;
        }
      }, 80);
    }
  };

  const cancel = () => {
    setInputVal("");
    setAdding(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") confirm();
    if (e.key === "Escape") cancel();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
    <div
      ref={rowRef}
      style={{
        display: "flex",
        gap: 6,
        overflowX: "auto",
        scrollbarWidth: "none",
        alignItems: "center",
        // Negative margin trick so chips don't clip on y-axis during scale animation
        paddingTop: 6,
        marginTop: -6,
        paddingBottom: 6,
        marginBottom: -6,
      }}
    >
      {projects.map((proj) => {
        const isActive = activeProject === proj;
        const isNew = proj === newProject;
        const chipColor = folderColors?.[proj] ?? "#6A70FF";
        return (
          <button
            key={proj}
            onClick={() => onSelect(proj)}
            style={{
              height: 32,
              minHeight: 44,
              paddingLeft: 13,
              paddingRight: 13,
              borderRadius: "var(--radius-chip)",
              fontSize: "var(--text-caption)",
              fontWeight: isActive
                ? "var(--font-weight-medium)"
                : "var(--font-weight-regular)",
              color: isActive
                ? "var(--redo-context-text)"
                : "var(--redo-text-secondary)",
              background: isActive
                ? "var(--redo-brand-light)"
                : "var(--redo-bg-secondary)",
              border: isActive
                ? "0.5px solid var(--redo-brand-mid)"
                : "0.5px solid var(--redo-border)",
              cursor: "pointer",
              fontFamily: FONT,
              display: "flex",
              alignItems: "center",
              gap: 5,
              flexShrink: 0,
              whiteSpace: "nowrap",
              transition: "all 0.15s ease",
              // Scale-in animation on newly added chips
              animation: isNew ? "redo-scalein 0.15s ease-out" : "none",
              transformOrigin: "left center",
            }}
          >
            <div style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: chipColor,
              flexShrink: 0,
            }} />
            {proj}
          </button>
        );
      })}

      {/* Inline input — replaces the chip in the same row */}
      {adding ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            height: 32,
            minHeight: 44,
            width: 148,
            flexShrink: 0,
            background: "#ffffff",
            borderRadius: "var(--radius-chip)",
            border: "1px solid var(--redo-brand)",
            paddingLeft: 10,
            paddingRight: 6,
            gap: 3,
            animation: "redo-expandin 0.15s ease-out",
            // Keep measured width stable after animation ends
            boxSizing: "border-box",
          }}
        >
          <input
            ref={inputRef}
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              // Slight delay so confirm/cancel buttons can fire first
              setTimeout(() => {
                if (document.activeElement !== inputRef.current) cancel();
              }, 150);
            }}
            placeholder="폴더 이름"
            maxLength={16}
            style={{
              flex: 1,
              border: "none",
              background: "transparent",
              outline: "none",
              fontSize: "var(--text-caption)",
              fontWeight: "var(--font-weight-regular)",
              color: "var(--redo-text-primary)",
              fontFamily: FONT,
              lineHeight: 1.4,
              minWidth: 0,
            }}
          />

          {/* Confirm ✓ */}
          <button
            onMouseDown={(e) => e.preventDefault()} // prevent blur before click
            onClick={confirm}
            style={{
              width: 22,
              height: 22,
              minWidth: 30,
              minHeight: 30,
              borderRadius: "50%",
              background: inputVal.trim()
                ? "var(--redo-brand)"
                : "var(--redo-bg-secondary)",
              border: "none",
              cursor: inputVal.trim() ? "pointer" : "default",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              transition: "background 0.15s ease",
            }}
          >
            <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
              <path
                d="M2 6l3 3 5-5"
                stroke={inputVal.trim() ? "#fff" : "var(--redo-text-tertiary)"}
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {/* Cancel ✕ */}
          <button
            onMouseDown={(e) => e.preventDefault()} // prevent blur before click
            onClick={cancel}
            style={{
              width: 20,
              height: 20,
              minWidth: 26,
              minHeight: 26,
              borderRadius: "50%",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
              <path
                d="M9 3L3 9M3 3l6 6"
                stroke="var(--redo-text-tertiary)"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      ) : (
        /* + 추가 dashed chip */
        <button
          onClick={openInput}
          style={{
            height: 32,
            minHeight: 44,
            paddingLeft: 12,
            paddingRight: 12,
            borderRadius: "var(--radius-chip)",
            fontSize: "var(--text-caption)",
            fontWeight: "var(--font-weight-regular)",
            color: "var(--redo-text-tertiary)",
            background: "transparent",
            border: "1px dashed var(--redo-border)",
            cursor: "pointer",
            fontFamily: FONT,
            display: "flex",
            alignItems: "center",
            gap: 4,
            flexShrink: 0,
            whiteSpace: "nowrap",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor =
              "var(--redo-brand-mid)";
            (e.currentTarget as HTMLButtonElement).style.color =
              "var(--redo-brand)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor =
              "var(--redo-border)";
            (e.currentTarget as HTMLButtonElement).style.color =
              "var(--redo-text-tertiary)";
          }}
        >
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
            <path
              d="M6 2v8M2 6h8"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          추가
        </button>
      )}
    </div>
    {adding && (
      <div style={{ display: "flex", gap: 6, paddingLeft: 2, paddingBottom: 2 }}>
        {FOLDER_PRESET_COLORS.map((color) => (
          <button
            key={color}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setSelectedColor(color)}
            style={{
              width: 22,
              height: 22,
              minWidth: 22,
              minHeight: 22,
              borderRadius: "50%",
              background: color,
              border: selectedColor === color
                ? "2.5px solid var(--redo-text-primary)"
                : "2.5px solid transparent",
              cursor: "pointer",
              padding: 0,
              outline: "none",
              boxSizing: "border-box",
              transition: "border 0.12s ease",
            }}
          />
        ))}
      </div>
    )}
    </div>
  );
}

// ─── Save Bottom Sheet ────────────────────────────────────────────────────────

export interface SavePayload {
  title: string;
  savedReason: string;
  imageUrl: string | null;
  url: string;
  projectTag: string;
  chips: string[];
  source: string;
}

interface SaveBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  onSave?: (info: SavePayload & { urlValue: string }) => void;
  onOptimisticSave?: (info: {
    projectTag: string;
    image: string | null;
    title: string;
    urlValue: string;
  }) => void;
  initialUrl?: string;
  initialTitle?: string;
  existingProjects?: string[];
  folderColors?: Record<string, string>;
  onFolderColorChange?: (name: string, color: string) => void;
}

export function SaveBottomSheet({
  visible,
  onClose,
  onSave,
  onOptimisticSave,
  initialUrl,
  initialTitle,
  existingProjects,
  folderColors,
  onFolderColorChange,
}: SaveBottomSheetProps) {
  const [phase, setPhase] = useState<
    "hidden" | "entering" | "visible" | "leaving"
  >("hidden");

  const [urlValue, setUrlValue] = useState("");
  const [fetchState, setFetchState] = useState<FetchState>("idle");
  const [meta, setMeta] = useState<OGMeta | null>(null);

  const allProjects = useMemo(() => {
    const base = [...PROJECTS];
    if (existingProjects) {
      for (const p of existingProjects) {
        if (!base.includes(p)) base.push(p);
      }
    }
    return base;
  }, [existingProjects]);

  const [activeProject, setActiveProject] = useState("영감");
  const [projects, setProjects] = useState<string[]>(allProjects);
  const [selectedChips, setSelectedChips] = useState<string[]>([]);
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]); // AI 추천 이유 다중선택
  const [tagPickerOpen, setTagPickerOpen] = useState(false);           // 태그 추가 피커
  const [memoValue, setMemoValue] = useState("");
  const [newProject, setNewProject] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // AI analysis state
  const [aiState, setAiState] = useState<AIState>("idle");
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const aiDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Image upload state
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sheetRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number | null>(null);
  const dragDeltaRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  // Open/close animation
  useEffect(() => {
    if (visible) {
      setPhase("entering");
      const t = requestAnimationFrame(() => {
        requestAnimationFrame(() => setPhase("visible"));
      });
      return () => cancelAnimationFrame(t);
    } else {
      setPhase("leaving");
      const t = setTimeout(() => setPhase("hidden"), 300);
      return () => clearTimeout(t);
    }
  }, [visible]);

  // Reset on open
  useEffect(() => {
    if (visible) {
      const startUrl = initialUrl ?? "";
      setUrlValue(startUrl);
      setFetchState("idle");
      setMeta(null);
      setActiveProject("영감");
      setProjects([...allProjects]);
      setSelectedChips([]);
      setSelectedReasons([]);
      setTagPickerOpen(false);
      setMemoValue(initialTitle ?? "");
      setNewProject(null);
      setSaved(false);
      setAiState("idle");
      setAiAnalysis(null);
      setUploadedImageUrl(null);
      setImageUploading(false);
      if (aiDebounceRef.current) clearTimeout(aiDebounceRef.current);
      // Auto-trigger fetch if initialUrl provided
      if (startUrl && isValidUrl(startUrl)) {
        triggerFetch(startUrl);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // AI analysis via Supabase Edge Function (debounced 1.2s)
  // ⚠️ must be declared BEFORE triggerFetch which references it
  const triggerAIAnalysis = useCallback((url: string, prefetchedTitle?: string, prefetchedDescription?: string) => {
    if (aiDebounceRef.current) clearTimeout(aiDebounceRef.current);

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    if (!supabaseUrl) return; // graceful: no Supabase configured

    aiDebounceRef.current = setTimeout(async () => {
      setAiState("loading");
      setAiAnalysis(null);
      try {
        const endpoint = `${supabaseUrl}/functions/v1/analyze-url`;
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url,
            title: prefetchedTitle ?? meta?.title ?? undefined,
            description: prefetchedDescription ?? undefined,
          }),
          signal: AbortSignal.timeout(20000),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        if (data.analysis) {
          setAiAnalysis(data.analysis as AIAnalysis);

          // Auto-fill keyword chips — map AI keywords to fixed ALL_TAGS pool
          const aiKeywords: string[] = data.analysis.keywords ?? [];
          const mappedTags = mapToAllTags(aiKeywords);
          if (mappedTags.length > 0) {
            setSelectedChips((prev) => {
              const merged = [...new Set([...prev, ...mappedTags])];
              return merged.slice(0, 6);
            });
          }

          // If OG image came back and meta doesn't have one, apply it
          if (data.ogImage && meta && !meta.image) {
            setMeta((prev) => prev ? { ...prev, image: data.ogImage } : prev);
          }
        }
        setAiState("done");
      } catch (err) {
        console.warn("AI analysis failed:", err);
        setAiState("error");
      }
    }, 1200);
  }, [meta]);

  // Fetch link metadata using fetchLinkMetadata util
  const triggerFetch = useCallback(async (url: string) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setFetchState("loading");
    setMeta(null);

    try {
      const linkMeta = await fetchLinkMetadata(url);
      setMeta({
        image: linkMeta.imageUrl,
        title: linkMeta.title || null,
        domain: linkMeta.siteName || extractDomain(url),
      });
      setFetchState("success");

      // 메타 가져온 후 title/description 함께 AI 분석 트리거
      triggerAIAnalysis(url, linkMeta.title || undefined, linkMeta.description || undefined);

      // Auto-fill description (savedReason) if textarea is empty
      if (linkMeta.description && !memoValue) {
        setMemoValue(linkMeta.description.slice(0, 120));
      }

      // Auto-fill tags from meta keywords (mapped to fixed ALL_TAGS pool)
      const rawChips = extractChipsFromMeta(linkMeta);
      const autoChips = mapToAllTags(rawChips);
      if (autoChips.length > 0) {
        setSelectedChips((prev) => {
          const merged = [...new Set([...prev, ...autoChips])];
          return merged.slice(0, 6);
        });
      }
    } catch {
      setMeta({ image: null, title: null, domain: extractDomain(url) });
      setFetchState("error");
      // 메타 실패해도 AI 분석은 시도
      triggerAIAnalysis(url);
    }
  }, [memoValue, triggerAIAnalysis]);

  const handleClear = () => {
    abortRef.current?.abort();
    if (aiDebounceRef.current) clearTimeout(aiDebounceRef.current);
    setUrlValue("");
    setFetchState("idle");
    setMeta(null);
    setAiState("idle");
    setAiAnalysis(null);
    setUploadedImageUrl(null);
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageUploading(true);

    // Show base64 preview immediately
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string;
      setUploadedImageUrl(base64);

      // Try uploading to Supabase Storage if configured
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

      if (supabaseUrl && supabaseKey) {
        try {
          const filename = `${Date.now()}.jpg`;
          const uploadRes = await fetch(
            `${supabaseUrl}/storage/v1/object/references/${filename}`,
            {
              method: "POST",
              headers: {
                "Content-Type": file.type || "image/jpeg",
                apikey: supabaseKey,
                Authorization: `Bearer ${supabaseKey}`,
              },
              body: file,
            }
          );
          if (uploadRes.ok) {
            const publicUrl = `${supabaseUrl}/storage/v1/object/public/references/${filename}`;
            setUploadedImageUrl(publicUrl);
          }
        } catch {
          // Keep base64 preview on upload error
        }
      }

      setImageUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const toggleChip = (chip: string) => {
    setSelectedChips((prev) =>
      prev.includes(chip) ? prev.filter((c) => c !== chip) : [...prev, chip]
    );
  };

  const handleSave = () => {
    const finalImageUrl = uploadedImageUrl ?? meta?.image ?? null;
    // Fire optimistic callback immediately — no delay
    onOptimisticSave?.({
      projectTag: activeProject,
      image: finalImageUrl,
      title: meta?.title ?? meta?.domain ?? (urlValue ? urlValue : "새 레퍼런스"),
      urlValue,
    });

    setSaved(true);
    setTimeout(() => {
      onSave?.({
        title: meta?.title ?? (urlValue ? extractDomain(urlValue) : "새 레퍼런스"),
        savedReason: [...selectedReasons, memoValue].filter(Boolean).join(" · "),
        imageUrl: finalImageUrl,
        url: urlValue,
        projectTag: activeProject,
        chips: selectedChips,
        source: meta?.domain ?? extractDomain(urlValue),
        urlValue,
      });
      onClose();
    }, 700);
  };

  // Drag-to-dismiss
  const handleTouchStart = (e: React.TouchEvent) => {
    startYRef.current = e.touches[0].clientY;
    dragDeltaRef.current = 0;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (startYRef.current === null) return;
    const delta = e.touches[0].clientY - startYRef.current;
    dragDeltaRef.current = delta;
    if (delta > 0 && sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${delta}px)`;
    }
  };
  const handleTouchEnd = () => {
    if (dragDeltaRef.current > 80) {
      onClose();
    } else if (sheetRef.current) {
      sheetRef.current.style.transform = "translateY(0)";
    }
    startYRef.current = null;
    dragDeltaRef.current = 0;
  };

  if (phase === "hidden") return null;

  const sheetTranslateY =
    phase === "entering" || phase === "leaving" ? "100%" : "0%";
  const scrimOpacity = phase === "entering" || phase === "leaving" ? 0 : 0.3;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        overflow: "hidden",
      }}
    >
      {/* Scrim */}
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: `rgba(0,0,0,${scrimOpacity})`,
          transition: "background 0.3s ease",
        }}
      />

      {/* Sheet panel */}
      <div
        ref={sheetRef}
        style={{
          position: "relative",
          width: "100%",
          background: "var(--redo-bg-primary)",
          borderRadius: "var(--radius-sheet) var(--radius-sheet) 0 0",
          boxShadow: "0 -4px 32px rgba(0,0,0,0.14)",
          transform: `translateY(${sheetTranslateY})`,
          transition: "transform 0.32s cubic-bezier(0.32, 0.72, 0, 1)",
          maxHeight: "85%",
          display: "flex",
          flexDirection: "column",
          willChange: "transform",
        }}
      >
        {/* Handle bar */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            paddingTop: 10,
            paddingBottom: 4,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            cursor: "grab",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 32,
              height: 4,
              borderRadius: 99,
              background: "rgba(0,0,0,0.12)",
            }}
          />
        </div>

        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 16px 12px",
            flexShrink: 0,
          }}
        >
          <p
            style={{
              fontSize: "var(--text-body)",
              fontWeight: "var(--font-weight-medium)",
              color: "var(--redo-text-primary)",
              margin: 0,
              lineHeight: 1.3,
              fontFamily: FONT,
            }}
          >
            레퍼런스 저장
          </p>
          <button
            onClick={onClose}
            style={{
              width: 28,
              height: 28,
              minWidth: 44,
              minHeight: 44,
              borderRadius: "50%",
              background: "var(--redo-bg-secondary)",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path
                d="M18 6L6 18M6 6l12 12"
                stroke="var(--redo-text-secondary)"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* Divider */}
        <div
          style={{
            height: "0.5px",
            background: "var(--redo-border)",
            flexShrink: 0,
          }}
        />

        {/* Scrollable content */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            scrollbarWidth: "none",
            padding: "16px 16px 0",
          }}
        >
          {/* ── Section 1: URL / Image ── */}
          <div style={{ marginBottom: 20 }}>
            <SectionLabel>링크 또는 이미지</SectionLabel>

            <UrlInputRow
              urlValue={urlValue}
              setUrlValue={setUrlValue}
              fetchState={fetchState}
              onPaste={(url) => triggerFetch(url)}
              onClear={handleClear}
            />

            <ThumbnailPreview
              fetchState={fetchState}
              meta={uploadedImageUrl ? null : meta}
              onClear={handleClear}
            />

            {/* Uploaded image preview */}
            {uploadedImageUrl && (
              <div
                style={{
                  marginTop: 10,
                  borderRadius: 10,
                  overflow: "hidden",
                  border: "0.5px solid var(--redo-border)",
                  position: "relative",
                  animation: "redo-fadein 0.22s ease",
                }}
              >
                <img
                  src={uploadedImageUrl}
                  alt="업로드된 이미지"
                  style={{ width: "100%", maxHeight: 160, objectFit: "cover", display: "block" }}
                />
                <button
                  onClick={() => setUploadedImageUrl(null)}
                  style={{
                    position: "absolute", top: 6, right: 6,
                    width: 22, height: 22, minWidth: 36, minHeight: 36,
                    borderRadius: "50%", background: "rgba(0,0,0,0.45)",
                    border: "none", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none">
                    <path d="M18 6L6 18M6 6l12 12" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            )}

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleImageFileChange}
            />

            {/* Image upload button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={imageUploading}
              style={{
                marginTop: 8,
                width: "100%",
                height: 44,
                borderRadius: 10,
                border: "1.5px dashed var(--redo-border)",
                background: "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                cursor: imageUploading ? "default" : "pointer",
                color: "var(--redo-text-secondary)",
                fontSize: "var(--text-caption)",
                fontFamily: FONT,
                fontWeight: "var(--font-weight-regular)",
                transition: "border-color 0.15s ease, color 0.15s ease",
              }}
              onMouseEnter={(e) => {
                if (!imageUploading) {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--redo-brand-mid)";
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--redo-brand)";
                }
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--redo-border)";
                (e.currentTarget as HTMLButtonElement).style.color = "var(--redo-text-secondary)";
              }}
            >
              {imageUploading ? (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ animation: "spin 0.9s linear infinite" }}>
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" strokeDasharray="40 20" strokeLinecap="round" />
                  </svg>
                  업로드 중...
                </>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.8" />
                    <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M3 15l5-5 4 4 3-3 6 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  이미지 직접 업로드
                </>
              )}
            </button>
          </div>

          {/* ── Section 2: Project ── */}
          <div style={{ marginBottom: 20 }}>
            <SectionLabel>폴더</SectionLabel>

            <ProjectChipsRow
              projects={projects}
              activeProject={activeProject}
              newProject={newProject}
              onSelect={setActiveProject}
              onAdd={(name, color) => {
                setProjects((prev) => [...prev, name]);
                setActiveProject(name);
                // Clear the "new" marker after animation completes
                setNewProject(name);
                setTimeout(() => setNewProject(null), 300);
                onFolderColorChange?.(name, color);
              }}
              folderColors={folderColors}
            />
          </div>

          {/* ── Section 3: 태그 (AI 자동선택 + 수동 추가) ── */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <SectionLabel style={{ marginBottom: 0 }}>태그</SectionLabel>
              {aiState === "loading" && (
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  {[0,1,2].map(i => (
                    <span key={i} style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--redo-brand)", display: "inline-block", animation: `redo-dot-bounce 1.2s ease-in-out ${i * 0.18}s infinite` }} />
                  ))}
                  <span style={{ fontSize: 10, color: "var(--redo-brand)", fontFamily: FONT }}>AI 분석 중</span>
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              {/* AI가 선택한 태그 (× 로 제거 가능) */}
              {selectedChips.map((tag) => (
                <div
                  key={tag}
                  style={{
                    height: 30,
                    paddingLeft: 10,
                    paddingRight: 6,
                    borderRadius: "var(--radius-chip)",
                    fontSize: "var(--text-micro)",
                    fontWeight: "var(--font-weight-medium)",
                    color: "var(--redo-context-text)",
                    background: "var(--redo-brand-light)",
                    border: "0.5px solid var(--redo-brand-mid)",
                    fontFamily: FONT,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  {tag}
                  <button
                    onClick={() => setSelectedChips((prev) => prev.filter((c) => c !== tag))}
                    style={{ width: 16, height: 16, borderRadius: "50%", background: "rgba(83,74,183,0.12)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, flexShrink: 0 }}
                  >
                    <svg width="7" height="7" viewBox="0 0 12 12" fill="none">
                      <path d="M2 2l8 8M10 2l-8 8" stroke="var(--redo-context-label)" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              ))}

              {/* + 태그 추가 버튼 */}
              <button
                onClick={() => setTagPickerOpen((v) => !v)}
                style={{
                  height: 30,
                  paddingLeft: 10,
                  paddingRight: 10,
                  borderRadius: "var(--radius-chip)",
                  fontSize: "var(--text-micro)",
                  fontWeight: "var(--font-weight-medium)",
                  color: tagPickerOpen ? "var(--redo-brand)" : "var(--redo-text-tertiary)",
                  background: "transparent",
                  border: `1px dashed ${tagPickerOpen ? "var(--redo-brand)" : "var(--redo-border)"}`,
                  cursor: "pointer",
                  fontFamily: FONT,
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                  transition: "all 0.15s ease",
                  minHeight: 44,
                }}
              >
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                  <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                태그 추가
              </button>
            </div>

            {/* 태그 피커 — 선택되지 않은 태그만 표시 */}
            {tagPickerOpen && (
              <div
                style={{
                  marginTop: 10,
                  padding: "10px 12px",
                  background: "var(--redo-bg-secondary)",
                  borderRadius: 10,
                  display: "flex",
                  gap: 6,
                  flexWrap: "wrap",
                  animation: "redo-fadein 0.15s ease",
                }}
              >
                {ALL_TAGS.filter((t) => !selectedChips.includes(t)).map((tag) => (
                  <button
                    key={tag}
                    onClick={() => {
                      setSelectedChips((prev) => [...prev, tag]);
                      // 전부 선택하면 피커 닫기
                      if (ALL_TAGS.filter(t => !selectedChips.includes(t)).length <= 1) setTagPickerOpen(false);
                    }}
                    style={{
                      height: 28,
                      paddingLeft: 10,
                      paddingRight: 10,
                      borderRadius: "var(--radius-chip)",
                      fontSize: "var(--text-micro)",
                      color: "var(--redo-text-secondary)",
                      background: "#fff",
                      border: "0.5px solid var(--redo-border)",
                      cursor: "pointer",
                      fontFamily: FONT,
                      display: "flex",
                      alignItems: "center",
                      transition: "all 0.12s ease",
                      minHeight: 40,
                    }}
                  >
                    {tag}
                  </button>
                ))}
                {ALL_TAGS.filter((t) => !selectedChips.includes(t)).length === 0 && (
                  <p style={{ fontSize: 12, color: "var(--redo-text-tertiary)", fontFamily: FONT, margin: 0 }}>모든 태그가 선택됐어요 ✓</p>
                )}
              </div>
            )}
          </div>

          {/* ── Section 4: 저장이유 ── */}
          <div style={{ marginBottom: 4 }}>
            <SectionLabel>저장이유</SectionLabel>

            {/* AI loading dots */}
            {aiState === "loading" && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, animation: "redo-fadein 0.2s ease" }}>
                {[0, 1, 2].map((i) => (
                  <span key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--redo-brand)", display: "inline-block", animation: `redo-dot-bounce 1.2s ease-in-out ${i * 0.18}s infinite` }} />
                ))}
                <span style={{ fontSize: "var(--text-micro)", color: "var(--redo-brand)", fontFamily: FONT }}>AI가 분석 중...</span>
              </div>
            )}

            {/* AI 추천 이유 — 중복 선택 가능 */}
            {aiState === "done" && aiAnalysis && aiAnalysis.suggested_reasons.length > 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10, animation: "redo-fadein 0.22s ease" }}>
                {aiAnalysis.suggested_reasons.map((reason) => {
                  const isSelected = selectedReasons.includes(reason);
                  return (
                    <button
                      key={reason}
                      onClick={() =>
                        setSelectedReasons((prev) =>
                          isSelected ? prev.filter((r) => r !== reason) : [...prev, reason]
                        )
                      }
                      style={{
                        height: 32,
                        minHeight: 44,
                        paddingLeft: 10,
                        paddingRight: 10,
                        borderRadius: "var(--radius-chip)",
                        fontSize: "var(--text-micro)",
                        fontWeight: isSelected ? "var(--font-weight-medium)" : "var(--font-weight-regular)",
                        color: isSelected ? "var(--redo-context-text)" : "var(--redo-text-secondary)",
                        background: isSelected ? "var(--redo-brand-light)" : "var(--redo-bg-secondary)",
                        border: isSelected ? "0.5px solid var(--redo-brand-mid)" : "0.5px solid transparent",
                        cursor: "pointer",
                        fontFamily: FONT,
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        transition: "all 0.15s ease",
                        flexShrink: 0,
                        textAlign: "left",
                      }}
                    >
                      {isSelected && (
                        <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="var(--redo-context-label)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                      {reason}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Freeform text input */}
            <input
              type="text"
              value={memoValue}
              onChange={(e) => setMemoValue(e.target.value)}
              placeholder="직접 입력... (선택)"
              style={{
                width: "100%",
                height: 40,
                minHeight: 44,
                paddingLeft: 12,
                paddingRight: 12,
                borderRadius: 10,
                border: "0.5px solid var(--redo-border)",
                background: "var(--redo-bg-secondary)",
                fontSize: "var(--text-caption)",
                color: "var(--redo-text-primary)",
                fontFamily: FONT,
                outline: "none",
                boxSizing: "border-box",
                transition: "border-color 0.15s ease",
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(106,112,255,0.4)"; e.currentTarget.style.background = "#fff"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "var(--redo-border)"; e.currentTarget.style.background = "var(--redo-bg-secondary)"; }}
            />

            <p
              style={{
                fontSize: "var(--text-micro)",
                fontStyle: "italic",
                color: "var(--redo-text-tertiary)",
                margin: "6px 0 0",
                lineHeight: 1.5,
                fontFamily: FONT,
              }}
            >
              저장 이유가 있으면 나중에 더 잘 꺼내줄 수 있어
            </p>
          </div>

          <div style={{ height: 16 }} />
        </div>

        {/* ── Bottom CTA ── */}
        <div
          style={{
            flexShrink: 0,
            padding: "12px 16px 20px",
            borderTop: "0.5px solid var(--redo-border)",
            background: "var(--redo-bg-primary)",
          }}
        >
          <button
            onClick={handleSave}
            style={{
              width: "100%",
              height: 44,
              borderRadius: 12,
              background: saved ? "var(--redo-success)" : "var(--redo-brand)",
              color: "#fff",
              fontSize: "var(--text-body)",
              fontWeight: "var(--font-weight-medium)",
              border: "none",
              cursor: "pointer",
              fontFamily: FONT,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 7,
              transition: "background 0.25s ease",
              lineHeight: 1,
            }}
          >
            {saved ? (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M5 13l4 4L19 7"
                    stroke="white"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                저장완료
              </>
            ) : (
              "저장하기"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}