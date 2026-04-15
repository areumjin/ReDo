import { useState, useEffect, useRef } from "react";
import type { CardData } from "../types";
import { useBreakpoint } from "../hooks/useBreakpoint";

const FONT =
  "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Noto Sans KR', system-ui, sans-serif";

interface ExecutionMemoSheetProps {
  isOpen: boolean;
  card: CardData | null;
  cards?: CardData[]; // 프로젝트 태그 목록 추출용
  onComplete: (memo: string) => void;
  onSkip: () => void;
  onClose: () => void;
}

// ─── 색상 스와치 ───────────────────────────────────────────────────────────────

function ColorSwatch({ hex }: { hex: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(hex).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    });
  };

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={handleCopy}
        title={hex}
        style={{
          width: 24,
          height: 24,
          borderRadius: "50%",
          background: hex,
          border: "1.5px solid rgba(0,0,0,0.08)",
          cursor: "pointer",
          padding: 0,
          display: "block",
          WebkitTapHighlightColor: "transparent",
          flexShrink: 0,
        }}
      />
      {copied && (
        <div
          style={{
            position: "absolute",
            bottom: 30,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(0,0,0,0.75)",
            color: "#fff",
            fontSize: 10,
            borderRadius: 4,
            padding: "3px 6px",
            whiteSpace: "nowrap",
            fontFamily: FONT,
            pointerEvents: "none",
            zIndex: 10,
          }}
        >
          복사됨
        </div>
      )}
    </div>
  );
}

// ─── 재료 섹션 레이블 ──────────────────────────────────────────────────────────

