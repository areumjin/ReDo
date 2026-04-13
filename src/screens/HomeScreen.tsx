import { useState, useRef, useEffect } from "react";
import { StatusBar } from "../components/StatusBar";
import { BottomNav } from "../components/AppBottomNav";
import { ALL_CARDS, type CardData } from "../types";

// ─── Data ─────────────────────────────────────────────────────────────────────

const FONT =
  "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Noto Sans KR', 'Inter', system-ui, sans-serif";

const PLACEHOLDER_BG: Record<string, string> = {
  "브랜딩 과제": "#FFE8D6",
  졸업전시: "#E8F4FD",
  기타: "#F1EFE8",
};

// Aspect ratios cycling for natural masonry feel
const ASPECT_RATIOS = [3 / 4, 4 / 3, 1, 3 / 4, 4 / 3, 3 / 4, 1, 4 / 3];

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

function DropdownDivider() {
  return (
    <div style={{ height: "0.5px", background: "rgba(0,0,0,0.08)", margin: "0 12px" }} />
  );
}

function DropdownItem({
  icon,
  label,
  color,
  onClick,
}: {
  icon?: React.ReactNode;
  label: string;
  color?: string;
  onClick?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 14px",
        background: hovered ? "rgba(0,0,0,0.03)" : "transparent",
        border: "none",
        cursor: "pointer",
        textAlign: "left",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {icon && (
        <span style={{ flexShrink: 0, opacity: 0.6, display: "flex" }}>{icon}</span>
      )}
      <span
        style={{
          fontSize: 14,
          fontWeight: 400,
          color: color ?? "var(--redo-text-primary)",
          fontFamily: FONT,
          lineHeight: 1.3,
        }}
      >
        {label}
      </span>
    </button>
  );
}

// ─── Top Bar ──────────────────────────────────────────────────────────────────

