import { useState, useRef, useEffect, useCallback } from "react";
import { StatusBar } from "../components/StatusBar";
import { BottomNav } from "../components/AppBottomNav";
import { ALL_CARDS, type CardData } from "../types";
import { useBreakpoint } from "../hooks/useBreakpoint";
import { sortByRelevance, buildContext } from "../lib/relevanceScore";

// ─── Keyframe injection ───────────────────────────────────────────────────────

const HOME_STYLE_ID = "redo-home-keyframes";
if (typeof document !== "undefined" && !document.getElementById(HOME_STYLE_ID)) {
  const s = document.createElement("style");
  s.id = HOME_STYLE_ID;
  s.textContent = `
    @keyframes redo-processing-pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(0.85); }
    }
  `;
  document.head.appendChild(s);
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const FONT =
  "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Noto Sans KR', 'Inter', system-ui, sans-serif";

const PLACEHOLDER_BG: Record<string, string> = {
  영감: "#FFE8D6",
  작업: "#E8F4FD",
  학습: "#EDF6ED",
  아이디어: "#F0EEFE",
  기타: "#F1EFE8",
};

// Aspect ratios cycling for natural masonry feel
const ASPECT_RATIOS = [3 / 4, 4 / 3, 1, 3 / 4, 4 / 3, 3 / 4, 1, 4 / 3];

// ─── Color filter ─────────────────────────────────────────────────────────────

type ColorCategory = "전체" | "레드/핑크" | "오렌지/옐로" | "그린" | "블루/퍼플" | "뉴트럴";

const COLOR_FILTERS: { label: ColorCategory; swatch: string }[] = [
  { label: "전체",       swatch: "" },
  { label: "레드/핑크",  swatch: "#FF6B7A" },
  { label: "오렌지/옐로", swatch: "#F5A862" },
  { label: "그린",       swatch: "#6CBF8A" },
  { label: "블루/퍼플",  swatch: "#7B9FE8" },
  { label: "뉴트럴",    swatch: "#AAAAAA" },
];

function classifyColor(r: number, g: number, b: number): ColorCategory {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (s < 0.18 || l > 0.92 || l < 0.08) return "뉴트럴";
  let h = 0;
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d + 6) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
  }
  if (h < 30 || h >= 330) return "레드/핑크";
  if (h < 80) return "오렌지/옐로";
  if (h < 160) return "그린";
  if (h < 270) return "블루/퍼플";
  return "레드/핑크"; // 270-330: 마젠타/핑크
}

async function extractDominantCategory(imageUrl: string): Promise<ColorCategory> {
  return new Promise((resolve) => {
    if (!imageUrl || imageUrl.startsWith("data:application")) { resolve("뉴트럴"); return; }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const SIZE = 40;
        const canvas = document.createElement("canvas");
        canvas.width = SIZE; canvas.height = SIZE;
        const ctx = canvas.getContext("2d");
        if (!ctx) { resolve("뉴트럴"); return; }
        ctx.drawImage(img, 0, 0, SIZE, SIZE);
        let data: Uint8ClampedArray;
        try { data = ctx.getImageData(0, 0, SIZE, SIZE).data; }
        catch { resolve("뉴트럴"); return; }
        const counts: Record<string, number> = { "레드/핑크": 0, "오렌지/옐로": 0, "그린": 0, "블루/퍼플": 0, "뉴트럴": 0 };
        for (let i = 0; i < data.length; i += 4) {
          counts[classifyColor(data[i], data[i + 1], data[i + 2])]++;
        }
        const total = SIZE * SIZE;
        if (counts["뉴트럴"] / total > 0.70) { resolve("뉴트럴"); return; }
        let best: ColorCategory = "뉴트럴", bestCount = 0;
        for (const cat of ["레드/핑크", "오렌지/옐로", "그린", "블루/퍼플"] as ColorCategory[]) {
          if (counts[cat] > bestCount) { bestCount = counts[cat]; best = cat; }
        }
        resolve(best);
      } catch { resolve("뉴트럴"); }
    };
    img.onerror = () => resolve("뉴트럴");
    img.src = imageUrl;
  });
}

