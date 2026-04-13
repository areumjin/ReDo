import { useState, useEffect, useRef } from "react";
import type { CardData } from "../types";

const FONT =
  "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Noto Sans KR', system-ui, sans-serif";

interface ExecutionMemoSheetProps {
  isOpen: boolean;
  card: CardData | null;
  onComplete: (memo: string) => void;
  onSkip: () => void;
  onClose: () => void;
}

export function ExecutionMemoSheet({
  isOpen,
  card,
  onComplete,
  onSkip,
  onClose,
}: ExecutionMemoSheetProps) {
  const [phase, setPhase] = useState<"hidden" | "entering" | "visible" | "leaving">("hidden");
  const [memo, setMemo] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setMemo("");
      setPhase("entering");
      const t = requestAnimationFrame(() => {
        requestAnimationFrame(() => setPhase("visible"));
      });
      return () => cancelAnimationFrame(t);
    } else {
      setPhase("leaving");
      const t = setTimeout(() => setPhase("hidden"), 260);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  if (phase === "hidden") return null;

  const isVisible = phase === "visible";
  const sheetY = isVisible ? "translateY(0)" : "translateY(100%)";
  const scrimOpacity = isVisible ? 0.4 : 0;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 60,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        overflow: "hidden",
      }}
    >
      {/* Scrim */}
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: `rgba(0,0,0,${scrimOpacity})`,
          transition: "background 0.3s ease",
        }}
      />

      {/* Sheet */}
      <div
        style={{
          position: "relative",
          width: "100%",
          background: "#ffffff",
          borderRadius: "20px 20px 0 0",
          boxShadow: "0 -4px 32px rgba(0,0,0,0.14)",
          transform: sheetY,
          transition: isVisible
            ? "transform 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94)"
            : "transform 250ms cubic-bezier(0.55, 0, 1, 0.45)",
          paddingBottom: 24,
          willChange: "transform",
        }}
      >
        {/* Handle bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            paddingTop: 12,
            paddingBottom: 8,
          }}
        >
          <div
            style={{
              width: 32,
              height: 4,
              borderRadius: 99,
              background: "#E5E5E5",
            }}
          />
        </div>

        {/* Content */}
        <div style={{ padding: "8px 16px 0" }}>
          {/* Card mini preview */}
          {card && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: "#F8F7F4",
                borderRadius: 8,
                padding: "8px 12px",
                marginBottom: 20,
              }}
            >
              {card.image && (
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 6,
                    overflow: "hidden",
                    flexShrink: 0,
                  }}
                >
                  <img
                    src={card.image}
                    alt={card.title}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              )}
              <p
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: "#2C2C2A",
                  margin: 0,
                  lineHeight: 1.4,
                  fontFamily: FONT,
                  flex: 1,
                  minWidth: 0,
                  overflow: "hidden",
                  display: "-webkit-box",
                  WebkitLineClamp: 1,
                  WebkitBoxOrient: "vertical",
                }}
              >
                {card.title}
              </p>
            </div>
          )}

          {/* Title */}
          <p
            style={{
              fontSize: 16,
              fontWeight: 500,
              color: "#2C2C2A",
              margin: 0,
              marginBottom: 6,
              lineHeight: 1.3,
              fontFamily: FONT,
              textAlign: "center",
            }}
          >
            어떻게 활용했어요?
          </p>

          {/* Sub */}
          <p
            style={{
              fontSize: 12,
              fontWeight: 400,
              color: "#888780",
              margin: 0,
              marginBottom: 16,
              lineHeight: 1.6,
              fontFamily: FONT,
              textAlign: "center",
            }}
          >
            간단히 남기면 나중에 더 잘 기억돼요
          </p>

          {/* Memo textarea */}
          <textarea
            ref={textareaRef}
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="이 레퍼런스를 어떻게 썼는지 써봐요..."
            rows={4}
            style={{
              width: "100%",
              background: "#F8F7F4",
              borderRadius: 10,
              border: "0.5px solid rgba(0,0,0,0.08)",
              padding: 12,
              fontSize: 14,
              fontWeight: 400,
              color: "#2C2C2A",
              fontFamily: FONT,
              lineHeight: 1.6,
              resize: "none",
              outline: "none",
              display: "block",
              boxSizing: "border-box",
              marginBottom: 16,
            }}
          />

          {/* Buttons */}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={onSkip}
              style={{
                flex: 1,
                height: 44,
                background: "#ffffff",
                border: "0.5px solid rgba(0,0,0,0.12)",
                borderRadius: 10,
                color: "#888780",
                fontSize: 14,
                fontWeight: 400,
                fontFamily: FONT,
                cursor: "pointer",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              건너뛰기
            </button>

            <button
              onClick={() => onComplete(memo.trim())}
              style={{
                flex: 2,
                height: 44,
                background: "#6A70FF",
                border: "none",
                borderRadius: 10,
                color: "#ffffff",
                fontSize: 14,
                fontWeight: 500,
                fontFamily: FONT,
                cursor: "pointer",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              저장하고 완료
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
