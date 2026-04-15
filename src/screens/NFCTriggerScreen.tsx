// ─── NFC Trigger Screen ──────────────────────────────────────────────────────
// Station 임계점 도달 후 폰을 올려놓으면 자동으로 열리는 화면.
// 진입: ?nfc=true URL 파라미터 또는 App.tsx isNFCTriggered state

import { useState, useEffect } from "react";
import type { CardData } from "../types";

const FONT =
  "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Noto Sans KR', system-ui, sans-serif";

// ─── Seesaw SVG ──────────────────────────────────────────────────────────────

function SeesawIllustration() {
  return (
    <svg width="120" height="64" viewBox="0 0 120 64" fill="none">
      {/* 중심 삼각형 (받침) */}
      <polygon points="60,52 50,64 70,64" fill="rgba(255,255,255,0.35)" />
      {/* 시소 판 — 좌측이 아래로 기울어진 상태 */}
      <rect
        x="8"
        y="28"
        width="104"
        height="6"
        rx="3"
        fill="rgba(255,255,255,0.7)"
        transform="rotate(-8 60 31)"
      />
      {/* 좌측 레퍼런스 블록 (무거움 — 아래) */}
      <rect
        x="14"
        y="24"
        width="22"
        height="16"
        rx="4"
        fill="rgba(255,255,255,0.9)"
        transform="rotate(-8 25 32)"
      />
      <rect
        x="19"
        y="16"
        width="14"
        height="12"
        rx="3"
        fill="rgba(255,255,255,0.55)"
        transform="rotate(-8 26 22)"
      />
      {/* 우측 실행 블록 (가벼움 — 위) */}
      <rect
        x="84"
        y="12"
        width="20"
        height="14"
        rx="4"
        fill="rgba(255,255,255,0.5)"
        transform="rotate(-8 94 19)"
      />
    </svg>
  );
}

// ─── Mini Preview Card ───────────────────────────────────────────────────────

