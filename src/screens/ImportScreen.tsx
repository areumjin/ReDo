// ─── ImportScreen ──────────────────────────────────────────────────────────────
// CSV / JSON 파일을 드래그&드롭 또는 파일 선택으로 가져오는 화면

import { useState, useRef, useCallback } from "react";
import { StatusBar } from "../components/StatusBar";
import {
  autoDetectAndParse,
  parsePinterestCSV,
  parseNotionCSV,
  parseGenericCSV,
  parseJSON,
  type ParsedCard,
  type PlatformHint,
} from "../utils/importParser";

const FONT =
  "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Noto Sans KR', system-ui, sans-serif";

// ─── Props ────────────────────────────────────────────────────────────────────

interface ImportScreenProps {
  onBack: () => void;
  onImport: (cards: ParsedCard[], projectTag: string) => void;
  existingProjects: string[];
}

// ─── Platform card config ─────────────────────────────────────────────────────

const PLATFORMS: {
  id: PlatformHint;
  label: string;
  color: string;
  bg: string;
  letter: string;
  desc: string;
  sample: string;
}[] = [
  {
    id: "pinterest",
    label: "Pinterest",
    color: "#E60023",
    bg: "#FFF0F1",
    letter: "P",
    desc: "내보내기 → CSV (핀 목록)",
    sample: "sample-pinterest.csv",
  },
  {
    id: "notion",
    label: "Notion",
    color: "#191919",
    bg: "#F5F5F5",
    letter: "N",
    desc: "페이지 내보내기 → CSV",
    sample: "sample-notion.csv",
  },
  {
    id: "generic",
    label: "기타 CSV",
    color: "#6A70FF",
    bg: "#EEEFFE",
    letter: "C",
    desc: "URL, Title, Description 컬럼",
    sample: "sample-generic.json",
  },
  {
    id: "json",
    label: "JSON",
    color: "#F59E0B",
    bg: "#FFFBEB",
    letter: "{ }",
    desc: '{ url, title, description } 배열',
    sample: "sample-generic.json",
  },
];

// ─── Chip ─────────────────────────────────────────────────────────────────────

function Chip({
  label,
  active,
  color,
  onClick,
}: {
  label: string;
  active: boolean;
  color?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        height: 32,
        paddingLeft: 14,
        paddingRight: 14,
        borderRadius: 20,
        border: active ? "none" : "1px solid rgba(0,0,0,0.1)",
        background: active ? (color ?? "var(--redo-brand)") : "#F5F5F7",
        color: active ? "#fff" : "var(--redo-text-secondary)",
        fontSize: 13,
        fontWeight: active ? 600 : 400,
        cursor: "pointer",
        fontFamily: FONT,
        whiteSpace: "nowrap",
        transition: "all 140ms ease",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {label}
    </button>
  );
}

// ─── Preview card ──────────────────────────────────────────────────────────────