// ─── Dropdown shell ───────────────────────────────────────────────────────────

function Dropdown({
  children,
  width = 220,
}: {
  children: React.ReactNode;
  width?: number;
}) {
  return (
    <div
      style={{
        position: "absolute",
        top: 44,
        right: 0,
        width,
        background: "#ffffff",
        borderRadius: 12,
        boxShadow: "0 4px 20px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.06)",
        border: "0.5px solid rgba(0,0,0,0.07)",
        zIndex: 200,
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
}


// ─── Top Bar ──────────────────────────────────────────────────────────────────

function TopBar({
  unexecutedCount,
  onProfilePress,
  userName,
}: {
  unexecutedCount: number;
  onProfilePress?: () => void;
  userName?: string;
}) {
  const { isMobile } = useBreakpoint();
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // derive avatar initial from userName
  const avatarInitial = userName ? userName.charAt(0).toUpperCase() : "?";

  useEffect(() => {
    if (!bellOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!bellRef.current?.contains(target)) setBellOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [bellOpen]);

  return (
    <div
      className="flex items-center justify-between shrink-0 w-full"
      style={{ height: 56, paddingLeft: 16, paddingRight: 16, position: "relative" }}
    >
      <div className="flex flex-col" style={{ gap: 2 }}>
        <p
          style={{
            fontSize: 11,
            fontWeight: 400,
            color: "var(--redo-text-tertiary)",
            lineHeight: 1.4,
            margin: 0,
            fontFamily: FONT,
          }}
        >
          오늘도 좋은 발견을
        </p>
        <p
          style={{
            fontSize: 17,
            fontWeight: 500,
            color: "var(--redo-text-primary)",
            lineHeight: 1.3,
            margin: 0,
            fontFamily: FONT,
          }}
        >
          {`안녕, ${userName ?? "게스트"} 👋`}
        </p>
      </div>

      {isMobile && <div className="flex items-center" style={{ gap: 8 }}>
        {/* Bell button */}
        <div ref={bellRef} style={{ position: "relative" }}>
          <button
            onClick={() => setBellOpen((v) => !v)}
            className="flex items-center justify-center"
            style={{
              width: 36,
              height: 36,
              minWidth: 44,
              minHeight: 44,
              borderRadius: 99,
              background: bellOpen ? "var(--redo-brand-light)" : "rgba(0,0,0,0.04)",
              border: "none",
              cursor: "pointer",
              transition: "background 150ms ease",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"
                fill={bellOpen ? "var(--redo-brand)" : "var(--redo-text-tertiary)"}
              />
            </svg>
          </button>

          {bellOpen && (
            <Dropdown width={228}>
              <div style={{ padding: "12px 14px 4px" }}>
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: "var(--redo-text-primary)",
                    margin: 0,
                    marginBottom: 6,
                    fontFamily: FONT,
                    lineHeight: 1.4,
                  }}
                >
                  미실행 레퍼런스 {unexecutedCount}개가 있어요
                </p>
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 400,
                    color: "#888780",
                    margin: 0,
                    marginBottom: 6,
                    fontFamily: FONT,
                    lineHeight: 1.5,
                  }}
                >
                  3일 이상 지난 레퍼런스가 있어요
                </p>
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: "#6A70FF",
                    margin: 0,
                    marginBottom: 12,
                    fontFamily: FONT,
                    lineHeight: 1.5,
                  }}
                >
                  오늘도 실행해봐요 ✨
                </p>
              </div>
            </Dropdown>
          )}
        </div>

        {/* Avatar button */}
        <div ref={profileRef} style={{ position: "relative" }}>
          <button
            onClick={() => onProfilePress?.()}
            className="flex items-center justify-center shrink-0"
            style={{
              width: 36,
              height: 36,
              minWidth: 44,
              minHeight: 44,
              borderRadius: "50%",
              background: "var(--redo-brand-light)",
              border: "none",
              cursor: "pointer",
              overflow: "hidden",
              position: "relative",
              transition: "border 150ms ease",
            }}
          >
            <span
              style={{
                fontSize: 15,
                fontWeight: 500,
                color: "var(--redo-brand-dark)",
                lineHeight: 1,
                fontFamily: FONT,
              }}
            >
              {avatarInitial}
            </span>
          </button>
        </div>
      </div>}
    </div>
  );
}

