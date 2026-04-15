// ─── WorkbenchScreen — 작업대 ─────────────────────────────────────────────────
// 실행 완료된 레퍼런스들을 프로젝트별로 모아보는 무드보드 화면
// "재료를 꺼내놓기만 함 — 창작자가 어떻게 쓸지는 스스로 결정"

import { useState, useCallback } from "react";
import { useAppContext, type ActiveTab } from "../context/AppContext";
import { BottomNav } from "../components/AppBottomNav";
import type { CardData } from "../types";

const FONT =
  "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Noto Sans KR', system-ui, sans-serif";

// ─── 카드 컴포넌트 ─────────────────────────────────────────────────────────────
function WorkbenchCard({
  card,
  onTap,
}: {
  card: CardData;
  onTap?: (card: CardData) => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={() => onTap?.(card)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 10,
        overflow: "hidden",
        cursor: "pointer",
        position: "relative",
        background: "#F8F7F4",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      }}
    >
      {/* 이미지 */}
      {card.image ? (
        <img
          src={card.image}
          alt={card.title}
          style={{ width: "100%", display: "block", objectFit: "cover" }}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <div
          style={{
            height: 100,
            background: "#E8E8E8",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span style={{ fontSize: 28 }}>📌</span>
        </div>
      )}

      {/* 호버 오버레이 */}
      {hovered && card.savedReason && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.58)",
            display: "flex",
            alignItems: "flex-end",
            padding: 10,
          }}
        >
          <p
            style={{
              color: "#fff",
              fontSize: 11,
              lineHeight: 1.5,
              margin: 0,
              fontFamily: FONT,
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: 4,
              WebkitBoxOrient: "vertical",
            }}
          >
            {card.savedReason}
          </p>
        </div>
      )}

      {/* 실행 메모 */}
      {card.executionMemo && (
        <div style={{ padding: "6px 8px", background: "#fff" }}>
          <p
            style={{
              fontSize: 11,
              color: "#888780",
              margin: 0,
              lineHeight: 1.4,
              fontFamily: FONT,
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {card.executionMemo}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
interface WorkbenchScreenProps {
  onCardTap?: (card: CardData) => void;
  onFabPress?: () => void;
  onTabChange?: (tab: ActiveTab) => void;
}

export function WorkbenchScreen({
  onCardTap,
  onFabPress,
  onTabChange,
}: WorkbenchScreenProps) {
  const { cards, executedCardIds, showToast } = useAppContext();
  const [selectedProject, setSelectedProject] = useState<string>("전체");

  // 실행 완료 카드
  const executedCards = cards.filter(
    (c) => executedCardIds.has(c.id) || c.statusDot === "실행완료"
  );

  // 고유 프로젝트 태그 (실행 완료된 카드 기준)
  const projectTags = Array.from(
    new Set(executedCards.map((c) => c.projectTag).filter(Boolean))
  );

  // 선택된 프로젝트로 필터링
  const displayCards =
    selectedProject === "전체"
      ? executedCards
      : executedCards.filter((c) => c.projectTag === selectedProject);

  // Figma 내보내기 — URL 또는 제목+출처를 클립보드에 복사
  const handleFigmaExport = useCallback(() => {
    if (displayCards.length === 0) {
      showToast({ variant: "info", sourceChip: "내보낼 레퍼런스가 없어요" });
      return;
    }
    const lines = displayCards.map((c) => {
      const url = (c as CardData & { urlValue?: string }).urlValue;
      if (url) return url;
      return `${c.title}${c.source ? ` (${c.source})` : ""}`;
    });
    navigator.clipboard
      .writeText(lines.join("\n"))
      .then(() => {
        showToast({
          variant: "success",
          sourceChip: "클립보드에 복사됐어요. Figma에 붙여넣으세요 🎨",
        });
      })
      .catch(() => {
        showToast({ variant: "error", sourceChip: "클립보드 복사에 실패했어요" });
      });
  }, [displayCards, showToast]);

  // Masonry — 2컬럼
  const leftCards = displayCards.filter((_, i) => i % 2 === 0);
  const rightCards = displayCards.filter((_, i) => i % 2 === 1);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "var(--redo-bg-primary, #FAFAF8)",
        fontFamily: FONT,
        overflow: "hidden",
      }}
    >
      {/* ── 상단 헤더 ── */}
      <div
        style={{
          padding: "52px 16px 10px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <p
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: "#2C2C2A",
            margin: 0,
            fontFamily: FONT,
          }}
        >
          작업대
        </p>
        <button
          onClick={handleFigmaExport}
          style={{
            border: "1px solid #6A70FF",
            color: "#6A70FF",
            borderRadius: 20,
            padding: "6px 14px",
            fontSize: 12,
            fontWeight: 500,
            background: "transparent",
            cursor: "pointer",
            fontFamily: FONT,
            WebkitTapHighlightColor: "transparent",
            lineHeight: 1,
          }}
        >
          Figma로 내보내기
        </button>
      </div>

      {/* ── 프로젝트 탭 ── */}
      <div
        style={{
          display: "flex",
          gap: 8,
          overflowX: "auto",
          padding: "0 16px 12px",
          scrollbarWidth: "none",
          flexShrink: 0,
        }}
      >
        {["전체", ...projectTags].map((tag) => {
          const isActive = selectedProject === tag;
          return (
            <button
              key={tag}
              onClick={() => setSelectedProject(tag)}
              style={{
                flexShrink: 0,
                height: 32,
                padding: "0 14px",
                borderRadius: 20,
                border: isActive ? "none" : "1px solid #6A70FF",
                background: isActive ? "#6A70FF" : "transparent",
                color: isActive ? "#fff" : "#6A70FF",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: FONT,
                WebkitTapHighlightColor: "transparent",
              }}
            >
              {tag}
            </button>
          );
        })}
      </div>

      {/* ── 메인 컨텐츠 ── */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "0 12px 8px",
          scrollbarWidth: "none",
        }}
      >
        {displayCards.length === 0 ? (
          /* 빈 상태 */
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "60px 24px",
              gap: 14,
            }}
          >
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: 18,
                background: "#EEEFFE",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 28,
              }}
            >
              🗂️
            </div>
            <p
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: "#2C2C2A",
                margin: 0,
                textAlign: "center",
                fontFamily: FONT,
                lineHeight: 1.4,
              }}
            >
              활용 탭에서 레퍼런스를 실행하면{"\n"}여기 모여요
            </p>
            <p
              style={{
                fontSize: 13,
                color: "#888780",
                margin: 0,
                textAlign: "center",
                lineHeight: 1.6,
                fontFamily: FONT,
              }}
            >
              작업 중인 레퍼런스들을 한눈에 볼 수 있어요
            </p>
          </div>
        ) : (
          /* Masonry 그리드 */
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
              alignItems: "start",
            }}
          >
            {/* 왼쪽 컬럼 */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {leftCards.map((card) => (
                <WorkbenchCard key={card.id} card={card} onTap={onCardTap} />
              ))}
            </div>
            {/* 오른쪽 컬럼 */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {rightCards.map((card) => (
                <WorkbenchCard key={card.id} card={card} onTap={onCardTap} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── 하단 카운터 ── */}
      {displayCards.length > 0 && (
        <p
          style={{
            fontSize: 12,
            color: "#888780",
            textAlign: "center",
            padding: "4px 16px 6px",
            margin: 0,
            fontFamily: FONT,
            flexShrink: 0,
          }}
        >
          {displayCards.length}개의 레퍼런스가{" "}
          {selectedProject === "전체"
            ? "작업대"
            : `${selectedProject} 프로젝트 작업대`}에 있어요
        </p>
      )}

      {/* ── 바텀 네비 ── */}
      <BottomNav
        activeTab="보관"
        onTabChange={onTabChange}
        onFabPress={onFabPress}
      />
    </div>
  );
}
