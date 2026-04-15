// ─── Station Status Screen ───────────────────────────────────────────────────
// 홈탭 상단 Station 배너를 탭하면 열리는 전체 화면.
// 시소 기울기 + 미실행 현황 + 프로젝트별 진행률.

import { useState, useEffect, useMemo } from "react";
import type { CardData } from "../types";

const FONT =
  "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Noto Sans KR', system-ui, sans-serif";

// ─── Seesaw SVG (동적 기울기) ────────────────────────────────────────────────

function SeesawVisualization({
  tiltDeg,
  animated,
}: {
  tiltDeg: number;
  animated: boolean;
}) {
  return (
    <svg
      width="100%"
      height="120"
      viewBox="0 0 280 120"
      fill="none"
      style={{ display: "block" }}
    >
      {/* 받침대 삼각형 */}
      <polygon points="140,95 125,115 155,115" fill="#CCCBC6" />

      {/* 시소 판 */}
      <g
        style={{
          transformOrigin: "140px 90px",
          transform: `rotate(${animated ? tiltDeg : 0}deg)`,
          transition: animated ? "transform 1.2s ease-in-out" : "none",
        }}
      >
        <rect x="30" y="87" width="220" height="6" rx="3" fill="#D5D4CF" />

        {/* 왼쪽 끝: 폰 아이콘 (레퍼런��� 쌓임) */}
        <rect x="35" y="69" width="18" height="26" rx="4" fill="#6A70FF" opacity="0.8" />
        <rect x="39" y="72" width="10" height="16" rx="2" fill="#fff" opacity="0.6" />

        {/* 오른쪽 끝: 워치 아이콘 */}
        <circle cx="242" cy="78" r="10" fill="#BCBAB5" opacity="0.6" />
        <circle cx="242" cy="78" r="6" fill="#fff" opacity="0.4" />
      </g>

      {/* 기울기 각도 텍스트 */}
      <text
        x="260"
        y="112"
        fontSize="11"
        fill="#BCBAB5"
        fontFamily={FONT}
        textAnchor="end"
      >
        {tiltDeg === 0 ? "수평" : `${Math.abs(tiltDeg)}°`}
      </text>
    </svg>
  );
}

// ─── Mini Seesaw (홈 배너용) ─────────────────────────────────────────────────

export function MiniSeesaw({ tiltDeg }: { tiltDeg: number }) {
  return (
    <svg width="30" height="20" viewBox="0 0 30 20" fill="none">
      <polygon points="15,16 12,20 18,20" fill="#CCCBC6" />
      <g
        style={{
          transformOrigin: "15px 14px",
          transform: `rotate(${tiltDeg}deg)`,
        }}
      >
        <rect x="2" y="13" width="26" height="2" rx="1" fill="#D5D4CF" />
        <rect x="3" y="8" width="5" height="7" rx="1.5" fill="#6A70FF" opacity="0.7" />
        <circle cx="26" cy="11" r="3" fill="#BCBAB5" opacity="0.5" />
      </g>
    </svg>
  );
}

// ─── Tilt degree from pending count ──────────────────────────────────────────

export function getTiltDeg(pendingCount: number): number {
  if (pendingCount === 0) return 0;
  if (pendingCount <= 4) return -5;
  if (pendingCount <= 9) return -12;
  if (pendingCount <= 14) return -20;
  return -28;
}

// ─── Status message ──────────────────────────────────────────────────────────

function getStatusMessage(pendingCount: number): { text: string; color: string } {
  if (pendingCount === 0)
    return { text: "완벽해요! 시소가 수평이에요 🎉", color: "#1D9E75" };
  if (pendingCount <= 4)
    return { text: "거의 다 왔어요. 조금만 더!", color: "#6A70FF" };
  if (pendingCount <= 14)
    return { text: "레퍼런스가 쌓이고 있어요", color: "#EF9F27" };
  return {
    text: "임계점에 도달했어요. 폰을 올려두면 자동으로 열려요",
    color: "#E24B4A",
  };
}

