import { useState, useRef, useEffect } from "react";
import { StatusBar } from "../components/StatusBar";

// ─── Keyframe injection ────────────────────────────────────────────────────────

const STYLE_ID = "redo-ob-v3";
if (typeof document !== "undefined" && !document.getElementById(STYLE_ID)) {
  const s = document.createElement("style");
  s.id = STYLE_ID;
  s.textContent = `
    @keyframes ob3-slide-in {
      from { transform: translateX(100%); opacity: 0.85; }
      to   { transform: translateX(0);    opacity: 1;    }
    }
    @keyframes ob3-fade-up {
      from { transform: translateY(14px); opacity: 0; }
      to   { transform: translateY(0);    opacity: 1; }
    }
    @keyframes ob3-appear {
      from { transform: scale(0.92); opacity: 0; }
      to   { transform: scale(1);    opacity: 1; }
    }
    @keyframes ob3-gesture {
      0%,  100% { transform: translateX(0)    rotate(0deg);  opacity: 0.45; }
      25%        { transform: translateX(-22px) rotate(-12deg); opacity: 1;    }
      75%        { transform: translateX(22px)  rotate(12deg);  opacity: 1;    }
    }
    @keyframes ob3-hero-float {
      0%, 100% { transform: translateY(0px);  }
      50%      { transform: translateY(-5px); }
    }
    @keyframes ob3-progress {
      from { opacity: 0.6; }
      to   { opacity: 1;   }
    }
  `;
  document.head.appendChild(s);
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FONT =
  "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Noto Sans KR', system-ui, sans-serif";

const SWIPE_THRESHOLD = 65;
const MAX_ROTATE = 10;

const AI_CHIPS = ["타이포 참고", "그리드 구조", "색상 팔레트", "분위기"];

// ─── Platform Data ─────────────────────────────────────────────────────────────

const PLATFORMS = [
  {
    id: "pinterest",
    name: "Pinterest",
    desc: "저장한 핀 가져오기",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="#E60023">
        <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
      </svg>
    ),
  },
  {
    id: "notion",
    name: "Notion",
    desc: "저장한 페이지 가져오기",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="#000">
        <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.14c-.093-.514.28-.887.747-.933z" />
      </svg>
    ),
  },
  {
    id: "instagram",
    name: "Instagram",
    desc: "저장한 게시물 가져오기",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <defs>
          <linearGradient id="ig-grad" x1="0" y1="24" x2="24" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#F58529" />
            <stop offset="50%" stopColor="#DD2A7B" />
            <stop offset="100%" stopColor="#8134AF" />
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="20" height="20" rx="5.5" stroke="url(#ig-grad)" strokeWidth="1.8" />
        <circle cx="12" cy="12" r="4" stroke="url(#ig-grad)" strokeWidth="1.8" />
        <circle cx="17.5" cy="6.5" r="1" fill="url(#ig-grad)" />
      </svg>
    ),
  },
];