function TopBar({
  unexecutedCount,
  onProfilePress,
}: {
  unexecutedCount: number;
  onProfilePress?: () => void;
}) {
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

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
          안녕, 지원 👋
        </p>
      </div>

      <div className="flex items-center" style={{ gap: 8 }}>
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
              지
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Day Summary Banner ───────────────────────────────────────────────────────

function DaySummaryBanner({
  totalCount,
  executedCount,
}: {
  totalCount: number;
  executedCount: number;
}) {
  const unexecuted = totalCount - executedCount;
  const pct = totalCount > 0 ? Math.round((executedCount / totalCount) * 100) : 0;

  const size = 52;
  const stroke = 4;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct / 100);

  return (
    <div
      style={{
        margin: "0 16px 12px",
        borderRadius: 14,
        background: "linear-gradient(135deg, #6A70FF 0%, #4B52E0 100%)",
        padding: 16,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <div>
        <p
          style={{
            fontSize: 12,
            fontWeight: 400,
            color: "rgba(255,255,255,0.75)",
            margin: 0,
            marginBottom: 4,
            fontFamily: FONT,
            lineHeight: 1.3,
          }}
        >
          미실행 {unexecuted}개 중
        </p>
        <p
          style={{
            fontSize: 28,
            fontWeight: 500,
            color: "#ffffff",
            margin: 0,
            lineHeight: 1.1,
            fontFamily: FONT,
          }}
        >
          {unexecuted}
          <span
            style={{
              fontSize: 14,
              fontWeight: 400,
              color: "rgba(255,255,255,0.75)",
              marginLeft: 6,
            }}
          >
            개 남음
          </span>
        </p>
        <p
          style={{
            fontSize: 12,
            fontWeight: 400,
            color: "rgba(255,255,255,0.65)",
            margin: 0,
            marginTop: 4,
            fontFamily: FONT,
          }}
        >
          오늘 실행할 레퍼런스
        </p>
      </div>

      <div style={{ position: "relative", flexShrink: 0 }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none"
            stroke="rgba(255,255,255,0.2)"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none"
            stroke="rgba(255,255,255,0.9)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ transition: "stroke-dashoffset 0.8s ease" }}
          />
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: "#ffffff",
              fontFamily: FONT,
              lineHeight: 1,
            }}
          >
            {pct}%
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── AI Strip ─────────────────────────────────────────────────────────────────

function AIStrip({
  expanded,
  onToggle,
}: {
  expanded: boolean;
  onToggle?: () => void;
}) {
  const [pressed, setPressed] = useState(false);
  return (
    <div
      style={{ paddingLeft: 16, paddingRight: 16, marginBottom: 0 }}
    >
      <div
        className="flex items-center"
        onClick={onToggle}
        onPointerDown={() => setPressed(true)}
        onPointerUp={() => setPressed(false)}
        onPointerLeave={() => setPressed(false)}
        style={{
          background: "var(--redo-context-bg)",
          borderRadius: expanded ? "12px 12px 0 0" : "var(--radius-card)",
          padding: "10px 14px",
          gap: 10,
          cursor: "pointer",
          transform: pressed ? "scale(0.98)" : "scale(1)",
          transition: pressed ? "transform 60ms ease-in" : "transform 100ms ease-out",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: "var(--redo-brand)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5L12 2z"
              fill="white"
            />
          </svg>
        </div>

        <div className="flex flex-col flex-1" style={{ gap: 2 }}>
          <p
            style={{
              fontSize: 10,
              fontWeight: 500,
              color: "var(--redo-context-label)",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              margin: 0,
              lineHeight: 1.3,
              fontFamily: FONT,
            }}
          >
            AI 추천
          </p>
          <p
            style={{
              fontSize: 13,
              fontWeight: 400,
              color: "var(--redo-context-text)",
              margin: 0,
              lineHeight: 1.5,
              fontFamily: FONT,
            }}
          >
            브랜딩 과제와 연관된 레퍼런스 3개를 발견했어요
          </p>
        </div>

        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          style={{
            transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
            transition: "transform 200ms ease",
            flexShrink: 0,
          }}
        >
          <path
            d="M9 18l6-6-6-6"
            stroke="var(--redo-brand)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}

// ─── AI Expand Section ────────────────────────────────────────────────────────

function AIExpandSection({
  cards,
  executedCardIds,
  onCardTap,
  onClose,
}: {
  cards: CardData[];
  executedCardIds: Set<number>;
  onCardTap: (card: CardData) => void;
  onClose: () => void;
}) {
  const topCards = cards
    .filter((c) => !executedCardIds.has(c.id) && c.statusDot !== "실행완료")
    .slice(0, 3);

  return (
    <div
      style={{
        marginLeft: 16,
        marginRight: 16,
        marginBottom: 12,
        background: "var(--redo-context-bg)",
        borderRadius: "0 0 12px 12px",
        overflow: "hidden",
        borderTop: "0.5px solid rgba(106,112,255,0.12)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px 8px",
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: "#534AB7",
            fontFamily: FONT,
          }}
        >
          지금 실행하기 좋은 레퍼런스
        </span>
        <button
          onClick={onClose}
          style={{
            fontSize: 12,
            color: "#888780",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "2px 4px",
            fontFamily: FONT,
          }}
        >
          닫기
        </button>
      </div>

      {/* Horizontal scroll cards */}
      <div
        style={{
          display: "flex",
          gap: 10,
          paddingLeft: 14,
          paddingRight: 14,
          paddingBottom: 14,
          overflowX: "auto",
          scrollbarWidth: "none",
        }}
      >
        {topCards.map((card) => (
          <div
            key={card.id}
            onClick={() => onCardTap(card)}
            style={{
              width: 160,
              flexShrink: 0,
              borderRadius: 10,
              border: "1px solid rgba(106,112,255,0.18)",
              overflow: "hidden",
              cursor: "pointer",
              background: "#fff",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {/* Image */}
            <div style={{ height: 80, overflow: "hidden" }}>
              {card.image ? (
                <img
                  src={card.image}
                  alt={card.title}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    background: PLACEHOLDER_BG[card.projectTag] ?? "#F1EFE8",
                  }}
                />
              )}
            </div>
            {/* Title */}
            <div style={{ padding: "8px 8px 6px" }}>
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: "var(--redo-text-primary)",
                  margin: 0,
                  marginBottom: 6,
                  lineHeight: 1.4,
                  fontFamily: FONT,
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  textOverflow: "ellipsis",
                }}
              >
                {card.title}
              </p>
              <button
                onClick={(e) => { e.stopPropagation(); onCardTap(card); }}
                style={{
                  width: "100%",
                  height: 28,
                  borderRadius: 7,
                  background: "var(--redo-brand)",
                  color: "#fff",
                  fontSize: 11,
                  fontWeight: 500,
                  border: "none",
                  cursor: "pointer",
                  fontFamily: FONT,
                }}
              >
                실행하기
              </button>
            </div>
          </div>
        ))}

        {topCards.length === 0 && (
          <p style={{ fontSize: 13, color: "#888780", fontFamily: FONT, padding: "4px 0 8px" }}>
            미실행 레퍼런스가 없어요 🎉
          </p>
        )}
      </div>
    </div>
  );
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

  const aspectRatio = ASPECT_RATIOS[index % ASPECT_RATIOS.length];
  const placeholderBg = PLACEHOLDER_BG[card.projectTag] ?? "#F1EFE8";

  return (
    <div
      style={{
        breakInside: "avoid",
        marginBottom: 8,
        borderRadius: 12,
        overflow: "hidden",
        cursor: "pointer",
        transform: pressed ? "scale(0.97)" : "scale(1)",
        transition: pressed ? "transform 80ms ease-in" : "transform 150ms ease-out",
        position: "relative",
        WebkitTapHighlightColor: "transparent",
      }}
      onClick={() => onTap(card)}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
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

      {/* Context Box — 저장 이유 */}
      {card.savedReason && (
        <div
          style={{
            padding: "8px 10px",
            background: "var(--redo-context-bg, #EEEFFE)",
          }}
        >
          <p
            style={{
              fontSize: 10,
              fontWeight: 500,
              color: "var(--redo-context-label, #534AB7)",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              marginBottom: 3,
              fontFamily: FONT,
              lineHeight: 1.2,
            }}
          >
            저장 이유
          </p>
          <p
            style={{
              fontSize: 12,
              color: "var(--redo-context-text, #3C3489)",
              lineHeight: 1.45,
              fontFamily: FONT,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              margin: 0,
            }}
          >
            {card.savedReason}
          </p>
        </div>
      )}
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
  onAIStripPress?: () => void;
  onProfilePress?: () => void;
  cards?: CardData[];
}

export function HomeScreen({
  onTabChange,
  onCardTap,
  onFabPress,
  executedCardIds,
  onProfilePress,
  cards: cardsProp,
}: HomeScreenProps) {
  const [aiExpanded, setAiExpanded] = useState(false);
  const [activeFilter, setActiveFilter] = useState("전체");

  const cardSource = cardsProp ?? ALL_CARDS;
  const execSet = executedCardIds ?? new Set<number>();

  const totalCount = cardSource.length;
  const executedCount = cardSource.filter(
    (c) => execSet.has(c.id) || c.statusDot === "실행완료"
  ).length;
  const unexecutedCount = totalCount - executedCount;

  // Project filter
  const projectTags = Array.from(new Set(cardSource.map((c) => c.projectTag)));
  const filterChips = ["전체", ...projectTags];
  const filteredCards = activeFilter === "전체"
    ? cardSource
    : cardSource.filter((c) => c.projectTag === activeFilter);

  // Sort: unexecuted first, executed last
  const sortedCards = [...filteredCards].sort((a, b) => {
    const aExec = execSet.has(a.id) || a.statusDot === "실행완료";
    const bExec = execSet.has(b.id) || b.statusDot === "실행완료";
    if (aExec === bExec) return 0;
    return aExec ? 1 : -1;
  });

  return (
    <div
      className="flex flex-col relative overflow-hidden"
      style={{
        width: 375,
        height: 812,
        background: "var(--redo-bg-primary)",
        fontFamily: FONT,
      }}
    >
      <StatusBar />
      <TopBar unexecutedCount={unexecutedCount} onProfilePress={onProfilePress} />

      {/* Scrollable content */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ scrollbarWidth: "none", paddingBottom: 4 }}
      >
        <div style={{ paddingTop: 12 }}>
          <DaySummaryBanner totalCount={totalCount} executedCount={executedCount} />

          {/* AI Strip */}
          <div style={{ marginBottom: aiExpanded ? 0 : 12 }}>
            <AIStrip
              expanded={aiExpanded}
              onToggle={() => setAiExpanded((v) => !v)}
            />
          </div>

          {/* AI Expand Section — slide down */}
          <div
            style={{
              overflow: "hidden",
              maxHeight: aiExpanded ? 200 : 0,
              transition: "max-height 300ms ease",
            }}
          >
            <AIExpandSection
              cards={cardSource}
              executedCardIds={execSet}
              onCardTap={(card) => onCardTap?.(card)}
              onClose={() => setAiExpanded(false)}
            />
          </div>
        </div>

        {/* Project filter chips */}
        <div
          style={{
            display: "flex",
            gap: 6,
            padding: "4px 12px 10px",
            overflowX: "auto",
            scrollbarWidth: "none",
            flexWrap: "nowrap",
          }}
        >
          {filterChips.map((chip) => {
            const isActive = activeFilter === chip;
            return (
              <button
                key={chip}
                onClick={() => setActiveFilter(chip)}
                style={{
                  height: 32,
                  minHeight: 44,
                  paddingLeft: 14,
                  paddingRight: 14,
                  borderRadius: 999,
                  border: "none",
                  cursor: "pointer",
                  flexShrink: 0,
                  fontSize: 13,
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
                {chip}
              </button>
            );
          })}
        </div>

        {/* Moodboard grid or empty state */}
        {sortedCards.length > 0 ? (
          <div
            style={{
              columns: 2,
              columnGap: 8,
              padding: "0 12px 12px",
            }}
          >
            {sortedCards.map((card, index) => (
              <MoodboardCard
                key={card.id}
                card={card}
                index={index}
                onTap={(c) => onCardTap?.(c)}
                executedCardIds={execSet}
              />
            ))}
          </div>
        ) : (
          <div
            className="flex flex-col items-center justify-center"
            style={{ padding: "64px 32px", gap: 0 }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                background: "var(--redo-context-bg)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z"
                  stroke="var(--redo-text-secondary)"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <p
              style={{
                fontSize: 15,
                fontWeight: 500,
                color: "var(--redo-text-secondary)",
                margin: 0,
                marginBottom: 6,
                textAlign: "center",
                lineHeight: 1.4,
                fontFamily: FONT,
              }}
            >
              저장한 레퍼런스가 없어요
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
              FAB 버튼으로 첫 레퍼런스를 저장해봐요
            </p>
            {onFabPress && (
              <button
                onClick={onFabPress}
                style={{
                  height: 40,
                  minHeight: 44,
                  width: 140,
                  borderRadius: 11,
                  background: "var(--redo-brand)",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 500,
                  border: "none",
                  cursor: "pointer",
                  fontFamily: FONT,
                  lineHeight: 1,
                }}
              >
                저장하기
              </button>
            )}
          </div>
        )}
      </div>

      <BottomNav activeTab="홈" onTabChange={onTabChange} onFabPress={onFabPress} />
    </div>
  );
}
