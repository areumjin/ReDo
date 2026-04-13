import { useState, useRef, useCallback } from "react";

type ActiveTab = "홈" | "보관" | "활용" | "기록";

const ICON_PATHS: Record<string, string> = {
  홈: "M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z",
  보관: "M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM12 17.5L6.5 12H10v-2h4v2h3.5L12 17.5zM5.12 5l.81-1h12l.94 1H5.12z",
  활용: "M8 5.14v14l11-7-11-7z",
  기록: "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z",
};

const LEFT_TABS: ActiveTab[] = ["홈", "보관"];
const RIGHT_TABS: ActiveTab[] = ["활용", "기록"];

// ─── FAB animation phases ─────────────────────────────────────────────────────
type FabPhase = "idle" | "press" | "overshoot" | "settle";

interface RippleState {
  id: number;
  x: number;
  y: number;
}

interface BottomNavProps {
  activeTab: ActiveTab;
  onTabChange?: (tab: ActiveTab) => void;
  onFabPress?: () => void;
}

const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Noto Sans KR', system-ui, sans-serif";

function TabButton({ tab, isActive, onTabChange }: { tab: ActiveTab; isActive: boolean; onTabChange?: (tab: ActiveTab) => void }) {
  return (
    <button
      onClick={() => onTabChange?.(tab)}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        gap: 3,
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: 0,
        WebkitTapHighlightColor: "transparent",
      }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path
          d={ICON_PATHS[tab]}
          fill={isActive ? "var(--redo-brand)" : "var(--redo-text-tertiary)"}
          opacity={isActive ? 1 : 0.45}
        />
      </svg>
      <span
        style={{
          fontSize: 10,
          fontWeight: isActive ? 500 : 400,
          color: isActive ? "var(--redo-brand)" : "var(--redo-text-tertiary)",
          lineHeight: 1.2,
          fontFamily: FONT,
        }}
      >
        {tab}
      </span>
    </button>
  );
}

export function BottomNav({ activeTab, onTabChange, onFabPress }: BottomNavProps) {
  const [fabPhase, setFabPhase] = useState<FabPhase>("idle");
  const [ripples, setRipples] = useState<RippleState[]>([]);
  const rippleId = useRef(0);
  const phaseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fabScale =
    fabPhase === "press"     ? 0.88  :
    fabPhase === "overshoot" ? 1.05  :
    1.0;

  const fabShadow =
    fabPhase === "press" || fabPhase === "overshoot"
      ? "0 6px 24px rgba(106,112,255,0.70), 0 3px 10px rgba(106,112,255,0.45)"
      : "0 4px 16px rgba(106,112,255,0.55), 0 2px 6px rgba(106,112,255,0.30)";

  const fabTransition =
    fabPhase === "press"
      ? "transform 80ms ease-in, box-shadow 80ms ease-in"
      : fabPhase === "overshoot"
      ? "transform 100ms ease-out, box-shadow 100ms ease-out"
      : "transform 80ms ease-in-out, box-shadow 80ms ease-in-out";

  const clearPhaseTimer = () => {
    if (phaseTimer.current) clearTimeout(phaseTimer.current);
  };

  const triggerHaptic = useCallback((x: number, y: number) => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(10);
    }
    const id = ++rippleId.current;
    setRipples((prev) => [...prev, { id, x, y }]);
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 320);

    clearPhaseTimer();
    setFabPhase("press");
    phaseTimer.current = setTimeout(() => {
      setFabPhase("overshoot");
      phaseTimer.current = setTimeout(() => {
        setFabPhase("settle");
        phaseTimer.current = setTimeout(() => {
          setFabPhase("idle");
        }, 80);
      }, 100);
    }, 80);
  }, []);

  const handleFabClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    triggerHaptic(e.clientX - rect.left, e.clientY - rect.top);
    onFabPress?.();
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr",
        width: "100%",
        height: 62,
        background: "rgba(255,255,255,0.97)",
        backdropFilter: "blur(16px)",
        borderTop: "0.5px solid var(--redo-border)",
        paddingBottom: "env(safe-area-inset-bottom)",
        flexShrink: 0,
      }}
    >
      {/* 홈 */}
      <TabButton tab="홈" isActive={activeTab === "홈"} onTabChange={onTabChange} />

      {/* 보관 */}
      <TabButton tab="보관" isActive={activeTab === "보관"} onTabChange={onTabChange} />

      {/* FAB 셀 */}
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <button
          onClick={handleFabClick}
          style={{
            position: "absolute",
            top: -20,
            left: "50%",
            transform: `translateX(-50%) scale(${fabScale})`,
            transformOrigin: "center center",
            transition: fabTransition,
            width: 60,
            height: 60,
            borderRadius: "50%",
            background: "var(--redo-brand)",
            boxShadow: fabShadow,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            border: "none",
            overflow: "hidden",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            style={{ position: "relative", zIndex: 1, flexShrink: 0 }}
          >
            <path
              d="M12 5v14M5 12h14"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>

          {ripples.map((r) => (
            <span
              key={r.id}
              style={{
                position: "absolute",
                left: r.x,
                top: r.y,
                width: 0,
                height: 0,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.38)",
                transform: "translate(-50%, -50%)",
                animation: "fab-ripple 300ms ease-out forwards",
                pointerEvents: "none",
              }}
            />
          ))}
        </button>
        <style>{`
          @keyframes fab-ripple {
            from { width: 0px; height: 0px; opacity: 0.30; }
            to   { width: 60px; height: 60px; opacity: 0; }
          }
        `}</style>
      </div>

      {/* 활용 */}
      <TabButton tab="활용" isActive={activeTab === "활용"} onTabChange={onTabChange} />

      {/* 기록 */}
      <TabButton tab="기록" isActive={activeTab === "기록"} onTabChange={onTabChange} />
    </div>
  );
}