function SectionLabel({ text }: { text: string }) {
  return (
    <p
      style={{
        fontSize: 10,
        fontWeight: 600,
        color: "#888780",
        fontFamily: FONT,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        margin: "0 0 6px",
        lineHeight: 1,
      }}
    >
      {text}
    </p>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function ExecutionMemoSheet({
  isOpen,
  card,
  cards,
  onComplete,
  onSkip,
  onClose,
}: ExecutionMemoSheetProps) {
  const [phase, setPhase] = useState<"hidden" | "entering" | "visible" | "leaving">("hidden");
  const [memo, setMemo] = useState("");
  const [selectedProject, setSelectedProject] = useState<string>("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setMemo("");
      // 현재 카드의 projectTag를 기본값으로
      setSelectedProject(card?.projectTag ?? "");
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
  }, [isOpen, card]);

  const { isMobile } = useBreakpoint();

  if (phase === "hidden") return null;

  const isVisible = phase === "visible";
  const isAnimating = !isVisible;
  const sheetY = isVisible ? "translateY(0)" : "translateY(100%)";
  const scrimOpacity = isVisible ? 0.4 : 0;
  const desktopScale = isVisible ? "scale(1)" : "scale(0.96)";
  const desktopOpacity = isVisible ? 1 : 0;

  // ── 프로젝트 태그 목록 (중복 제거) ──────────────────────────────────────────
  const projectTags = cards
    ? Array.from(new Set(cards.map((c) => c.projectTag).filter(Boolean)))
    : card?.projectTag
    ? [card.projectTag]
    : [];

  // ── aiAnalysis 재료 ───────────────────────────────────────────────────────────
  const ai = card?.aiAnalysis;
  const colors = ai?.colors?.filter((c) => c.hex) ?? [];
  const fonts = ai?.fonts?.filter((f) => f.name) ?? [];
  const keywords = ai?.keywords?.filter(Boolean) ?? [];
  const hasAI = colors.length > 0 || fonts.length > 0 || keywords.length > 0;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        display: "flex",
        flexDirection: "column",
        justifyContent: isMobile ? "flex-end" : "center",
        alignItems: isMobile ? "stretch" : "center",
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
          backdropFilter: isMobile ? undefined : "blur(4px)",
          WebkitBackdropFilter: isMobile ? undefined : "blur(4px)",
          transition: "background 0.3s ease",
        }}
      />

      {/* Sheet / Modal */}
      <div
        style={{
          position: "relative",
          width: isMobile ? "100%" : 480,
          maxWidth: isMobile ? undefined : "90vw",
          background: "#ffffff",
          borderRadius: isMobile ? "20px 20px 0 0" : 20,
          boxShadow: isMobile
            ? "0 -4px 32px rgba(0,0,0,0.14)"
            : "0 8px 40px rgba(0,0,0,0.16)",
          transform: isMobile ? sheetY : desktopScale,
          opacity: isMobile ? 1 : desktopOpacity,
          transition: isMobile
            ? isAnimating
              ? "transform 250ms cubic-bezier(0.55, 0, 1, 0.45)"
              : "transform 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94)"
            : "transform 0.24s ease, opacity 0.24s ease",
          paddingBottom: 24,
          willChange: "transform",
          maxHeight: isMobile ? "90vh" : undefined,
          overflowY: "auto",
        }}
      >
        {/* Handle bar */}
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 12, paddingBottom: 8 }}>
          <div style={{ width: 32, height: 4, borderRadius: 99, background: "#E5E5E5" }} />
        </div>

        {/* Content */}
        <div style={{ padding: "8px 16px 0" }}>

          {/* ── 카드 미리보기 ── */}
          {card && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: "#F8F7F4",
                borderRadius: 8,
                padding: "8px 12px",
                marginBottom: 16,
              }}
            >
              {card.image && (
                <div style={{ width: 44, height: 44, borderRadius: 6, overflow: "hidden", flexShrink: 0 }}>
                  <img
                    src={card.image}
                    alt={card.title}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
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

          {/* ── 헤더 ── */}
          <p
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: "#2C2C2A",
              margin: 0,
              marginBottom: 4,
              lineHeight: 1.3,
              fontFamily: FONT,
              textAlign: "center",
            }}
          >
            실행 메모
          </p>
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
            어떻게 실행했는지 기록해봐요
          </p>

          {/* ── aiAnalysis 재료 영역 ── */}
          {hasAI && (
            <div
              style={{
                background: "#F8F7F4",
                borderRadius: 10,
                padding: "10px 12px",
                marginBottom: 14,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {/* 컬러 */}
              {colors.length > 0 && (
                <div>
                  <SectionLabel text="컬러" />
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {colors.map((c, i) => (
                      <ColorSwatch key={i} hex={c.hex} />
                    ))}
                  </div>
                </div>
              )}

              {/* 폰트 */}
              {fonts.length > 0 && (
                <div>
                  <SectionLabel text="폰트" />
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {fonts.map((f, i) => (
                      <button
                        key={i}
                        onClick={() =>
                          window.open(
                            `https://fonts.google.com/?query=${encodeURIComponent(f.name)}`,
                            "_blank",
                            "noopener"
                          )
                        }
                        style={{
                          height: 26,
                          paddingLeft: 10,
                          paddingRight: 10,
                          borderRadius: 20,
                          border: "0.5px solid rgba(0,0,0,0.1)",
                          background: "#fff",
                          color: "#2C2C2A",
                          fontSize: 11,
                          fontWeight: 500,
                          fontFamily: FONT,
                          cursor: "pointer",
                          lineHeight: 1,
                          WebkitTapHighlightColor: "transparent",
                        }}
                      >
                        {f.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 키워드 */}
              {keywords.length > 0 && (
                <div>
                  <SectionLabel text="키워드" />
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {keywords.map((kw, i) => (
                      <span
                        key={i}
                        style={{
                          height: 26,
                          paddingLeft: 10,
                          paddingRight: 10,
                          borderRadius: 20,
                          border: "0.5px solid rgba(0,0,0,0.08)",
                          background: "#EEEFFE",
                          color: "#6A70FF",
                          fontSize: 11,
                          fontWeight: 500,
                          fontFamily: FONT,
                          lineHeight: "26px",
                          display: "inline-block",
                        }}
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── 프로젝트 연결 드롭다운 ── */}
          {projectTags.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: "#888780",
                  fontFamily: FONT,
                  margin: "0 0 6px",
                  letterSpacing: "0.04em",
                }}
              >
                어떤 프로젝트에 연결할까요?
              </p>
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                style={{
                  width: "100%",
                  height: 40,
                  borderRadius: 8,
                  border: "0.5px solid rgba(0,0,0,0.12)",
                  background: "#F8F7F4",
                  color: "#2C2C2A",
                  fontSize: 13,
                  fontFamily: FONT,
                  padding: "0 10px",
                  outline: "none",
                  cursor: "pointer",
                  appearance: "none",
                  WebkitAppearance: "none",
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23888780' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 12px center",
                  paddingRight: 32,
                }}
              >
                {projectTags.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* ── 메모 입력창 ── */}
          <textarea
            ref={textareaRef}
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="어떻게 활용할 건가요? (선택사항)"
            rows={3}
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
              marginBottom: 14,
            }}
          />

          {/* ── 버튼 ── */}
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
                fontWeight: 600,
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
