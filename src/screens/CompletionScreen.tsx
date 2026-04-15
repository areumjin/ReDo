// ─── Completion Screen ───────────────────────────────────────────────────────
// 미실행 레퍼런스가 0개가 됐을 때 나타나는 보상 화면.
// ActionScreen에서 마지막 카드 처리 후 자동으로 열림.

import { useState, useEffect } from "react";

const FONT =
  "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Noto Sans KR', system-ui, sans-serif";

// ─── Animated Seesaw SVG ─────────────────────────────────────────────────────

function AnimatedSeesaw() {
  const [tilt, setTilt] = useState(-20);
  const [showParticles, setShowParticles] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setTilt(0), 1000);
    const t2 = setTimeout(() => setShowParticles(true), 2500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <svg width="200" height="110" viewBox="0 0 200 110" fill="none">
      {/* 받침대 */}
      <polygon points="100,85 88,105 112,105" fill="#D5D4CF" />

      {/* 시소 판 (기울기 애니메이션) */}
      <g
        style={{
          transformOrigin: "100px 80px",
          transform: `rotate(${tilt}deg)`,
          transition: "transform 1.5s ease-in-out",
        }}
      >
        <rect x="16" y="77" width="168" height="6" rx="3" fill="#BCBAB5" />

        {/* 왼쪽: 폰 아이콘 */}
        <rect x="22" y="57" width="20" height="28" rx="5" fill="#6A70FF" opacity="0.75" />
        <rect x="26" y="61" width="12" height="17" rx="2.5" fill="#fff" opacity="0.6" />

        {/* 오른쪽: 워치 아이콘 */}
        <circle cx="172" cy="67" r="12" fill="#6A70FF" opacity="0.55" />
        <circle cx="172" cy="67" r="7" fill="#fff" opacity="0.5" />
      </g>

      {/* 파티클 효과 (복귀 완료 시) */}
      {showParticles && (
        <>
          <circle cx="85" cy="60" r="3" fill="#6A70FF" opacity="0.7">
            <animate attributeName="cy" from="65" to="30" dur="0.8s" fill="freeze" />
            <animate attributeName="opacity" from="0.7" to="0" dur="0.8s" fill="freeze" />
          </circle>
          <circle cx="100" cy="55" r="2.5" fill="#1D9E75" opacity="0.6">
            <animate attributeName="cy" from="60" to="22" dur="0.9s" fill="freeze" />
            <animate attributeName="opacity" from="0.6" to="0" dur="0.9s" fill="freeze" />
          </circle>
          <circle cx="118" cy="58" r="3.5" fill="#EF9F27" opacity="0.65">
            <animate attributeName="cy" from="62" to="28" dur="0.85s" fill="freeze" />
            <animate attributeName="opacity" from="0.65" to="0" dur="0.85s" fill="freeze" />
          </circle>
        </>
      )}
    </svg>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

interface CompletionScreenProps {
  executedCount: number;
  skippedCount: number;
  totalCards: number;
  onSaveNew: () => void;
  onGoHome: () => void;
}

export function CompletionScreen({
  executedCount,
  skippedCount,
  totalCards,
  onSaveNew,
  onGoHome,
}: CompletionScreenProps) {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => setEntered(true));
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  // 애니메이션 딜레이별 스타일 생성
  const makeDelay = (delayMs: number): React.CSSProperties => ({
    opacity: entered ? 1 : 0,
    transform: entered ? "translateY(0) scale(1)" : "translateY(12px) scale(0.95)",
    transition: `opacity 350ms ease-out ${delayMs}ms, transform 350ms ease-out ${delayMs}ms`,
  });

  const checkIconStyle: React.CSSProperties = {
    transform: entered ? "scale(1)" : "scale(0)",
    transition: "transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1) 100ms",
  };

  // 평균 실행 시간 (간단히 전체 카드수 ÷ 실행수로 추정)
  const avgDays = executedCount > 0 ? Math.max(1, Math.round(totalCards / executedCount)) : 0;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 75,
        background: "#fff",
        backgroundImage: "radial-gradient(circle at 50% 40%, rgba(106,112,255,0.06) 0%, transparent 70%)",
        display: "flex",
        flexDirection: "column",
        fontFamily: FONT,
        overflow: "hidden",
        opacity: entered ? 1 : 0,
        transform: entered ? "scale(1)" : "scale(0.8)",
        transition: "opacity 350ms ease-out, transform 350ms ease-out",
      }}
    >
      {/* ── 중앙 메인 영역 ── */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 32px",
          gap: 0,
        }}
      >
        {/* 시소 애니메이션 */}
        <div style={makeDelay(0)}>
          <AnimatedSeesaw />
        </div>

        {/* 완료 아이콘 */}
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            background: "#E1F5EE",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginTop: 16,
            ...checkIconStyle,
          }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <path
              d="M5 13l4 4L19 7"
              stroke="#1D9E75"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* 타이틀 */}
        <p
          style={{
            fontSize: 24,
            fontWeight: 500,
            color: "#2C2C2A",
            margin: 0,
            marginTop: 16,
            textAlign: "center",
            lineHeight: 1.3,
            ...makeDelay(200),
          }}
        >
          모두 실행했어요!
        </p>

        {/* 이번 루프 요약 */}
        <div style={{ marginTop: 10, textAlign: "center", ...makeDelay(300) }}>
          <p
            style={{
              fontSize: 14,
              color: "#888780",
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            이번에 {executedCount}개 실행 · {skippedCount}개 건너뜀
          </p>
        </div>

        {/* 진행 요약 카드 */}
        <div
          style={{
            background: "#F8F7F4",
            borderRadius: 14,
            padding: 16,
            marginTop: 20,
            width: "100%",
            maxWidth: 280,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            textAlign: "center",
            ...makeDelay(400),
          }}
        >
          <div>
            <p style={{ fontSize: 11, color: "#888780", margin: "0 0 4px", lineHeight: 1 }}>
              실행한 레퍼런스
            </p>
            <p style={{ fontSize: 18, fontWeight: 500, color: "#6A70FF", margin: 0, lineHeight: 1.2 }}>
              {executedCount}개
            </p>
          </div>
          <div>
            <p style={{ fontSize: 11, color: "#888780", margin: "0 0 4px", lineHeight: 1 }}>
              평균 실행 시간
            </p>
            <p style={{ fontSize: 18, fontWeight: 500, color: "#6A70FF", margin: 0, lineHeight: 1.2 }}>
              {avgDays}일
            </p>
          </div>
        </div>
      </div>

      {/* ── 하단 영역 ── */}
      <div
        style={{
          padding: "0 20px 20px",
          paddingBottom: "calc(20px + env(safe-area-inset-bottom))",
          flexShrink: 0,
          ...makeDelay(500),
        }}
      >
        {/* 메시지 */}
        <p
          style={{
            fontSize: 12,
            color: "#6A70FF",
            fontStyle: "italic",
            margin: "0 0 14px",
            textAlign: "center",
            lineHeight: 1.5,
          }}
        >
          실행이 저장을 부르는 선순환이 시작됐어요 ↻
        </p>

        {/* 메인 버튼 */}
        <button
          onClick={onSaveNew}
          style={{
            width: "100%",
            height: 52,
            borderRadius: 14,
            background: "#6A70FF",
            color: "#fff",
            fontSize: 16,
            fontWeight: 500,
            border: "none",
            cursor: "pointer",
            fontFamily: FONT,
            lineHeight: 1,
            boxShadow: "0 4px 16px rgba(106,112,255,0.35)",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          새로운 레퍼런스 저장하기
        </button>

        {/* 서브 버튼 */}
        <button
          onClick={onGoHome}
          style={{
            width: "100%",
            height: 40,
            marginTop: 6,
            borderRadius: 10,
            background: "transparent",
            color: "#888780",
            fontSize: 13,
            fontWeight: 400,
            border: "none",
            cursor: "pointer",
            fontFamily: FONT,
            lineHeight: 1,
            WebkitTapHighlightColor: "transparent",
          }}
        >
          기록 보기
        </button>
      </div>
    </div>
  );
}
