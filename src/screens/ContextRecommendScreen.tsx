// ─── Context Recommend Screen ────────────────────────────────────────────────
// 작업 중에 Station에 폰을 올려놓으면 열리는 화면.
// 프로젝트 선택 → 관련 레퍼런스 추천 → Figma로 보내기.

import { useState, useMemo } from "react";
import type { CardData } from "../types";
import { ImageWithFallback } from "../components/ImageWithFallback";

const FONT =
  "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Noto Sans KR', system-ui, sans-serif";

// ─── Match reason badge ──────────────────────────────────────────────────────

type MatchReason = "저장 이유 일치" | "같은 프로젝트" | "AI 추천";

const BADGE_STYLES: Record<MatchReason, { bg: string; color: string }> = {
  "저장 이유 일치": { bg: "#EEEFFE", color: "#6A70FF" },
  "같은 프로젝트": { bg: "#E6F6ED", color: "#1D9E75" },
  "AI 추천": { bg: "#FFF3E0", color: "#D97706" },
};

function MatchBadge({ reason }: { reason: MatchReason }) {
  const s = BADGE_STYLES[reason];
  return (
    <span
      style={{
        fontSize: 9,
        fontWeight: 600,
        color: s.color,
        background: s.bg,
        borderRadius: 4,
        padding: "2px 6px",
        lineHeight: 1.3,
        fontFamily: FONT,
        whiteSpace: "nowrap",
      }}
    >
      {reason}
    </span>
  );
}

// ─── Recommend Card Row ──────────────────────────────────────────────────────

