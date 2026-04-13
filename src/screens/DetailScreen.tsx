import { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react";
import { StatusBar } from "../components/StatusBar";
import { ImageWithFallback } from "../components/ImageWithFallback";
import { type CardData } from "../types";
import { extractColors, type ExtractedColor } from "../lib/colorExtractor";

// ─── Keyframe injection ───────────────────────────────────────────────────────

const DETAIL_STYLE_ID = "redo-detail-keyframes";
if (typeof document !== "undefined" && !document.getElementById(DETAIL_STYLE_ID)) {
  const s = document.createElement("style");
  s.id = DETAIL_STYLE_ID;
  s.textContent = `
    @keyframes redo-dot-bounce {
      0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
      40% { transform: scale(1); opacity: 1; }
    }
  `;
  document.head.appendChild(s);
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FONT =
  "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Noto Sans KR', system-ui, sans-serif";

const HERO_CONTAINER_H = 150;   // fixed container height
const HERO_IMAGE_H = 200;       // taller image to allow upward travel
const PARALLAX_RATIO = 0.5;
const MAX_TRANSLATE = -50;      // cap so image doesn't run out of bounds
const MINI_HEADER_THRESHOLD = 130; // scrollY at which mini header appears

// ─── Related Card ─────────────────────────────────────────────────────────────

function RelatedCard({
  item,
  onTap,
}: {
  item: CardData;
  onTap: (card: CardData) => void;
}) {
  const [pressed, setPressed] = useState(false);

  return (
    <div
      onClick={() => onTap(item)}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      style={{
        width: 80,
        flexShrink: 0,
        borderRadius: 8,
        border: "0.5px solid var(--redo-border)",
        background: "var(--redo-bg-primary)",
        overflow: "hidden",
        boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
        cursor: "pointer",
        transform: pressed ? "scale(0.95)" : "scale(1)",
        transition: pressed ? "transform 60ms ease-in" : "transform 100ms ease-out",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      <div style={{ height: 48, width: "100%", overflow: "hidden" }}>
        <ImageWithFallback
          src={item.image}
          alt={item.title}
          style={{
            width: "100%", height: "100%",
            objectFit: "cover", display: "block", pointerEvents: "none",
          }}
        />
      </div>
      <div style={{ padding: "5px 6px 6px" }}>
        <p
          style={{
            fontSize: 8,
            fontWeight: "var(--font-weight-medium)",
            color: "var(--redo-text-primary)",
            margin: 0, lineHeight: 1.4, fontFamily: FONT,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {item.title}
        </p>
      </div>
    </div>
  );
}

// ─── Detail Screen ────────────────────────────────────────────────────────────

interface DetailScreenProps {
  card: CardData | null;
  allCards?: CardData[];
  backLabel: string;
  onBack: () => void;
  onRelatedTap?: (card: CardData) => void;
  executedCardIds?: Set<number>;
  onExecute?: (id: number) => void;
  onLater?: (id: number) => void;
  onEditPress?: () => void;
}

export function DetailScreen({
  card,
  allCards = [],
  backLabel,
  onBack,
  onRelatedTap,
  executedCardIds,
  onExecute,
  onLater,
  onEditPress,
}: DetailScreenProps) {
  // Local executed state REMOVED — derived from global executedCardIds
  // ── Color palette state ──
  const [paletteColors, setPaletteColors] = useState<ExtractedColor[]>([]);
  const [paletteLoading, setPaletteLoading] = useState(false);
  const [copiedHex, setCopiedHex] = useState<string | null>(null);
  const [scaledHex, setScaledHex] = useState<string | null>(null);

  // ── Parallax & header fade state (using refs to avoid re-renders on scroll) ──
  const scrollRef = useRef<HTMLDivElement>(null);
  const heroImgRef = useRef<HTMLImageElement & HTMLDivElement>(null);
  const miniHeaderRef = useRef<HTMLDivElement>(null);
  const rafPending = useRef(false);
  const lastScrollY = useRef(0);

  // Apply parallax + mini-header visibility — called inside rAF
  const applyScrollEffects = useCallback((scrollY: number) => {
    // Hero parallax
    if (heroImgRef.current) {
      const raw = scrollY * -PARALLAX_RATIO;
      // Center offset: image is taller by (HERO_IMAGE_H - HERO_CONTAINER_H) = 50px
      // So neutral offset is -(50/2) = -25px to center it at scroll 0
      const centerOffset = -((HERO_IMAGE_H - HERO_CONTAINER_H) / 2);
      const translateY = Math.max(MAX_TRANSLATE, centerOffset + raw * 1);
      heroImgRef.current.style.transform = `translateY(${translateY}px)`;
    }

    // Mini header fade
    if (miniHeaderRef.current) {
      const progress = Math.min(
        1,
        Math.max(0, (scrollY - MINI_HEADER_THRESHOLD + 20) / 20)
      );
      miniHeaderRef.current.style.opacity = String(progress);
      miniHeaderRef.current.style.pointerEvents = progress > 0 ? "auto" : "none";
    }
  }, []);

  // Reset scroll, hero parallax and mini-header BEFORE browser paint when card changes.
  // useLayoutEffect fires synchronously after DOM mutations but before paint,
  // guaranteeing the new card always enters at the top with no flash of old position.
  useLayoutEffect(() => {
    // 1. Scroll container → top immediately
    if (scrollRef.current) scrollRef.current.scrollTop = 0;

    // 2. Mini header → hidden immediately (opacity driven by scroll position)
    if (miniHeaderRef.current) {
      miniHeaderRef.current.style.opacity = "0";
      miniHeaderRef.current.style.pointerEvents = "none";
    }

    // 3. Hero image → centered position (same as scrollY=0 state)
    if (heroImgRef.current) {
      const centerOffset = -((HERO_IMAGE_H - HERO_CONTAINER_H) / 2);
      heroImgRef.current.style.transform = `translateY(${centerOffset}px)`;
    }
  }, [card?.id]);

  // Scroll listener — throttled with rAF (kept as useEffect since it needs addEventListener)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onScroll = () => {
      lastScrollY.current = el.scrollTop;
      if (rafPending.current) return;
      rafPending.current = true;
      requestAnimationFrame(() => {
        applyScrollEffects(lastScrollY.current);
        rafPending.current = false;
      });
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    // Apply initial state
    applyScrollEffects(0);

    return () => el.removeEventListener("scroll", onScroll);
  }, [applyScrollEffects, card?.id]);

  // Extract colors when card image changes
  useEffect(() => {
    setPaletteColors([]);
    setPaletteLoading(false);
    setCopiedHex(null);
    if (!card?.image) return;

    let cancelled = false;
    setPaletteLoading(true);
    extractColors(card.image).then((colors) => {
      if (cancelled) return;
      setPaletteColors(colors);
      setPaletteLoading(false);
    });
    return () => { cancelled = true; };
  }, [card?.image]);

  // Related cards logic
  const relatedCards = card
    ? allCards.filter((c) => c.projectTag === card.projectTag && c.id !== card.id)
    : [];
  const displayedRelated =
    relatedCards.length > 0
      ? relatedCards
      : allCards.filter((c) => c.id !== card?.id).slice(0, 3);

  if (!card) return null;

  // Derive effective execution state — global set OR card's own statusDot
  const isExecuted = (executedCardIds?.has(card.id) ?? false) || card.statusDot === "실행완료";
  const isCompleted = isExecuted;

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

      {/* ── Mini sticky header (fades in on scroll) ── */}
      <div
        ref={miniHeaderRef}
        style={{
          position: "absolute",
          top: 44, // below status bar (StatusBar height ≈ 44px)
          left: 0,
          right: 0,
          height: 44,
          background: "rgba(255,255,255,0.97)",
          backdropFilter: "blur(10px)",
          borderBottom: "0.5px solid var(--redo-border)",
          display: "flex",
          alignItems: "center",
          paddingLeft: 8,
          paddingRight: 16,
          opacity: 0,
          pointerEvents: "none",
          transition: "opacity 150ms ease",
          zIndex: 50,
          gap: 4,
        }}
      >
        {/* Back button */}
        <button
          onClick={onBack}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 3,
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "0 8px",
            minHeight: 44,
            minWidth: 44,
            flexShrink: 0,
            WebkitTapHighlightColor: "transparent",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path
              d="M19 12H5M5 12l7 7M5 12l7-7"
              stroke="var(--redo-text-secondary)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span
            style={{
              fontSize: "var(--text-caption)",
              fontWeight: "var(--font-weight-regular)",
              color: "var(--redo-text-secondary)",
              lineHeight: 1.3,
              fontFamily: FONT,
              whiteSpace: "nowrap",
            }}
          >
            {backLabel}
          </span>
        </button>

        {/* Centered title */}
        <p
          style={{
            flex: 1,
            fontSize: "var(--text-card-title)",
            fontWeight: "var(--font-weight-medium)",
            color: "var(--redo-text-primary)",
            margin: 0,
            textAlign: "center",
            lineHeight: 1.3,
            fontFamily: FONT,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            paddingRight: 56, // offset for back button width to keep centering
          }}
        >
          {card.title}
        </p>
      </div>

      {/* ── Scrollable body ── */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          scrollbarWidth: "none",
          paddingBottom: 90,
        }}
      >
        {/* Back nav (always visible behind mini header at top) */}
        <div
          style={{
            paddingLeft: 16, paddingRight: 16,
            paddingTop: 6, paddingBottom: 10,
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}
        >
          <button
            onClick={onBack}
            style={{
              display: "flex", alignItems: "center", gap: 4,
              background: "none", border: "none", cursor: "pointer",
              padding: "6px 0", minHeight: 44, minWidth: 44,
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path
                d="M19 12H5M5 12l7 7M5 12l7-7"
                stroke="var(--redo-text-secondary)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span
              style={{
                fontSize: "var(--text-caption)",
                fontWeight: "var(--font-weight-regular)",
                color: "var(--redo-text-secondary)",
                lineHeight: 1.3,
                fontFamily: FONT,
              }}
            >
              {backLabel}
            </span>
          </button>

          {/* Edit button */}
          {onEditPress && (
            <button
              onClick={onEditPress}
              style={{
                display: "flex", alignItems: "center", gap: 4,
                background: "none", border: "none", cursor: "pointer",
                padding: "6px 0", minHeight: 44,
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path
                  d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"
                  stroke="var(--redo-text-secondary)" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round"
                />
                <path
                  d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
                  stroke="var(--redo-text-secondary)" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round"
                />
              </svg>
              <span style={{ fontSize: 13, color: "var(--redo-text-secondary)", fontFamily: FONT }}>
                편집
              </span>
            </button>
          )}
        </div>

        {/* ── Hero image with parallax ── */}
        <div
          style={{
            position: "relative",
            width: "100%",
            height: HERO_CONTAINER_H,
            overflow: "hidden",     // clips the taller image
            flexShrink: 0,
          }}
        >
          {/* Actual image — taller than container, moved by parallax */}
          <div
            ref={heroImgRef as React.RefObject<HTMLDivElement>}
            style={{
              width: "100%",
              height: HERO_IMAGE_H,
              // Initial centering: shift up by half the extra height
              transform: `translateY(-${(HERO_IMAGE_H - HERO_CONTAINER_H) / 2}px)`,
              willChange: "transform",
            }}
          >
            <ImageWithFallback
              src={card.image}
              alt={card.title}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          </div>

          {/* Gradient scrim — stays fixed within container, not part of parallax */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(160deg, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0) 55%)",
              pointerEvents: "none",
            }}
          />

          {/* Project tag — top left */}
          <div style={{ position: "absolute", top: 10, left: 12 }}>
            <span
              style={{
                fontSize: "var(--text-context-label)",
                fontWeight: "var(--font-weight-medium)",
                color: "#fff",
                background: "var(--redo-brand)",
                borderRadius: "var(--radius-chip)",
                padding: "3px 10px",
                lineHeight: 1.5,
                fontFamily: FONT,
                display: "inline-block",
              }}
            >
              {card.projectTag}
            </span>
          </div>

          {/* Status tag — top right */}
          <div style={{ position: "absolute", top: 10, right: 12 }}>
            <span
              style={{
                fontSize: "var(--text-context-label)",
                fontWeight: "var(--font-weight-medium)",
                color: isCompleted ? "var(--redo-success)" : "var(--redo-brand)",
                background: isCompleted
                  ? "rgba(29,158,117,0.12)"
                  : "rgba(238,237,254,0.92)",
                borderRadius: "var(--radius-chip)",
                padding: "3px 10px",
                lineHeight: 1.5,
                fontFamily: FONT,
                border: isCompleted
                  ? "0.5px solid rgba(29,158,117,0.3)"
                  : "0.5px solid rgba(106,112,255,0.35)",
                display: "inline-block",
                backdropFilter: "blur(4px)",
                transition: "all 150ms ease",
              }}
            >
              {isCompleted ? "실행완료" : "미실행"}
            </span>
          </div>
        </div>

        {/* ── Content body ── */}
        <div style={{ padding: "0 16px" }}>

          {/* Title */}
          <p
            style={{
              fontSize: 15,
              fontWeight: "var(--font-weight-medium)",
              color: "var(--redo-text-primary)",
              margin: 0, marginTop: 14, marginBottom: 10,
              lineHeight: 1.4, fontFamily: FONT,
            }}
          >
            {card.title}
          </p>

          {/* Meta chips */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 14 }}>
            {[card.source, card.daysAgo + " 저장", ...card.chips].map((chip) => (
              <span
                key={chip}
                style={{
                  fontSize: "var(--text-context-label)",
                  fontWeight: "var(--font-weight-regular)",
                  color: "var(--redo-text-secondary)",
                  background: "var(--redo-bg-secondary)",
                  borderRadius: "var(--radius-chip)",
                  padding: "3px 10px",
                  lineHeight: 1.5,
                  border: "0.5px solid var(--redo-border)",
                  fontFamily: FONT,
                }}
              >
                {chip}
              </span>
            ))}
          </div>

          {/* Divider */}
          <div style={{ height: "0.5px", background: "var(--redo-border)", marginBottom: 14 }} />

          {/* Context box */}
          <div
            style={{
              background: "var(--redo-context-bg)",
              borderRadius: 10,
              padding: "10px 12px 12px",
              marginBottom: 20,
            }}
          >
            <p
              style={{
                fontSize: "var(--text-context-label)",
                fontWeight: "var(--font-weight-medium)",
                color: "var(--redo-context-label)",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                margin: 0, marginBottom: 5,
                lineHeight: 1.3, fontFamily: FONT,
              }}
            >
              저장 이유
            </p>
            <p
              style={{
                fontSize: "var(--text-caption)",
                fontWeight: "var(--font-weight-regular)",
                color: "var(--redo-context-text)",
                margin: 0, lineHeight: 1.6, fontFamily: FONT,
              }}
            >
              {card.savedReason}
            </p>
          </div>

          {/* ── Color Palette ── */}
          {card.image && (paletteLoading || paletteColors.length > 0) && (
            <div
              style={{
                background: "var(--redo-bg-secondary, #F8F7F4)",
                borderRadius: 10,
                padding: 12,
                marginBottom: 20,
              }}
            >
              <p
                style={{
                  fontSize: 10,
                  fontWeight: "var(--font-weight-medium)",
                  color: "var(--redo-context-label)",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  margin: 0,
                  marginBottom: paletteLoading ? 0 : 10,
                  lineHeight: 1.3,
                  fontFamily: FONT,
                }}
              >
                컬러 팔레트
              </p>

              {paletteLoading ? (
                /* Loading dots */
                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: "50%",
                        background: "var(--redo-brand)",
                        display: "inline-block",
                        animation: `redo-dot-bounce 1.2s ease-in-out ${i * 0.18}s infinite`,
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {paletteColors.map((color) => {
                    const isScaled = scaledHex === color.hex;
                    return (
                      <div
                        key={color.hex}
                        style={{
                          display: "inline-flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 4,
                          cursor: "pointer",
                        }}
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(color.hex);
                            setCopiedHex(color.hex);
                            setScaledHex(color.hex);
                            setTimeout(() => setScaledHex(null), 300);
                            setTimeout(() => setCopiedHex(null), 1500);
                          } catch {
                            // clipboard not available
                          }
                        }}
                      >
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: "50%",
                            background: color.hex,
                            border: "0.5px solid rgba(0,0,0,0.08)",
                            transform: isScaled ? "scale(1.2)" : "scale(1)",
                            transition: "transform 150ms ease",
                          }}
                        />
                        <span
                          style={{
                            fontSize: 10,
                            color: copiedHex === color.hex ? "var(--redo-brand)" : "#888",
                            fontFamily: "monospace",
                            lineHeight: 1,
                            transition: "color 150ms ease",
                          }}
                        >
                          {copiedHex === color.hex ? "복사됨!" : color.hex.toLowerCase()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Keywords */}
          <div style={{ marginBottom: 24 }}>
            <p
              style={{
                fontSize: "var(--text-context-label)",
                fontWeight: "var(--font-weight-regular)",
                color: "var(--redo-text-tertiary)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                margin: 0, marginBottom: 8,
                lineHeight: 1.3, fontFamily: FONT,
              }}
            >
              시각 키워드
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {card.chips.map((kw) => (
                <span
                  key={kw}
                  style={{
                    fontSize: "var(--text-micro)",
                    fontWeight: "var(--font-weight-regular)",
                    color: "var(--redo-context-text)",
                    background: "var(--redo-context-bg)",
                    borderRadius: "var(--radius-chip)",
                    padding: "4px 12px",
                    lineHeight: 1.5,
                    border: "0.5px solid rgba(106,112,255,0.2)",
                    fontFamily: FONT,
                  }}
                >
                  {kw}
                </span>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: "0.5px", background: "var(--redo-border)", marginBottom: 16 }} />

          {/* Related references */}
          {displayedRelated.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <p
                style={{
                  fontSize: "var(--text-context-label)",
                  fontWeight: "var(--font-weight-regular)",
                  color: "var(--redo-text-tertiary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  margin: 0, marginBottom: 10,
                  lineHeight: 1.3, fontFamily: FONT,
                }}
              >
                {relatedCards.length > 0 ? "같은 프로젝트 레퍼런스" : "다른 레퍼런스"}
              </p>
              <div
                style={{
                  display: "flex", gap: 8,
                  overflowX: "auto", scrollbarWidth: "none",
                  marginRight: -16, paddingRight: 16,
                }}
              >
                {displayedRelated.map((item) => (
                  <RelatedCard key={item.id} item={item} onTap={(c) => onRelatedTap?.(c)} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sticky bottom action bar */}
      <div
        style={{
          position: "absolute",
          bottom: 0, left: 0, right: 0,
          background: "rgba(255,255,255,0.97)",
          backdropFilter: "blur(12px)",
          borderTop: "0.5px solid var(--redo-border)",
          padding: "10px 16px 20px",
          display: "flex", gap: 8,
          flexShrink: 0,
        }}
      >
        <button
          onClick={() => card && onLater?.(card.id)}
          style={{
            flex: 1, height: 44, borderRadius: 11,
            background: "var(--redo-bg-secondary)",
            color: "var(--redo-text-secondary)",
            fontSize: "var(--text-body)",
            fontWeight: "var(--font-weight-regular)",
            border: "0.5px solid var(--redo-border)",
            cursor: "pointer", fontFamily: FONT,
            display: "flex", alignItems: "center", justifyContent: "center",
            lineHeight: 1,
          }}
        >
          나중에
        </button>

        <button
          onClick={() => {
            if (!isExecuted && card) {
              onExecute?.(card.id);
            }
          }}
          disabled={isExecuted}
          style={{
            flex: 2, height: 44, borderRadius: 11,
            background: isExecuted ? "var(--redo-success)" : "var(--redo-brand)",
            color: "#fff",
            fontSize: "var(--text-body)",
            fontWeight: "var(--font-weight-medium)",
            border: "none",
            cursor: isExecuted ? "default" : "pointer",
            fontFamily: FONT,
            display: "flex", alignItems: "center", justifyContent: "center",
            gap: 6, lineHeight: 1,
            transition: "background 150ms ease",
          }}
        >
          {isExecuted ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path
                  d="M5 13l4 4L19 7"
                  stroke="white" strokeWidth="2.2"
                  strokeLinecap="round" strokeLinejoin="round"
                />
              </svg>
              실행완료 ✓
            </>
          ) : (
            "실행하기"
          )}
        </button>
      </div>
    </div>
  );
}