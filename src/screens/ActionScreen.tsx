import { useState, useRef, useCallback, useEffect } from "react";
import { StatusBar } from "../components/StatusBar";
import { BottomNav } from "../components/AppBottomNav";
import { ImageWithFallback } from "../components/ImageWithFallback";
import { type CardData } from "../types";
import { useBreakpoint } from "../hooks/useBreakpoint";

// ─── Constants ────────────────────────────────────────────────────────────────

const FONT =
  "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Noto Sans KR', system-ui, sans-serif";
const SWIPE_THRESHOLD = 80;
const MAX_ROTATE = 12; // degrees
const FLY_MS = 280;
const SNAP_MS = 300;
const LATER_MS = 250;
const SPRING = "cubic-bezier(0.34, 1.56, 0.64, 1)";

// ─── Card Data ────────────────────────────────────────────────────────────────

// SWIPE_CARDS removed — now derived from ALL_CARDS (statusDot === "미실행")
// filtered once per session in ActionScreen via useState initializer

type Phase =
  | "idle"
  | "dragging"
  | "exit-left"
  | "exit-right"
  | "exit-up"
  | "snap-back";

// ─── Progress Dots ────────────────────────────────────────────────────────────

function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center justify-center" style={{ gap: 6 }}>
      {Array.from({ length: total }).map((_, i) => {
        const isActive = i === current;
        return (
          <div
            key={i}
            style={{
              height: 6,
              width: isActive ? 18 : 6,
              borderRadius: 99,
              background: isActive
                ? "var(--redo-brand)"
                : "var(--redo-brand-mid)",
              opacity: isActive ? 1 : 0.35,
              transition: "width 0.25s ease, background 0.25s ease, opacity 0.25s ease",
            }}
          />
        );
      })}
    </div>
  );
}

// ─── Back Card (static, no interactivity) ────────────────────────────────────

function BackCard({
  card,
  zIndex,
  scale,
  translateY,
  isPromoting,
  promoteScale,
  promoteY,
}: {
  card: CardData;
  zIndex: number;
  scale: number;
  translateY: number;
  isPromoting: boolean;
  promoteScale: number;
  promoteY: number;
}) {
  const targetScale = isPromoting ? promoteScale : scale;
  const targetY = isPromoting ? promoteY : translateY;
  const transition = isPromoting ? `transform ${FLY_MS - 60}ms ease-out` : "none";

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex,
        transform: `scale(${targetScale}) translateY(${targetY}px)`,
        transformOrigin: "center bottom",
        transition,
        pointerEvents: "none",
        willChange: "transform",
      }}
    >
      <div
        style={{
          background: "var(--redo-bg-primary)",
          borderRadius: "var(--radius-card)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          border: "0.5px solid var(--redo-border)",
          overflow: "hidden",
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Thumbnail only — back cards don't show body */}
        <div style={{ height: 140, flexShrink: 0, overflow: "hidden" }}>
          <ImageWithFallback
            src={card.image}
            alt={card.title}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        </div>
        <div style={{ flex: 1, background: "var(--redo-bg-secondary)" }} />
      </div>
    </div>
  );
}

// ─── Front Card ───────────────────────────────────────────────────────────────

interface FrontCardProps {
  card: CardData;
  phase: Phase;
  dragX: number;
  onPointerDown: (e: React.PointerEvent) => void;
  onSkip: () => void;
  onExecute: () => void;
  // Refs for direct DOM writes during drag (no re-renders)
  skipTintRef: React.RefObject<HTMLDivElement>;
  execTintRef: React.RefObject<HTMLDivElement>;
  hintSkipRef: React.RefObject<HTMLSpanElement>;
  hintExecRef: React.RefObject<HTMLSpanElement>;
}

