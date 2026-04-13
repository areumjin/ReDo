import { useState, useEffect, useRef, useMemo } from "react";
import { StatusBar } from "../components/StatusBar";
import { BottomNav } from "../components/AppBottomNav";
import type { CardData } from "../types";
import {
  calculateChipFrequency,
  calculateProjectStats,
  calculateHabitStats,
  getTopKeywords,
  getSparklineData,
  getSourceFrequency,
  getColorKeywords,
  getTrendKeyword,
} from "../utils/insightsData";

// ─── Constants ────────────────────────────────────────────────────────────────

type SubTab = "취향" | "프로젝트" | "습관" | "시각";
const SUB_TABS: SubTab[] = ["취향", "프로젝트", "습관", "시각"];

const FONT =
  "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Noto Sans KR', system-ui, sans-serif";

// USER_NAME is now read from props

// Rank-based color palette for taste items
const TASTE_COLORS = [
  {
    bg: "var(--redo-brand-light)",
    bar: "var(--redo-brand)",
    text: "var(--redo-brand-dark)",
  },
  {
    bg: "rgba(29,158,117,0.07)",
    bar: "var(--redo-success)",
    text: "#0d6b50",
  },
  {
    bg: "rgba(239,159,39,0.08)",
    bar: "var(--redo-warning)",
    text: "#a06200",
  },
  {
    bg: "rgba(226,75,74,0.07)",
    bar: "var(--redo-danger)",
    text: "#b03534",
  },
];

// ─── Shared primitives ────────────────────────────────────────────────────────

function SectionPill({ label }: { label: string }) {
  return (
    <span
      style={{
        fontSize: "var(--text-context-label)",
        fontWeight: "var(--font-weight-medium)",
        color: "var(--redo-brand-dark)",
        background: "var(--redo-brand-light)",
        borderRadius: "var(--radius-chip)",
        padding: "3px 10px",
        lineHeight: 1.5,
        fontFamily: FONT,
      }}
    >
      {label}
    </span>
  );
}

function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        background: "var(--redo-bg-primary)",
        borderRadius: "var(--radius-card)",
        border: "0.5px solid var(--redo-border)",
        boxShadow: "var(--shadow-card)",
        overflow: "hidden",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function AnimatedBar({
  pct,
  color,
  mounted,
  height = 4,
}: {
  pct: number;
  color: string;
  mounted: boolean;
  height?: number;
}) {
  return (
    <div
      style={{
        width: "100%",
        height,
        borderRadius: 99,
        background: "rgba(0,0,0,0.07)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: "100%",
          borderRadius: 99,
          background: color,
          width: mounted ? `${pct}%` : "0%",
          transition: "width 0.85s cubic-bezier(0.34,1.2,0.64,1)",
        }}
      />
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div
      style={{
        padding: "28px 16px",
        textAlign: "center",
        fontSize: "var(--text-caption)",
        fontWeight: "var(--font-weight-regular)",
        color: "var(--redo-text-tertiary)",
        fontFamily: FONT,
        lineHeight: 1.6,
      }}
    >
      {text}
    </div>
  );
}

// ─── Sub-tab bar ──────────────────────────────────────────────────────────────

function SubTabBar({
  active,
  onChange,
}: {
  active: SubTab;
  onChange: (t: SubTab) => void;
}) {
  return (
    <div
      className="flex shrink-0 w-full"
      style={{
        background: "var(--redo-bg-primary)",
        borderBottom: "0.5px solid var(--redo-border)",
      }}
    >
      {SUB_TABS.map((tab) => {
        const isActive = tab === active;
        return (
          <button
            key={tab}
            onClick={() => onChange(tab)}
            style={{
              flex: 1,
              height: 44,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "none",
              border: "none",
              cursor: "pointer",
              position: "relative",
              padding: 0,
            }}
          >
            <span
              style={{
                fontSize: "var(--text-body)",
                fontWeight: isActive
                  ? "var(--font-weight-medium)"
                  : "var(--font-weight-regular)",
                color: isActive
                  ? "var(--redo-brand)"
                  : "var(--redo-text-tertiary)",
                lineHeight: 1.4,
                fontFamily: FONT,
                transition: "color 0.15s ease",
              }}
            >
              {tab}
            </span>
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: "50%",
                transform: "translateX(-50%)",
                height: 2,
                borderRadius: 2,
                background: "var(--redo-brand)",
                width: isActive ? "60%" : "0%",
                transition: "width 0.2s ease",
              }}
            />
          </button>
        );
      })}
    </div>
  );
}

// ─── Sparkline ────────────────────────────────────────────────────────────────