function PreviewCard({ card }: { card: ParsedCard }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 0",
        borderBottom: "0.5px solid rgba(0,0,0,0.06)",
      }}
    >
      {/* thumbnail */}
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 8,
          background: "#F0F0F0",
          flexShrink: 0,
          overflow: "hidden",
        }}
      >
        {card.image ? (
          <img
            src={card.image}
            alt={card.title}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
            }}
          >
            🖼
          </div>
        )}
      </div>

      {/* text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            margin: 0,
            fontSize: 13,
            fontWeight: 500,
            color: "var(--redo-text-primary)",
            fontFamily: FONT,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {card.title}
        </p>
        <p
          style={{
            margin: "2px 0 0",
            fontSize: 11,
            color: "var(--redo-text-tertiary)",
            fontFamily: FONT,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {card.savedReason}
        </p>
      </div>

      {/* source badge */}
      <span
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: "var(--redo-text-tertiary)",
          fontFamily: FONT,
          background: "#F0F0F0",
          borderRadius: 4,
          padding: "2px 6px",
          flexShrink: 0,
        }}
      >
        {card.source}
      </span>
    </div>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export function ImportScreen({
  onBack,
  onImport,
  existingProjects,
}: ImportScreenProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformHint>("pinterest");
  const [dragOver, setDragOver] = useState(false);
  const [parsedCards, setParsedCards] = useState<ParsedCard[] | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string>(
    existingProjects[0] ?? "영감"
  );
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const projects = existingProjects.length > 0 ? existingProjects : ["영감"];

  // ── File processing ─────────────────────────────────────────────────────────

  const processFile = useCallback(
    (file: File) => {
      setParseError(null);
      setParsedCards(null);
      setFileName(file.name);

      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result;
        if (typeof text !== "string") {
          setParseError("파일을 읽을 수 없어요.");
          return;
        }

        try {
          let cards: ParsedCard[];
          switch (selectedPlatform) {
            case "pinterest":
              cards = parsePinterestCSV(text);
              break;
            case "notion":
              cards = parseNotionCSV(text);
              break;
            case "json":
              cards = parseJSON(text);
              break;
            case "generic":
            default:
              cards = parseGenericCSV(text);
              break;
          }

          // If selected parser returns nothing, try auto-detect
          if (cards.length === 0) {
            cards = autoDetectAndParse(text, file.name);
          }

          if (cards.length === 0) {
            setParseError(
              "카드를 찾을 수 없어요. 파일 형식을 확인하거나 다른 플랫폼을 선택해 보세요."
            );
          } else {
            setParsedCards(cards);
          }
        } catch (err) {
          setParseError(
            err instanceof Error ? err.message : "파일 파싱 중 오류가 발생했어요."
          );
        }
      };

      reader.onerror = () => {
        setParseError("파일을 읽을 수 없어요.");
      };

      reader.readAsText(file, "utf-8");
    },
    [selectedPlatform]
  );

  // ── Drag & Drop ─────────────────────────────────────────────────────────────

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
      e.target.value = "";
    },
    [processFile]
  );

  // ── Import ──────────────────────────────────────────────────────────────────

  const handleImport = () => {
    if (!parsedCards || parsedCards.length === 0) return;
    setImporting(true);
    setTimeout(() => {
      onImport(parsedCards, selectedProject);
      setImporting(false);
      setDone(true);
    }, 600);
  };

  // ── Reset ───────────────────────────────────────────────────────────────────

  const handleReset = () => {
    setParsedCards(null);
    setFileName(null);
    setParseError(null);
    setDone(false);
  };

  // ── Sample download ─────────────────────────────────────────────────────────

  const handleSampleDownload = () => {
    const platform = PLATFORMS.find((p) => p.id === selectedPlatform);
    if (!platform) return;
    const link = document.createElement("a");
    link.href = `/samples/${platform.sample}`;
    link.download = platform.sample;
    link.click();
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "var(--redo-bg-secondary)",
        fontFamily: FONT,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Status bar */}
      <div style={{ background: "#fff", flexShrink: 0 }}>
        <StatusBar />
      </div>

      {/* Header */}
      <div
        style={{
          background: "#fff",
          borderBottom: "0.5px solid var(--redo-border)",
          display: "flex",
          alignItems: "center",
          height: 52,
          paddingLeft: 4,
          paddingRight: 16,
          flexShrink: 0,
          gap: 4,
        }}
      >
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
          <span style={{ fontSize: 13, color: "var(--redo-text-secondary)", fontFamily: FONT }}>
            뒤로
          </span>
        </button>
        <p
          style={{
            flex: 1,
            fontSize: 16,
            fontWeight: 500,
            color: "var(--redo-text-primary)",
            margin: 0,
            fontFamily: FONT,
            textAlign: "center",
            paddingRight: 52,
          }}
        >
          레퍼런스 가져오기
        </p>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: "auto", scrollbarWidth: "none" }}>

        {/* ── Done state ── */}
        {done && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "60px 24px",
              gap: 16,
              minHeight: "60vh",
            }}
          >
            <div style={{ fontSize: 56 }}>🎉</div>
            <p
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: "var(--redo-text-primary)",
                margin: 0,
                fontFamily: FONT,
                textAlign: "center",
              }}
            >
              {parsedCards?.length}개의 레퍼런스를 가져왔어요!
            </p>
            <p
              style={{
                fontSize: 13,
                color: "var(--redo-text-secondary)",
                margin: 0,
                fontFamily: FONT,
                textAlign: "center",
              }}
            >
              홈과 보관함에서 확인할 수 있어요.
            </p>
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button
                onClick={handleReset}
                style={{
                  height: 44,
                  paddingLeft: 20,
                  paddingRight: 20,
                  borderRadius: 12,
                  border: "1px solid rgba(0,0,0,0.1)",
                  background: "#fff",
                  color: "var(--redo-text-secondary)",
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: "pointer",
                  fontFamily: FONT,
                }}
              >
                더 가져오기
              </button>
              <button
                onClick={onBack}
                style={{
                  height: 44,
                  paddingLeft: 20,
                  paddingRight: 20,
                  borderRadius: 12,
                  border: "none",
                  background: "var(--redo-brand)",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: FONT,
                }}
              >
                확인하러 가기
              </button>
            </div>
          </div>
        )}

        {/* ── Normal state ── */}
        {!done && (
          <>
            {/* Platform selection */}
            <div style={{ padding: "16px 16px 0" }}>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: "var(--redo-text-tertiary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  margin: "0 0 10px",
                  fontFamily: FONT,
                }}
              >
                파일 형식 선택
              </p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                }}
              >
                {PLATFORMS.map((p) => {
                  const active = selectedPlatform === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSelectedPlatform(p.id);
                        // Reset parse result when platform changes
                        if (parsedCards !== null || parseError !== null) {
                          setParsedCards(null);
                          setParseError(null);
                          setFileName(null);
                        }
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "12px 14px",
                        borderRadius: 12,
                        border: active
                          ? `1.5px solid ${p.color}`
                          : "1.5px solid transparent",
                        background: active ? p.bg : "#fff",
                        cursor: "pointer",
                        textAlign: "left",
                        WebkitTapHighlightColor: "transparent",
                        transition: "all 150ms ease",
                      }}
                    >
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          background: p.color,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <span
                          style={{
                            fontSize: p.letter.length > 2 ? 9 : 13,
                            fontWeight: 700,
                            color: "#fff",
                            fontFamily: FONT,
                          }}
                        >
                          {p.letter}
                        </span>
                      </div>
                      <div>
                        <p
                          style={{
                            margin: 0,
                            fontSize: 13,
                            fontWeight: 600,
                            color: active ? p.color : "var(--redo-text-primary)",
                            fontFamily: FONT,
                          }}
                        >
                          {p.label}
                        </p>
                        <p
                          style={{
                            margin: "1px 0 0",
                            fontSize: 10,
                            color: "var(--redo-text-tertiary)",
                            fontFamily: FONT,
                          }}
                        >
                          {p.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Sample download link */}
              <button
                onClick={handleSampleDownload}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  marginTop: 8,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 16V4M12 16l-4-4M12 16l4-4M4 20h16"
                    stroke="var(--redo-brand)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span
                  style={{
                    fontSize: 12,
                    color: "var(--redo-brand)",
                    fontFamily: FONT,
                    fontWeight: 400,
                  }}
                >
                  샘플 파일 다운로드
                </span>
              </button>
            </div>

            {/* Drop zone */}
            <div style={{ padding: "16px" }}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.json,.txt"
                onChange={handleFileChange}
                style={{ display: "none" }}
              />

              {parsedCards === null ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    borderRadius: 16,
                    border: `2px dashed ${dragOver ? "var(--redo-brand)" : "rgba(0,0,0,0.12)"}`,
                    background: dragOver ? "#EEEFFE" : "#FAFAFA",
                    padding: "36px 24px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 10,
                    cursor: "pointer",
                    transition: "all 150ms ease",
                    WebkitTapHighlightColor: "transparent",
                  }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      background: dragOver ? "var(--redo-brand)" : "#EDEDF0",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 150ms ease",
                    }}
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M16 10l-4-4-4 4M12 6v10"
                        stroke={dragOver ? "#fff" : "var(--redo-text-tertiary)"}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 15,
                        fontWeight: 600,
                        color: dragOver ? "var(--redo-brand)" : "var(--redo-text-primary)",
                        fontFamily: FONT,
                      }}
                    >
                      파일을 여기에 드롭하거나
                    </p>
                    <p
                      style={{
                        margin: "2px 0 0",
                        fontSize: 13,
                        color: "var(--redo-text-secondary)",
                        fontFamily: FONT,
                      }}
                    >
                      탭해서 파일 선택
                    </p>
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 11,
                      color: "var(--redo-text-tertiary)",
                      fontFamily: FONT,
                    }}
                  >
                    .csv · .json · .txt 지원
                  </p>
                </div>
              ) : (
                /* ── Parse result area ── */
                <div
                  style={{
                    borderRadius: 16,
                    border: "1.5px solid var(--redo-brand)",
                    background: "#fff",
                    overflow: "hidden",
                  }}
                >
                  {/* Result header */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 14px",
                      borderBottom: "0.5px solid rgba(0,0,0,0.06)",
                      background: "#EEEFFE",
                    }}
                  >
                    <div>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 13,
                          fontWeight: 600,
                          color: "var(--redo-brand)",
                          fontFamily: FONT,
                        }}
                      >
                        {parsedCards.length}개 항목 인식됨
                      </p>
                      <p
                        style={{
                          margin: "1px 0 0",
                          fontSize: 11,
                          color: "var(--redo-text-tertiary)",
                          fontFamily: FONT,
                        }}
                      >
                        {fileName}
                      </p>
                    </div>
                    <button
                      onClick={handleReset}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: 4,
                        color: "var(--redo-text-tertiary)",
                        fontSize: 18,
                        lineHeight: 1,
                        WebkitTapHighlightColor: "transparent",
                      }}
                    >
                      ×
                    </button>
                  </div>

                  {/* Preview list (max 8) */}
                  <div style={{ padding: "0 14px", maxHeight: 280, overflowY: "auto" }}>
                    {parsedCards.slice(0, 8).map((card, i) => (
                      <PreviewCard key={i} card={card} />
                    ))}
                    {parsedCards.length > 8 && (
                      <p
                        style={{
                          textAlign: "center",
                          fontSize: 12,
                          color: "var(--redo-text-tertiary)",
                          fontFamily: FONT,
                          padding: "8px 0",
                          margin: 0,
                        }}
                      >
                        외 {parsedCards.length - 8}개 더…
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Parse error */}
              {parseError && (
                <div
                  style={{
                    marginTop: 12,
                    padding: "12px 14px",
                    borderRadius: 12,
                    background: "#FFF0F0",
                    border: "1px solid rgba(239,68,68,0.2)",
                    display: "flex",
                    gap: 8,
                    alignItems: "flex-start",
                  }}
                >
                  <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 13,
                      color: "#EF4444",
                      fontFamily: FONT,
                    }}
                  >
                    {parseError}
                  </p>
                </div>
              )}
            </div>

            {/* Project tag selector */}
            {parsedCards !== null && parsedCards.length > 0 && (
              <div style={{ padding: "0 16px 16px" }}>
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    color: "var(--redo-text-tertiary)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    margin: "0 0 10px",
                    fontFamily: FONT,
                  }}
                >
                  프로젝트 폴더
                </p>
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  {projects.map((p) => (
                    <Chip
                      key={p}
                      label={p}
                      active={selectedProject === p}
                      onClick={() => setSelectedProject(p)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Import button */}
            {parsedCards !== null && parsedCards.length > 0 && (
              <div style={{ padding: "0 16px 32px" }}>
                <button
                  onClick={handleImport}
                  disabled={importing}
                  style={{
                    width: "100%",
                    height: 52,
                    borderRadius: 16,
                    border: "none",
                    background: importing ? "#C0C2FF" : "var(--redo-brand)",
                    color: "#fff",
                    fontSize: 16,
                    fontWeight: 700,
                    cursor: importing ? "default" : "pointer",
                    fontFamily: FONT,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    transition: "background 200ms ease",
                    WebkitTapHighlightColor: "transparent",
                  }}
                >
                  {importing ? (
                    <>
                      <div
                        style={{
                          width: 16,
                          height: 16,
                          border: "2px solid rgba(255,255,255,0.5)",
                          borderTopColor: "#fff",
                          borderRadius: "50%",
                          animation: "spin 0.8s linear infinite",
                        }}
                      />
                      가져오는 중…
                    </>
                  ) : (
                    `${parsedCards.length}개 가져오기`
                  )}
                </button>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            )}

            {/* How-to section */}
            {parsedCards === null && (
              <div style={{ padding: "0 16px 32px" }}>
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    color: "var(--redo-text-tertiary)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    margin: "0 0 10px",
                    fontFamily: FONT,
                  }}
                >
                  가져오는 방법
                </p>
                <div
                  style={{
                    background: "#fff",
                    borderRadius: 14,
                    overflow: "hidden",
                  }}
                >
                  {[
                    selectedPlatform === "pinterest" && {
                      step: "1",
                      text: "Pinterest → 설정 → 데이터 내보내기",
                    },
                    selectedPlatform === "pinterest" && {
                      step: "2",
                      text: '"핀 내보내기" → 이메일로 받기',
                    },
                    selectedPlatform === "pinterest" && {
                      step: "3",
                      text: "받은 CSV 파일을 위에 업로드",
                    },
                    selectedPlatform === "notion" && {
                      step: "1",
                      text: "Notion 페이지 열기 → ··· 메뉴",
                    },
                    selectedPlatform === "notion" && {
                      step: "2",
                      text: '"내보내기" → CSV 형식 선택',
                    },
                    selectedPlatform === "notion" && {
                      step: "3",
                      text: "받은 CSV 파일을 위에 업로드",
                    },
                    (selectedPlatform === "generic" || selectedPlatform === "json") && {
                      step: "1",
                      text: "URL, 제목, 설명 컬럼이 있는 CSV 또는",
                    },
                    (selectedPlatform === "generic" || selectedPlatform === "json") && {
                      step: "2",
                      text: '{ url, title, description } 배열 JSON 사용',
                    },
                    (selectedPlatform === "generic" || selectedPlatform === "json") && {
                      step: "3",
                      text: "샘플 파일을 다운로드해서 형식 확인",
                    },
                  ]
                    .filter(Boolean)
                    .map((item, i, arr) => {
                      if (!item) return null;
                      const isLast = i === arr.length - 1;
                      return (
                        <div
                          key={i}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            padding: "12px 14px",
                            borderBottom: isLast ? "none" : "0.5px solid rgba(0,0,0,0.06)",
                          }}
                        >
                          <div
                            style={{
                              width: 22,
                              height: 22,
                              borderRadius: "50%",
                              background: "var(--redo-brand)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: "#fff",
                                fontFamily: FONT,
                              }}
                            >
                              {item.step}
                            </span>
                          </div>
                          <p
                            style={{
                              margin: 0,
                              fontSize: 13,
                              color: "var(--redo-text-primary)",
                              fontFamily: FONT,
                            }}
                          >
                            {item.text}
                          </p>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