function RecommendCard({
  card,
  matchReason,
  isExecuted,
  onTap,
  onExecute,
}: {
  card: CardData;
  matchReason: MatchReason;
  isExecuted: boolean;
  onTap: () => void;
  onExecute: () => void;
}) {
  return (
    <div
      onClick={onTap}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 0",
        borderBottom: "0.5px solid rgba(0,0,0,0.05)",
        cursor: "pointer",
        opacity: isExecuted ? 0.55 : 1,
        transition: "opacity 150ms ease",
      }}
    >
      {/* Thumbnail */}
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 8,
          overflow: "hidden",
          flexShrink: 0,
          background: "var(--redo-bg-secondary, #F1EFE8)",
        }}
      >
        {card.image ? (
          <ImageWithFallback
            src={card.image}
            alt={card.title}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"
                stroke="var(--redo-text-tertiary)"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Title */}
        <p
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: "var(--redo-text-primary, #2C2C2A)",
            margin: 0,
            lineHeight: 1.4,
            fontFamily: FONT,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            textDecoration: isExecuted ? "line-through" : "none",
          }}
        >
          {card.title}
        </p>

        {/* Context box inline */}
        {card.savedReason && (
          <div
            style={{
              display: "inline-block",
              fontSize: 11,
              color: "#3C3489",
              background: "#EEEFFE",
              borderRadius: 6,
              padding: "3px 8px",
              lineHeight: 1.4,
              fontFamily: FONT,
              marginTop: 4,
              maxWidth: "100%",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            저장 이유: {card.savedReason}
          </div>
        )}

        {/* Source + badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
          <span
            style={{
              fontSize: 10,
              color: "var(--redo-text-tertiary, #888780)",
              fontFamily: FONT,
            }}
          >
            {card.source || card.daysAgo}
          </span>
          <MatchBadge reason={matchReason} />
        </div>
      </div>

      {/* Execute button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (!isExecuted) onExecute();
        }}
        style={{
          width: 34,
          height: 34,
          borderRadius: 8,
          background: isExecuted ? "var(--redo-success, #1D9E75)" : "#6A70FF",
          border: "none",
          cursor: isExecuted ? "default" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          transition: "background 150ms ease",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path
            d="M5 13l4 4L19 7"
            stroke="#fff"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 32px",
        gap: 12,
      }}
    >
      {/* Icon circle */}
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 26,
          background: "#EEEFFE",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path
            d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z"
            stroke="#6A70FF"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <p
        style={{
          fontSize: 14,
          fontWeight: 500,
          color: "var(--redo-text-secondary, #888780)",
          margin: 0,
          textAlign: "center",
          lineHeight: 1.6,
          fontFamily: FONT,
          whiteSpace: "pre-line",
        }}
      >
        {"프로젝트를 선택하면\n맞는 레퍼런스를 찾아줄게요"}
      </p>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

interface ContextRecommendScreenProps {
  cards: CardData[];
  executedCardIds: Set<number>;
  existingProjects: string[];
  onClose: () => void;
  onCardTap: (card: CardData) => void;
  onExecuteCard: (id: number) => void;
  showToast: (cfg: { variant: string; sourceChip: string }) => void;
}

export function ContextRecommendScreen({
  cards,
  executedCardIds,
  existingProjects,
  onClose,
  onCardTap,
  onExecuteCard,
  showToast,
}: ContextRecommendScreenProps) {
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [customInput, setCustomInput] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [listVisible, setListVisible] = useState(false);

  // 프로젝트 칩 목록: 기존 프로젝트 + "직접 입력"
  const projectChips = useMemo(() => {
    const unique = existingProjects.length > 0 ? existingProjects : ["영감", "작업", "학습", "아이디어"];
    return unique;
  }, [existingProjects]);

  // 추천 카드 — projectTag 일치 + savedReason 키워드 매칭
  const recommendedCards = useMemo(() => {
    if (!selectedProject) return [];

    const tagged = cards.filter((c) => c.projectTag === selectedProject);

    // projectTag가 아닌 카드 중 savedReason에 프로젝트명 포함하는 것
    const reasonMatch = cards.filter(
      (c) =>
        c.projectTag !== selectedProject &&
        c.savedReason.toLowerCase().includes(selectedProject.toLowerCase())
    );

    // 나머지 카드 중 같은 chips를 가진 것 (AI 추천으로 표시)
    const taggedChips = new Set(tagged.flatMap((c) => c.chips));
    const aiMatch = cards
      .filter(
        (c) =>
          c.projectTag !== selectedProject &&
          !reasonMatch.includes(c) &&
          c.chips.some((ch) => taggedChips.has(ch))
      )
      .slice(0, 3);

    // 합치기 (중복 제거)
    const seen = new Set<number>();
    const result: { card: CardData; reason: MatchReason }[] = [];

    for (const c of tagged) {
      if (!seen.has(c.id)) {
        seen.add(c.id);
        result.push({ card: c, reason: "같은 프로젝트" });
      }
    }
    for (const c of reasonMatch) {
      if (!seen.has(c.id)) {
        seen.add(c.id);
        result.push({ card: c, reason: "저장 이유 일치" });
      }
    }
    for (const c of aiMatch) {
      if (!seen.has(c.id)) {
        seen.add(c.id);
        result.push({ card: c, reason: "AI 추천" });
      }
    }

    return result;
  }, [cards, selectedProject]);

  // 프로젝트 선택 핸들러
  const handleSelectProject = (project: string) => {
    setSelectedProject(project);
    setShowCustomInput(false);
    setListVisible(false);
    // fadeIn 딜레이
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setListVisible(true));
    });
  };

  const handleCustomInputConfirm = () => {
    const trimmed = customInput.trim();
    if (trimmed) {
      handleSelectProject(trimmed);
    }
  };

  // Figma로 보내기
  const handleFigmaExport = () => {
    const exportCards = recommendedCards
      .filter((r) => !executedCardIds.has(r.card.id) && r.card.statusDot !== "실행완료")
      .map((r) => r.card);

    if (exportCards.length === 0) return;

    const text = exportCards
      .map(
        (c) =>
          `[${c.projectTag}] ${c.title}\n저장 이유: ${c.savedReason}\n태그: ${c.chips.join(", ")}${c.urlValue ? `\nURL: ${c.urlValue}` : ""}`
      )
      .join("\n\n---\n\n");

    navigator.clipboard.writeText(text).then(() => {
      showToast({ variant: "success", sourceChip: "Figma 클립보드에 복사됐어요 ✓" });
    });
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 72,
        background: "var(--redo-bg-primary, #fff)",
        display: "flex",
        flexDirection: "column",
        fontFamily: FONT,
        overflow: "hidden",
      }}
    >
      {/* ── 헤더 ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px",
          borderBottom: "0.5px solid #EBEBEB",
          flexShrink: 0,
        }}
      >
        {/* 좌: 닫기 */}
        <button
          onClick={onClose}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
            minHeight: 44,
            minWidth: 44,
            WebkitTapHighlightColor: "transparent",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path
              d="M19 12H5M5 12l7 7M5 12l7-7"
              stroke="#888780"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span style={{ fontSize: 14, color: "#888780", fontFamily: FONT }}>닫기</span>
        </button>

        {/* 중앙: 타이틀 */}
        <p
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: "#2C2C2A",
            margin: 0,
            lineHeight: 1.3,
            fontFamily: FONT,
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
            whiteSpace: "nowrap",
          }}
        >
          지금 작업 중인 거 알려줘요
        </p>

        {/* 우: 빈 공간 */}
        <div style={{ width: 44 }} />
      </div>

      {/* ── 프로젝트 선택 섹션 ── */}
      <div style={{ padding: 20, flexShrink: 0 }}>
        <p
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: "#888780",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            margin: "0 0 10px",
            lineHeight: 1,
            fontFamily: FONT,
          }}
        >
          어떤 작업을 하고 있어요?
        </p>

        {/* 칩 리스트 */}
        <div
          style={{
            display: "flex",
            gap: 8,
            overflowX: "auto",
            scrollbarWidth: "none",
            paddingBottom: 4,
          }}
        >
          {projectChips.map((project) => {
            const isActive = selectedProject === project && !showCustomInput;
            return (
              <button
                key={project}
                onClick={() => handleSelectProject(project)}
                style={{
                  height: 34,
                  padding: "0 14px",
                  borderRadius: 20,
                  border: "none",
                  background: isActive ? "#6A70FF" : "var(--redo-bg-secondary, #F1EFE8)",
                  color: isActive ? "#fff" : "var(--redo-text-secondary, #888780)",
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 400,
                  cursor: "pointer",
                  fontFamily: FONT,
                  flexShrink: 0,
                  transition: "all 150ms ease",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                {project}
              </button>
            );
          })}

          {/* 직접 입력 버튼 */}
          <button
            onClick={() => {
              setShowCustomInput(true);
              setSelectedProject(null);
              setListVisible(false);
            }}
            style={{
              height: 34,
              padding: "0 14px",
              borderRadius: 20,
              border: showCustomInput
                ? "1.5px solid #6A70FF"
                : "1px dashed var(--redo-text-tertiary, #BCBAB5)",
              background: showCustomInput ? "#EEEFFE" : "transparent",
              color: showCustomInput ? "#6A70FF" : "var(--redo-text-tertiary, #BCBAB5)",
              fontSize: 13,
              fontWeight: showCustomInput ? 500 : 400,
              cursor: "pointer",
              fontFamily: FONT,
              flexShrink: 0,
              transition: "all 150ms ease",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            + 직접 입력
          </button>
        </div>

        {/* 직접 입력 필드 */}
        {showCustomInput && (
          <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
            <input
              type="text"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCustomInputConfirm()}
              placeholder="프로젝트명 입력..."
              autoFocus
              style={{
                flex: 1,
                height: 40,
                background: "#F8F7F4",
                borderRadius: 10,
                border: "0.5px solid var(--redo-border, #E5E5E5)",
                padding: "0 12px",
                fontSize: 13,
                color: "#2C2C2A",
                fontFamily: FONT,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            <button
              onClick={handleCustomInputConfirm}
              disabled={!customInput.trim()}
              style={{
                height: 40,
                padding: "0 14px",
                borderRadius: 10,
                border: "none",
                background: customInput.trim() ? "#6A70FF" : "var(--redo-bg-secondary)",
                color: customInput.trim() ? "#fff" : "var(--redo-text-tertiary)",
                fontSize: 13,
                fontWeight: 500,
                cursor: customInput.trim() ? "pointer" : "default",
                fontFamily: FONT,
                transition: "all 150ms ease",
              }}
            >
              확인
            </button>
          </div>
        )}
      </div>

      {/* ── 추천 레퍼런스 섹션 (스크롤) ── */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          scrollbarWidth: "none",
          padding: "0 20px",
        }}
      >
        {selectedProject && recommendedCards.length > 0 ? (
          <div
            style={{
              opacity: listVisible ? 1 : 0,
              transition: "opacity 200ms ease",
            }}
          >
            {/* 섹션 헤더 */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <p
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: "#2C2C2A",
                  margin: 0,
                  lineHeight: 1.3,
                  fontFamily: FONT,
                }}
              >
                {selectedProject}에 맞는 레퍼런스
              </p>
              <span
                style={{
                  fontSize: 12,
                  color: "#6A70FF",
                  fontWeight: 500,
                  fontFamily: FONT,
                }}
              >
                전체 {recommendedCards.length}개
              </span>
            </div>

            {/* 카드 리스트 */}
            {recommendedCards.map(({ card, reason }) => (
              <RecommendCard
                key={card.id}
                card={card}
                matchReason={reason}
                isExecuted={executedCardIds.has(card.id) || card.statusDot === "실행완료"}
                onTap={() => onCardTap(card)}
                onExecute={() => onExecuteCard(card.id)}
              />
            ))}

            <div style={{ height: 80 }} />
          </div>
        ) : selectedProject && recommendedCards.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "48px 32px",
              gap: 12,
              opacity: listVisible ? 1 : 0,
              transition: "opacity 200ms ease",
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                background: "#F1EFE8",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path
                  d="M3 12l2-6h14l2 6M3 12v6a1 1 0 001 1h16a1 1 0 001-1v-6M3 12h18"
                  stroke="var(--redo-text-secondary)"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <p
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: "var(--redo-text-secondary, #888780)",
                margin: 0,
                textAlign: "center",
                lineHeight: 1.6,
                fontFamily: FONT,
              }}
            >
              이 프로젝트와 관련된 레퍼런스가 아직 없어요
            </p>
          </div>
        ) : (
          <EmptyState />
        )}
      </div>

      {/* ── 하단 고정: Figma로 보내기 ── */}
      {selectedProject && recommendedCards.length > 0 && (
        <div
          style={{
            padding: "12px 20px",
            paddingBottom: "calc(12px + env(safe-area-inset-bottom))",
            flexShrink: 0,
            borderTop: "0.5px solid rgba(0,0,0,0.06)",
          }}
        >
          <button
            onClick={handleFigmaExport}
            style={{
              width: "100%",
              height: 44,
              borderRadius: 12,
              border: "1px solid #6A70FF",
              background: "transparent",
              color: "#6A70FF",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: FONT,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              WebkitTapHighlightColor: "transparent",
              transition: "background 150ms ease",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path
                d="M8 17l4 4 4-4M12 12v9M20.88 18.09A5 5 0 0018 9h-1.26A8 8 0 103 16.29"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Figma로 보내기
          </button>
        </div>
      )}
    </div>
  );
}
