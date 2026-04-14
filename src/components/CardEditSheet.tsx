import { useState, useEffect, useMemo } from "react";
import { ImageWithFallback } from "./ImageWithFallback";
import type { CardData } from "../types";

const FONT =
  "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Noto Sans KR', system-ui, sans-serif";

const PROJECTS = ["영감", "작업", "학습", "아이디어", "기타"];
const KEYWORD_OPTIONS = ["타이포그래피", "미니멀", "아이덴티티", "전시", "공간", "조명", "컬러", "무드", "그리드", "브랜딩", "로고", "포스터"];

type SheetPhase = "hidden" | "entering" | "visible" | "leaving";

interface CardEditSheetProps {
  isOpen: boolean;
  card: CardData | null;
  onSave: (updated: Partial<CardData>) => void;
  onDelete?: () => void;
  onClose: () => void;
  existingProjects?: string[];
}

export function CardEditSheet({ isOpen, card, onSave, onDelete, onClose, existingProjects }: CardEditSheetProps) {
  const allProjects = useMemo(() => {
    const base = [...PROJECTS];
    if (existingProjects) {
      for (const p of existingProjects) {
        if (!base.includes(p)) base.push(p);
      }
    }
    return base;
  }, [existingProjects]);
  const [phase, setPhase] = useState<SheetPhase>("hidden");

  // Editable fields
  const [title, setTitle] = useState("");
  const [savedReason, setSavedReason] = useState("");
  const [projectTag, setProjectTag] = useState("");
  const [chips, setChips] = useState<string[]>([]);

  // Sync fields when card changes
  useEffect(() => {
    if (card) {
      setTitle(card.title);
      setSavedReason(card.savedReason ?? "");
      setProjectTag(card.projectTag);
      setChips([...card.chips]);
    }
  }, [card]);

  // Phase lifecycle
  useEffect(() => {
    if (isOpen) {
      setPhase("entering");
      const t = setTimeout(() => setPhase("visible"), 16);
      return () => clearTimeout(t);
    } else {
      if (phase === "visible" || phase === "entering") {
        setPhase("leaving");
        const t = setTimeout(() => setPhase("hidden"), 280);
        return () => clearTimeout(t);
      }
    }
  }, [isOpen]);

  const handleSave = () => {
    onSave({ title, savedReason, projectTag, chips });
    onClose();
  };

  const toggleChip = (chip: string) => {
    setChips((prev) =>
      prev.includes(chip) ? prev.filter((c) => c !== chip) : [...prev, chip]
    );
  };

  const isVisible = phase !== "hidden";

  const overlayOpacity =
    phase === "entering" || phase === "leaving" ? 0 : 0.4;
  const sheetTranslate =
    phase === "entering" || phase === "leaving" ? "translateY(100%)" : "translateY(0)";

  if (!isVisible || !card) return null;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 70,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "#000",
          opacity: overlayOpacity,
          transition: "opacity 300ms ease",
        }}
      />

      {/* Sheet */}
      <div
        style={{
          position: "relative",
          background: "#ffffff",
          borderRadius: "20px 20px 0 0",
          maxHeight: "88%",
          display: "flex",
          flexDirection: "column",
          transform: sheetTranslate,
          transition: "transform 300ms cubic-bezier(0.25,0.46,0.45,0.94)",
          overflow: "hidden",
        }}
      >
        {/* Handle bar */}
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 10, paddingBottom: 4, flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(0,0,0,0.12)" }} />
        </div>

        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingLeft: 16,
            paddingRight: 16,
            paddingBottom: 12,
            flexShrink: 0,
          }}
        >
          <p style={{ fontSize: 16, fontWeight: 500, color: "var(--redo-text-primary)", margin: 0, fontFamily: FONT }}>
            레퍼런스 편집
          </p>
          <button
            onClick={handleSave}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 15,
              fontWeight: 500,
              color: "var(--redo-brand)",
              fontFamily: FONT,
              padding: "4px 0",
              minHeight: 44,
            }}
          >
            완료
          </button>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: "auto", scrollbarWidth: "none", padding: "0 16px" }}>

          {/* Thumbnail preview */}
          <div
            style={{
              width: "100%",
              height: 100,
              borderRadius: 10,
              overflow: "hidden",
              marginBottom: 16,
              background: "var(--redo-bg-secondary)",
            }}
          >
            <ImageWithFallback
              src={card.image}
              alt={card.title}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          </div>

          {/* 제목 */}
          <div style={{ marginBottom: 14 }}>
            <p style={{ fontSize: 11, fontWeight: 500, color: "#B4B2A9", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 6px", fontFamily: FONT }}>
              제목
            </p>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{
                width: "100%",
                height: 40,
                borderRadius: 10,
                border: "0.5px solid var(--redo-border)",
                background: "var(--redo-bg-input)",
                padding: "0 12px",
                fontSize: 14,
                color: "var(--redo-text-primary)",
                fontFamily: FONT,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* 저장 이유 */}
          <div style={{ marginBottom: 14 }}>
            <p style={{ fontSize: 11, fontWeight: 500, color: "#B4B2A9", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 6px", fontFamily: FONT }}>
              저장 이유
            </p>
            <textarea
              value={savedReason}
              onChange={(e) => setSavedReason(e.target.value)}
              rows={3}
              style={{
                width: "100%",
                borderRadius: 10,
                border: "none",
                background: "#EEEFFE",
                padding: "10px 12px",
                fontSize: 13,
                color: "#3C3489",
                fontFamily: FONT,
                outline: "none",
                resize: "none",
                lineHeight: 1.6,
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* 프로젝트 태그 */}
          <div style={{ marginBottom: 14 }}>
            <p style={{ fontSize: 11, fontWeight: 500, color: "#B4B2A9", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px", fontFamily: FONT }}>
              폴더
            </p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {allProjects.map((proj) => {
                const isActive = proj === projectTag;
                return (
                  <button
                    key={proj}
                    onClick={() => setProjectTag(proj)}
                    style={{
                      height: 30,
                      paddingLeft: 14,
                      paddingRight: 14,
                      borderRadius: 20,
                      border: isActive ? "1px solid var(--redo-brand)" : "0.5px solid var(--redo-border)",
                      background: isActive ? "var(--redo-brand-light)" : "var(--redo-bg-secondary)",
                      color: isActive ? "var(--redo-brand)" : "var(--redo-text-secondary)",
                      fontSize: 13,
                      fontWeight: isActive ? 500 : 400,
                      cursor: "pointer",
                      fontFamily: FONT,
                    }}
                  >
                    {proj}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 키워드 칩 */}
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 500, color: "#B4B2A9", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px", fontFamily: FONT }}>
              키워드
            </p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {KEYWORD_OPTIONS.map((kw) => {
                const isSelected = chips.includes(kw);
                return (
                  <button
                    key={kw}
                    onClick={() => toggleChip(kw)}
                    style={{
                      height: 28,
                      paddingLeft: 12,
                      paddingRight: 12,
                      borderRadius: 20,
                      border: isSelected ? "1px solid var(--redo-brand)" : "0.5px solid var(--redo-border)",
                      background: isSelected ? "var(--redo-brand-light)" : "var(--redo-bg-secondary)",
                      color: isSelected ? "var(--redo-brand)" : "var(--redo-text-secondary)",
                      fontSize: 12,
                      fontWeight: isSelected ? 500 : 400,
                      cursor: "pointer",
                      fontFamily: FONT,
                    }}
                  >
                    {kw}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 삭제 버튼 */}
          <button
            onClick={() => {
              if (window.confirm("이 레퍼런스를 삭제할까요?")) {
                onDelete?.();
              }
            }}
            style={{
              width: "100%",
              height: 44,
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 400,
              color: "var(--redo-danger)",
              fontFamily: FONT,
              marginBottom: 8,
            }}
          >
            레퍼런스 삭제
          </button>

          <div style={{ height: 20 }} />
        </div>
      </div>
    </div>
  );
}