function Sparkline({ data }: { data: number[] }) {
  const W = 311;
  const H = 44;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = W / (data.length - 1);

  const points = data.map((v, i) => ({
    x: i * step,
    y: H - ((v - min) / range) * (H - 8) - 2,
  }));

  const smoothD = points.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = points[i - 1];
    const cx = (prev.x + p.x) / 2;
    return `${acc} C ${cx} ${prev.y}, ${cx} ${p.y}, ${p.x} ${p.y}`;
  }, "");

  const fillD = `${smoothD} L ${points[points.length - 1].x} ${H} L 0 ${H} Z`;

  return (
    <div style={{ marginTop: 10 }}>
      <svg
        width="100%"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        style={{ display: "block", overflow: "visible" }}
      >
        <defs>
          <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6A70FF" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#6A70FF" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={fillD} fill="url(#sparkGrad)" />
        <path
          d={smoothD}
          fill="none"
          stroke="var(--redo-brand)"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          cx={points[points.length - 1].x}
          cy={points[points.length - 1].y}
          r="3.5"
          fill="var(--redo-brand)"
        />
        <circle
          cx={points[points.length - 1].x}
          cy={points[points.length - 1].y}
          r="6"
          fill="var(--redo-brand)"
          opacity="0.15"
        />
      </svg>
      <div className="flex justify-between" style={{ marginTop: 4 }}>
        {["5W", "4W", "3W", "2W", "1W", "이번 주"].map((w) => (
          <span
            key={w}
            style={{
              fontSize: 9,
              color: "var(--redo-text-tertiary)",
              fontFamily: FONT,
              lineHeight: 1.3,
            }}
          >
            {w}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Ring Progress ────────────────────────────────────────────────────────────

function RingProgress({
  pct,
  size = 88,
  stroke = 7,
  color = "var(--redo-brand)",
}: {
  pct: number;
  size?: number;
  stroke?: number;
  color?: string;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct / 100);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Track */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="rgba(0,0,0,0.07)"
        strokeWidth={stroke}
      />
      {/* Progress arc */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 0.9s cubic-bezier(0.34,1.2,0.64,1)" }}
      />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 취향 TAB
// ═══════════════════════════════════════════════════════════════════════════════

function AISummaryCard({
  topKeywords,
  userName,
}: {
  topKeywords: { keyword: string; count: number; percent: number }[];
  userName?: string;
}) {
  const displayName = userName ?? "게스트";
  const top3 = topKeywords.slice(0, 3);
  const dynamicSentence =
    top3.length >= 2
      ? `${displayName}은 ${top3[0].keyword}, ${top3[1].keyword} 스타일을 반복해서 저장해.`
      : top3.length === 1
      ? `${displayName}은 ${top3[0].keyword} 스타일을 주로 저장해.`
      : "레퍼런스를 더 저장하면 취향을 분석해줄게요.";

  const chipList = topKeywords.slice(0, 5).map((k) => k.keyword);

  return (
    <div
      style={{
        background: "var(--redo-brand-light)",
        borderRadius: "var(--radius-card)",
        padding: "14px 14px 12px",
      }}
    >
      <div className="flex items-center" style={{ gap: 6, marginBottom: 10 }}>
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            background: "var(--redo-brand-dark)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="white" />
          </svg>
        </div>
        <span
          style={{
            fontSize: "var(--text-context-label)",
            fontWeight: "var(--font-weight-medium)",
            color: "var(--redo-context-label)",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            lineHeight: 1.3,
            fontFamily: FONT,
          }}
        >
          AI 종합 분석
        </span>
      </div>

      <p
        style={{
          fontSize: "var(--text-caption)",
          fontWeight: "var(--font-weight-medium)",
          color: "#26215C",
          margin: 0,
          marginBottom: 12,
          lineHeight: 1.6,
          fontFamily: FONT,
        }}
      >
        {dynamicSentence}
      </p>

      {chipList.length > 0 ? (
        <div className="flex flex-wrap" style={{ gap: 5 }}>
          {chipList.map((chip) => (
            <span
              key={chip}
              style={{
                fontSize: "var(--text-micro)",
                fontWeight: "var(--font-weight-medium)",
                color: "var(--redo-brand-dark)",
                background: "rgba(106,112,255,0.14)",
                borderRadius: "var(--radius-chip)",
                padding: "3px 10px",
                lineHeight: 1.5,
                border: "0.5px solid rgba(106,112,255,0.22)",
                fontFamily: FONT,
              }}
            >
              {chip}
            </span>
          ))}
        </div>
      ) : (
        <p
          style={{
            fontSize: "var(--text-caption)",
            color: "var(--redo-context-text)",
            margin: 0,
            fontFamily: FONT,
          }}
        >
          저장한 레퍼런스가 늘어나면 분석이 더 풍부해져요.
        </p>
      )}
    </div>
  );
}

function StylePreferenceCard({
  mounted,
  tasteItems,
  userName,
}: {
  mounted: boolean;
  tasteItems: { label: string; percent: number; count: number }[];
  userName?: string;
}) {
  const items = tasteItems.slice(0, 4);

  return (
    <Card>
      <div style={{ padding: "12px 14px 0" }}>
        <div style={{ marginBottom: 6 }}>
          <SectionPill label="스타일 취향" />
        </div>
        <p
          style={{
            fontSize: "var(--text-card-title)",
            fontWeight: "var(--font-weight-medium)",
            color: "var(--redo-text-primary)",
            margin: 0,
            marginBottom: 14,
            lineHeight: 1.4,
            fontFamily: FONT,
          }}
        >
          {(userName ?? "게스트")}이 반복해서 저장하는 스타일
        </p>
      </div>

      {items.length > 0 ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
            padding: "0 12px 14px",
          }}
        >
          {items.map((item, i) => {
            const palette = TASTE_COLORS[i % TASTE_COLORS.length];
            return (
              <div
                key={item.label}
                style={{
                  background: palette.bg,
                  borderRadius: 10,
                  padding: "10px 11px 11px",
                }}
              >
                <p
                  style={{
                    fontSize: "var(--text-micro)",
                    fontWeight: "var(--font-weight-medium)",
                    color: palette.text,
                    margin: 0,
                    marginBottom: 8,
                    lineHeight: 1.3,
                    fontFamily: FONT,
                  }}
                >
                  {item.label}
                </p>
                <div style={{ marginBottom: 6 }}>
                  <AnimatedBar
                    pct={item.percent}
                    color={palette.bar}
                    mounted={mounted}
                  />
                </div>
                <p
                  style={{
                    fontSize: "var(--text-context-label)",
                    fontWeight: "var(--font-weight-medium)",
                    color: palette.text,
                    margin: 0,
                    lineHeight: 1.3,
                    fontFamily: FONT,
                    opacity: 0.75,
                  }}
                >
                  {item.percent}%
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState text="칩 태그가 있는 레퍼런스를 저장하면\n스타일 취향을 분석해줄게요." />
      )}
    </Card>
  );
}

function TrendCard({
  sparklineData,
  trendKeyword,
}: {
  sparklineData: number[];
  trendKeyword: string | null;
}) {
  const insightText = trendKeyword
    ? `${trendKeyword} 저장이 이전보다 늘었어.`
    : "아직 비교할 데이터가 부족해요.";

  return (
    <Card style={{ padding: "12px 14px 14px" }}>
      <div style={{ marginBottom: 6 }}>
        <SectionPill label="취향 변화" />
      </div>
      <p
        style={{
          fontSize: "var(--text-card-title)",
          fontWeight: "var(--font-weight-medium)",
          color: "var(--redo-text-primary)",
          margin: 0,
          marginBottom: 6,
          lineHeight: 1.4,
          fontFamily: FONT,
        }}
      >
        최근 저장 패턴
      </p>

      <Sparkline data={sparklineData} />

      <div
        className="flex items-start"
        style={{
          marginTop: 12,
          background: "var(--redo-bg-secondary)",
          borderRadius: 8,
          padding: "8px 10px",
          gap: 8,
        }}
      >
        <div
          style={{
            width: 20,
            height: 20,
            borderRadius: 6,
            background: trendKeyword
              ? "rgba(106,112,255,0.12)"
              : "rgba(0,0,0,0.05)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            marginTop: 1,
          }}
        >
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
            <path
              d="M6 10V2M2 6l4-4 4 4"
              stroke={trendKeyword ? "var(--redo-brand)" : "var(--redo-text-tertiary)"}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <p
          style={{
            fontSize: "var(--text-caption)",
            fontWeight: "var(--font-weight-regular)",
            color: "var(--redo-text-secondary)",
            margin: 0,
            lineHeight: 1.6,
            fontFamily: FONT,
          }}
        >
          {trendKeyword ? (
            <>
              <span
                style={{
                  color: "var(--redo-brand)",
                  fontWeight: "var(--font-weight-medium)",
                }}
              >
                {trendKeyword}
              </span>{" "}
              저장이 이전보다 늘었어.
            </>
          ) : (
            insightText
          )}
        </p>
      </div>
    </Card>
  );
}

function KeywordCloudCard({
  keywords,
}: {
  keywords: { keyword: string; count: number; percent: number }[];
}) {
  const top15 = keywords.slice(0, 15);
  const maxCount = top15[0]?.count ?? 1;

  // Font size: 11px → 20px based on frequency
  const getFontSize = (count: number) =>
    Math.round(11 + ((count / maxCount) * 9));

  // Color: #3C3489 (high freq) → #A5A9FF (low freq)
  const getColor = (count: number): string => {
    const t = count / maxCount; // 0→1
    // Interpolate hex components
    const r = Math.round(0xaf + (0x3c - 0xaf) * t);
    const g = Math.round(0xa9 + (0x34 - 0xa9) * t);
    const b = Math.round(0xec + (0x89 - 0xec) * t);
    return `rgb(${r},${g},${b})`;
  };

  return (
    <Card style={{ padding: "12px 14px 14px" }}>
      <div style={{ marginBottom: 6 }}>
        <SectionPill label="키워드 클라우드" />
      </div>
      <p
        style={{
          fontSize: "var(--text-card-title)",
          fontWeight: "var(--font-weight-medium)",
          color: "var(--redo-text-primary)",
          margin: 0,
          marginBottom: 12,
          lineHeight: 1.4,
          fontFamily: FONT,
        }}
      >
        자주 저장된 스타일 키워드
      </p>

      {top15.length > 0 ? (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 7,
            alignItems: "baseline",
          }}
        >
          {top15.map((kw) => (
            <span
              key={kw.keyword}
              style={{
                fontSize: getFontSize(kw.count),
                fontWeight: "var(--font-weight-medium)",
                color: getColor(kw.count),
                lineHeight: 1.3,
                fontFamily: FONT,
                cursor: "default",
              }}
            >
              {kw.keyword}
            </span>
          ))}
        </div>
      ) : (
        <EmptyState text="칩 태그가 있는 레퍼런스를 저장하면\n키워드 클라우드가 채워져요." />
      )}
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 프로젝트 TAB
// ═══════════════════════════════════════════════════════════════════════════════

function ProjectSummaryBanner({
  totalProjects,
  totalSaved,
  mostActiveProject,
  mounted,
}: {
  totalProjects: number;
  totalSaved: number;
  mostActiveProject: string | null;
  mounted: boolean;
}) {
  return (
    <div
      style={{
        background: "var(--redo-brand-light)",
        borderRadius: "var(--radius-card)",
        padding: "14px",
      }}
    >
      <div className="flex items-center" style={{ gap: 6, marginBottom: 10 }}>
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            background: "var(--redo-brand-dark)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path
              d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"
              fill="white"
            />
          </svg>
        </div>
        <span
          style={{
            fontSize: "var(--text-context-label)",
            fontWeight: "var(--font-weight-medium)",
            color: "var(--redo-context-label)",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            fontFamily: FONT,
          }}
        >
          프로젝트 요약
        </span>
      </div>

      <div className="flex" style={{ gap: 16, marginBottom: mostActiveProject ? 10 : 0 }}>
        <div>
          <p
            style={{
              fontSize: 20,
              fontWeight: "var(--font-weight-medium)",
              color: "var(--redo-brand-dark)",
              margin: 0,
              lineHeight: 1.2,
              fontFamily: FONT,
            }}
          >
            {totalProjects}
          </p>
          <p
            style={{
              fontSize: "var(--text-micro)",
              fontWeight: "var(--font-weight-regular)",
              color: "var(--redo-context-text)",
              margin: 0,
              fontFamily: FONT,
              opacity: 0.8,
            }}
          >
            프로젝트
          </p>
        </div>
        <div
          style={{
            width: "0.5px",
            background: "rgba(106,112,255,0.25)",
            alignSelf: "stretch",
          }}
        />
        <div>
          <p
            style={{
              fontSize: 20,
              fontWeight: "var(--font-weight-medium)",
              color: "var(--redo-brand-dark)",
              margin: 0,
              lineHeight: 1.2,
              fontFamily: FONT,
            }}
          >
            {totalSaved}
          </p>
          <p
            style={{
              fontSize: "var(--text-micro)",
              fontWeight: "var(--font-weight-regular)",
              color: "var(--redo-context-text)",
              margin: 0,
              fontFamily: FONT,
              opacity: 0.8,
            }}
          >
            총 저장
          </p>
        </div>
      </div>

      {mostActiveProject && (
        <div
          style={{
            background: "rgba(106,112,255,0.12)",
            borderRadius: 8,
            padding: "7px 10px",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
            <circle cx="6" cy="6" r="5" fill="var(--redo-brand)" />
            <path
              d="M4 6l1.5 1.5L8 4"
              stroke="white"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span
            style={{
              fontSize: "var(--text-caption)",
              fontWeight: "var(--font-weight-medium)",
              color: "var(--redo-brand-dark)",
              fontFamily: FONT,
            }}
          >
            가장 활발한 프로젝트:{" "}
            <span style={{ fontWeight: "var(--font-weight-medium)" }}>
              {mostActiveProject}
            </span>
          </span>
        </div>
      )}
    </div>
  );
}

function ProjectStatCard({
  stat,
  mounted,
  isTop,
}: {
  stat: { name: string; total: number; executed: number; executionRate: number };
  mounted: boolean;
  isTop: boolean;
}) {
  // Tint background intensity proportional to executionRate
  const tintOpacity = 0.03 + (stat.executionRate / 100) * 0.05;
  const barColor =
    stat.executionRate >= 70
      ? "var(--redo-success)"
      : stat.executionRate >= 30
      ? "var(--redo-brand)"
      : "var(--redo-text-tertiary)";

  return (
    <Card>
      <div
        style={{
          padding: "12px 14px 14px",
          background: isTop
            ? `rgba(106,112,255,${tintOpacity})`
            : "transparent",
        }}
      >
        <div
          className="flex items-center justify-between"
          style={{ marginBottom: 10 }}
        >
          <div className="flex items-center" style={{ gap: 6 }}>
            {isTop && (
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  background: "var(--redo-brand)",
                  flexShrink: 0,
                }}
              />
            )}
            <p
              style={{
                fontSize: "var(--text-card-title)",
                fontWeight: "var(--font-weight-medium)",
                color: "var(--redo-text-primary)",
                margin: 0,
                lineHeight: 1.3,
                fontFamily: FONT,
              }}
            >
              {stat.name}
            </p>
          </div>
          <span
            style={{
              fontSize: "var(--text-micro)",
              fontWeight: "var(--font-weight-medium)",
              color:
                stat.executionRate >= 70
                  ? "var(--redo-success)"
                  : "var(--redo-text-secondary)",
              fontFamily: FONT,
            }}
          >
            {stat.executionRate}%
          </span>
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: 8 }}>
          <AnimatedBar
            pct={stat.executionRate}
            color={barColor}
            mounted={mounted}
            height={5}
          />
        </div>

        {/* Stats row */}
        <div className="flex" style={{ gap: 12 }}>
          <span
            style={{
              fontSize: "var(--text-caption)",
              fontWeight: "var(--font-weight-regular)",
              color: "var(--redo-text-tertiary)",
              fontFamily: FONT,
            }}
          >
            저장 {stat.total}개
          </span>
          <span
            style={{
              fontSize: "var(--text-caption)",
              fontWeight: "var(--font-weight-regular)",
              color: "var(--redo-success)",
              fontFamily: FONT,
            }}
          >
            실행완료 {stat.executed}개
          </span>
          <span
            style={{
              fontSize: "var(--text-caption)",
              fontWeight: "var(--font-weight-regular)",
              color: "var(--redo-text-tertiary)",
              fontFamily: FONT,
            }}
          >
            미실행 {stat.total - stat.executed}개
          </span>
        </div>
      </div>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 습관 TAB
// ═══════════════════════════════════════════════════════════════════════════════

function HabitStatusMessage({
  rate,
}: {
  rate: number;
}) {
  const config =
    rate <= 20
      ? {
          text: "레퍼런스가 많이 쌓여 있어요. 하나씩 꺼내봐요.",
          color: "var(--redo-warning)",
          bg: "rgba(239,159,39,0.08)",
          icon: "⏳",
        }
      : rate <= 50
      ? {
          text: "잘 하고 있어요! 조금만 더 꺼내봐요.",
          color: "var(--redo-brand)",
          bg: "var(--redo-brand-light)",
          icon: "👍",
        }
      : rate <= 80
      ? {
          text: "활용을 잘 하고 있어요 👍",
          color: "var(--redo-success)",
          bg: "rgba(29,158,117,0.07)",
          icon: "✅",
        }
      : {
          text: "완벽해요! 레퍼런스를 잘 활용하고 있어요 🎉",
          color: "var(--redo-success)",
          bg: "rgba(29,158,117,0.07)",
          icon: "🎉",
        };

  return (
    <div
      style={{
        background: config.bg,
        borderRadius: "var(--radius-context)",
        padding: "10px 12px",
        display: "flex",
        alignItems: "flex-start",
        gap: 8,
      }}
    >
      <span style={{ fontSize: 14, lineHeight: 1.4, flexShrink: 0 }}>
        {config.icon}
      </span>
      <p
        style={{
          fontSize: "var(--text-caption)",
          fontWeight: "var(--font-weight-medium)",
          color: config.color,
          margin: 0,
          lineHeight: 1.5,
          fontFamily: FONT,
        }}
      >
        {config.text}
      </p>
    </div>
  );
}

function HabitOverviewCard({
  stats,
  mounted,
}: {
  stats: { totalSaved: number; totalExecuted: number; executionRate: number; pendingCount: number };
  mounted: boolean;
}) {
  const ringColor =
    stats.executionRate >= 70
      ? "var(--redo-success)"
      : stats.executionRate >= 30
      ? "var(--redo-brand)"
      : "var(--redo-warning)";

  const displayPct = mounted ? stats.executionRate : 0;

  return (
    <Card style={{ padding: "14px 14px 14px" }}>
      <div style={{ marginBottom: 10 }}>
        <SectionPill label="실행 현황" />
      </div>

      <div className="flex items-center" style={{ gap: 20, marginBottom: 14 }}>
        {/* Ring chart */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <RingProgress
            pct={displayPct}
            size={88}
            stroke={7}
            color={ringColor}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                fontSize: 18,
                fontWeight: "var(--font-weight-medium)",
                color: "var(--redo-text-primary)",
                fontFamily: FONT,
                lineHeight: 1.2,
              }}
            >
              {stats.executionRate}%
            </span>
            <span
              style={{
                fontSize: 9,
                fontWeight: "var(--font-weight-regular)",
                color: "var(--redo-text-tertiary)",
                fontFamily: FONT,
                lineHeight: 1.2,
              }}
            >
              실행률
            </span>
          </div>
        </div>

        {/* Stats column */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            {
              label: "총 저장",
              value: stats.totalSaved,
              color: "var(--redo-text-primary)",
            },
            {
              label: "실행완료",
              value: stats.totalExecuted,
              color: "var(--redo-success)",
            },
            {
              label: "미실행",
              value: stats.pendingCount,
              color: "var(--redo-text-secondary)",
            },
          ].map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between"
            >
              <span
                style={{
                  fontSize: "var(--text-caption)",
                  fontWeight: "var(--font-weight-regular)",
                  color: "var(--redo-text-tertiary)",
                  fontFamily: FONT,
                }}
              >
                {row.label}
              </span>
              <span
                style={{
                  fontSize: "var(--text-body)",
                  fontWeight: "var(--font-weight-medium)",
                  color: row.color,
                  fontFamily: FONT,
                  minWidth: 24,
                  textAlign: "right",
                }}
              >
                {row.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      <HabitStatusMessage rate={stats.executionRate} />
    </Card>
  );
}

function HabitSparklineCard({ sparklineData }: { sparklineData: number[] }) {
  return (
    <Card style={{ padding: "12px 14px 14px" }}>
      <div style={{ marginBottom: 6 }}>
        <SectionPill label="저장 흐름" />
      </div>
      <p
        style={{
          fontSize: "var(--text-card-title)",
          fontWeight: "var(--font-weight-medium)",
          color: "var(--redo-text-primary)",
          margin: 0,
          marginBottom: 2,
          lineHeight: 1.4,
          fontFamily: FONT,
        }}
      >
        최근 6주 저장 추이
      </p>
      <p
        style={{
          fontSize: "var(--text-caption)",
          fontWeight: "var(--font-weight-regular)",
          color: "var(--redo-text-tertiary)",
          margin: 0,
          marginBottom: 0,
          lineHeight: 1.4,
          fontFamily: FONT,
        }}
      >
        카드 index 기반 시뮬레이션
      </p>
      <Sparkline data={sparklineData} />
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 시각 TAB
// ═══════════════════════════════════════════════════════════════════════════════

function ColorClusterCard({
  colorKeywords,
}: {
  colorKeywords: { label: string; count: number; color: string }[];
}) {
  const maxCount = colorKeywords[0]?.count ?? 1;
  // Circle sizes: 36px–72px
  const getSize = (count: number) =>
    Math.round(36 + ((count / maxCount) * 36));

  return (
    <Card style={{ padding: "12px 14px 14px" }}>
      <div style={{ marginBottom: 6 }}>
        <SectionPill label="컬러 클러스터" />
      </div>
      <p
        style={{
          fontSize: "var(--text-card-title)",
          fontWeight: "var(--font-weight-medium)",
          color: "var(--redo-text-primary)",
          margin: 0,
          marginBottom: 14,
          lineHeight: 1.4,
          fontFamily: FONT,
        }}
      >
        색상 관련 저장 키워드
      </p>

      {colorKeywords.length > 0 ? (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            alignItems: "center",
            justifyContent: "center",
            padding: "4px 0",
          }}
        >
          {colorKeywords.map((kw) => {
            const sz = getSize(kw.count);
            return (
              <div
                key={kw.label}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <div
                  style={{
                    width: sz,
                    height: sz,
                    borderRadius: "50%",
                    background: kw.color,
                    opacity: 0.7 + (kw.count / maxCount) * 0.3,
                    transition: "all 0.4s ease",
                  }}
                />
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: "var(--font-weight-regular)",
                    color: "var(--redo-text-tertiary)",
                    fontFamily: FONT,
                    textAlign: "center",
                  }}
                >
                  {kw.label}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState text={'칩 태그에 "컬러", "흑백", "파스텔" 등\n색상 키워드를 포함하면 분석해줄게요.'} />
      )}
    </Card>
  );
}

function SourceDistCard({
  sources,
  mounted,
}: {
  sources: { source: string; count: number; percent: number }[];
  mounted: boolean;
}) {
  const SOURCE_COLORS: Record<string, string> = {
    Dribbble: "var(--redo-brand)",
    Pinterest: "#E60023",
    Behance: "#0057FF",
    Instagram: "#C13584",
    기타: "var(--redo-text-tertiary)",
  };

  return (
    <Card style={{ padding: "12px 14px 14px" }}>
      <div style={{ marginBottom: 6 }}>
        <SectionPill label="저장 소스" />
      </div>
      <p
        style={{
          fontSize: "var(--text-card-title)",
          fontWeight: "var(--font-weight-medium)",
          color: "var(--redo-text-primary)",
          margin: 0,
          marginBottom: 14,
          lineHeight: 1.4,
          fontFamily: FONT,
        }}
      >
        어디서 저장하고 있어요?
      </p>

      {sources.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {sources.map((src) => {
            const color =
              SOURCE_COLORS[src.source] ?? "var(--redo-text-tertiary)";
            return (
              <div key={src.source}>
                <div
                  className="flex items-center justify-between"
                  style={{ marginBottom: 4 }}
                >
                  <span
                    style={{
                      fontSize: "var(--text-caption)",
                      fontWeight: "var(--font-weight-medium)",
                      color: "var(--redo-text-primary)",
                      fontFamily: FONT,
                    }}
                  >
                    {src.source}
                  </span>
                  <div className="flex items-center" style={{ gap: 6 }}>
                    <span
                      style={{
                        fontSize: "var(--text-micro)",
                        fontWeight: "var(--font-weight-regular)",
                        color: "var(--redo-text-tertiary)",
                        fontFamily: FONT,
                      }}
                    >
                      {src.count}개
                    </span>
                    <span
                      style={{
                        fontSize: "var(--text-micro)",
                        fontWeight: "var(--font-weight-medium)",
                        color,
                        fontFamily: FONT,
                        minWidth: 32,
                        textAlign: "right",
                      }}
                    >
                      {src.percent}%
                    </span>
                  </div>
                </div>
                <AnimatedBar
                  pct={src.percent}
                  color={color}
                  mounted={mounted}
                  height={5}
                />
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState text="레퍼런스를 저장하면 소스 분포를 보여줄게요." />
      )}
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════════════════════════

interface InsightsScreenProps {
  cards: CardData[];
  executedCardIds: Set<number>;
  onTabChange?: (tab: "홈" | "보관" | "활용" | "기록") => void;
  onFabPress?: () => void;
  onCardTap?: (card: CardData) => void;
  userName?: string;
}

export function InsightsScreen({
  cards,
  executedCardIds,
  onTabChange,
  onFabPress,
  onCardTap,
  userName,
}: InsightsScreenProps) {
  const USER_NAME = userName ?? "게스트";
  const [activeSubTab, setActiveSubTab] = useState<SubTab>("취향");

  // ── Project tab state ──────────────────────────────────────────────────────
  const uniqueProjects = useMemo(
    () => [...new Set(cards.map((c) => c.projectTag))],
    [cards]
  );
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const currentProject = selectedProject ?? uniqueProjects[0] ?? null;
  const [mounted, setMounted] = useState(false);

  // Trigger bar/ring animations after mount
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 120);
    return () => clearTimeout(t);
  }, []);

  // Re-trigger animation on sub-tab change
  const prevSubTab = useRef(activeSubTab);
  const handleSubTabChange = (tab: SubTab) => {
    if (tab !== prevSubTab.current) {
      prevSubTab.current = tab;
      setMounted(false);
      setTimeout(() => setMounted(true), 80);
    }
    setActiveSubTab(tab);
  };

  // ── Computed data (memoised) ───────────────────────────────────────────────

  const chipFreq = useMemo(() => calculateChipFrequency(cards), [cards]);

  const topKeywords = useMemo(
    () => getTopKeywords(chipFreq, 15),
    [chipFreq]
  );

  const tasteItems = useMemo(
    () =>
      getTopKeywords(chipFreq, 4).map((k) => ({
        label: k.keyword,
        percent: k.percent,
        count: k.count,
      })),
    [chipFreq]
  );

  const projectStats = useMemo(
    () => calculateProjectStats(cards, executedCardIds),
    [cards, executedCardIds]
  );

  const habitStats = useMemo(
    () => calculateHabitStats(cards, executedCardIds),
    [cards, executedCardIds]
  );

  const sparklineData = useMemo(() => getSparklineData(cards), [cards]);

  const sourceDist = useMemo(() => getSourceFrequency(cards), [cards]);

  const colorKeywords = useMemo(() => getColorKeywords(cards), [cards]);

  const trendKeyword = useMemo(() => getTrendKeyword(cards), [cards]);

  const mostActiveProject = useMemo(() => {
    if (projectStats.length === 0) return null;
    const sorted = [...projectStats].sort(
      (a, b) => b.executionRate - a.executionRate
    );
    return sorted[0].executionRate > 0 ? sorted[0].name : null;
  }, [projectStats]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="flex flex-col relative"
      style={{
        width: "100%",
        height: "100%",
        background: "var(--redo-bg-secondary)",
        fontFamily: FONT,
        overflow: "hidden",
      }}
    >
      {/* Status Bar */}
      <div style={{ background: "var(--redo-bg-primary)" }}>
        <StatusBar />
      </div>

      {/* Top Bar */}
      <div
        className="flex items-center justify-between shrink-0"
        style={{
          height: 52,
          paddingLeft: 16,
          paddingRight: 16,
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
          인사이트
        </p>
        <p
          style={{
            fontSize: "var(--text-caption)",
            fontWeight: "var(--font-weight-regular)",
            color: "var(--redo-text-tertiary)",
            margin: 0,
            lineHeight: 1.3,
            fontFamily: FONT,
          }}
        >
          {USER_NAME}의 취향
        </p>
      </div>

      {/* Sub-tab navigation */}
      <SubTabBar active={activeSubTab} onChange={handleSubTabChange} />

      {/* Scrollable content */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ scrollbarWidth: "none" }}
      >
        {/* ── 취향 TAB ─────────────────────────────────────────────────── */}
        {activeSubTab === "취향" && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              padding: "16px 16px",
            }}
          >
            <AISummaryCard topKeywords={topKeywords} userName={USER_NAME} />
            <StylePreferenceCard mounted={mounted} tasteItems={tasteItems} userName={USER_NAME} />
            <TrendCard sparklineData={sparklineData} trendKeyword={trendKeyword} />
            <KeywordCloudCard keywords={topKeywords} />
            <div style={{ height: 4 }} />
          </div>
        )}

        {/* ── 프로젝트 TAB ─────────────────────────────────────────────── */}
        {activeSubTab === "프로젝트" && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              padding: "16px 16px",
            }}
          >
            {uniqueProjects.length === 0 ? (
              <Card style={{ padding: "14px" }}>
                <EmptyState text="저장된 레퍼런스가 없어요.\nFAB 버튼으로 첫 번째 레퍼런스를 저장해봐요." />
              </Card>
            ) : (
              <>
                {/* 1. 프로젝트 선택 칩 */}
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    overflowX: "auto",
                    scrollbarWidth: "none",
                    paddingBottom: 2,
                  }}
                >
                  {uniqueProjects.map((proj) => {
                    const isActive = proj === currentProject;
                    return (
                      <button
                        key={proj}
                        onClick={() => setSelectedProject(proj)}
                        style={{
                          flexShrink: 0,
                          height: 32,
                          paddingLeft: 14,
                          paddingRight: 14,
                          borderRadius: 20,
                          fontSize: 13,
                          fontWeight: isActive ? 500 : 400,
                          color: isActive ? "#fff" : "var(--redo-text-secondary)",
                          background: isActive ? "var(--redo-brand)" : "var(--redo-bg-secondary)",
                          border: isActive ? "none" : "0.5px solid var(--redo-border)",
                          cursor: "pointer",
                          fontFamily: FONT,
                          whiteSpace: "nowrap",
                          transition: "all 150ms ease",
                        }}
                      >
                        {proj}
                      </button>
                    );
                  })}
                </div>

                {/* 2. 선택된 프로젝트 요약 카드 */}
                {(() => {
                  const projectCards = cards.filter((c) => c.projectTag === currentProject);
                  const total = projectCards.length;
                  const executed = projectCards.filter(
                    (c) => executedCardIds.has(c.id) || c.statusDot === "실행완료"
                  ).length;
                  const unexecuted = total - executed;
                  const rate = total > 0 ? Math.round((executed / total) * 100) : 0;

                  // Top 3 keywords
                  const chipCounts: Record<string, number> = {};
                  projectCards.forEach((c) =>
                    c.chips.forEach((chip) => {
                      chipCounts[chip] = (chipCounts[chip] ?? 0) + 1;
                    })
                  );
                  const topChips = Object.entries(chipCounts)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 3)
                    .map(([k]) => k);

                  return (
                    <>
                      <Card style={{ padding: "16px" }}>
                        <p
                          style={{
                            fontSize: 16,
                            fontWeight: 500,
                            color: "var(--redo-text-primary)",
                            margin: 0,
                            marginBottom: 12,
                            fontFamily: FONT,
                          }}
                        >
                          {currentProject}
                        </p>

                        {/* Stats row */}
                        <div
                          style={{
                            display: "flex",
                            gap: 12,
                            marginBottom: 12,
                          }}
                        >
                          {[
                            { label: "총 저장", value: total, color: "var(--redo-text-primary)" },
                            { label: "실행완료", value: executed, color: "var(--redo-success)" },
                            { label: "미실행", value: unexecuted, color: "var(--redo-brand)" },
                          ].map(({ label, value, color }) => (
                            <div key={label} style={{ flex: 1 }}>
                              <p
                                style={{
                                  fontSize: 10,
                                  color: "var(--redo-text-tertiary)",
                                  margin: 0,
                                  marginBottom: 2,
                                  fontFamily: FONT,
                                  textTransform: "uppercase",
                                  letterSpacing: "0.04em",
                                }}
                              >
                                {label}
                              </p>
                              <p
                                style={{
                                  fontSize: 22,
                                  fontWeight: 700,
                                  color,
                                  margin: 0,
                                  fontFamily: FONT,
                                  lineHeight: 1.2,
                                }}
                              >
                                {value}
                              </p>
                            </div>
                          ))}
                        </div>

                        {/* Progress bar */}
                        <div
                          style={{
                            height: 6,
                            background: "var(--redo-bg-secondary)",
                            borderRadius: 3,
                            overflow: "hidden",
                            marginBottom: 12,
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              width: mounted ? `${rate}%` : "0%",
                              background: "var(--redo-brand)",
                              borderRadius: 3,
                              transition: "width 700ms ease",
                            }}
                          />
                        </div>

                        {/* Top keywords */}
                        {topChips.length > 0 && (
                          <div>
                            <p
                              style={{
                                fontSize: 11,
                                color: "var(--redo-text-tertiary)",
                                margin: 0,
                                marginBottom: 6,
                                fontFamily: FONT,
                              }}
                            >
                              가장 많이 쓴 키워드
                            </p>
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                              {topChips.map((chip) => (
                                <span
                                  key={chip}
                                  style={{
                                    fontSize: 12,
                                    fontWeight: 500,
                                    color: "var(--redo-brand-dark)",
                                    background: "var(--redo-brand-light)",
                                    borderRadius: 20,
                                    padding: "3px 10px",
                                    fontFamily: FONT,
                                  }}
                                >
                                  {chip}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </Card>

                      {/* 3. 레퍼런스 목록 */}
                      <Card style={{ overflow: "hidden" }}>
                        <div style={{ padding: "14px 14px 10px" }}>
                          <p
                            style={{
                              fontSize: 13,
                              fontWeight: 500,
                              color: "var(--redo-text-secondary)",
                              margin: 0,
                              fontFamily: FONT,
                            }}
                          >
                            저장된 레퍼런스 {total}개
                          </p>
                        </div>

                        {projectCards.length === 0 ? (
                          <div style={{ padding: "0 14px 14px" }}>
                            <EmptyState text="이 프로젝트에 저장된 레퍼런스가 없어요" />
                          </div>
                        ) : (
                          <div>
                            {projectCards.map((card, idx) => {
                              const isExec =
                                executedCardIds.has(card.id) || card.statusDot === "실행완료";
                              return (
                                <button
                                  key={card.id}
                                  onClick={() => onCardTap?.(card)}
                                  style={{
                                    width: "100%",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 10,
                                    padding: "10px 14px",
                                    background: "none",
                                    border: "none",
                                    borderTop:
                                      idx === 0 ? "none" : "0.5px solid var(--redo-border)",
                                    cursor: "pointer",
                                    textAlign: "left",
                                    WebkitTapHighlightColor: "transparent",
                                  }}
                                >
                                  {/* Thumbnail */}
                                  <div
                                    style={{
                                      width: 56,
                                      height: 56,
                                      borderRadius: 8,
                                      overflow: "hidden",
                                      flexShrink: 0,
                                      background: "#F1EFE8",
                                    }}
                                  >
                                    {card.image ? (
                                      <img
                                        src={card.image}
                                        alt={card.title}
                                        style={{
                                          width: "100%",
                                          height: "100%",
                                          objectFit: "cover",
                                          display: "block",
                                        }}
                                      />
                                    ) : null}
                                  </div>

                                  {/* Text */}
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <p
                                      style={{
                                        fontSize: 13,
                                        fontWeight: 500,
                                        color: "var(--redo-text-primary)",
                                        margin: 0,
                                        marginBottom: 3,
                                        fontFamily: FONT,
                                        overflow: "hidden",
                                        whiteSpace: "nowrap",
                                        textOverflow: "ellipsis",
                                        lineHeight: 1.3,
                                      }}
                                    >
                                      {card.title}
                                    </p>
                                    <p
                                      style={{
                                        fontSize: 12,
                                        fontWeight: 400,
                                        color: "#888780",
                                        margin: 0,
                                        fontFamily: FONT,
                                        overflow: "hidden",
                                        whiteSpace: "nowrap",
                                        textOverflow: "ellipsis",
                                        lineHeight: 1.4,
                                      }}
                                    >
                                      {card.savedReason}
                                    </p>
                                  </div>

                                  {/* Status dot */}
                                  <div
                                    style={{
                                      width: 8,
                                      height: 8,
                                      borderRadius: "50%",
                                      background: isExec
                                        ? "var(--redo-success)"
                                        : "var(--redo-brand)",
                                      flexShrink: 0,
                                    }}
                                  />
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </Card>
                    </>
                  );
                })()}
              </>
            )}
            <div style={{ height: 4 }} />
          </div>
        )}

        {/* ── 습관 TAB ─────────────────────────────────────────────────── */}
        {activeSubTab === "습관" && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              padding: "16px 16px",
            }}
          >
            <HabitOverviewCard stats={habitStats} mounted={mounted} />
            <HabitSparklineCard sparklineData={sparklineData} />
            <div style={{ height: 4 }} />
          </div>
        )}

        {/* ── 시각 TAB ─────────────────────────────────────────────────── */}
        {activeSubTab === "시각" && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              padding: "16px 16px",
            }}
          >
            <ColorClusterCard colorKeywords={colorKeywords} />
            <SourceDistCard sources={sourceDist} mounted={mounted} />
            <div style={{ height: 4 }} />
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNav
        activeTab="기록"
        onTabChange={onTabChange}
        onFabPress={onFabPress}
      />
    </div>
  );
}