function FrontCard({
  card,
  phase,
  dragX,
  onPointerDown,
  onSkip,
  onExecute,
  skipTintRef,
  execTintRef,
  hintSkipRef,
  hintExecRef,
}: FrontCardProps) {
  // Compute transform from phase
  let tx = 0, ty = 0, rot = 0, opacity = 1, transition = "none";

  if (phase === "dragging") {
    tx = dragX;
    rot = Math.max(-MAX_ROTATE, Math.min(MAX_ROTATE, dragX * 0.08));
    ty = -Math.abs(dragX) * 0.05;
    transition = "none";
  } else if (phase === "idle") {
    // Just landed — static at 0
    tx = 0; ty = 0; rot = 0;
    transition = "none";
  } else if (phase === "snap-back") {
    tx = 0; ty = 0; rot = 0;
    transition = `transform ${SNAP_MS}ms ${SPRING}`;
  } else if (phase === "exit-left") {
    tx = -520; ty = 0; rot = -20; opacity = 1;
    transition = `transform ${FLY_MS}ms ease-in`;
  } else if (phase === "exit-right") {
    tx = 520; ty = 0; rot = 20; opacity = 1;
    transition = `transform ${FLY_MS}ms ease-in`;
  } else if (phase === "exit-up") {
    tx = 0; ty = -50; opacity = 0;
    transition = `transform ${LATER_MS}ms ease, opacity ${LATER_MS}ms ease`;
  }

  const pastThreshold = Math.abs(dragX) >= SWIPE_THRESHOLD;
  const skipThreshold = dragX < -SWIPE_THRESHOLD;
  const execThreshold = dragX > SWIPE_THRESHOLD;

  // Tint / hint opacities (for non-dragging phases, from dragX=0)
  const skipTintOpacity = phase === "dragging" ? Math.min(1, (-dragX) / 80) : 0;
  const execTintOpacity = phase === "dragging" ? Math.min(1, dragX / 80) : 0;

  return (
    <div
      onPointerDown={onPointerDown}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 3,
        transform: `translateX(${tx}px) translateY(${ty}px) rotate(${rot}deg)`,
        transformOrigin: "center bottom",
        opacity,
        transition,
        cursor: phase === "dragging" ? "grabbing" : "grab",
        userSelect: "none",
        touchAction: "none",
        willChange: "transform",
      }}
    >
      <div
        style={{
          background: "var(--redo-bg-primary)",
          borderRadius: "var(--radius-card)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.10)",
          border: "0.5px solid var(--redo-border)",
          overflow: "hidden",
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Thumbnail — 이미지 영역 강조 */}
        <div className="relative w-full shrink-0" style={{ height: typeof window !== "undefined" && window.innerWidth >= 768 ? 260 : 180 }}>
          <ImageWithFallback
            src={card.image}
            alt={card.title}
            className="w-full h-full object-cover"
            style={{ display: "block", pointerEvents: "none" }}
          />

          {/* Skip tint (red, left drag) */}
          <div
            ref={skipTintRef}
            style={{
              position: "absolute",
              inset: 0,
              background: "var(--redo-swipe-tint-left)",
              opacity: skipTintOpacity,
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-start",
              padding: "0 18px",
              pointerEvents: "none",
              transition: phase === "dragging" ? "none" : "opacity 150ms ease",
            }}
          >
            <span
              style={{
                fontSize: 15,
                fontWeight: "var(--font-weight-medium)",
                color: "var(--redo-danger)",
                fontFamily: FONT,
                border: "2px solid var(--redo-danger)",
                borderRadius: 8,
                padding: "3px 10px",
                transform: "rotate(-10deg)",
                display: "inline-block",
                lineHeight: 1.3,
              }}
            >
              건너뜀
            </span>
          </div>

          {/* Execute tint (green/purple, right drag) */}
          <div
            ref={execTintRef}
            style={{
              position: "absolute",
              inset: 0,
              background: "var(--redo-swipe-tint-right)",
              opacity: execTintOpacity,
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              padding: "0 18px",
              pointerEvents: "none",
              transition: phase === "dragging" ? "none" : "opacity 150ms ease",
            }}
          >
            <span
              style={{
                fontSize: 15,
                fontWeight: "var(--font-weight-medium)",
                color: "var(--redo-brand)",
                fontFamily: FONT,
                border: "2px solid var(--redo-brand)",
                borderRadius: 8,
                padding: "3px 10px",
                transform: "rotate(10deg)",
                display: "inline-block",
                lineHeight: 1.3,
              }}
            >
              실행 ✓
            </span>
          </div>

          {/* Project tag */}
          <div style={{ position: "absolute", top: 10, left: 10 }}>
            <span
              style={{
                background: "var(--redo-brand)",
                color: "#fff",
                fontSize: "var(--text-micro)",
                fontWeight: "var(--font-weight-medium)",
                borderRadius: "var(--radius-chip)",
                padding: "3px 10px",
                lineHeight: 1.4,
                fontFamily: FONT,
              }}
            >
              {card.projectTag}
            </span>
          </div>
        </div>

        {/* Card body */}
        <div
          className="flex flex-col flex-1"
          style={{ padding: "12px 14px 14px", gap: 0 }}
        >
          {/* Title */}
          <p
            style={{
              fontSize: "var(--text-card-title)",
              fontWeight: "var(--font-weight-medium)",
              color: "var(--redo-text-primary)",
              margin: 0,
              marginBottom: 8,
              lineHeight: 1.5,
              fontFamily: FONT,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {card.title}
          </p>

          {/* Chips */}
          <div className="flex flex-wrap" style={{ gap: 5, marginBottom: 10 }}>
            {card.chips.map((chip) => (
              <span
                key={chip}
                style={{
                  fontSize: "var(--text-micro)",
                  fontWeight: "var(--font-weight-regular)",
                  color: "var(--redo-text-secondary)",
                  background: "var(--redo-bg-secondary)",
                  borderRadius: "var(--radius-chip)",
                  padding: "3px 9px",
                  lineHeight: 1.5,
                  border: "0.5px solid var(--redo-border)",
                  fontFamily: FONT,
                }}
              >
                {chip}
              </span>
            ))}
          </div>

          {/* Context box */}
          <div
            style={{
              background: "var(--redo-context-bg)",
              borderRadius: "var(--radius-context)",
              padding: "7px 10px 8px",
              marginBottom: 14,
            }}
          >
            <p
              style={{
                fontSize: "var(--text-context-label)",
                fontWeight: "var(--font-weight-medium)",
                color: "var(--redo-context-label)",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                margin: 0,
                marginBottom: 3,
                lineHeight: 1.3,
                fontFamily: FONT,
              }}
            >
              저장 이유
            </p>
            <p
              style={{
                fontSize: "var(--text-caption)",
                fontWeight: "var(--font-weight-regular)",
                color: "var(--redo-context-text)",
                margin: 0,
                lineHeight: 1.5,
                fontFamily: FONT,
              }}
            >
              {card.savedReason}
            </p>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 10, padding: "0 16px 20px" }}>
            {/* 건너뜀 */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSkip();
              }}
              style={{
                flex: 1,
                height: 52,
                borderRadius: 14,
                background: "#ffffff",
                color: "#888780",
                fontSize: 15,
                fontWeight: 500,
                border: "1px solid rgba(0,0,0,0.12)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: FONT,
                lineHeight: 1,
                WebkitTapHighlightColor: "transparent",
              }}
            >
              건너뜀
            </button>

            {/* 실행하기 */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onExecute();
              }}
              style={{
                flex: 2,
                height: 52,
                borderRadius: 14,
                background: "var(--redo-brand)",
                color: "#fff",
                fontSize: 15,
                fontWeight: 500,
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: FONT,
                lineHeight: 1,
                boxShadow: "0 2px 8px rgba(106,112,255,0.35)",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              실행하기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Completion State ─────────────────────────────────────────────────────────

function CompletionState({ onReset }: { onReset: () => void }) {
  return (
    <div
      className="flex flex-col items-center justify-center"
      style={{ gap: 12, padding: "0 32px", textAlign: "center" }}
    >
      {/* Green checkmark circle */}
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: "50%",
          background: "var(--redo-success)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 4,
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path
            d="M5 13l4 4L19 7"
            stroke="#fff"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

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
        오늘 할 일 끝
      </p>

      <p
        style={{
          fontSize: "var(--text-card-title)",
          fontWeight: "var(--font-weight-regular)",
          color: "var(--redo-text-secondary)",
          margin: 0,
          lineHeight: 1.6,
          fontFamily: FONT,
        }}
      >
        새로운 레퍼런스가 쌓이면 다시 알려줄게
      </p>

      <button
        onClick={onReset}
        style={{
          marginTop: 8,
          height: 40,
          minHeight: 44,
          paddingLeft: 24,
          paddingRight: 24,
          borderRadius: "var(--radius-button)",
          background: "var(--redo-brand-light)",
          color: "var(--redo-brand-dark)",
          fontSize: "var(--text-body)",
          fontWeight: "var(--font-weight-medium)",
          border: "none",
          cursor: "pointer",
          fontFamily: FONT,
          WebkitTapHighlightColor: "transparent",
        }}
      >
        다시 보기
      </button>
    </div>
  );
}

// ─── No Cards State ───────────────────────────────────────────────────────────

function NoCardsState({ onFabPress }: { onFabPress?: () => void }) {
  return (
    <div
      className="flex flex-col items-center justify-center"
      style={{ gap: 0, padding: "48px 32px", textAlign: "center" }}
    >
      <div
        style={{
          width: 52, height: 52, borderRadius: 26,
          background: "var(--redo-bg-input)",
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: 16,
        }}
      >
        {/* Inbox / empty tray icon */}
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path
            d="M3 12l2-6h14l2 6M3 12v6a1 1 0 001 1h16a1 1 0 001-1v-6M3 12h18"
            stroke="var(--redo-text-secondary)" strokeWidth="1.7"
            strokeLinecap="round" strokeLinejoin="round"
          />
        </svg>
      </div>
      <p
        style={{
          fontSize: "var(--text-body)",
          fontWeight: "var(--font-weight-medium)",
          color: "var(--redo-text-secondary)",
          margin: 0, marginBottom: 6, lineHeight: 1.4, fontFamily: FONT,
        }}
      >
        실행할 레퍼런스가 없어요
      </p>
      <p
        style={{
          fontSize: "var(--text-caption)",
          fontWeight: "var(--font-weight-regular)",
          color: "var(--redo-text-tertiary)",
          margin: 0, marginBottom: 16, lineHeight: 1.5, fontFamily: FONT,
        }}
      >
        새로운 레퍼런스를 저장하고 활용해봐요
      </p>
      {onFabPress && (
        <button
          onClick={onFabPress}
          style={{
            height: 40, minHeight: 44, width: 140,
            borderRadius: 11,
            background: "var(--redo-brand)",
            color: "#fff",
            fontSize: "var(--text-body)",
            fontWeight: "var(--font-weight-medium)",
            border: "none", cursor: "pointer", fontFamily: FONT, lineHeight: 1,
            WebkitTapHighlightColor: "transparent",
          }}
        >
          저장하기
        </button>
      )}
    </div>
  );
}

// ─── Action Screen ────────────────────────────────────────────────────────────

interface ActionScreenProps {
  cards?: CardData[];
  onTabChange?: (tab: "홈" | "보관" | "활용" | "기록") => void;
  onFabPress?: () => void;
  executedCardIds?: Set<number>;
  onExecuteCard?: (id: number) => void;
}

export function ActionScreen({ cards = [], onTabChange, onFabPress, executedCardIds, onExecuteCard }: ActionScreenProps) {
  const { isMobile, isDesktop } = useBreakpoint();
  // ── Derive swipe deck ONCE at mount — frozen for this session ──────────
  // Excludes cards already marked 실행완료, plus any executed
  // this session (executedCardIds from App.tsx) so returning users see a
  // trimmed deck without previously executed cards.
  const [swipeCards] = useState<CardData[]>(() =>
    cards.filter(
      (c) => c.statusDot === "미실행" && !(executedCardIds?.has(c.id))
    )
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [dragX, setDragX] = useState(0);

  // Hint label refs — we write colors directly to avoid re-renders on drag
  const hintSkipRef = useRef<HTMLSpanElement>(null);
  const hintExecRef = useRef<HTMLSpanElement>(null);
  const skipTintRef = useRef<HTMLDivElement>(null);
  const execTintRef = useRef<HTMLDivElement>(null);

  // Pointer state refs
  const startXRef = useRef(0);
  const activePointerId = useRef<number | null>(null);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isDone = currentIndex >= swipeCards.length;
  const currentCard = swipeCards[currentIndex];
  const nextCard = swipeCards[currentIndex + 1];
  const preloadCard = swipeCards[currentIndex + 2];
  const isExiting =
    phase === "exit-left" || phase === "exit-right" || phase === "exit-up";

  // Remaining count: decrement immediately when exiting
  const remaining = swipeCards.length - currentIndex;

  // Progress dot current: advance immediately on exit start
  const dotCurrent = isExiting ? currentIndex + 1 : currentIndex;

  // Dynamic subtitle derived from current card
  const headerSubtitle = currentCard
    ? `${currentCard.projectTag} · 미실행`
    : "미실행 레퍼런스";

  // ── Update hint labels directly during drag ──────────────────────────────
  const updateHintsDirect = useCallback((dx: number) => {
    const skipPast = dx < -SWIPE_THRESHOLD;
    const execPast = dx > SWIPE_THRESHOLD;

    if (hintSkipRef.current) {
      hintSkipRef.current.style.color = skipPast
        ? "var(--redo-danger)"
        : "var(--redo-text-tertiary)";
      hintSkipRef.current.style.fontWeight = skipPast
        ? "var(--font-weight-medium)"
        : "var(--font-weight-regular)";
    }
    if (hintExecRef.current) {
      hintExecRef.current.style.color = execPast
        ? "var(--redo-brand)"
        : "var(--redo-text-tertiary)";
      hintExecRef.current.style.fontWeight = execPast
        ? "var(--font-weight-medium)"
        : "var(--font-weight-regular)";
    }
  }, []);

  // Reset hints to neutral
  const resetHints = useCallback(() => {
    if (hintSkipRef.current) {
      hintSkipRef.current.style.color = "var(--redo-text-tertiary)";
      hintSkipRef.current.style.fontWeight = "var(--font-weight-regular)";
    }
    if (hintExecRef.current) {
      hintExecRef.current.style.color = "var(--redo-text-tertiary)";
      hintExecRef.current.style.fontWeight = "var(--font-weight-regular)";
    }
  }, []);

  // ── Commit card exit ─────────────────────────────────────────────────────
  const commitExit = useCallback(
    (dir: "left" | "right" | "up") => {
      if (exitTimer.current) clearTimeout(exitTimer.current);
      resetHints();
      setPhase(`exit-${dir}` as Phase);
      setDragX(0);

      const duration = dir === "up" ? LATER_MS : FLY_MS;
      exitTimer.current = setTimeout(() => {
        // Notify parent of execution AFTER animation completes so App.tsx
        // can update executedCardIds for the next session
        if (dir === "right" && currentCard) {
          onExecuteCard?.(currentCard.id);
        }
        setCurrentIndex((i) => i + 1);
        setPhase("idle");
      }, duration + 40);
    },
    [resetHints, currentCard, onExecuteCard]
  );

  // ── Pointer handlers ─────────────────────────────────────────────────────
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (phase !== "idle" || isDone) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      activePointerId.current = e.pointerId;
      startXRef.current = e.clientX;
      setPhase("dragging");
    },
    [phase, isDone]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (phase !== "dragging" || e.pointerId !== activePointerId.current) return;
      const dx = e.clientX - startXRef.current;
      setDragX(dx);
      updateHintsDirect(dx);
    },
    [phase, updateHintsDirect]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (phase !== "dragging" || e.pointerId !== activePointerId.current) return;
      activePointerId.current = null;
      const dx = e.clientX - startXRef.current;

      if (dx > SWIPE_THRESHOLD) {
        commitExit("right");
      } else if (dx < -SWIPE_THRESHOLD) {
        commitExit("left");
      } else {
        // Snap back
        resetHints();
        setPhase("snap-back");
        setDragX(0);
        exitTimer.current = setTimeout(() => setPhase("idle"), SNAP_MS + 40);
      }
    },
    [phase, commitExit, resetHints]
  );

  // Cleanup on unmount
  useEffect(() => () => { if (exitTimer.current) clearTimeout(exitTimer.current); }, []);

  // ── Render ───────────────────────────────────────────────────────────────
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
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* Status Bar */}
      <div style={{ background: "var(--redo-bg-primary)" }}>
        <StatusBar />
      </div>

      {/* Top Bar */}
      <div
        style={{
          background: "var(--redo-bg-primary)",
          paddingLeft: 16,
          paddingRight: 16,
          paddingTop: 10,
          paddingBottom: 14,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "0.5px solid var(--redo-border)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <p
            style={{
              fontSize: "var(--text-micro)",
              fontWeight: "var(--font-weight-regular)",
              color: "var(--redo-text-tertiary)",
              margin: 0,
              lineHeight: 1.4,
              fontFamily: FONT,
            }}
          >
            {headerSubtitle}
          </p>
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
            지금 이걸 봐
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Remaining count — hides when done */}
          {!isDone && (
            <span
              style={{
                fontSize: "var(--text-micro)",
                fontWeight: "var(--font-weight-medium)",
                color: "var(--redo-brand)",
                background: "var(--redo-brand-light)",
                borderRadius: "var(--radius-chip)",
                padding: "3px 10px",
                lineHeight: 1.4,
                fontFamily: FONT,
                transition: "opacity 200ms",
              }}
            >
              {/* Show decremented immediately when exiting */}
              {isExiting ? remaining - 1 : remaining}개 남음
            </span>
          )}

          {/* Avatar */}
          <div
            style={{
              width: 34,
              height: 34,
              minWidth: 44,
              minHeight: 44,
              borderRadius: "50%",
              background: "var(--redo-brand-light)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <span
              style={{
                fontSize: "var(--text-body)",
                fontWeight: "var(--font-weight-medium)",
                color: "var(--redo-brand-dark)",
                lineHeight: 1,
                fontFamily: FONT,
              }}
            >
              지
            </span>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div
        className="flex-1 flex flex-col"
        style={{ padding: "20px 16px 16px", gap: 0, overflow: "hidden" }}
      >
        {/* Swipe hint row */}
        {!isDone && (
          <div
            className="flex items-center justify-between shrink-0"
            style={{ marginBottom: 12 }}
          >
            <span
              ref={hintSkipRef}
              style={{
                fontSize: "var(--text-micro)",
                fontWeight: "var(--font-weight-regular)",
                color: "var(--redo-text-tertiary)",
                fontFamily: FONT,
                transition: "color 120ms ease, font-weight 120ms ease",
              }}
            >
              ← 건너뜀
            </span>
            <span
              ref={hintExecRef}
              style={{
                fontSize: "var(--text-micro)",
                fontWeight: "var(--font-weight-regular)",
                color: "var(--redo-text-tertiary)",
                fontFamily: FONT,
                transition: "color 120ms ease, font-weight 120ms ease",
              }}
            >
              실행하기 →
            </span>
          </div>
        )}

        {/* ── Card stack area ── */}
        <div
          className="flex-1 relative"
          style={{
            marginBottom: isDone ? 0 : 16,
            maxWidth: isMobile ? undefined : 480,
            margin: isMobile ? undefined : "0 auto",
            width: "100%",
          }}
        >
          {swipeCards.length === 0 && cards.length === 0 ? (
            /* No cards saved at all */
            <div className="flex items-center justify-center" style={{ height: "100%" }}>
              <NoCardsState onFabPress={onFabPress} />
            </div>
          ) : swipeCards.length === 0 || isDone ? (
            /* All cards executed — completion state */
            <div className="flex items-center justify-center" style={{ height: "100%" }}>
              <CompletionState onReset={() => { setCurrentIndex(0); setPhase("idle"); setDragX(0); }} />
            </div>
          ) : (
            <>
              {/* Layer 1: preload card (card after next) */}
              {preloadCard && (
                <BackCard
                  key={`preload-${preloadCard.id}`}
                  card={preloadCard}
                  zIndex={1}
                  scale={0.90}
                  translateY={16}
                  isPromoting={isExiting}
                  promoteScale={0.95}
                  promoteY={8}
                />
              )}

              {/* Layer 2: next card */}
              {nextCard && (
                <BackCard
                  key={`back-${nextCard.id}`}
                  card={nextCard}
                  zIndex={2}
                  scale={0.95}
                  translateY={8}
                  isPromoting={isExiting}
                  promoteScale={1}
                  promoteY={0}
                />
              )}

              {/* Layer 3: front card (interactive) */}
              <FrontCard
                key={`front-${currentCard.id}`}
                card={currentCard}
                phase={phase}
                dragX={dragX}
                onPointerDown={handlePointerDown}
                onSkip={() => commitExit("left")}
                onExecute={() => commitExit("right")}
                skipTintRef={skipTintRef}
                execTintRef={execTintRef}
                hintSkipRef={hintSkipRef}
                hintExecRef={hintExecRef}
              />
            </>
          )}
        </div>

        {/* Progress dots */}
        {!isDone && (
          <div className="shrink-0" style={{ marginBottom: 8 }}>
            <ProgressDots
              total={swipeCards.length}
              current={Math.min(dotCurrent, swipeCards.length - 1)}
            />
          </div>
        )}
      </div>

      <BottomNav activeTab="활용" onTabChange={onTabChange} onFabPress={onFabPress} />
    </div>
  );
}