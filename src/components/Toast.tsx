import { useState, useRef, useCallback, useEffect } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ToastConfig {
  variant: "success" | "duplicate" | "error" | "later";
  sourceChip: string;
}

type ToastPhase = "hidden" | "entering" | "visible" | "leaving";

const FONT =
  "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Noto Sans KR', system-ui, sans-serif";

// ─── Toast Component ──────────────────────────────────────────────────────────

function Toast({
  phase,
  config,
  onDismiss,
}: {
  phase: ToastPhase;
  config: ToastConfig | null;
  onDismiss: () => void;
}) {
  if (phase === "hidden" || !config) return null;

  const isVisible = phase === "visible";
  const isSuccess = config.variant === "success";
  const isError = config.variant === "error";
  const isLater = config.variant === "later";

  const iconBg = isSuccess
    ? "var(--redo-success)"
    : isError
    ? "var(--redo-danger)"
    : isLater
    ? "var(--redo-text-tertiary)"
    : "var(--redo-warning)";

  const transform =
    phase === "entering" || phase === "leaving"
      ? "translateY(-20px)"
      : "translateY(0)";

  const opacity =
    phase === "entering" || phase === "leaving" ? 0 : 1;

  const transition =
    phase === "entering" || phase === "visible"
      ? "transform 250ms cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 250ms cubic-bezier(0.25, 0.46, 0.45, 0.94)"
      : "transform 200ms cubic-bezier(0.55, 0.0, 1.0, 0.45), opacity 200ms cubic-bezier(0.55, 0.0, 1.0, 0.45)";

  return (
    <div
      style={{
        position: "absolute",
        top: 56,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        zIndex: 200,
        // Don't block taps when hidden/animating out
        pointerEvents: isVisible ? "auto" : "none",
      }}
    >
      <div
        onClick={onDismiss}
        style={{
          display: "inline-flex",
          alignItems: "center",
          height: 40,
          paddingLeft: 12,
          paddingRight: 16,
          gap: 8,
          background: "var(--redo-text-primary)",
          borderRadius: 20,
          maxWidth: 280,
          cursor: "pointer",
          // Animation
          transform,
          opacity,
          transition,
          willChange: "transform, opacity",
          // Prevent text selection on click
          userSelect: "none",
          WebkitTapHighlightColor: "transparent",
          // Subtle shadow for depth
          boxShadow: "0 4px 16px rgba(0,0,0,0.22), 0 1px 4px rgba(0,0,0,0.12)",
        }}
      >
        {/* Icon circle */}
        <div
          style={{
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: iconBg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {isSuccess ? (
            /* Checkmark */
            <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
              <path
                d="M1.5 5l2.5 2.5 4.5-4.5"
                stroke="white"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : isLater ? (
            /* Clock icon */
            <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
              <circle cx="5" cy="5" r="3.5" stroke="white" strokeWidth="1.4" />
              <path d="M5 3v2l1.2 1.2" stroke="white" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          ) : (
            /* Warning / error exclamation */
            <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
              <path
                d="M5 2.5v3M5 7h.01"
                stroke="white"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>

        {/* Label */}
        <span
          style={{
            fontSize: 13,
            fontWeight: "var(--font-weight-medium)",
            color: "#ffffff",
            lineHeight: 1,
            fontFamily: FONT,
            whiteSpace: "nowrap",
          }}
        >
          {isSuccess
            ? "방금 저장됨"
            : isError
            ? "저장에 실패했어. 다시 시도해줘"
            : isLater
            ? "나중에 다시 볼게요"
            : "이미 저장된 레퍼런스야"}
        </span>

        {/* Source chip */}
        {config.sourceChip && (
          <span
            style={{
              fontSize: 11,
              fontWeight: "var(--font-weight-regular)",
              color: "rgba(255,255,255,0.50)",
              fontFamily: FONT,
              lineHeight: 1,
              whiteSpace: "nowrap",
            }}
          >
            {config.sourceChip}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── useToast hook ────────────────────────────────────────────────────────────

const HOLD_MS = 2200;
const ENTER_MS = 250;
const EXIT_MS = 200;

export function useToast() {
  const [phase, setPhase] = useState<ToastPhase>("hidden");
  const [config, setConfig] = useState<ToastConfig | null>(null);

  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enterTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAllTimers = useCallback(() => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    if (enterTimer.current) clearTimeout(enterTimer.current);
    if (exitTimer.current) clearTimeout(exitTimer.current);
  }, []);

  const startHold = useCallback(() => {
    holdTimer.current = setTimeout(() => {
      // Begin exit
      setPhase("leaving");
      exitTimer.current = setTimeout(() => {
        setPhase("hidden");
      }, EXIT_MS);
    }, HOLD_MS);
  }, []);

  const dismiss = useCallback(() => {
    clearAllTimers();
    setPhase("leaving");
    exitTimer.current = setTimeout(() => {
      setPhase("hidden");
    }, EXIT_MS);
  }, [clearAllTimers]);

  const showToast = useCallback(
    (cfg: ToastConfig) => {
      clearAllTimers();

      if (phase !== "hidden") {
        // Already visible — just update config and reset hold timer
        setConfig(cfg);
        setPhase("visible");
        startHold();
        return;
      }

      // Fresh enter sequence
      setConfig(cfg);
      setPhase("entering");

      // Two-frame trick: set entering first (initial position), then visible to trigger transition
      enterTimer.current = setTimeout(() => {
        setPhase("visible");
        startHold();
      }, 16); // one frame — enough for entering styles to be painted
    },
    [phase, clearAllTimers, startHold]
  );

  // Clean up on unmount
  useEffect(() => () => clearAllTimers(), [clearAllTimers]);

  const ToastNode = <Toast phase={phase} config={config} onDismiss={dismiss} />;

  return { showToast, ToastNode };
}