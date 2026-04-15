// ─── Dev Test Panel ──────────────────────────────────────────────────────────
// 개발 중에만 보이는 화면 테스트 패널.
// import.meta.env.DEV === true 일 때만 렌더링.
// npm run build 결과물에는 tree-shaking으로 제거됨.

import { useState, useEffect, useRef } from "react";
import type { ActiveTab } from "../context/AppContext";

const FONT =
  "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Noto Sans KR', system-ui, sans-serif";

interface DevTestPanelProps {
  setIsNFCTriggered: (v: boolean) => void;
  setIsContextMode: (v: boolean) => void;
  setIsStationStatusOpen: (v: boolean) => void;
  setIsStationPairing: (v: boolean) => void;
  setIsCompletionOpen: (v: boolean) => void;
  setCurrentTab: (tab: ActiveTab) => void;
  setIsSaveSheetOpen: (v: boolean) => void;
}

interface ButtonDef {
  emoji: string;
  label: string;
  bg: string;
  color: string;
  action: () => void;
}

export function DevTestPanel({
  setIsNFCTriggered,
  setIsContextMode,
  setIsStationStatusOpen,
  setIsStationPairing,
  setIsCompletionOpen,
  setCurrentTab,
  setIsSaveSheetOpen,
}: DevTestPanelProps) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // 바깥 클릭 시 닫기
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const fire = (action: () => void) => {
    action();
    setOpen(false);
  };

  const stationButtons: ButtonDef[] = [
    {
      emoji: "📡",
      label: "NFC 트리거",
      bg: "#EEEFFE",
      color: "#6A70FF",
      action: () => setIsNFCTriggered(true),
    },
    {
      emoji: "🔍",
      label: "맥락 추천",
      bg: "#EEEFFE",
      color: "#6A70FF",
      action: () => setIsContextMode(true),
    },
    {
      emoji: "📊",
      label: "Station 현황",
      bg: "#EEEFFE",
      color: "#6A70FF",
      action: () => setIsStationStatusOpen(true),
    },
    {
      emoji: "🔗",
      label: "Station 페어링",
      bg: "#EEEFFE",
      color: "#6A70FF",
      action: () => setIsStationPairing(true),
    },
    {
      emoji: "🎉",
      label: "완료 화면",
      bg: "#EEEFFE",
      color: "#6A70FF",
      action: () => setIsCompletionOpen(true),
    },
  ];

  const screenButtons: ButtonDef[] = [
    {
      emoji: "🏠",
      label: "홈탭",
      bg: "#F1EFE8",
      color: "#2C2C2A",
      action: () => setCurrentTab("홈"),
    },
    {
      emoji: "✅",
      label: "활용탭",
      bg: "#F1EFE8",
      color: "#2C2C2A",
      action: () => setCurrentTab("활용"),
    },
    {
      emoji: "💾",
      label: "저장 시트",
      bg: "#F1EFE8",
      color: "#2C2C2A",
      action: () => setIsSaveSheetOpen(true),
    },
    {
      emoji: "📋",
      label: "온보딩",
      bg: "#F1EFE8",
      color: "#2C2C2A",
      action: () => { window.location.href = "/?onboarding=true"; },
    },
  ];

  const utilButtons: ButtonDef[] = [
    {
      emoji: "🔄",
      label: "localStorage 초기화",
      bg: "#FFF4F4",
      color: "#E24B4A",
      action: () => { localStorage.clear(); window.location.reload(); },
    },
  ];

  const renderButton = (btn: ButtonDef) => (
    <button
      key={btn.label}
      onClick={() => fire(btn.action)}
      style={{
        width: "100%",
        height: 40,
        borderRadius: 8,
        border: "none",
        background: btn.bg,
        color: btn.color,
        fontSize: 13,
        fontWeight: 500,
        fontFamily: FONT,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        padding: "0 12px",
        gap: 8,
        textAlign: "left",
        WebkitTapHighlightColor: "transparent",
        transition: "opacity 100ms",
      }}
      onMouseDown={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.7"; }}
      onMouseUp={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
    >
      <span style={{ fontSize: 14, lineHeight: 1 }}>{btn.emoji}</span>
      {btn.label}
    </button>
  );

  return (
    <div ref={panelRef}>
      {/* ── 패널 (열렸을 때) ── */}
      {open && (
        <div
          style={{
            position: "fixed",
            bottom: 140,
            right: 16,
            width: 220,
            background: "#fff",
            borderRadius: 16,
            boxShadow: "0 8px 32px rgba(0,0,0,0.16), 0 2px 8px rgba(0,0,0,0.08)",
            border: "0.5px solid rgba(0,0,0,0.06)",
            padding: 16,
            zIndex: 9999,
            maxHeight: "70vh",
            overflowY: "auto",
            scrollbarWidth: "none",
            animation: "dev-panel-in 200ms ease-out",
          }}
        >
          <style>{`
            @keyframes dev-panel-in {
              from { opacity: 0; transform: translateY(12px); }
              to   { opacity: 1; transform: translateY(0); }
            }
          `}</style>

          {/* 제목 */}
          <p
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "#888780",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              margin: "0 0 8px",
              lineHeight: 1,
              fontFamily: FONT,
            }}
          >
            DEV — 화면 테스트
          </p>
          <div style={{ height: 1, background: "#EBEBEB", marginBottom: 10 }} />

          {/* Station 연결 화면들 */}
          <p style={{ fontSize: 10, color: "#BCBAB5", margin: "0 0 6px", fontFamily: FONT, textTransform: "uppercase" }}>
            Station 화면
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
            {stationButtons.map(renderButton)}
          </div>

          {/* 기존 화면들 */}
          <p style={{ fontSize: 10, color: "#BCBAB5", margin: "0 0 6px", fontFamily: FONT, textTransform: "uppercase" }}>
            기존 화면
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
            {screenButtons.map(renderButton)}
          </div>

          {/* 유틸리티 */}
          <div style={{ height: 1, background: "#EBEBEB", marginBottom: 8 }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {utilButtons.map(renderButton)}
          </div>
        </div>
      )}

      {/* ── FAB 토글 버튼 ── */}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          position: "fixed",
          bottom: 90,
          right: 16,
          width: 44,
          height: 44,
          borderRadius: "50%",
          background: open ? "#2C2C2A" : "#6A70FF",
          color: "#fff",
          fontSize: 10,
          fontWeight: 700,
          fontFamily: FONT,
          border: "none",
          cursor: "pointer",
          boxShadow: "0 2px 12px rgba(0,0,0,0.2)",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "background 150ms ease, transform 150ms ease",
          transform: open ? "rotate(45deg)" : "rotate(0deg)",
          WebkitTapHighlightColor: "transparent",
          letterSpacing: "-0.5px",
        }}
      >
        {open ? "✕" : "DEV"}
      </button>
    </div>
  );
}
