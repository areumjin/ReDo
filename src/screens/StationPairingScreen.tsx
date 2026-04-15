// ─── Station Pairing Screen ──────────────────────────────────────────────────
// 앱 최초 실행 시 NFC가 처음 감지됐을 때 1회만 표시.
// localStorage 'redo_station_paired' 없을 때만 진입.

import { useState, useEffect } from "react";

const FONT =
  "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Noto Sans KR', system-ui, sans-serif";

// ─── Large Seesaw Illustration ───────────────────────────────────────────────

function PairingSeesaw() {
  return (
    <svg width="160" height="90" viewBox="0 0 160 90" fill="none">
      {/* 받침대 */}
      <polygon points="80,72 68,88 92,88" fill="rgba(255,255,255,0.3)" />

      {/* 시소 판 — 수평 */}
      <rect x="12" y="65" width="136" height="6" rx="3" fill="rgba(255,255,255,0.6)" />

      {/* 왼쪽: 폰 아이콘 */}
      <rect x="18" y="45" width="20" height="28" rx="5" fill="rgba(255,255,255,0.85)" />
      <rect x="22" y="49" width="12" height="17" rx="2.5" fill="rgba(106,112,255,0.5)" />

      {/* 오른쪽: 워치 아이콘 */}
      <circle cx="138" cy="55" r="12" fill="rgba(255,255,255,0.85)" />
      <circle cx="138" cy="55" r="7" fill="rgba(106,112,255,0.4)" />

      {/* 중앙 하단: NFC 물결 */}
      <g transform="translate(68, 0)">
        <path
          d="M8 18c2.5-2.5 6.5-2.5 9 0"
          stroke="rgba(255,255,255,0.9)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M5 14c4.5-4.5 11.5-4.5 16 0"
          stroke="rgba(255,255,255,0.6)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M2 10c6.5-6.5 16.5-6.5 23 0"
          stroke="rgba(255,255,255,0.35)"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

// ─── Feature Row ─────────────────────────────────────────────────────────────

function FeatureRow({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
      {/* 아이콘 원 */}
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          background: "#EEEFFE",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          marginTop: 2,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <p
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: "#2C2C2A",
            margin: 0,
            lineHeight: 1.4,
            fontFamily: FONT,
          }}
        >
          {title}
        </p>
        <p
          style={{
            fontSize: 11,
            fontWeight: 400,
            color: "#888780",
            margin: "3px 0 0",
            lineHeight: 1.5,
            fontFamily: FONT,
          }}
        >
          {subtitle}
        </p>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

interface StationPairingScreenProps {
  onComplete: (threshold: number) => void;
  onDismiss: () => void;
}

export function StationPairingScreen({
  onComplete,
  onDismiss,
}: StationPairingScreenProps) {
  const [slideIn, setSlideIn] = useState(false);
  const [threshold, setThreshold] = useState(15);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => setSlideIn(true));
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        display: "flex",
        flexDirection: "column",
        fontFamily: FONT,
      }}
    >
      {/* Scrim */}
      <div
        onClick={onDismiss}
        style={{
          position: "absolute",
          inset: 0,
          background: slideIn ? "rgba(0,0,0,0.4)" : "rgba(0,0,0,0)",
          transition: "background 300ms ease",
        }}
      />

      {/* Sheet */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "#fff",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          transform: slideIn ? "translateY(0)" : "translateY(100%)",
          transition: "transform 300ms ease-out",
          willChange: "transform",
        }}
      >
        {/* ── 상단 일러스트 영역 (40%) ── */}
        <div
          style={{
            height: "40%",
            background: "#6A70FF",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 20,
            flexShrink: 0,
          }}
        >
          <PairingSeesaw />
          <p
            style={{
              fontSize: 20,
              fontWeight: 500,
              color: "#fff",
              margin: 0,
              textAlign: "center",
              lineHeight: 1.5,
              whiteSpace: "pre-line",
            }}
          >
            {"ReDo Station\n발견됐어요!"}
          </p>
        </div>

        {/* ── 콘텐츠 영역 (스크롤) ── */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            scrollbarWidth: "none",
            padding: "24px 20px 0",
          }}
        >
          <p
            style={{
              fontSize: 16,
              fontWeight: 500,
              color: "#2C2C2A",
              margin: "0 0 16px",
              lineHeight: 1.3,
            }}
          >
            연결하면 이렇게 작동해요
          </p>

          {/* 기능 소개 rows */}
          <div
            style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}
          >
            <FeatureRow
              icon={
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M3 12l2-6h14l2 6M3 12v6a1 1 0 001 1h16a1 1 0 001-1v-6"
                    stroke="#6A70FF"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              }
              title="레퍼런스가 쌓이면 시소가 기울어져요"
              subtitle="강요나 알림 없이, 존재감으로만 알려줘요"
            />
            <FeatureRow
              icon={
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <rect
                    x="5"
                    y="2"
                    width="14"
                    height="20"
                    rx="3"
                    stroke="#6A70FF"
                    strokeWidth="2"
                  />
                  <path d="M12 18h0" stroke="#6A70FF" strokeWidth="2" strokeLinecap="round" />
                </svg>
              }
              title="폰을 올려두면 앱이 자동으로 열려요"
              subtitle="기존 충전 습관에 연결해요 — 새 행동 필요 없어요"
            />
            <FeatureRow
              icon={
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M5 13l4 4L19 7"
                    stroke="#6A70FF"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              }
              title="실행할수록 시소가 수평으로 돌아와요"
              subtitle="실행이 보상이에요"
            />
          </div>

          {/* ── 임계값 설정 ── */}
          <div
            style={{
              background: "#F8F7F4",
              borderRadius: 12,
              padding: 16,
              marginBottom: 20,
            }}
          >
            <p
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: "#888780",
                margin: "0 0 10px",
                lineHeight: 1,
              }}
            >
              기울어지기 시작할 개수 설정
            </p>

            <p
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: "#6A70FF",
                margin: "0 0 8px",
                lineHeight: 1.3,
              }}
            >
              {threshold}개 미실행 시 최대 기울기
            </p>

            <input
              type="range"
              min={5}
              max={20}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              style={{
                width: "100%",
                height: 6,
                accentColor: "#6A70FF",
                cursor: "pointer",
              }}
            />

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 4,
              }}
            >
              <span style={{ fontSize: 10, color: "#BCBAB5", fontFamily: FONT }}>5개</span>
              <span style={{ fontSize: 10, color: "#BCBAB5", fontFamily: FONT }}>20개</span>
            </div>

            <p
              style={{
                fontSize: 11,
                fontStyle: "italic",
                color: "#888780",
                margin: "8px 0 0",
                lineHeight: 1.5,
              }}
            >
              저장 속도에 따라 나중에 자동으로 조정돼요
            </p>
          </div>
        </div>

        {/* ── 하단 버튼 ── */}
        <div
          style={{
            padding: "0 20px 20px",
            paddingBottom: "calc(20px + env(safe-area-inset-bottom))",
            flexShrink: 0,
          }}
        >
          <button
            onClick={() => onComplete(threshold)}
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
            연결하기
          </button>

          <button
            onClick={onDismiss}
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
            나중에 연결할게요
          </button>
        </div>
      </div>
    </div>
  );
}