// ─── Processing Status Badge ──────────────────────────────────────────────────

function ProcessingBadge({ status }: { status: CardData["processingStatus"] }) {
  if (!status || status === "raw") return null;

  if (status === "processing") {
    return (
      <div
        style={{
          position: "absolute",
          bottom: 8,
          right: 8,
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: "var(--redo-brand)",
          animation: "redo-processing-pulse 1.4s ease-in-out infinite",
        }}
      />
    );
  }

  if (status === "processed") {
    return (
      <div
        style={{
          position: "absolute",
          bottom: 8,
          right: 8,
          fontSize: 10,
          color: "var(--redo-brand)",
          lineHeight: 1,
          textShadow: "0 0 4px rgba(255,255,255,0.8)",
        }}
      >
        ✦
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div
        style={{
          position: "absolute",
          bottom: 8,
          right: 8,
          fontSize: 10,
          color: "#999",
          lineHeight: 1,
          textShadow: "0 0 4px rgba(255,255,255,0.8)",
        }}
      >
        !
      </div>
    );
  }

  return null;
}

// ─── Moodboard Card ───────────────────────────────────────────────────────────

function MoodboardCard({
  card,
  index,
  onTap,
  executedCardIds,
}: {
  card: CardData;
  index: number;
  onTap: (card: CardData) => void;
  executedCardIds: Set<number>;
}) {
  const isExecuted = executedCardIds.has(card.id) || card.statusDot === "실행완료";
  const [pressed, setPressed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const { isMobile } = useBreakpoint();

  const aspectRatio = ASPECT_RATIOS[index % ASPECT_RATIOS.length];
  const placeholderBg = PLACEHOLDER_BG[card.projectTag] ?? "#F1EFE8";

  const hoverScale = !isMobile && hovered ? 1.02 : pressed ? 0.97 : 1;
  const hoverShadow = !isMobile && hovered
    ? "0 4px 16px rgba(0,0,0,0.12)"
    : "none";

  return (
    <div
      style={{
        breakInside: "avoid",
        marginBottom: isMobile ? 8 : 12,
        borderRadius: isMobile ? 12 : 14,
        overflow: "hidden",
        cursor: "pointer",
        transform: `scale(${hoverScale})`,
        transition: pressed
          ? "transform 80ms ease-in"
          : "transform 150ms ease-out, box-shadow 150ms ease-out",
        boxShadow: hoverShadow,
        position: "relative",
        WebkitTapHighlightColor: "transparent",
      }}
      onClick={() => onTap(card)}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => { setPressed(false); setHovered(false); }}
      onMouseEnter={() => { if (!isMobile) setHovered(true); }}
      onMouseLeave={() => setHovered(false)}
    >
      {card.image ? (
        <img
          src={card.image}
          alt={card.title}
          style={{
            width: "100%",
            aspectRatio: `${Math.round(aspectRatio * 100)} / 100`,
            objectFit: "cover",
            display: "block",
          }}
        />
      ) : (
        <div
          style={{
            width: "100%",
            paddingBottom: `${Math.round((1 / aspectRatio) * 100)}%`,
            background: placeholderBg,
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ fontSize: 11, color: "#888", fontFamily: FONT }}>
              {card.projectTag}
            </span>
          </div>
        </div>
      )}

      {/* Executed badge */}
      {isExecuted && (
        <div
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: "#1D9E75",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
            <path
              d="M5 13l4 4L19 7"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}

      {/* Processing status badge */}
      <ProcessingBadge status={card.processingStatus} />
    </div>
  );
}

// ─── Empty Moodboard (first-time user) ───────────────────────────────────────

const GHOST_CARDS = [
  { w: "100%", h: 160, br: "12px 12px 0 0" },
  { w: "100%", h: 110, br: 12 },
  { w: "100%", h: 130, br: 12 },
  { w: "100%", h: 90,  br: 12 },
  { w: "100%", h: 145, br: 12 },
  { w: "100%", h: 100, br: 12 },
];

function EmptyMoodboard({ onFabPress }: { onFabPress?: () => void }) {
  return (
    <div style={{ position: "relative" }}>
      {/* Ghost grid */}
      <div
        style={{
          columns: 2,
          columnGap: 8,
          padding: "0 12px",
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        {GHOST_CARDS.map((g, i) => (
          <div
            key={i}
            style={{
              breakInside: "avoid",
              marginBottom: 8,
              borderRadius: g.br,
              background: i % 3 === 0 ? "#EBEBEB" : i % 3 === 1 ? "#F0F0F0" : "#E8E8E8",
              height: g.h,
              width: g.w,
            }}
          />
        ))}
      </div>

      {/* Frosted overlay with CTA */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(to bottom, rgba(var(--redo-bg-primary-rgb, 255,255,255), 0.2) 0%, rgba(var(--redo-bg-primary-rgb, 255,255,255), 0.85) 40%, var(--redo-bg-primary) 70%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-end",
          paddingBottom: 32,
          paddingLeft: 24,
          paddingRight: 24,
        }}
      >
        <p
          style={{
            fontSize: 17,
            fontWeight: 600,
            color: "var(--redo-text-primary)",
            margin: 0,
            marginBottom: 6,
            textAlign: "center",
            lineHeight: 1.4,
            fontFamily: FONT,
          }}
        >
          첫 레퍼런스를 저장해봐요
        </p>
        <p
          style={{
            fontSize: 13,
            fontWeight: 400,
            color: "var(--redo-text-tertiary)",
            margin: 0,
            marginBottom: 20,
            textAlign: "center",
            lineHeight: 1.5,
            fontFamily: FONT,
          }}
        >
          링크나 이미지를 저장하면 여기에 모여요
        </p>
        {onFabPress && (
          <button
            onClick={onFabPress}
            style={{
              height: 48,
              minHeight: 48,
              paddingLeft: 32,
              paddingRight: 32,
              borderRadius: 14,
              background: "var(--redo-brand)",
              color: "#fff",
              fontSize: 15,
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              fontFamily: FONT,
              lineHeight: 1,
              boxShadow: "0 4px 16px rgba(106,112,255,0.35)",
            }}
          >
            + 레퍼런스 저장하기
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

interface HomeScreenProps {
  onTabChange?: (tab: "홈" | "보관" | "활용" | "기록") => void;
  onCardTap?: (card: CardData) => void;
  onFabPress?: () => void;
  executedCardIds?: Set<number>;
  onExecute?: (id: number) => void;
  laterCardIds?: Set<number>;
  onLater?: (id: number) => void;
  onProfilePress?: () => void;
  cards?: CardData[];
  userName?: string;
}

type SortMode = "최신순" | "오래된순" | "폴더별" | "미실행먼저";
const SORT_OPTIONS: SortMode[] = ["최신순", "오래된순", "폴더별", "미실행먼저"];

export function HomeScreen({
  onTabChange,
  onCardTap,
  onFabPress,
  executedCardIds,
  onProfilePress,
  cards: cardsProp,
  userName,
}: HomeScreenProps) {
  const { isMobile, isDesktop, width: viewportWidth } = useBreakpoint();
  const [activeFilter, setActiveFilter] = useState<ColorCategory>("전체");
  const [colorCategoryMap, setColorCategoryMap] = useState<Map<number, ColorCategory>>(new Map());
  const [sortMode, setSortMode] = useState<SortMode>("최신순");
  const [sortOpen, setSortOpen] = useState(false);
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<number[]>([]);
  const sortRef = useRef<HTMLDivElement>(null);

  const cardSource = cardsProp ?? ALL_CARDS;
  const execSet = executedCardIds ?? new Set<number>();

  // Close sort dropdown on outside click
  useEffect(() => {
    if (!sortOpen) return;
    const handler = (e: MouseEvent) => {
      if (!sortRef.current?.contains(e.target as Node)) setSortOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [sortOpen]);

  // Track recently viewed cards for relevance context
  const handleCardTap = useCallback((card: CardData) => {
    setRecentlyViewedIds((prev) => {
      const next = [card.id, ...prev.filter((id) => id !== card.id)].slice(0, 10);
      return next;
    });
    onCardTap?.(card);
  }, [onCardTap]);

  const totalCount = cardSource.length;
  const executedCount = cardSource.filter(
    (c) => execSet.has(c.id) || c.statusDot === "실행완료"
  ).length;
  const unexecutedCount = totalCount - executedCount;

  // Color category extraction — runs lazily per card
  useEffect(() => {
    const pending = cardSource.filter((c) => c.image && !colorCategoryMap.has(c.id));
    if (pending.length === 0) return;
    pending.forEach((card) => {
      if (!card.image) return;
      extractDominantCategory(card.image).then((cat) => {
        setColorCategoryMap((prev) => new Map(prev).set(card.id, cat));
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardSource]);

  const filteredCards = activeFilter === "전체"
    ? cardSource
    : cardSource.filter((c) => colorCategoryMap.get(c.id) === activeFilter);

  // Apply sort mode
  const sortedCards = (() => {
    const base = [...filteredCards];
    switch (sortMode) {
      case "최신순":
        return base.sort((a, b) => b.id - a.id);
      case "오래된순":
        return base.sort((a, b) => a.id - b.id);
      case "폴더별":
        return base.sort((a, b) => {
          const t = a.projectTag.localeCompare(b.projectTag, "ko");
          return t !== 0 ? t : b.id - a.id;
        });
      case "미실행먼저": {
        const ctx = buildContext(cardSource, activeFilter, recentlyViewedIds);
        return sortByRelevance(base, ctx, execSet);
      }
    }
  })();

  return (
    <div
      className="flex flex-col relative overflow-hidden"
      style={{
        width: "100%",
        height: "100%",
        background: "var(--redo-bg-primary)",
        fontFamily: FONT,
      }}
    >
      <StatusBar />
      <TopBar unexecutedCount={unexecutedCount} onProfilePress={onProfilePress} userName={userName} />

      {/* Scrollable content */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ scrollbarWidth: "none", paddingBottom: 4 }}
      >
        {/* Filter chips row + Sort button */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 0,
            padding: "6px 12px 6px",
          }}
        >
          {/* Scrollable color filter swatches */}
          <div
            style={{
              display: "flex",
              gap: 8,
              overflowX: "auto",
              overflowY: "visible",
              scrollbarWidth: "none",
              flexWrap: "nowrap",
              flex: 1,
              minWidth: 0,
              alignItems: "center",
              padding: "4px 0",
            }}
          >
            {COLOR_FILTERS.map(({ label, swatch }) => {
              const isActive = activeFilter === label;
              if (label === "전체") {
                return (
                  <button
                    key={label}
                    onClick={() => setActiveFilter(label)}
                    style={{
                      height: 26,
                      minHeight: 36,
                      paddingLeft: 12,
                      paddingRight: 12,
                      borderRadius: 999,
                      border: "none",
                      cursor: "pointer",
                      flexShrink: 0,
                      fontSize: 12,
                      fontWeight: isActive ? 600 : 400,
                      fontFamily: FONT,
                      background: isActive ? "var(--redo-brand, #6A70FF)" : "var(--redo-bg-secondary, #F1EFE8)",
                      color: isActive ? "#fff" : "var(--redo-text-secondary, #888780)",
                      transition: "all 150ms ease",
                      display: "flex",
                      alignItems: "center",
                      WebkitTapHighlightColor: "transparent",
                    }}
                  >
                    전체
                  </button>
                );
              }
              return (
                <button
                  key={label}
                  onClick={() => setActiveFilter(label)}
                  title={label}
                  style={{
                    width: 22,
                    height: 22,
                    minWidth: 36,
                    minHeight: 36,
                    borderRadius: "50%",
                    border: "none",
                    cursor: "pointer",
                    flexShrink: 0,
                    background: swatch,
                    outline: isActive ? "2.5px solid var(--redo-text-primary, #1A1A2E)" : "none",
                    outlineOffset: 2,
                    transition: "outline 150ms ease, transform 100ms ease",
                    transform: isActive ? "scale(1.1)" : "scale(1)",
                    WebkitTapHighlightColor: "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                />
              );
            })}
          </div>

          {/* Sort button */}
          <div ref={sortRef} style={{ position: "relative", flexShrink: 0, marginLeft: 8 }}>
            <button
              onClick={() => setSortOpen((v) => !v)}
              style={{
                height: 32,
                minHeight: 44,
                paddingLeft: 10,
                paddingRight: 10,
                borderRadius: 10,
                border: "none",
                background: sortOpen ? "var(--redo-bg-secondary)" : "transparent",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
                WebkitTapHighlightColor: "transparent",
                transition: "background 150ms ease",
              }}
            >
              {/* Sort icon */}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M3 6h18M7 12h10M11 18h2" stroke={sortMode !== "최신순" ? "var(--redo-brand)" : "var(--redo-text-secondary)"} strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span
                style={{
                  fontSize: 12,
                  fontFamily: FONT,
                  color: sortMode !== "최신순" ? "var(--redo-brand)" : "var(--redo-text-secondary)",
                  fontWeight: sortMode !== "최신순" ? 600 : 400,
                  whiteSpace: "nowrap",
                }}
              >
                {sortMode}
              </span>
            </button>

            {/* Sort dropdown */}
            {sortOpen && (
              <div
                style={{
                  position: "absolute",
                  top: 40,
                  right: 0,
                  width: 130,
                  background: "#fff",
                  borderRadius: 12,
                  boxShadow: "0 4px 20px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.06)",
                  border: "0.5px solid rgba(0,0,0,0.07)",
                  zIndex: 300,
                  overflow: "hidden",
                  animation: "redo-fadein 0.12s ease",
                }}
              >
                {SORT_OPTIONS.map((opt) => {
                  const isActive = sortMode === opt;
                  return (
                    <button
                      key={opt}
                      onClick={() => { setSortMode(opt); setSortOpen(false); }}
                      style={{
                        width: "100%",
                        height: 40,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "0 14px",
                        background: isActive ? "var(--redo-brand-light)" : "transparent",
                        border: "none",
                        cursor: "pointer",
                        fontFamily: FONT,
                        fontSize: 13,
                        fontWeight: isActive ? 600 : 400,
                        color: isActive ? "var(--redo-brand)" : "var(--redo-text-primary)",
                        WebkitTapHighlightColor: "transparent",
                      }}
                    >
                      {opt}
                      {isActive && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="var(--redo-brand)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Moodboard grid or empty state */}
        {sortedCards.length > 0 ? (
          <div
            style={{
              columns: viewportWidth >= 1800 ? 6 : viewportWidth >= 1400 ? 5 : viewportWidth >= 1200 ? 4 : isMobile ? 2 : 3,
              columnGap: isDesktop ? 12 : 8,
              padding: isDesktop ? "0 16px 16px" : "0 12px 12px",
            }}
          >
            {sortedCards.map((card, index) => (
              <MoodboardCard
                key={card.id}
                card={card}
                index={index}
                onTap={handleCardTap}
                executedCardIds={execSet}
              />
            ))}
          </div>
        ) : (
          <EmptyMoodboard onFabPress={onFabPress} />
        )}
      </div>

      <BottomNav activeTab="홈" onTabChange={onTabChange} onFabPress={onFabPress} />
    </div>
  );
}