// ─── Main Component ──────────────────────────────────────────────────────────

interface StationStatusScreenProps {
  cards: CardData[];
  executedCardIds: Set<number>;
  onClose: () => void;
  onExecuteNow: () => void;
}

export function StationStatusScreen({
  cards,
  executedCardIds,
  onClose,
  onExecuteNow,
}: StationStatusScreenProps) {
  const [animated, setAnimated] = useState(false);
  const [slideIn, setSlideIn] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setSlideIn(true);
        setAnimated(true);
      });
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  // ── 수치 계산 ──
  const totalCount = cards.length;
  const executedCount = cards.filter(
    (c) => executedCardIds.has(c.id) || c.statusDot === "실행완료"
  ).length;
  const pendingCount = totalCount - executedCount;
  const tiltDeg = getTiltDeg(pendingCount);
  const status = getStatusMessage(pendingCount);

  // ── 프로젝트별 현황 ──
  const projectStats = useMemo(() => {
    const map = new Map<string, { total: number; executed: number }>();
    cards.forEach((c) => {
      const tag = c.projectTag;
      if (!map.has(tag)) map.set(tag, { total: 0, executed: 0 });
      const s = map.get(tag)!;
      s.total++;
      if (executedCardIds.has(c.id) || c.statusDot === "실행완료") s.executed++;
    });
    return Array.from(map.entries())
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.total - a.total);
  }, [cards, executedCardIds]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 68,
        display: "flex",
        flexDirection: "column",
        fontFamily: FONT,
      }}
    >
      {/* Scrim */}
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: slideIn ? "rgba(0,0,0,0.35)" : "rgba(0,0,0,0)",
          transition: "background 300ms ease",
        }}
      />

      {/* Sheet — 아래에서 위로 슬라이드인 */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          maxHeight: "92vh",
          background: "#fff",
          borderRadius: "20px 20px 0 0",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          transform: slideIn ? "translateY(0)" : "translateY(100%)",
          transition: "transform 300ms ease-out",
          willChange: "transform",
        }}
      >
        {/* 핸들바 + 헤더 */}
        <div style={{ padding: "12px 20px 0", flexShrink: 0 }}>
          <div
            style={{
              width: 36,
              height: 4,
              borderRadius: 2,
              background: "#D5D4CF",
              margin: "0 auto 12px",
            }}
          />
          <p
            style={{
              fontSize: 16,
              fontWeight: 500,
              color: "var(--redo-text-primary, #2C2C2A)",
              margin: 0,
              textAlign: "center",
              lineHeight: 1.3,
            }}
          >
            Station 현황
          </p>
        </div>

        {/* 스크롤 가능 영역 */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            scrollbarWidth: "none",
            paddingBottom: 0,
          }}
        >
          {/* ── 시소 시각화 ── */}
          <div
            style={{
              margin: "16px 20px",
              background: "#F8F7F4",
              borderRadius: 16,
              padding: 24,
            }}
          >
            <SeesawVisualization tiltDeg={tiltDeg} animated={animated} />

            {/* 수치 요약 3열 */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 0,
                marginTop: 16,
                textAlign: "center",
              }}
            >
              <div>
                <p
                  style={{
                    fontSize: 11,
                    color: "#888780",
                    margin: "0 0 4px",
                    lineHeight: 1,
                  }}
                >
                  전체 저장
                </p>
                <p
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    color: "#2C2C2A",
                    margin: 0,
                    lineHeight: 1,
                  }}
                >
                  {totalCount}
                </p>
              </div>
              <div>
                <p
                  style={{
                    fontSize: 11,
                    color: "#888780",
                    margin: "0 0 4px",
                    lineHeight: 1,
                  }}
                >
                  미실행
                </p>
                <p
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    color: "#E24B4A",
                    margin: 0,
                    lineHeight: 1,
                  }}
                >
                  {pendingCount}
                </p>
              </div>
              <div>
                <p
                  style={{
                    fontSize: 11,
                    color: "#888780",
                    margin: "0 0 4px",
                    lineHeight: 1,
                  }}
                >
                  실행 완료
                </p>
                <p
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    color: "#1D9E75",
                    margin: 0,
                    lineHeight: 1,
                  }}
                >
                  {executedCount}
                </p>
              </div>
            </div>
          </div>

          {/* ── 상태 메시지 ── */}
          <div style={{ padding: "0 20px", marginBottom: 16 }}>
            <p
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: status.color,
                margin: 0,
                lineHeight: 1.5,
                textAlign: "center",
              }}
            >
              {status.text}
            </p>
          </div>

          {/* ── NFC 상태 배너 (15개+ 일 때만) ── */}
          {pendingCount >= 15 && (
            <div
              style={{
                margin: "0 20px 16px",
                background: "#FFF4F4",
                borderRadius: 10,
                padding: "12px 16px",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              {/* NFC 물결 아이콘 */}
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                style={{ flexShrink: 0 }}
              >
                <path
                  d="M6 18.7V5.3c0-1 .8-1.7 1.6-1.2l.2.1C9.2 5.3 10 7.1 10 9v6c0 1.9.8 3.7 2.2 4.8"
                  stroke="#E24B4A"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <path
                  d="M14 18.7V5.3c0-1 .8-1.7 1.6-1.2l.2.1C17.2 5.3 18 7.1 18 9v6c0 1.9.8 3.7 2.2 4.8"
                  stroke="#E24B4A"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  opacity="0.5"
                />
              </svg>
              <div>
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#E24B4A",
                    margin: 0,
                    lineHeight: 1.3,
                  }}
                >
                  NFC 활성화됨
                </p>
                <p
                  style={{
                    fontSize: 11,
                    color: "#888780",
                    margin: "2px 0 0",
                    lineHeight: 1.4,
                  }}
                >
                  폰을 Station에 올려두면 앱이 자동으로 열려요
                </p>
              </div>
            </div>
          )}

          {/* ── 프로젝트별 현황 ── */}
          <div style={{ padding: "0 20px", marginBottom: 16 }}>
            <p
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: "#888780",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                margin: "0 0 12px",
                lineHeight: 1,
              }}
            >
              프로젝트별 현황
            </p>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              {projectStats.map(({ name, total, executed }) => {
                const pct = total > 0 ? Math.round((executed / total) * 100) : 0;
                return (
                  <div key={name}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 6,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: "#2C2C2A",
                        }}
                      >
                        {name}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          color: "#888780",
                        }}
                      >
                        {executed}개 실행 / {total}개 전체
                      </span>
                    </div>
                    {/* 진행바 */}
                    <div
                      style={{
                        width: "100%",
                        height: 6,
                        borderRadius: 3,
                        background: "#EBEBEB",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${pct}%`,
                          height: "100%",
                          borderRadius: 3,
                          background: "#6A70FF",
                          transition: animated
                            ? "width 0.8s ease-out"
                            : "none",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── 하단 버튼 ── */}
        <div
          style={{
            padding: "16px 20px",
            paddingBottom: "calc(16px + env(safe-area-inset-bottom))",
            flexShrink: 0,
            borderTop: "0.5px solid rgba(0,0,0,0.06)",
          }}
        >
          <button
            onClick={onExecuteNow}
            style={{
              width: "100%",
              height: 48,
              borderRadius: 12,
              background: "#6A70FF",
              color: "#fff",
              fontSize: 15,
              fontWeight: 500,
              border: "none",
              cursor: "pointer",
              fontFamily: FONT,
              lineHeight: 1,
              boxShadow: "0 4px 16px rgba(106,112,255,0.3)",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            지금 실행하기
          </button>
        </div>
      </div>
    </div>
  );
}