// ─── Shared Components ─────────────────────────────────────────────────────────

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div
      style={{
        height: 3,
        background: "var(--redo-border)",
        borderRadius: 99,
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${pct}%`,
          background: "var(--redo-brand)",
          borderRadius: 99,
          transition: "width 420ms cubic-bezier(0.34, 1.1, 0.64, 1)",
        }}
      />
    </div>
  );
}

function CTAButton({
  label,
  onClick,
  disabled = false,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "100%",
        height: 48,
        borderRadius: 12,
        background: disabled ? "var(--redo-brand-mid)" : "var(--redo-brand)",
        color: "#fff",
        border: "none",
        cursor: disabled ? "default" : "pointer",
        fontSize: "var(--text-body)",
        fontWeight: "var(--font-weight-medium)",
        fontFamily: FONT,
        lineHeight: 1,
        flexShrink: 0,
        transition: "background 150ms ease, opacity 150ms ease",
        opacity: disabled ? 0.65 : 1,
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {label}
    </button>
  );
}

function SkipButton({ onSkip }: { onSkip: () => void }) {
  return (
    <button
      onClick={onSkip}
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        fontSize: 12,
        fontWeight: "var(--font-weight-regular)",
        color: "var(--redo-text-tertiary)",
        fontFamily: FONT,
        padding: "0 4px",
        minHeight: 44,
        minWidth: 44,
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      건너뛰기
    </button>
  );
}

function StepLabel({ step }: { step: number }) {
  return (
    <p
      style={{
        fontSize: "var(--text-context-label)",
        fontWeight: "var(--font-weight-regular)",
        color: "var(--redo-brand-mid)",
        fontFamily: FONT,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        margin: 0,
        marginBottom: 10,
        lineHeight: 1.4,
      }}
    >
      STEP {step} OF 3
    </p>
  );
}

function StepTitle({ text }: { text: string }) {
  return (
    <p
      style={{
        fontSize: 20,
        fontWeight: "var(--font-weight-medium)",
        color: "var(--redo-text-primary)",
        fontFamily: FONT,
        margin: 0,
        marginBottom: 8,
        lineHeight: 1.3,
        whiteSpace: "pre-line",
      }}
    >
      {text}
    </p>
  );
}

function StepSub({ text }: { text: string }) {
  return (
    <p
      style={{
        fontSize: 13,
        fontWeight: "var(--font-weight-regular)",
        color: "var(--redo-text-secondary)",
        fontFamily: FONT,
        margin: 0,
        marginBottom: 24,
        lineHeight: 1.6,
        whiteSpace: "pre-line",
      }}
    >
      {text}
    </p>
  );
}

// ─── Step 1: 환영 ──────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M3 7h18M3 12h18M3 17h10" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    text: "흩어진 레퍼런스를 한 곳에",
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          stroke="#fff"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path d="M9 12h6M9 16h4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
    text: "저장 이유까지 기억해줘요",
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <circle cx="11" cy="11" r="7" stroke="#fff" strokeWidth="1.8" />
        <path d="M16.5 16.5l4 4" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    text: "지금 필요한 것만 꺼내줘요",
  },
];

function Step1Screen({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Progress bar area */}
      <div style={{ padding: "14px 16px 0" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", marginBottom: 12 }}>
          <SkipButton onSkip={onSkip} />
        </div>
        <ProgressBar pct={33} />
      </div>

      {/* Hero area — 40% of remaining space */}
      <div
        style={{
          flex: "0 0 38%",
          background: "linear-gradient(145deg, var(--redo-brand) 0%, var(--redo-brand-dark) 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative circles */}
        <div
          style={{
            position: "absolute",
            width: 260,
            height: 260,
            borderRadius: "50%",
            border: "1px solid rgba(255,255,255,0.1)",
            top: -80,
            right: -60,
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 160,
            height: 160,
            borderRadius: "50%",
            border: "1px solid rgba(255,255,255,0.08)",
            bottom: -40,
            left: -20,
          }}
        />

        {/* Wordmark */}
        <div
          style={{
            animation: "ob3-hero-float 3.5s ease-in-out infinite",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
          }}
        >
          {/* Logo icon */}
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: "rgba(255,255,255,0.18)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backdropFilter: "blur(8px)",
            }}
          >
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path
                d="M7 8h9a5 5 0 010 10H7V8z"
                stroke="#fff"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M7 18l6 5"
                stroke="#fff"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <p
            style={{
              fontSize: 28,
              fontWeight: "var(--font-weight-medium)",
              color: "#fff",
              fontFamily: FONT,
              margin: 0,
              lineHeight: 1,
              letterSpacing: "-0.02em",
            }}
          >
            ReDo
          </p>
          <p
            style={{
              fontSize: "var(--text-caption)",
              fontWeight: "var(--font-weight-regular)",
              color: "rgba(255,255,255,0.7)",
              fontFamily: FONT,
              margin: 0,
              lineHeight: 1.3,
            }}
          >
            레퍼런스 활용 시스템
          </p>
        </div>
      </div>

      {/* Body — 60% */}
      <div
        style={{
          flex: 1,
          background: "var(--redo-bg-primary)",
          padding: "28px 24px 24px",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
          scrollbarWidth: "none",
        }}
      >
        <p
          style={{
            fontSize: 22,
            fontWeight: "var(--font-weight-medium)",
            color: "var(--redo-text-primary)",
            fontFamily: FONT,
            margin: 0,
            marginBottom: 10,
            lineHeight: 1.3,
            whiteSpace: "pre-line",
          }}
        >
          {"저장만 하고\n잊고 있진 않나요?"}
        </p>
        <p
          style={{
            fontSize: "var(--text-body)",
            fontWeight: "var(--font-weight-regular)",
            color: "var(--redo-text-secondary)",
            fontFamily: FONT,
            margin: 0,
            marginBottom: 24,
            lineHeight: 1.6,
            whiteSpace: "pre-line",
          }}
        >
          {"ReDo는 저장한 레퍼런스를\n다시 꺼내 작업으로 이어주는 시스템이에요."}
        </p>

        {/* Feature rows */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 28, flex: 1 }}>
          {FEATURES.map((f, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                animation: `ob3-fade-up 350ms ease-out ${80 + i * 80}ms both`,
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "var(--redo-brand)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {f.icon}
              </div>
              <p
                style={{
                  fontSize: "var(--text-body)",
                  fontWeight: "var(--font-weight-regular)",
                  color: "var(--redo-text-primary)",
                  fontFamily: FONT,
                  margin: 0,
                  lineHeight: 1.4,
                }}
              >
                {f.text}
              </p>
            </div>
          ))}
        </div>

        <CTAButton label="시작하기" onClick={onNext} />
      </div>
    </div>
  );
}

// ─── Step 2: 첫 저장 ───────────────────────────────────────────────────────────

interface Step2Props {
  urlInput: string;
  onUrlChange: (v: string) => void;
  thumbnailVisible: boolean;
  selectedChips: Set<string>;
  onToggleChip: (chip: string) => void;
  savedReason: string;
  onReasonChange: (v: string) => void;
  onSave: () => void;
  onSkip: () => void;
}

function Step2Screen({
  urlInput,
  onUrlChange,
  thumbnailVisible,
  selectedChips,
  onToggleChip,
  savedReason,
  onReasonChange,
  onSave,
  onSkip,
}: Step2Props) {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Top bar */}
      <div style={{ padding: "14px 16px 0", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", marginBottom: 12 }}>
          <SkipButton onSkip={onSkip} />
        </div>
        <ProgressBar pct={66} />
      </div>

      {/* Scrollable body */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          scrollbarWidth: "none",
          padding: "20px 16px 32px",
          display: "flex",
          flexDirection: "column",
          gap: 0,
        }}
      >
        <StepLabel step={2} />
        <StepTitle text="첫 레퍼런스를 저장해봐요" />
        <StepSub text={"저장할 때 이유를 남기면\n나중에 더 잘 꺼내줄 수 있어요."} />

        {/* URL Input */}
        <div style={{ marginBottom: 12 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "var(--redo-bg-input)",
              borderRadius: "var(--radius-button)",
              padding: "0 12px",
              height: 44,
              border: "0.5px solid var(--redo-border)",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, opacity: 0.4 }}>
              <path
                d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"
                stroke="var(--redo-text-primary)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"
                stroke="var(--redo-text-primary)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <input
              type="url"
              placeholder="레퍼런스 URL을 붙여넣어요"
              value={urlInput}
              onChange={(e) => onUrlChange(e.target.value)}
              style={{
                flex: 1,
                background: "none",
                border: "none",
                outline: "none",
                fontSize: "var(--text-body)",
                fontWeight: "var(--font-weight-regular)",
                color: "var(--redo-text-primary)",
                fontFamily: FONT,
                lineHeight: 1.4,
              }}
            />
          </div>
        </div>

        {/* Thumbnail preview */}
        <div
          style={{
            height: thumbnailVisible ? 80 : 0,
            borderRadius: "var(--radius-button)",
            overflow: "hidden",
            marginBottom: thumbnailVisible ? 12 : 0,
            transition: "height 300ms ease, margin-bottom 300ms ease",
            background: "linear-gradient(135deg, var(--redo-brand) 0%, var(--redo-brand-dark) 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            flexShrink: 0,
          }}
        >
          {thumbnailVisible && (
            <>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="18" height="18" rx="3" stroke="rgba(255,255,255,0.7)" strokeWidth="1.6" />
                <path d="M3 9h18" stroke="rgba(255,255,255,0.7)" strokeWidth="1.6" />
                <circle cx="7" cy="6" r="1" fill="rgba(255,255,255,0.7)" />
                <circle cx="10" cy="6" r="1" fill="rgba(255,255,255,0.7)" />
              </svg>
              <p
                style={{
                  fontSize: "var(--text-caption)",
                  fontWeight: "var(--font-weight-regular)",
                  color: "rgba(255,255,255,0.8)",
                  fontFamily: FONT,
                  margin: 0,
                  lineHeight: 1.3,
                }}
              >
                {urlInput.replace(/https?:\/\//, "").split("/")[0] || "링크 미리보기"}
              </p>
            </>
          )}
        </div>

        {/* AI Chip suggestions */}
        <p
          style={{
            fontSize: "var(--text-context-label)",
            fontWeight: "var(--font-weight-regular)",
            color: "var(--redo-text-tertiary)",
            fontFamily: FONT,
            margin: 0,
            marginBottom: 8,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          AI 추천 저장 이유
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 14 }}>
          {AI_CHIPS.map((chip) => {
            const selected = selectedChips.has(chip);
            return (
              <button
                key={chip}
                onClick={() => onToggleChip(chip)}
                style={{
                  height: 32,
                  paddingLeft: 14,
                  paddingRight: 14,
                  borderRadius: "var(--radius-chip)",
                  background: selected ? "var(--redo-brand-light)" : "var(--redo-bg-secondary)",
                  border: selected
                    ? "1px solid var(--redo-brand-mid)"
                    : "0.5px solid var(--redo-border)",
                  color: selected ? "var(--redo-context-text)" : "var(--redo-text-secondary)",
                  fontSize: "var(--text-caption)",
                  fontWeight: selected ? "var(--font-weight-medium)" : "var(--font-weight-regular)",
                  fontFamily: FONT,
                  cursor: "pointer",
                  lineHeight: 1,
                  transition: "all 150ms ease",
                  WebkitTapHighlightColor: "transparent",
                  flexShrink: 0,
                }}
              >
                {chip}
              </button>
            );
          })}
        </div>

        {/* Context box / reason input */}
        <div
          style={{
            background: "var(--redo-context-bg)",
            borderRadius: "var(--radius-context)",
            padding: "10px 12px 12px",
            marginBottom: 8,
          }}
        >
          <p
            style={{
              fontSize: "var(--text-context-label)",
              fontWeight: "var(--font-weight-medium)",
              color: "var(--redo-context-label)",
              fontFamily: FONT,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              margin: 0,
              marginBottom: 6,
              lineHeight: 1.3,
            }}
          >
            저장 이유
          </p>
          <textarea
            rows={3}
            placeholder="이 레퍼런스를 왜 저장하는지 써봐요..."
            value={savedReason}
            onChange={(e) => onReasonChange(e.target.value)}
            style={{
              width: "100%",
              background: "none",
              border: "none",
              outline: "none",
              resize: "none",
              fontSize: "var(--text-caption)",
              fontWeight: "var(--font-weight-regular)",
              color: "var(--redo-context-text)",
              fontFamily: FONT,
              lineHeight: 1.6,
              padding: 0,
              boxSizing: "border-box",
            }}
          />
        </div>
        <p
          style={{
            fontSize: "var(--text-micro)",
            fontWeight: "var(--font-weight-regular)",
            color: "var(--redo-text-tertiary)",
            fontFamily: FONT,
            fontStyle: "italic",
            margin: 0,
            marginBottom: 24,
            lineHeight: 1.5,
          }}
        >
          저장 이유가 있으면 나중에 더 잘 꺼내줄 수 있어
        </p>

        <CTAButton label="저장하기" onClick={onSave} />
      </div>
    </div>
  );
}

// ─── Step 3: 첫 실행 (swipe demo) ─────────────────────────────────────────────

interface SavedCardData {
  title: string;
  reason: string;
  chips: string[];
}

interface Step3Props {
  savedCard: SavedCardData;
  onCTA: () => void;
}

function Step3Screen({ savedCard, onCTA }: Step3Props) {
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [swipePhase, setSwipePhase] = useState<"idle" | "exit-left" | "exit-right">("idle");
  const [swiped, setSwiped] = useState(false);
  const [completionVisible, setCompletionVisible] = useState(false);
  const [ctaVisible, setCtaVisible] = useState(false);

  const startXRef = useRef(0);
  const activePointerRef = useRef<number | null>(null);
  const gestureRef = useRef<HTMLDivElement>(null);
  const hintSkipRef = useRef<HTMLSpanElement>(null);
  const hintExecRef = useRef<HTMLSpanElement>(null);

  const skipTintOpacity = isDragging ? Math.min(1, (-dragX) / 80) : 0;
  const execTintOpacity = isDragging ? Math.min(1, dragX / 80) : 0;

  let tx = isDragging ? dragX : 0;
  let rot = isDragging ? Math.max(-MAX_ROTATE, Math.min(MAX_ROTATE, dragX * 0.08)) : 0;
  let cardTransition = isDragging ? "none" : swipePhase === "idle" ? "transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1)" : "none";

  if (swipePhase === "exit-left") {
    tx = -520; rot = -18;
    cardTransition = "transform 280ms ease-in";
  }
  if (swipePhase === "exit-right") {
    tx = 520; rot = 18;
    cardTransition = "transform 280ms ease-in";
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    if (swipePhase !== "idle" || swiped) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    activePointerRef.current = e.pointerId;
    startXRef.current = e.clientX;
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || e.pointerId !== activePointerRef.current) return;
    const dx = e.clientX - startXRef.current;
    setDragX(dx);
    // Update hint colors directly
    if (hintSkipRef.current) {
      hintSkipRef.current.style.color = dx < -SWIPE_THRESHOLD
        ? "var(--redo-danger)"
        : "var(--redo-text-tertiary)";
    }
    if (hintExecRef.current) {
      hintExecRef.current.style.color = dx > SWIPE_THRESHOLD
        ? "var(--redo-brand)"
        : "var(--redo-text-tertiary)";
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging || e.pointerId !== activePointerRef.current) return;
    activePointerRef.current = null;
    setIsDragging(false);
    const dx = e.clientX - startXRef.current;

    if (dx > SWIPE_THRESHOLD) {
      triggerCompletion("exit-right");
    } else if (dx < -SWIPE_THRESHOLD) {
      triggerCompletion("exit-left");
    } else {
      setDragX(0);
      if (hintSkipRef.current) hintSkipRef.current.style.color = "var(--redo-text-tertiary)";
      if (hintExecRef.current) hintExecRef.current.style.color = "var(--redo-text-tertiary)";
    }
  };

  const triggerCompletion = (dir: "exit-left" | "exit-right") => {
    setSwiped(true);
    setSwipePhase(dir);
    setDragX(0);
    setTimeout(() => {
      setCompletionVisible(true);
      setTimeout(() => setCtaVisible(true), 2000);
    }, 320);
  };

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        touchAction: "none",
      }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* Top bar */}
      <div style={{ padding: "14px 16px 0", flexShrink: 0 }}>
        <div style={{ height: 44 }} /> {/* Spacer where skip would be */}
        <ProgressBar pct={100} />
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          padding: "20px 16px 0",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <StepLabel step={3} />
        <StepTitle text="이렇게 꺼내줄게요" />
        <StepSub text={"저장한 레퍼런스를 스와이프해서\n실행하거나 건너뛸 수 있어요."} />

        {/* Hint row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 10,
            paddingLeft: 4,
            paddingRight: 4,
            flexShrink: 0,
          }}
        >
          <span
            ref={hintSkipRef}
            style={{
              fontSize: "var(--text-caption)",
              fontWeight: "var(--font-weight-regular)",
              color: "var(--redo-text-tertiary)",
              fontFamily: FONT,
              lineHeight: 1,
              transition: "color 100ms ease",
            }}
          >
            ← 건너뜀
          </span>
          <span
            ref={hintExecRef}
            style={{
              fontSize: "var(--text-caption)",
              fontWeight: "var(--font-weight-regular)",
              color: "var(--redo-text-tertiary)",
              fontFamily: FONT,
              lineHeight: 1,
              transition: "color 100ms ease",
            }}
          >
            실행하기 →
          </span>
        </div>

        {/* Swipe card area */}
        <div
          style={{
            flex: 1,
            position: "relative",
            minHeight: 0,
            flexShrink: 1,
          }}
        >
          {/* The swipeable card */}
          <div
            onPointerDown={handlePointerDown}
            style={{
              position: "absolute",
              inset: 0,
              transform: `translateX(${tx}px) rotate(${rot}deg)`,
              transformOrigin: "center bottom",
              transition: cardTransition,
              cursor: swiped ? "default" : isDragging ? "grabbing" : "grab",
              userSelect: "none",
              willChange: "transform",
              zIndex: 2,
            }}
          >
            <div
              style={{
                background: "var(--redo-bg-primary)",
                borderRadius: "var(--radius-card)",
                border: "0.5px solid var(--redo-border)",
                boxShadow: "0 4px 24px rgba(0,0,0,0.10)",
                overflow: "hidden",
                height: "100%",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* Thumbnail */}
              <div
                style={{
                  height: 120,
                  flexShrink: 0,
                  background: "linear-gradient(135deg, var(--redo-brand) 0%, var(--redo-brand-dark) 100%)",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {/* Grid pattern */}
                <svg
                  style={{ position: "absolute", inset: 0, opacity: 0.12 }}
                  width="100%"
                  height="100%"
                >
                  <defs>
                    <pattern id="ob-grid" width="24" height="24" patternUnits="userSpaceOnUse">
                      <path d="M 24 0 L 0 0 0 24" fill="none" stroke="white" strokeWidth="0.5" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#ob-grid)" />
                </svg>

                {/* Centered icon */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="3" width="18" height="18" rx="3" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" />
                    <path d="M3 8h18M8 3v5" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" strokeLinecap="round" />
                    <circle cx="9" cy="13" r="2" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" />
                    <path d="M13 11h5M13 15h5" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  <p
                    style={{
                      fontSize: "var(--text-micro)",
                      fontWeight: "var(--font-weight-regular)",
                      color: "rgba(255,255,255,0.65)",
                      fontFamily: FONT,
                      margin: 0,
                      lineHeight: 1,
                    }}
                  >
                    방금 저장한 레퍼런스
                  </p>
                </div>

                {/* Skip tint */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "var(--redo-swipe-tint-left)",
                    opacity: skipTintOpacity,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-start",
                    padding: "0 16px",
                    pointerEvents: "none",
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: "var(--font-weight-medium)",
                      color: "var(--redo-danger)",
                      fontFamily: FONT,
                      border: "1.5px solid var(--redo-danger)",
                      borderRadius: 6,
                      padding: "2px 8px",
                      transform: "rotate(-10deg)",
                      display: "inline-block",
                      lineHeight: 1.4,
                    }}
                  >
                    건너뜀
                  </span>
                </div>

                {/* Exec tint */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "var(--redo-swipe-tint-right)",
                    opacity: execTintOpacity,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    padding: "0 16px",
                    pointerEvents: "none",
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: "var(--font-weight-medium)",
                      color: "var(--redo-brand)",
                      fontFamily: FONT,
                      border: "1.5px solid var(--redo-brand)",
                      borderRadius: 6,
                      padding: "2px 8px",
                      transform: "rotate(10deg)",
                      display: "inline-block",
                      lineHeight: 1.4,
                    }}
                  >
                    실행 ✓
                  </span>
                </div>

                {/* Project tag */}
                <div style={{ position: "absolute", top: 8, left: 10 }}>
                  <span
                    style={{
                      background: "rgba(255,255,255,0.22)",
                      color: "#fff",
                      fontSize: "var(--text-micro)",
                      fontWeight: "var(--font-weight-medium)",
                      fontFamily: FONT,
                      borderRadius: "var(--radius-chip)",
                      padding: "2px 9px",
                      lineHeight: 1.5,
                      backdropFilter: "blur(4px)",
                    }}
                  >
                    내 프로젝트
                  </span>
                </div>
              </div>

              {/* Card body */}
              <div style={{ flex: 1, padding: "10px 12px 12px", display: "flex", flexDirection: "column", gap: 0 }}>
                <p
                  style={{
                    fontSize: "var(--text-card-title)",
                    fontWeight: "var(--font-weight-medium)",
                    color: "var(--redo-text-primary)",
                    fontFamily: FONT,
                    margin: 0,
                    marginBottom: 8,
                    lineHeight: 1.4,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {savedCard.title}
                </p>

                {savedCard.chips.length > 0 && (
                  <div style={{ display: "flex", gap: 5, marginBottom: 8, flexWrap: "wrap" }}>
                    {savedCard.chips.slice(0, 2).map((chip) => (
                      <span
                        key={chip}
                        style={{
                          fontSize: "var(--text-micro)",
                          fontWeight: "var(--font-weight-regular)",
                          color: "var(--redo-text-secondary)",
                          fontFamily: FONT,
                          background: "var(--redo-bg-secondary)",
                          borderRadius: "var(--radius-chip)",
                          padding: "2px 8px",
                          border: "0.5px solid var(--redo-border)",
                          lineHeight: 1.5,
                        }}
                      >
                        {chip}
                      </span>
                    ))}
                  </div>
                )}

                {/* Context box */}
                <div
                  style={{
                    background: "var(--redo-context-bg)",
                    borderRadius: "var(--radius-context)",
                    padding: "6px 8px 7px",
                    flex: 1,
                  }}
                >
                  <p
                    style={{
                      fontSize: "var(--text-context-label)",
                      fontWeight: "var(--font-weight-medium)",
                      color: "var(--redo-context-label)",
                      fontFamily: FONT,
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                      margin: 0,
                      marginBottom: 3,
                      lineHeight: 1.3,
                    }}
                  >
                    저장 이유
                  </p>
                  <p
                    style={{
                      fontSize: "var(--text-caption)",
                      fontWeight: "var(--font-weight-regular)",
                      color: "var(--redo-context-text)",
                      fontFamily: FONT,
                      margin: 0,
                      lineHeight: 1.5,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {savedCard.reason}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Gesture hint (finger icon) */}
          <div
            ref={gestureRef}
            style={{
              position: "absolute",
              bottom: 24,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 5,
              pointerEvents: "none",
              opacity: swiped || isDragging ? 0 : 1,
              transition: "opacity 200ms ease",
              animation: "ob3-gesture 2s ease-in-out infinite",
            }}
          >
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path
                d="M10 14V8a2 2 0 114 0v6m0 0V7a2 2 0 114 0v7m0 0V9a2 2 0 114 0v6m0 0v-3a2 2 0 114 0v5c0 4-2.5 6-6 6H12c-2.5 0-4.5-1.5-5.5-3L4 16a1.8 1.8 0 013-1.5L10 17"
                stroke="var(--redo-brand)"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* Bottom section */}
        <div
          style={{
            flexShrink: 0,
            padding: "14px 0 28px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
            minHeight: 88,
          }}
        >
          {completionVisible ? (
            <p
              style={{
                fontSize: "var(--text-body)",
                fontWeight: "var(--font-weight-medium)",
                color: "var(--redo-success)",
                fontFamily: FONT,
                margin: 0,
                textAlign: "center",
                lineHeight: 1.4,
                animation: "ob3-fade-up 350ms ease-out both",
              }}
            >
              완벽해요! 이제 ReDo를 시작해봐요 🎉
            </p>
          ) : (
            <p
              style={{
                fontSize: "var(--text-caption)",
                fontWeight: "var(--font-weight-regular)",
                color: "var(--redo-text-tertiary)",
                fontFamily: FONT,
                margin: 0,
                textAlign: "center",
                lineHeight: 1.4,
              }}
            >
              카드를 좌우로 스와이프해봐요
            </p>
          )}

          {ctaVisible && (
            <div style={{ animation: "ob3-fade-up 350ms ease-out both" }}>
              <CTAButton label="ReDo 시작하기" onClick={onCTA} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Login Screen (mock) ────────────────────────────────────────────────────────

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px 48px",
        gap: 0,
      }}
    >
      {/* Logo */}
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 18,
          background: "linear-gradient(145deg, var(--redo-brand) 0%, var(--redo-brand-dark) 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 20,
          boxShadow: "0 4px 20px rgba(127,119,221,0.35)",
        }}
      >
        <svg width="34" height="34" viewBox="0 0 28 28" fill="none">
          <path
            d="M7 8h9a5 5 0 010 10H7V8z"
            stroke="#fff"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M7 18l6 5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </div>

      <p
        style={{
          fontSize: 22,
          fontWeight: "var(--font-weight-medium)",
          color: "var(--redo-text-primary)",
          fontFamily: FONT,
          margin: 0,
          marginBottom: 10,
          lineHeight: 1.3,
          textAlign: "center",
        }}
      >
        ReDo에 오신 걸
        <br />
        환영해요
      </p>
      <p
        style={{
          fontSize: "var(--text-body)",
          fontWeight: "var(--font-weight-regular)",
          color: "var(--redo-text-secondary)",
          fontFamily: FONT,
          margin: 0,
          marginBottom: 40,
          lineHeight: 1.6,
          textAlign: "center",
        }}
      >
        계속하려면 로그인이 필요해요
      </p>

      {/* Login buttons */}
      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
        {/* Apple */}
        <button
          onClick={onLogin}
          style={{
            width: "100%",
            height: 48,
            borderRadius: 12,
            background: "#000",
            color: "#fff",
            border: "none",
            cursor: "pointer",
            fontSize: "var(--text-body)",
            fontWeight: "var(--font-weight-medium)",
            fontFamily: FONT,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            WebkitTapHighlightColor: "transparent",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
          </svg>
          Apple로 계속하기
        </button>

        {/* Email */}
        <button
          onClick={onLogin}
          style={{
            width: "100%",
            height: 48,
            borderRadius: 12,
            background: "var(--redo-bg-primary)",
            color: "var(--redo-text-primary)",
            border: "0.5px solid var(--redo-border)",
            cursor: "pointer",
            fontSize: "var(--text-body)",
            fontWeight: "var(--font-weight-regular)",
            fontFamily: FONT,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            WebkitTapHighlightColor: "transparent",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
              stroke="var(--redo-text-secondary)"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M22 6l-10 7L2 6"
              stroke="var(--redo-text-secondary)"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          이메일로 계속하기
        </button>
      </div>

      <p
        style={{
          fontSize: "var(--text-micro)",
          fontWeight: "var(--font-weight-regular)",
          color: "var(--redo-text-tertiary)",
          fontFamily: FONT,
          margin: 0,
          marginTop: 24,
          textAlign: "center",
          lineHeight: 1.6,
        }}
      >
        계속하면 서비스 이용약관 및
        <br />
        개인정보처리방침에 동의하는 것으로 간주해요
      </p>
    </div>
  );
}

// ─── Platform Connection Screen ────────────────────────────────────────────────

function PlatformScreen({
  selectedPlatforms,
  onToggle,
  onConnect,
  onSkip,
}: {
  selectedPlatforms: Set<string>;
  onToggle: (id: string) => void;
  onConnect: () => void;
  onSkip: () => void;
}) {
  const hasSelection = selectedPlatforms.size > 0;

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        padding: "28px 16px 32px",
        overflow: "hidden",
      }}
    >
      <p
        style={{
          fontSize: "var(--text-context-label)",
          fontWeight: "var(--font-weight-regular)",
          color: "var(--redo-brand-mid)",
          fontFamily: FONT,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          margin: 0,
          marginBottom: 10,
          lineHeight: 1.4,
        }}
      >
        로그인 완료
      </p>

      <p
        style={{
          fontSize: 20,
          fontWeight: "var(--font-weight-medium)",
          color: "var(--redo-text-primary)",
          fontFamily: FONT,
          margin: 0,
          marginBottom: 8,
          lineHeight: 1.3,
        }}
      >
        어디에 저장하고 있어요?
      </p>
      <p
        style={{
          fontSize: 13,
          fontWeight: "var(--font-weight-regular)",
          color: "var(--redo-text-secondary)",
          fontFamily: FONT,
          margin: 0,
          marginBottom: 28,
          lineHeight: 1.6,
        }}
      >
        연결하면 기존 레퍼런스를 바로 가져올 수 있어요.
      </p>

      {/* Platform cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
        {PLATFORMS.map((p) => {
          const selected = selectedPlatforms.has(p.id);
          return (
            <button
              key={p.id}
              onClick={() => onToggle(p.id)}
              style={{
                height: 72,
                borderRadius: "var(--radius-card)",
                background: selected ? "var(--redo-brand-light)" : "var(--redo-bg-primary)",
                border: selected
                  ? "1.5px solid var(--redo-brand)"
                  : "0.5px solid var(--redo-border)",
                display: "flex",
                alignItems: "center",
                paddingLeft: 16,
                paddingRight: 16,
                gap: 14,
                cursor: "pointer",
                textAlign: "left",
                transition: "all 160ms ease",
                WebkitTapHighlightColor: "transparent",
                boxShadow: selected ? "0 0 0 1px var(--redo-brand-mid)" : "none",
              }}
            >
              {/* Icon */}
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: selected ? "#fff" : "var(--redo-bg-secondary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  transition: "background 160ms ease",
                }}
              >
                {p.icon}
              </div>

              {/* Text */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
                <p
                  style={{
                    fontSize: "var(--text-body)",
                    fontWeight: "var(--font-weight-medium)",
                    color: selected ? "var(--redo-brand-dark)" : "var(--redo-text-primary)",
                    fontFamily: FONT,
                    margin: 0,
                    lineHeight: 1.3,
                    transition: "color 160ms ease",
                  }}
                >
                  {p.name}
                </p>
                <p
                  style={{
                    fontSize: "var(--text-caption)",
                    fontWeight: "var(--font-weight-regular)",
                    color: selected ? "var(--redo-context-label)" : "var(--redo-text-secondary)",
                    fontFamily: FONT,
                    margin: 0,
                    lineHeight: 1.3,
                    transition: "color 160ms ease",
                  }}
                >
                  {p.desc}
                </p>
              </div>

              {/* Checkmark */}
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: selected ? "var(--redo-brand)" : "transparent",
                  border: selected ? "none" : "1.5px solid var(--redo-border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  transition: "all 160ms ease",
                }}
              >
                {selected && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M5 13l4 4L19 7"
                      stroke="#fff"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* CTAs */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 24, flexShrink: 0 }}>
        <CTAButton
          label={hasSelection ? `${selectedPlatforms.size}개 연결하기` : "연결하기"}
          onClick={onConnect}
          disabled={!hasSelection}
        />
        <button
          onClick={onSkip}
          style={{
            width: "100%",
            height: 44,
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: "var(--text-body)",
            fontWeight: "var(--font-weight-regular)",
            color: "var(--redo-text-secondary)",
            fontFamily: FONT,
            lineHeight: 1,
            WebkitTapHighlightColor: "transparent",
          }}
        >
          나중에 연결할게요
        </button>
      </div>
    </div>
  );
}

// ─── Main Onboarding Screen ────────────────────────────────────────────────────

type Phase = "step1" | "step2" | "step3" | "login" | "platform";

interface OnboardingScreenProps {
  onComplete: () => void;
  forceMode?: boolean;
}

export function OnboardingScreen({ onComplete, forceMode }: OnboardingScreenProps) {
  const [phase, setPhase] = useState<Phase>("step1");
  const [slideKey, setSlideKey] = useState(0);

  // Step 2 state
  const [urlInput, setUrlInput] = useState("");
  const [savedReason, setSavedReason] = useState("");
  const [selectedChips, setSelectedChips] = useState<Set<string>>(new Set());
  const [thumbnailVisible, setThumbnailVisible] = useState(false);

  // Saved card for Step 3 demo
  const [savedCard, setSavedCard] = useState<SavedCardData>({
    title: "Dribbble — iOS 앱 타이포그래피 레퍼런스",
    reason: "타이포 시스템 참고용",
    chips: [],
  });

  // Platform state
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(new Set());

  const advanceTo = (next: Phase) => {
    setSlideKey((k) => k + 1);
    setPhase(next);
  };

  const handleUrlChange = (val: string) => {
    setUrlInput(val);
    if (val.length > 5) {
      setTimeout(() => setThumbnailVisible(true), 500);
    } else {
      setThumbnailVisible(false);
    }
  };

  const handleToggleChip = (chip: string) => {
    setSelectedChips((prev) => {
      const next = new Set(prev);
      if (next.has(chip)) next.delete(chip);
      else next.add(chip);
      return next;
    });
  };

  const handleSave = () => {
    const chips = Array.from(selectedChips);
    const domain = urlInput.replace(/https?:\/\//, "").split("/")[0];
    setSavedCard({
      title:
        urlInput.length > 5
          ? `${domain} 레퍼런스`
          : "Dribbble — iOS 타이포그래피 레퍼런스",
      reason: savedReason || "타이포 시스템 참고용으로 저장했어요",
      chips: chips.length > 0 ? chips : ["타이포 참고"],
    });
    advanceTo("step3");
  };

  const handleStep3CTA = () => {
    if (!forceMode) {
      localStorage.setItem("redo_onboarded", "true");
    }
    advanceTo("login");
  };

  const handleLogin = () => {
    advanceTo("platform");
  };

  const handlePlatformDone = () => {
    onComplete();
  };

  const togglePlatform = (id: string) => {
    setSelectedPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Progress bar pct per phase (only for steps 1–3)
  const progressPct =
    phase === "step1" ? 33 : phase === "step2" ? 66 : phase === "step3" ? 100 : 100;

  const showProgress = phase === "step1" || phase === "step2" || phase === "step3";

  return (
    <div
      style={{
        width: 375,
        height: 812,
        background: "var(--redo-bg-primary)",
        fontFamily: FONT,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
    >
      {/* Status bar */}
      <div style={{ background: "var(--redo-bg-primary)", flexShrink: 0 }}>
        <StatusBar />
      </div>

      {/* Phase content — key triggers slide animation on phase change */}
      <div
        key={slideKey}
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          animation:
            slideKey > 0
              ? "ob3-slide-in 280ms cubic-bezier(0.25, 0.46, 0.45, 0.94) both"
              : "none",
        }}
      >
        {phase === "step1" && (
          <Step1Screen
            onNext={() => advanceTo("step2")}
            onSkip={() => advanceTo("step2")}
          />
        )}

        {phase === "step2" && (
          <Step2Screen
            urlInput={urlInput}
            onUrlChange={handleUrlChange}
            thumbnailVisible={thumbnailVisible}
            selectedChips={selectedChips}
            onToggleChip={handleToggleChip}
            savedReason={savedReason}
            onReasonChange={setSavedReason}
            onSave={handleSave}
            onSkip={() => advanceTo("step3")}
          />
        )}

        {phase === "step3" && (
          <Step3Screen savedCard={savedCard} onCTA={handleStep3CTA} />
        )}

        {phase === "login" && <LoginScreen onLogin={handleLogin} />}

        {phase === "platform" && (
          <PlatformScreen
            selectedPlatforms={selectedPlatforms}
            onToggle={togglePlatform}
            onConnect={handlePlatformDone}
            onSkip={handlePlatformDone}
          />
        )}
      </div>
    </div>
  );
}
