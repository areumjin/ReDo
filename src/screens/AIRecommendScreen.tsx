import { useState, useRef, useMemo } from "react";
import { StatusBar } from "../components/StatusBar";
import { ImageWithFallback } from "../components/ImageWithFallback";
import type { CardData } from "../types";
import { sortByRelevance, buildKeywordCloud } from "../lib/relevanceScore";

const FONT =
  "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Noto Sans KR', system-ui, sans-serif";

// ─── Recommendation Card (reuses HomeScreen card visual style) ────────────────

function RecommendCard({
  card,
  executedCardIds,
  onTap,
  onExecute,
}: {
  card: CardData;
  executedCardIds: Set<number>;
  onTap: (card: CardData) => void;
  onExecute: (id: number) => void;
}) {
  const isExecuted = executedCardIds.has(card.id) || card.statusDot === "실행완료";
  const [pressed, setPressed] = useState(false);

  return (
    <div
      onClick={() => onTap(card)}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      style={{
        background: "var(--redo-bg-primary)",
        borderRadius: "var(--radius-card)",
        boxShadow: "var(--shadow-card)",
        overflow: "hidden",
        border: "0.5px solid var(--redo-border)",
        marginBottom: 12,
        cursor: "pointer",
        transform: pressed ? "scale(0.97)" : "scale(1)",
        transition: pressed
          ? "transform 80ms ease-in"
          : "transform 150ms ease-out",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {/* Thumbnail */}
      <div style={{ position: "relative", height: 120, width: "100%" }}>
        <ImageWithFallback
          src={card.image}
          alt={card.title}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", pointerEvents: "none" }}
        />
        {/* Project tag */}
        <div style={{ position: "absolute", top: 8, left: 10 }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 500,
              color: "#fff",
              background: "var(--redo-brand)",
              borderRadius: 20,
              padding: "3px 10px",
              fontFamily: FONT,
            }}
          >
            {card.projectTag}
          </span>
        </div>
        {/* Status dot */}
        <div
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: isExecuted ? "var(--redo-success)" : "var(--redo-brand)",
            }}
          />
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "10px 14px 14px" }}>
        <p
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: "var(--redo-text-primary)",
            margin: 0,
            marginBottom: 8,
            lineHeight: 1.5,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            fontFamily: FONT,
          }}
        >
          {card.title}
        </p>

        {/* Chips */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 10 }}>
          {card.chips.map((chip) => (
            <span
              key={chip}
              style={{
                fontSize: 11,
                fontWeight: 400,
                color: "var(--redo-text-secondary)",
                background: "var(--redo-bg-secondary)",
                borderRadius: 20,
                padding: "3px 9px",
                border: "0.5px solid var(--redo-border)",
                fontFamily: FONT,
              }}
            >
              {chip}
            </span>
          ))}
        </div>

        {/* Execute button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (!isExecuted) onExecute(card.id);
          }}
          disabled={isExecuted}
          style={{
            width: "100%",
            height: 36,
            borderRadius: 10,
            background: isExecuted ? "var(--redo-success)" : "var(--redo-brand)",
            color: "#fff",
            fontSize: 13,
            fontWeight: 500,
            border: "none",
            cursor: isExecuted ? "default" : "pointer",
            fontFamily: FONT,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 5,
          }}
        >
          {isExecuted ? (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="2.5"
                  strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              실행완료
            </>
          ) : (
            "실행하기"
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

interface AIRecommendScreenProps {
  cards: CardData[];
  executedCardIds: Set<number>;
  onBack: () => void;
  onCardTap: (card: CardData) => void;
  onExecute: (id: number) => void;
}

export function AIRecommendScreen({
  cards,
  executedCardIds,
  onBack,
  onCardTap,
  onExecute,
}: AIRecommendScreenProps) {
  const [activeKeyword, setActiveKeyword] = useState<string | null>(null);

  // Keyword cloud from all cards
  const keywordCloud = useMemo(() => buildKeywordCloud(cards, 10), [cards]);

  // Relevance context — use most frequent project tag as context
  const projectFreq: Record<string, number> = {};
  for (const card of cards) {
    if (!executedCardIds.has(card.id) && card.statusDot !== "실행완료") {
      projectFreq[card.projectTag] = (projectFreq[card.projectTag] ?? 0) + 1;
    }
  }
  const topProject = Object.entries(projectFreq).sort((a, b) => b[1] - a[1])[0]?.[0];

  // Build context: active keyword filter or top project
  const context = {
    projectTag: topProject,
    chips: activeKeyword ? [activeKeyword] : undefined,
  };

  // Relevance-sorted unexecuted cards
  const unexecuted = cards.filter(
    (c) => !executedCardIds.has(c.id) && c.statusDot !== "실행완료"
  );
  const keywordFiltered = activeKeyword
    ? unexecuted.filter(
        (c) =>
          c.chips.some((ch) => ch.toLowerCase() === activeKeyword.toLowerCase()) ||
          c.savedReason?.toLowerCase().includes(activeKeyword.toLowerCase()) ||
          c.title?.toLowerCase().includes(activeKeyword.toLowerCase())
      )
    : unexecuted;

  const recommended = useMemo(
    () => sortByRelevance(keywordFiltered, context, executedCardIds),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [keywordFiltered, activeKeyword, topProject]
  ).slice(0, 6);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "var(--redo-bg-secondary)",
        fontFamily: FONT,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Status bar */}
      <div style={{ background: "var(--redo-bg-primary)", flexShrink: 0 }}>
        <StatusBar />
      </div>

      {/* Header */}
      <div
        style={{
          background: "var(--redo-bg-primary)",
          borderBottom: "0.5px solid var(--redo-border)",
          display: "flex",
          alignItems: "center",
          height: 52,
          paddingLeft: 4,
          paddingRight: 16,
          flexShrink: 0,
          gap: 4,
        }}
      >
        <button
          onClick={onBack}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 3,
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "0 8px",
            minHeight: 44,
            minWidth: 44,
            WebkitTapHighlightColor: "transparent",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path
              d="M19 12H5M5 12l7 7M5 12l7-7"
              stroke="var(--redo-text-secondary)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span
            style={{
              fontSize: 13,
              color: "var(--redo-text-secondary)",
              fontFamily: FONT,
            }}
          >
            뒤로
          </span>
        </button>

        <p
          style={{
            flex: 1,
            fontSize: 16,
            fontWeight: 500,
            color: "var(--redo-text-primary)",
            margin: 0,
            fontFamily: FONT,
            textAlign: "center",
            paddingRight: 52, // offset back button width for centering
          }}
        >
          AI 추천 레퍼런스
        </p>
      </div>

      {/* Scrollable content */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          scrollbarWidth: "none",
          padding: "16px 16px",
        }}
      >
        {/* Sub-header banner */}
        <div
          style={{
            background: "#EEEFFE",
            borderRadius: 10,
            padding: "10px 14px",
            marginBottom: 12,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: "50%",
              background: "var(--redo-brand)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5L12 2z"
                fill="white"
              />
            </svg>
          </div>
          <p
            style={{
              fontSize: 13,
              fontWeight: 400,
              color: "#888780",
              margin: 0,
              lineHeight: 1.5,
              fontFamily: FONT,
            }}
          >
            {topProject ? (
              <>
                <span style={{ fontWeight: 500, color: "var(--redo-brand-dark)" }}>
                  {topProject}
                </span>
                와 연관된 레퍼런스{" "}
              </>
            ) : "미실행 레퍼런스 "}
            <span style={{ fontWeight: 500, color: "var(--redo-brand-dark)" }}>
              {recommended.length}개
            </span>
            를 발견했어요
          </p>
        </div>

        {/* Keyword cloud chips */}
        {keywordCloud.length > 0 && (
          <div
            style={{
              display: "flex",
              gap: 6,
              flexWrap: "wrap",
              marginBottom: 14,
            }}
          >
            {keywordCloud.map(({ keyword }) => {
              const isActive = activeKeyword === keyword;
              return (
                <button
                  key={keyword}
                  onClick={() => setActiveKeyword(isActive ? null : keyword)}
                  style={{
                    height: 28,
                    paddingLeft: 12,
                    paddingRight: 12,
                    borderRadius: 999,
                    border: isActive ? "none" : "0.5px solid var(--redo-border)",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: isActive ? 500 : 400,
                    fontFamily: FONT,
                    background: isActive ? "var(--redo-brand)" : "var(--redo-bg-secondary)",
                    color: isActive ? "#fff" : "var(--redo-text-secondary)",
                    transition: "all 120ms ease",
                    WebkitTapHighlightColor: "transparent",
                  }}
                >
                  {keyword}
                </button>
              );
            })}
          </div>
        )}

        {/* Card list */}
        {recommended.length > 0 ? (
          recommended.map((card) => (
            <RecommendCard
              key={card.id}
              card={card}
              executedCardIds={executedCardIds}
              onTap={onCardTap}
              onExecute={onExecute}
            />
          ))
        ) : (
          <div
            style={{
              textAlign: "center",
              padding: "48px 24px",
              color: "var(--redo-text-tertiary)",
              fontSize: 13,
              fontFamily: FONT,
              lineHeight: 1.6,
            }}
          >
            미실행 레퍼런스가 없어요.{"\n"}모두 활용 완료했어요! 🎉
          </div>
        )}

        <div style={{ height: 24 }} />
      </div>
    </div>
  );
}
