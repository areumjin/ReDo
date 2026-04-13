import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { StatusBar } from "../components/StatusBar";
import { BottomNav } from "../components/AppBottomNav";
import { ImageWithFallback } from "../components/ImageWithFallback";
import { ALL_CARDS, type CardData } from "../types";

// ─── Keyframes ────────────────────────────────────────────────────────────────

const ARCHIVE_STYLE_ID = "redo-archive-keyframes";
if (typeof document !== "undefined" && !document.getElementById(ARCHIVE_STYLE_ID)) {
  const s = document.createElement("style");
  s.id = ARCHIVE_STYLE_ID;
  s.textContent = `
    @keyframes redo-card-shake {
      0%, 100% { transform: translateX(0) scale(1); }
      18%  { transform: translateX(-6px) scale(1.01); }
      36%  { transform: translateX(6px)  scale(1.01); }
      54%  { transform: translateX(-6px) scale(1.01); }
      72%  { transform: translateX(6px)  scale(1.01); }
    }
  `;
  document.head.appendChild(s);
}

// ─── Types & Data ─────────────────────────────────────────────────────────────

const FONT =
  "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Noto Sans KR', system-ui, sans-serif";

// ArchiveCard and ARCHIVE_CARDS removed — now uses ALL_CARDS / CardData from types.ts

export interface PendingCardData {
  id: number;
  image: string | null;
  project: string;
  title: string;
}

// FILTER_CHIPS is now computed dynamically inside the component from card data

// ─── Top Bar ──────────────────────────────────────────────────────────────────

function TopBar({
  viewMode,
  onViewToggle,
}: {
  viewMode: "grid" | "list";
  onViewToggle: (mode: "grid" | "list") => void;
}) {
  return (
    <div
      className="flex items-center justify-between shrink-0 w-full"
      style={{
        height: 52,
        paddingLeft: 16,
        paddingRight: 12,
        background: "var(--redo-bg-primary)",
      }}
    >
      <p
        style={{
          fontSize: 16,
          fontWeight: "var(--font-weight-medium)",
          color: "var(--redo-text-primary)",
          margin: 0,
          lineHeight: 1.3,
          fontFamily: FONT,
        }}
      >
        보관함
      </p>

      <div style={{ display: "flex", gap: 4 }}>
        <button
          onClick={() => onViewToggle("grid")}
          style={{
            width: 28, height: 28,
            borderRadius: 7,
            background: viewMode === "grid" ? "#EEEFFE" : "transparent",
            border: "none", cursor: "pointer", padding: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.15s ease",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            {[["3","3"],["13","3"],["3","13"],["13","13"]].map(([x, y]) => (
              <rect key={`${x}${y}`} x={x} y={y} width="8" height="8" rx="1.5"
                fill={viewMode === "grid" ? "var(--redo-brand)" : "#B4B2A9"} />
            ))}
          </svg>
        </button>
        <button
          onClick={() => onViewToggle("list")}
          style={{
            width: 28, height: 28,
            borderRadius: 7,
            background: viewMode === "list" ? "#EEEFFE" : "transparent",
            border: "none", cursor: "pointer", padding: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.15s ease",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            {[["3","4"],["3","10.5"],["3","17"]].map(([x,y]) => (
              <rect key={`${x}${y}`} x={x} y={y} width="18" height="3" rx="1.5"
                fill={viewMode === "list" ? "var(--redo-brand)" : "#B4B2A9"} />
            ))}
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─── Search Bar ───────────────────────────────────────────────────────────────

function SearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="shrink-0 w-full"
      style={{ paddingLeft: 16, paddingRight: 16, paddingBottom: 10, background: "var(--redo-bg-primary)" }}>
      <div className="flex items-center"
        style={{
          height: 36,
          background: "var(--redo-bg-input)",
          borderRadius: "var(--radius-button)",
          border: "0.5px solid var(--redo-border)",
          paddingLeft: 10, paddingRight: 10, gap: 7,
        }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, opacity: 0.4 }}>
          <path d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z"
            stroke="var(--redo-text-primary)" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
        <input
          type="text" value={value} onChange={(e) => onChange(e.target.value)}
          placeholder="레퍼런스 검색..."
          style={{
            flex: 1, border: "none", background: "transparent", outline: "none",
            fontSize: "var(--text-body)", fontWeight: "var(--font-weight-regular)",
            color: "var(--redo-text-primary)", fontFamily: FONT, lineHeight: 1.4,
          }}
        />
        {value.length > 0 && (
          <button onClick={() => onChange("")}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              minWidth: 20, minHeight: 20 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="var(--redo-text-tertiary)"
                strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Sort Order ───────────────────────────────────────────────────────────────

type SortOrder = "최신순" | "오래된순" | "미실행먼저" | "실행완료먼저";

const SORT_OPTIONS: SortOrder[] = ["최신순", "오래된순", "미실행먼저", "실행완료먼저"];

// ─── Filter Chips Row ─────────────────────────────────────────────────────────

function FilterChipsRow({
  activeFilters,
  onToggle,
  sortOrder,
  onSortChange,
  chips,
}: {
  activeFilters: string[];
  onToggle: (chip: string) => void;
  sortOrder: SortOrder;
  onSortChange: (order: SortOrder) => void;
  chips: string[];
}) {
  const [dropOpen, setDropOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dropOpen) return;
    const handler = (e: MouseEvent) => {
      if (!dropRef.current?.contains(e.target as Node)) setDropOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [dropOpen]);

  return (
    <div className="shrink-0 w-full flex items-center"
      style={{
        paddingLeft: 16, paddingBottom: 10, paddingTop: 2,
        background: "var(--redo-bg-primary)",
        borderBottom: "0.5px solid var(--redo-border)",
        flexWrap: "nowrap",
      }}>
      <div className="flex-1 overflow-x-auto" style={{ scrollbarWidth: "none", minWidth: 0 }}>
        <div className="flex items-center" style={{ gap: 6, width: "max-content" }}>
          {chips.map((chip) => {
            const isActive = activeFilters.includes(chip);
            const isStatusChip = chip === "미실행";
            const bg = isActive
              ? isStatusChip ? "var(--redo-chip-status-bg)" : "var(--redo-brand-light)"
              : "var(--redo-bg-secondary)";
            const color = isActive
              ? isStatusChip ? "var(--redo-chip-status-text)" : "var(--redo-context-text)"
              : "var(--redo-text-secondary)";
            const border = isActive
              ? isStatusChip ? "0.5px solid rgba(8,80,65,0.2)" : "0.5px solid var(--redo-brand-mid)"
              : "0.5px solid transparent";
            return (
              <button key={chip} onClick={() => onToggle(chip)}
                style={{
                  height: 30, minHeight: 44, paddingLeft: 12, paddingRight: 12,
                  borderRadius: "var(--radius-chip)",
                  fontSize: "var(--text-body)",
                  fontWeight: isActive ? "var(--font-weight-medium)" : "var(--font-weight-regular)",
                  color, background: bg, border, cursor: "pointer",
                  whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 4,
                  fontFamily: FONT, transition: "all 0.15s ease",
                }}>
                {chip}
                {isActive && chip !== "전체" && (
                  <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5h6M5 2l3 3-3 3" stroke="currentColor"
                      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sort button + dropdown */}
      <div ref={dropRef} style={{ position: "relative", flexShrink: 0 }}>
        <button
          onClick={() => setDropOpen((v) => !v)}
          style={{
            height: 30, minHeight: 44,
            paddingLeft: 10, paddingRight: 16,
            display: "flex", alignItems: "center", gap: 3,
            background: "none", border: "none", cursor: "pointer", fontFamily: FONT,
          }}
        >
          <span style={{
            fontSize: "var(--text-body)", fontWeight: "var(--font-weight-regular)",
            color: dropOpen ? "var(--redo-brand)" : "var(--redo-text-secondary)",
            whiteSpace: "nowrap",
            transition: "color 150ms ease",
          }}>
            {sortOrder}
          </span>
          <svg
            width="10" height="10" viewBox="0 0 12 12" fill="none"
            style={{ transform: dropOpen ? "rotate(180deg)" : "none", transition: "transform 200ms ease" }}
          >
            <path d="M2 4l4 4 4-4" stroke={dropOpen ? "var(--redo-brand)" : "var(--redo-text-secondary)"}
              strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {dropOpen && (
          <div style={{
            position: "absolute",
            top: 44,
            right: 0,
            width: 148,
            background: "#ffffff",
            borderRadius: 10,
            boxShadow: "0 4px 16px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)",
            border: "0.5px solid rgba(0,0,0,0.07)",
            zIndex: 100,
            overflow: "hidden",
          }}>
            {SORT_OPTIONS.map((opt) => {
              const isSelected = opt === sortOrder;
              return (
                <button
                  key={opt}
                  onClick={() => { onSortChange(opt); setDropOpen(false); }}
                  style={{
                    width: "100%",
                    padding: "10px 16px",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    background: isSelected ? "rgba(106,112,255,0.05)" : "transparent",
                    border: "none", cursor: "pointer", textAlign: "left",
                    fontFamily: FONT,
                  }}
                >
                  <span style={{
                    fontSize: 13,
                    fontWeight: isSelected ? 500 : 400,
                    color: isSelected ? "var(--redo-brand)" : "var(--redo-text-primary)",
                    lineHeight: 1.3,
                  }}>
                    {opt}
                  </span>
                  {isSelected && (
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="var(--redo-brand)"
                        strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Grid Card ────────────────────────────────────────────────────────────────

function GridCard({
  card,
  onTap,
  showNewDot = false,
  newDotOpacity = 0,
  executedCardIds,
}: {
  card: CardData;
  onTap?: () => void;
  showNewDot?: boolean;
  newDotOpacity?: number;
  executedCardIds?: Set<number>;
}) {
  const isDone = (executedCardIds?.has(card.id) ?? false) || card.statusDot === "실행완료";
  const dotColor = isDone ? "var(--redo-success)" : "var(--redo-brand)";

  return (
    <div
      style={{
        background: "var(--redo-bg-primary)",
        borderRadius: "var(--radius-card)",
        border: "0.5px solid var(--redo-border)",
        overflow: "hidden",
        boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
        opacity: 1,
        transition: "opacity 0.1s",
        cursor: "pointer",
        position: "relative",
      }}
      onClick={onTap}
      onPointerDown={(e) => ((e.currentTarget as HTMLDivElement).style.opacity = "0.88")}
      onPointerUp={(e) => ((e.currentTarget as HTMLDivElement).style.opacity = "1")}
      onPointerLeave={(e) => ((e.currentTarget as HTMLDivElement).style.opacity = "1")}
    >
      {/* Thumbnail */}
      <div className="relative w-full" style={{ height: 88 }}>
        {card.image ? (
          <ImageWithFallback
            src={card.image}
            alt={card.title}
            className="w-full h-full object-cover"
            style={{ display: "block" }}
          />
        ) : (
          <div style={{
            width: "100%", height: "100%",
            background: "var(--redo-bg-secondary)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"
                stroke="var(--redo-text-tertiary)" strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round"
              />
            </svg>
          </div>
        )}

        {/* Project tag — top left */}
        <div style={{ position: "absolute", top: 6, left: 6 }}>
          <span style={{
            background: "var(--redo-brand)", color: "#fff", fontSize: 9,
            fontWeight: "var(--font-weight-medium)", borderRadius: "var(--radius-chip)",
            padding: "2px 7px", lineHeight: 1.5, fontFamily: FONT, display: "inline-block",
          }}>
            {card.projectTag}
          </span>
        </div>

        {/* Status dot — top right */}
        <div style={{
          position: "absolute", top: 8, right: 8,
          width: 16, height: 16, borderRadius: "50%",
          background: "rgba(255,255,255,0.88)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: dotColor, transition: "background 150ms ease" }} />
        </div>
      </div>

      {/* Card body */}
      <div style={{ padding: "8px 9px 10px" }}>
        <p style={{
          fontSize: 10, fontWeight: "var(--font-weight-medium)",
          color: "var(--redo-text-primary)", margin: 0, marginBottom: 5,
          lineHeight: 1.5, fontFamily: FONT,
          display: "-webkit-box", WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>
          {card.title}
        </p>
        <div className="flex items-center justify-between" style={{ gap: 4 }}>
          <span style={{
            fontSize: 9, fontWeight: "var(--font-weight-regular)",
            color: "var(--redo-text-tertiary)", lineHeight: 1.4, fontFamily: FONT,
          }}>{card.daysAgo}</span>
          <span style={{
            fontSize: 9, fontWeight: "var(--font-weight-regular)",
            color: isDone ? "var(--redo-success)" : "var(--redo-text-tertiary)",
            lineHeight: 1.4, fontFamily: FONT,
            transition: "color 150ms ease",
          }}>{isDone ? "실행완료" : "미실행"}</span>
        </div>
      </div>

      {/* NEW dot */}
      {showNewDot && (
        <div style={{
          position: "absolute", top: -3, right: -3,
          width: 8, height: 8, borderRadius: "50%",
          background: "var(--redo-brand)", border: "1.5px solid #fff",
          opacity: newDotOpacity, transition: "opacity 400ms ease-out", zIndex: 10,
        }} />
      )}
    </div>
  );
}

// ─── List Card ────────────────────────────────────────────────────────────────

function ListCard({ card, onTap, executedCardIds }: { card: CardData; onTap?: () => void; executedCardIds?: Set<number> }) {
  const isDone = (executedCardIds?.has(card.id) ?? false) || card.statusDot === "실행완료";
  const dotColor = isDone ? "var(--redo-success)" : "var(--redo-brand)";

  return (
    <div style={{
      background: "var(--redo-bg-primary)",
      borderRadius: "var(--radius-card)", border: "0.5px solid var(--redo-border)",
      overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
      opacity: 1, transition: "opacity 0.1s", cursor: "pointer",
      display: "flex", alignItems: "center", gap: 10,
      padding: "10px 12px 10px 10px",
    }}
      onClick={onTap}
      onPointerDown={(e) => ((e.currentTarget as HTMLDivElement).style.opacity = "0.88")}
      onPointerUp={(e) => ((e.currentTarget as HTMLDivElement).style.opacity = "1")}
      onPointerLeave={(e) => ((e.currentTarget as HTMLDivElement).style.opacity = "1")}
    >
      <div style={{
        width: 44, height: 44, borderRadius: 8,
        overflow: "hidden", flexShrink: 0, position: "relative",
        background: "var(--redo-bg-secondary)",
      }}>
        {card.image ? (
          <ImageWithFallback src={card.image} alt={card.title}
            className="w-full h-full object-cover" style={{ display: "block" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"
                stroke="var(--redo-text-tertiary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}
      </div>
      <div className="flex flex-col flex-1" style={{ gap: 3, minWidth: 0 }}>
        <p style={{
          fontSize: "var(--text-body)", fontWeight: "var(--font-weight-medium)",
          color: "var(--redo-text-primary)", margin: 0, lineHeight: 1.4, fontFamily: FONT,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>{card.title}</p>
        <div className="flex items-center" style={{ gap: 6 }}>
          <span style={{ fontSize: "var(--text-micro)", color: "var(--redo-text-tertiary)", fontFamily: FONT }}>
            {card.projectTag}
          </span>
          <span style={{ color: "var(--redo-text-tertiary)", fontSize: 9 }}>·</span>
          <span style={{ fontSize: "var(--text-micro)", color: "var(--redo-text-tertiary)", fontFamily: FONT }}>
            {card.daysAgo}
          </span>
        </div>
      </div>
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: dotColor, flexShrink: 0, transition: "background 150ms ease" }} />
    </div>
  );
}

// ─── Archive Screen ───────────────────────────────────────────────────────────

interface ArchiveScreenProps {
  onTabChange?: (tab: "홈" | "보관" | "활용" | "기록") => void;
  onCardTap?: (card: CardData) => void;
  onFabPress?: () => void;
  pendingCard?: PendingCardData | null;
  pendingStatus?: "saving" | "confirmed" | "failed" | null;
  executedCardIds?: Set<number>;
  cards?: CardData[];
}

type EnterPhase = "start" | "entering" | "pulsing" | "stable";
type FailPhase = "shaking" | "fading" | "gone" | null;
type ShiftPhase = "shifted" | "returning" | "idle";

export function ArchiveScreen({
  onTabChange,
  onCardTap,
  onFabPress,
  pendingCard,
  pendingStatus,
  executedCardIds,
  cards: cardsProp,
}: ArchiveScreenProps) {
  const cardSource = cardsProp ?? ALL_CARDS;
  const projectTags = useMemo(() => Array.from(new Set(cardSource.map(c => c.projectTag))), [cardSource]);
  const FILTER_CHIPS = useMemo(() => ["전체", ...projectTags, "미실행"], [projectTags]);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchValue, setSearchValue] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<string[]>(["전체", "미실행"]);
  const [sortOrder, setSortOrder] = useState<SortOrder>("최신순");

  // ── Debounce search input 150ms ──────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchValue), 150);
    return () => clearTimeout(t);
  }, [searchValue]);

  // ── Animation state ──
  const [enterPhase, setEnterPhase] = useState<EnterPhase>("start");
  const [failPhase, setFailPhase] = useState<FailPhase>(null);
  const [shiftPhase, setShiftPhase] = useState<ShiftPhase>("idle");
  const [newDotVisible, setNewDotVisible] = useState(false);
  const [newDotOpacity, setNewDotOpacity] = useState(0);

  const prevPendingId = useRef<number | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const rafRef = useRef<number | null>(null);

  const clearAll = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
  };

  // ── Entrance animation when a new pendingCard is injected ──
  useEffect(() => {
    if (!pendingCard || pendingCard.id === prevPendingId.current) return;
    prevPendingId.current = pendingCard.id;
    clearAll();

    // Reset fail state
    setFailPhase(null);

    // Step 1: appear at scale(0.8) opacity 0 instantly
    setEnterPhase("start");
    setNewDotVisible(true);
    setNewDotOpacity(0);

    // Existing cards shift down (start shifted, then animate back)
    setShiftPhase("shifted");

    // Step 2: after one paint frame, start transition
    rafRef.current = requestAnimationFrame(() => {
      // Unshift existing cards with transition
      setShiftPhase("returning");

      // Fade in new card with spring
      const t1 = setTimeout(() => {
        setEnterPhase("entering");
        setNewDotOpacity(1); // NEW dot fades in
      }, 16);

      // Step 3: border pulse starts after entrance completes
      const t2 = setTimeout(() => {
        setEnterPhase("pulsing");
      }, 16 + 260);

      // Step 4: pulse fades out
      const t3 = setTimeout(() => {
        setEnterPhase("stable");
        setShiftPhase("idle");
      }, 16 + 260 + 400);

      // Step 5: NEW dot fades after 3s
      const t4 = setTimeout(() => {
        setNewDotOpacity(0);
      }, 3000);

      const t5 = setTimeout(() => {
        setNewDotVisible(false);
      }, 3400);

      timers.current = [t1, t2, t3, t4, t5];
    });

    return clearAll;
  }, [pendingCard?.id]);

  // ── Failure animation ──
  useEffect(() => {
    if (pendingStatus !== "failed") return;
    clearAll();

    setFailPhase("shaking");
    const t1 = setTimeout(() => setFailPhase("fading"), 310);
    const t2 = setTimeout(() => {
      setFailPhase("gone");
      setNewDotVisible(false);
    }, 720);
    timers.current = [t1, t2];

    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [pendingStatus]);

  // ── Derive animation styles for pending card wrapper ──
  const pendingVisible = pendingCard !== null && failPhase !== "gone";

  let pendingTransform: string | undefined;
  if (failPhase === "shaking") {
    pendingTransform = undefined; // CSS animation handles transform
  } else if (enterPhase === "start") {
    pendingTransform = "scale(0.8)";
  } else {
    pendingTransform = "scale(1)";
  }

  let pendingOpacity = 1;
  if (enterPhase === "start") pendingOpacity = 0;
  if (failPhase === "fading" || failPhase === "gone") pendingOpacity = 0;

  let pendingTransition = "none";
  if (enterPhase === "entering") {
    pendingTransition =
      "transform 250ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 250ms ease-out";
  } else if (enterPhase === "stable") {
    pendingTransition = "box-shadow 400ms ease-out";
  } else if (failPhase === "fading") {
    pendingTransition = "opacity 400ms ease-out";
  }

  // Box-shadow encodes the border pulse (inset glow)
  let pendingBoxShadow = "0 1px 6px rgba(0,0,0,0.05)";
  if (enterPhase === "pulsing") {
    pendingBoxShadow =
      "inset 0 0 0 1.5px var(--redo-brand), 0 1px 6px rgba(0,0,0,0.05)";
  }

  // ── Existing card shift style ──
  const existingStyle: React.CSSProperties =
    shiftPhase === "shifted"
      ? { transform: "translateY(8px)", transition: "none" }
      : shiftPhase === "returning"
      ? { transform: "translateY(0)", transition: "transform 200ms ease-out" }
      : {};

  // ── Filter logic ──
  const toggleFilter = (chip: string) => {
    if (chip === "전체") {
      setActiveFilters(activeFilters.includes("전체") ? [] : ["전체"]);
      return;
    }
    setActiveFilters((prev) => {
      const without전체 = prev.filter((f) => f !== "전체");
      return without전체.includes(chip)
        ? without전체.filter((f) => f !== chip)
        : [...without전체, chip];
    });
  };

  const resetFilters = useCallback(() => {
    setActiveFilters(["전체"]);
    setSearchValue("");
    setDebouncedSearch("");
  }, []);

  // Expanded search: title + projectTag + savedReason + chips
  const filtered = cardSource.filter((card) => {
    const q = debouncedSearch.toLowerCase().trim();
    const matchesSearch =
      q === "" ||
      card.title.toLowerCase().includes(q) ||
      card.projectTag.toLowerCase().includes(q) ||
      card.savedReason.toLowerCase().includes(q) ||
      card.chips.some((c) => c.toLowerCase().includes(q));

    if (activeFilters.includes("전체") || activeFilters.length === 0) return matchesSearch;

    const matchesProject =
      activeFilters.includes(card.projectTag) ||
      !activeFilters.some((f) => ["브랜딩 과제", "졸업전시", "기타"].includes(f));

    const effectiveDone = (executedCardIds?.has(card.id) ?? false) || card.statusDot === "실행완료";
    const matchesStatus =
      !activeFilters.includes("미실행") || !effectiveDone;

    return matchesSearch && matchesProject && matchesStatus;
  });

  // Apply sort order
  const sortedFiltered = [...filtered].sort((a, b) => {
    const aDone = (executedCardIds?.has(a.id) ?? false) || a.statusDot === "실행완료";
    const bDone = (executedCardIds?.has(b.id) ?? false) || b.statusDot === "실행완료";
    if (sortOrder === "최신순") return b.id - a.id;
    if (sortOrder === "오래된순") return a.id - b.id;
    if (sortOrder === "미실행먼저") {
      if (aDone === bDone) return 0;
      return aDone ? 1 : -1;
    }
    if (sortOrder === "실행완료먼저") {
      if (aDone === bDone) return 0;
      return aDone ? -1 : 1;
    }
    return 0;
  });

  // Construct a full CardData from PendingCardData for display + tapping
  const pendingAsCard: CardData | null = pendingCard
    ? {
        id: pendingCard.id,
        image: pendingCard.image ?? "",
        projectTag: pendingCard.project,
        title: pendingCard.title,
        statusDot: "미실행",
        savedReason: "방금 저장한 레퍼런스예요",
        chips: [],
        daysAgo: "방금 전",
        source: "",
      }
    : null;

  const totalCount = filtered.length + (pendingVisible ? 1 : 0);

  // ── Determine empty state variant ──
  const hasActiveSearch = debouncedSearch.trim().length > 0;
  const hasActiveFilterChips =
    !activeFilters.includes("전체") && activeFilters.length > 0;
  const isDataEmpty = cardSource.length === 0;

  let emptyVariant: EmptyVariant | null = null;
  if (filtered.length === 0 && !pendingVisible) {
    if (isDataEmpty) emptyVariant = "empty";
    else if (hasActiveSearch) emptyVariant = "search";
    else if (hasActiveFilterChips) emptyVariant = "filter";
    else emptyVariant = "empty";
  }

  return (
    <div
      className="flex flex-col relative"
      style={{
        width: "100%", height: "100%",
        background: "var(--redo-bg-secondary)",
        fontFamily: FONT,
        overflow: "hidden",
      }}
    >
      <div style={{ background: "var(--redo-bg-primary)" }}>
        <StatusBar />
      </div>

      {/* Sticky header */}
      <div className="shrink-0" style={{ background: "var(--redo-bg-primary)" }}>
        <TopBar viewMode={viewMode} onViewToggle={setViewMode} />
        <SearchBar value={searchValue} onChange={setSearchValue} />
        <FilterChipsRow
          activeFilters={activeFilters}
          onToggle={toggleFilter}
          sortOrder={sortOrder}
          onSortChange={setSortOrder}
          chips={FILTER_CHIPS}
        />
      </div>

      {/* Scrollable content */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ scrollbarWidth: "none", padding: "14px 14px 8px" }}
      >
        {/* Results count */}
        <div style={{ marginBottom: 10 }}>
          <span style={{
            fontSize: "var(--text-micro)", fontWeight: "var(--font-weight-regular)",
            color: "var(--redo-text-tertiary)", fontFamily: FONT,
          }}>
            {totalCount}개 레퍼런스
            {hasActiveSearch && (
              <span style={{ color: "var(--redo-brand)", marginLeft: 4 }}>
                — '{debouncedSearch}' 검색 중
              </span>
            )}
          </span>
        </div>

        {/* ── Empty state ── */}
        {emptyVariant && (
          <ArchiveEmptyState
            variant={emptyVariant}
            searchQuery={debouncedSearch}
            onClearFilters={resetFilters}
            onFabPress={onFabPress}
          />
        )}

        {/* ── Grid View ── */}
        {viewMode === "grid" && !emptyVariant && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 10,
              overflow: "visible",
            }}
          >
            {/* Optimistic pending card — always first */}
            {pendingVisible && pendingAsCard && (
              <div
                style={{
                  transform: pendingTransform,
                  opacity: pendingOpacity,
                  transition: pendingTransition,
                  boxShadow: pendingBoxShadow,
                  borderRadius: "var(--radius-card)",
                  animation:
                    failPhase === "shaking"
                      ? "redo-card-shake 300ms ease-out"
                      : "none",
                  willChange: "transform, opacity, box-shadow",
                  position: "relative",
                }}
              >
                <GridCard
                  card={pendingAsCard}
                  showNewDot={newDotVisible}
                  newDotOpacity={newDotOpacity}
                  onTap={() => onCardTap?.(pendingAsCard)}
                />
              </div>
            )}

            {/* Existing cards */}
            {sortedFiltered.map((card) => (
              <div key={card.id} style={existingStyle}>
                <GridCard card={card} onTap={() => onCardTap?.(card)} executedCardIds={executedCardIds} />
              </div>
            ))}
          </div>
        )}

        {/* ── List View ── */}
        {viewMode === "list" && !emptyVariant && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {/* Pending card in list view */}
            {pendingVisible && pendingAsCard && (
              <div
                style={{
                  transform: pendingTransform,
                  opacity: pendingOpacity,
                  transition: pendingTransition,
                  animation:
                    failPhase === "shaking"
                      ? "redo-card-shake 300ms ease-out"
                      : "none",
                  willChange: "transform, opacity",
                }}
              >
                <ListCard card={pendingAsCard} onTap={() => onCardTap?.(pendingAsCard)} />
              </div>
            )}
            {sortedFiltered.map((card) => (
              <div key={card.id} style={existingStyle}>
                <ListCard card={card} onTap={() => onCardTap?.(card)} executedCardIds={executedCardIds} />
              </div>
            ))}
          </div>
        )}

        <div style={{ height: 80 }} />
      </div>

      <BottomNav activeTab="보관" onTabChange={onTabChange} onFabPress={onFabPress} />
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

type EmptyVariant = "search" | "filter" | "empty";

function ArchiveEmptyState({
  variant,
  searchQuery,
  onClearFilters,
  onFabPress,
}: {
  variant: EmptyVariant;
  searchQuery?: string;
  onClearFilters?: () => void;
  onFabPress?: () => void;
}) {
  const configs = {
    search: {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z"
            stroke="var(--redo-text-secondary)" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      ),
      title: searchQuery ? `'${searchQuery}'에 대한 결과가 없어요` : "검색 결과가 없어요",
      sub: "다른 키워드로 검색해봐요",
      btn: null,
    },
    filter: {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M3 6h18M7 12h10M11 18h2" stroke="var(--redo-text-secondary)"
            strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      title: "이 조건에 맞는 레퍼런스가 없어요",
      sub: "다른 필터를 선택해봐요",
      btn: { label: "필터 초기화", primary: false, onPress: onClearFilters },
    },
    empty: {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="3" width="18" height="18" rx="3" stroke="var(--redo-text-secondary)"
            strokeWidth="1.7" />
          <path d="M9 12h6M12 9v6" stroke="var(--redo-text-secondary)"
            strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      ),
      title: "아직 저장한 레퍼런스가 없어요",
      sub: "FAB 버튼을 눌러 첫 레퍼런스를 저장해봐요",
      btn: { label: "저장하기", primary: true, onPress: onFabPress },
    },
  };

  const cfg = configs[variant];
  // icon bg: #EEEFFE (context purple) for empty, #F1EFE8 (input gray) for search/filter
  const iconBg = variant === "empty" ? "var(--redo-context-bg)" : "var(--redo-bg-input)";

  return (
    <div
      className="flex flex-col items-center justify-center"
      style={{ padding: "48px 32px", gap: 0 }}
    >
      <div style={{
        width: 52, height: 52, borderRadius: 26,
        background: iconBg,
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 16,
      }}>
        {cfg.icon}
      </div>
      <p style={{
        fontSize: "var(--text-body)", fontWeight: "var(--font-weight-medium)",
        color: "var(--redo-text-secondary)", margin: 0, marginBottom: 6,
        textAlign: "center", lineHeight: 1.4, fontFamily: FONT,
      }}>
        {cfg.title}
      </p>
      <p style={{
        fontSize: "var(--text-caption)", fontWeight: "var(--font-weight-regular)",
        color: "var(--redo-text-tertiary)", margin: 0, marginBottom: 16,
        textAlign: "center", lineHeight: 1.5, fontFamily: FONT,
      }}>
        {cfg.sub}
      </p>
      {cfg.btn && (
        <button
          onClick={cfg.btn.onPress}
          style={{
            height: cfg.btn.primary ? 40 : 36,
            minHeight: 44,
            width: cfg.btn.primary ? 140 : "auto",
            paddingLeft: cfg.btn.primary ? 0 : 20,
            paddingRight: cfg.btn.primary ? 0 : 20,
            borderRadius: cfg.btn.primary ? 11 : "var(--radius-button)",
            background: cfg.btn.primary ? "var(--redo-brand)" : "#fff",
            color: cfg.btn.primary ? "#fff" : "var(--redo-brand)",
            fontSize: "var(--text-body)",
            fontWeight: "var(--font-weight-medium)",
            border: cfg.btn.primary ? "none" : "1px solid var(--redo-brand)",
            cursor: "pointer", fontFamily: FONT, lineHeight: 1,
          }}
        >
          {cfg.btn.label}
        </button>
      )}
    </div>
  );
}