import { useBreakpoint } from "../hooks/useBreakpoint";
import type { ActiveTab } from "../context/AppContext";

const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Noto Sans KR', system-ui, sans-serif";

interface SideNavProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onFabPress: () => void;
  onProfilePress: () => void;
  userName?: string;
}

const NAV_ITEMS: { tab: ActiveTab; label: string; icon: React.ReactNode }[] = [
  {
    tab: "홈",
    label: "홈",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
      </svg>
    ),
  },
  {
    tab: "보관",
    label: "보관함",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM12 17.5L6.5 12H10v-2h4v2h3.5L12 17.5zM5.12 5l.81-1h12l.94 1H5.12z" />
      </svg>
    ),
  },
  {
    tab: "활용",
    label: "활용",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M8 5.14v14l11-7-11-7z" />
      </svg>
    ),
  },
  {
    tab: "기록",
    label: "기록",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
      </svg>
    ),
  },
  {
    tab: "작업대",
    label: "작업대",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z" />
      </svg>
    ),
  },
];

export function SideNav({ activeTab, onTabChange, onFabPress, onProfilePress, userName }: SideNavProps) {
  const { isMobile } = useBreakpoint();
  if (isMobile) return null;

  return (
    <div
      style={{
        width: 260,
        height: "100dvh",
        background: "white",
        borderRight: "0.5px solid var(--redo-border)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        position: "sticky",
        top: 0,
        fontFamily: FONT,
      }}
    >
      {/* ── 로고 영역 ──────────────────────────────────────────────────────── */}
      <div
        style={{
          height: 64,
          display: "flex",
          alignItems: "center",
          padding: "0 20px",
          gap: 10,
          borderBottom: "0.5px solid var(--redo-border)",
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            background: "var(--redo-brand)",
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 800, color: "#fff", letterSpacing: "-0.5px" }}>Re</span>
        </div>
        <span style={{ fontSize: 18, fontWeight: 500, color: "var(--redo-text-primary)" }}>ReDo</span>
      </div>

      {/* ── 네비 메뉴 ──────────────────────────────────────────────────────── */}
      <nav style={{ flex: 1, padding: "12px 0", overflowY: "auto" }}>
        {NAV_ITEMS.map(({ tab, label, icon }) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => onTabChange(tab)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                width: "calc(100% - 16px)",
                height: 48,
                margin: "2px 8px",
                padding: "0 16px",
                borderRadius: 10,
                border: "none",
                cursor: "pointer",
                background: isActive ? "var(--redo-brand-light)" : "transparent",
                color: isActive ? "var(--redo-brand)" : "var(--redo-text-secondary)",
                fontFamily: FONT,
                fontSize: 14,
                fontWeight: isActive ? 500 : 400,
                textAlign: "left",
                transition: "background 120ms, color 120ms",
              }}
              onMouseEnter={(e) => {
                if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = "var(--redo-bg-secondary)";
              }}
              onMouseLeave={(e) => {
                if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = "transparent";
              }}
            >
              <span style={{ opacity: isActive ? 1 : 0.55, flexShrink: 0 }}>{icon}</span>
              <span>{label}</span>
            </button>
          );
        })}

        {/* 구분선 + 설정 */}
        <div style={{ height: 0.5, background: "var(--redo-border)", margin: "8px 16px" }} />
        <button
          onClick={onProfilePress}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            width: "calc(100% - 16px)",
            height: 48,
            margin: "2px 8px",
            padding: "0 16px",
            borderRadius: 10,
            border: "none",
            cursor: "pointer",
            background: "transparent",
            color: "var(--redo-text-secondary)",
            fontFamily: FONT,
            fontSize: 14,
            fontWeight: 400,
            textAlign: "left",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--redo-bg-secondary)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
        >
          <span style={{ opacity: 0.55, flexShrink: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z" />
            </svg>
          </span>
          <span>설정</span>
        </button>
      </nav>

      {/* ── 저장 버튼 ──────────────────────────────────────────────────────── */}
      <div style={{ padding: "12px 16px", borderTop: "0.5px solid var(--redo-border)" }}>
        <button
          onClick={onFabPress}
          style={{
            width: "100%",
            height: 44,
            background: "var(--redo-brand)",
            color: "white",
            border: "none",
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 500,
            fontFamily: FONT,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            transition: "background 120ms",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--redo-brand-dark)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--redo-brand)"; }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12h14" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          레퍼런스 저장
        </button>
      </div>

      {/* ── 프로필 영역 ─────────────────────────────────────────────────────── */}
      <button
        onClick={onProfilePress}
        style={{
          height: 64,
          padding: "0 16px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          border: "none",
          borderTop: "0.5px solid var(--redo-border)",
          background: "transparent",
          cursor: "pointer",
          textAlign: "left",
          width: "100%",
          fontFamily: FONT,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: "var(--redo-brand-light)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--redo-brand)" }}>
            {userName ? userName.charAt(0).toUpperCase() : "U"}
          </span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: "var(--redo-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {userName || "내 계정"}
          </p>
          <p style={{ margin: 0, fontSize: 11, color: "var(--redo-text-tertiary)" }}>프로필 설정</p>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M9 18l6-6-6-6" stroke="var(--redo-text-tertiary)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