function MiniCard({ card }: { card: CardData }) {
  return (
    <div
      style={{
        width: 80,
        height: 100,
        borderRadius: 10,
        overflow: "hidden",
        background: "#EEEFFE",
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {card.image ? (
        <img
          src={card.image}
          alt={card.title}
          style={{ width: "100%", height: 60, objectFit: "cover", display: "block" }}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <div
          style={{
            width: "100%",
            height: 60,
            background: "#DDD9FF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span style={{ fontSize: 18, opacity: 0.5 }}>📌</span>
        </div>
      )}
      <div style={{ padding: "4px 6px", flex: 1 }}>
        <p
          style={{
            fontSize: 9,
            fontWeight: 500,
            color: "#3C3489",
            margin: 0,
            lineHeight: 1.35,
            fontFamily: FONT,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {card.savedReason || card.title}
        </p>
      </div>
    </div>
  );
}

// ─── "그 외 N개 더" Card ─────────────────────────────────────────────────────

function MoreCard({ count }: { count: number }) {
  return (
    <div
      style={{
        width: 80,
        height: 100,
        borderRadius: 10,
        background: "#F1EFE8",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 2,
      }}
    >
      <span style={{ fontSize: 16, fontWeight: 700, color: "#888780", fontFamily: FONT }}>
        +{count}
      </span>
      <span style={{ fontSize: 9, color: "#888780", fontFamily: FONT }}>
        개 더
      </span>
    </div>
  );
}

// ─── NFC Trigger Screen ──────────────────────────────────────────────────────

interface NFCTriggerScreenProps {
  cards: CardData[];
  executedCardIds: Set<number>;
  onExecuteNow: (projectTag?: string) => void;
  onDismiss: () => void;
}

export function NFCTriggerScreen({
  cards,
  executedCardIds,
  onExecuteNow,
  onDismiss,
}: NFCTriggerScreenProps) {
  // ── 미실행 카드 계산 ────────────────────────────────────────────────────────
  const pendingCards = cards.filter(
    (c) => c.statusDot === "미실행" && !executedCardIds.has(c.id)
  );
  const pendingCount = pendingCards.length;

  // 가장 많은 프로젝트 태그 찾기
  const tagCounts = new Map<string, number>();
  pendingCards.forEach((c) => {
    tagCounts.set(c.projectTag, (tagCounts.get(c.projectTag) ?? 0) + 1);
  });
  let topProject = "레퍼런스";
  let topCount = 0;
  tagCounts.forEach((count, tag) => {
    if (count > topCount) {
      topCount = count;
      topProject = tag;
    }
  });

  // 미리보기 카드: 최대 4개
  const previewCards = pendingCards.slice(0, 4);
  const extraCount = pendingCount - previewCards.length;

  // ── 진입 애니메이션 ─────────────────────────────────────────────────────────
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => setEntered(true));
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  const heroStyle: React.CSSProperties = {
    transform: entered ? "scale(1)" : "scale(0.95)",
    opacity: entered ? 1 : 0,
    transition: "transform 300ms ease-out, opacity 300ms ease-out",
  };

  const bannerStyle: React.CSSProperties = {
    transform: entered ? "translateY(0)" : "translateY(20px)",
    opacity: entered ? 1 : 0,
    transition: "transform 200ms ease-out 100ms, opacity 200ms ease-out 100ms",
  };

  const stripStyle: React.CSSProperties = {
    transform: entered ? "translateY(0)" : "translateY(20px)",
    opacity: entered ? 1 : 0,
    transition: "transform 200ms ease-out 200ms, opacity 200ms ease-out 200ms",
  };

  const ctaStyle: React.CSSProperties = {
    transform: entered ? "translateY(0)" : "translateY(20px)",
    opacity: entered ? 1 : 0,
    transition: "transform 200ms ease-out 300ms, opacity 200ms ease-out 300ms",
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 70,
        background: "var(--redo-bg-primary, #fff)",
        display: "flex",
        flexDirection: "column",
        fontFamily: FONT,
        overflow: "hidden",
      }}
    >
      {/* ── 상단 보라 영역 (35%) ── */}
      <div
        style={{
          height: "35%",
          background: "#6A70FF",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          flexShrink: 0,
          borderRadius: "0 0 24px 24px",
          ...heroStyle,
        }}
      >
        <SeesawIllustration />
        <p
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: "rgba(255,255,255,0.85)",
            margin: 0,
            lineHeight: 1.4,
            textAlign: "center",
          }}
        >
          미실행 레퍼런스가 쌓였어요
        </p>
      </div>

      {/* ── 스크롤 가능한 콘텐츠 영역 ── */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 0,
        }}
      >
        {/* ── 배너 카드 ── */}
        <div
          style={{
            margin: "20px 20px 0",
            background: "#ffffff",
            borderRadius: 12,
            padding: 16,
            display: "flex",
            alignItems: "center",
            gap: 14,
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
            border: "0.5px solid rgba(0,0,0,0.05)",
            ...bannerStyle,
          }}
        >
          {/* 보라 원형 숫자 */}
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "#6A70FF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>
              {pendingCount}
            </span>
          </div>

          {/* 텍스트 */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: "#2C2C2A",
                margin: 0,
                lineHeight: 1.4,
              }}
            >
              {topProject} 레퍼런스 {pendingCount}개
            </p>
            <p
              style={{
                fontSize: 12,
                fontWeight: 400,
                color: "#888780",
                margin: "2px 0 0",
                lineHeight: 1.4,
              }}
            >
              지금 꺼내볼까요?
            </p>
          </div>
        </div>

        {/* ── 카드 미리보기 스트립 ── */}
        {previewCards.length > 0 && (
          <div
            style={{
              padding: "16px 20px 0",
              ...stripStyle,
            }}
          >
            <div
              style={{
                display: "flex",
                gap: 8,
                overflowX: "auto",
                scrollbarWidth: "none",
                paddingBottom: 4,
              }}
            >
              {previewCards.map((card) => (
                <MiniCard key={card.id} card={card} />
              ))}
              {extraCount > 0 && <MoreCard count={extraCount} />}
            </div>
          </div>
        )}
      </div>

      {/* ── 하단 고정 CTA 영역 ── */}
      <div
        style={{
          padding: "12px 20px",
          paddingBottom: "calc(12px + env(safe-area-inset-bottom))",
          flexShrink: 0,
          ...ctaStyle,
        }}
      >
        {/* 메인 CTA */}
        <button
          onClick={() => onExecuteNow(topProject)}
          style={{
            width: "100%",
            height: 52,
            borderRadius: 14,
            background: "#6A70FF",
            color: "#fff",
            fontSize: 18,
            fontWeight: 500,
            border: "none",
            cursor: "pointer",
            fontFamily: FONT,
            lineHeight: 1,
            boxShadow: "0 4px 16px rgba(106,112,255,0.35)",
            WebkitTapHighlightColor: "transparent",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          지금 실행하기
        </button>

        {/* 서브 버튼 */}
        <button
          onClick={onDismiss}
          style={{
            width: "100%",
            height: 44,
            marginTop: 6,
            borderRadius: 10,
            background: "transparent",
            color: "#888780",
            fontSize: 14,
            fontWeight: 400,
            border: "none",
            cursor: "pointer",
            fontFamily: FONT,
            lineHeight: 1,
            WebkitTapHighlightColor: "transparent",
          }}
        >
          나중에 할게요
        </button>
      </div>
    </div>
  );
}
