import { useState, useEffect, useRef } from "react";
import { StatusBar } from "../components/StatusBar";
import type { CardData } from "../types";

const FONT =
  "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Noto Sans KR', system-ui, sans-serif";

// ─── Mini toast (local to settings) ──────────────────────────────────────────

function MiniToast({ message, onDone }: { message: string | null; onDone: () => void }) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!message) return;
    setVisible(true);
    timerRef.current = setTimeout(() => {
      setVisible(false);
      setTimeout(onDone, 200);
    }, 2000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [message]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!message) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: 60,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        zIndex: 300,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          background: "#2C2C2A",
          color: "#fff",
          borderRadius: 20,
          padding: "10px 18px",
          fontSize: 13,
          fontFamily: FONT,
          boxShadow: "0 4px 16px rgba(0,0,0,0.22)",
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(-12px)",
          transition: "opacity 200ms ease, transform 200ms ease",
        }}
      >
        {message}
      </div>
    </div>
  );
}

// ─── Toggle switch ────────────────────────────────────────────────────────────

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      onClick={() => onChange(!on)}
      style={{
        width: 44,
        height: 26,
        borderRadius: 13,
        background: on ? "var(--redo-brand)" : "#D1D0CB",
        position: "relative",
        cursor: "pointer",
        transition: "background 200ms ease",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 3,
          left: on ? 21 : 3,
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: "#ffffff",
          boxShadow: "0 1px 4px rgba(0,0,0,0.18)",
          transition: "left 200ms ease",
        }}
      />
    </div>
  );
}

// ─── Section label ────────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return (
    <p
      style={{
        fontSize: 10,
        fontWeight: 500,
        color: "#B4B2A9",
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        margin: 0,
        padding: "18px 16px 6px",
        fontFamily: FONT,
      }}
    >
      {label}
    </p>
  );
}

// ─── Row ──────────────────────────────────────────────────────────────────────

function Row({
  label,
  trailing,
  onClick,
  danger,
  noBorder,
}: {
  label: string;
  trailing?: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
  noBorder?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: 52,
        paddingLeft: 16,
        paddingRight: 16,
        background: "#ffffff",
        borderBottom: noBorder ? "none" : "0.5px solid rgba(0,0,0,0.06)",
        cursor: onClick ? "pointer" : "default",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      <span
        style={{
          fontSize: 14,
          fontWeight: 400,
          color: danger ? "#E24B4A" : "var(--redo-text-primary)",
          fontFamily: FONT,
          lineHeight: 1.3,
        }}
      >
        {label}
      </span>
      {trailing}
    </div>
  );
}

// ─── Chevron ──────────────────────────────────────────────────────────────────

function Chevron() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M9 18l6-6-6-6" stroke="#B4B2A9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface SettingsScreenProps {
  executedCardIds: Set<number>;
  cards: CardData[];
  onBack: () => void;
  onSignOut?: () => void;
  currentUserId?: string | null;
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export function SettingsScreen({ executedCardIds, cards, onBack, onSignOut, currentUserId }: SettingsScreenProps) {
  const [notifOn, setNotifOn] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  // Profile state
  const [name, setName] = useState("지원");
  const [job, setJob] = useState("디자이너");
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(name);
  const [editJob, setEditJob] = useState(job);

  // Toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => setToastMsg(msg);

  const handleDarkModeToggle = (v: boolean) => {
    setDarkMode(v);
    document.documentElement.classList.toggle("dark", v);
  };

  const handleExport = () => {
    const json = JSON.stringify(cards, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "redo_data.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLogout = () => {
    if (window.confirm("로그아웃 하시겠어요?")) {
      if (onSignOut) {
        onSignOut();
      } else {
        localStorage.clear();
        window.location.reload();
      }
    }
  };

  const handleSaveProfile = () => {
    setName(editName.trim() || name);
    setJob(editJob.trim() || job);
    setEditing(false);
  };

  const handleEditStart = () => {
    setEditName(name);
    setEditJob(job);
    setEditing(true);
  };

  return (
    <div
      style={{
        width: 375,
        height: 812,
        background: "#F8F7F4",
        fontFamily: FONT,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
    >
      {/* Mini toast */}
      <MiniToast message={toastMsg} onDone={() => setToastMsg(null)} />

      {/* Status bar */}
      <div style={{ background: "#ffffff", flexShrink: 0 }}>
        <StatusBar />
      </div>

      {/* Header */}
      <div
        style={{
          background: "#ffffff",
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
          설정
        </p>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: "auto", scrollbarWidth: "none" }}>

        {/* ── 프로필 섹션 ── */}
        <div
          style={{
            margin: "16px 16px 0",
            background: "#ffffff",
            borderRadius: 14,
            padding: "20px 16px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 6,
          }}
        >
          {/* Avatar */}
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "#EEEFFE",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 4,
            }}
          >
            <span
              style={{
                fontSize: 24,
                fontWeight: 500,
                color: "var(--redo-brand)",
                fontFamily: FONT,
              }}
            >
              {name.charAt(0)}
            </span>
          </div>

          {editing ? (
            /* ── Edit mode ── */
            <div
              style={{
                width: "100%",
                display: "flex",
                flexDirection: "column",
                gap: 8,
                marginTop: 4,
              }}
            >
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="이름"
                style={{
                  width: "100%",
                  height: 40,
                  borderRadius: 10,
                  border: "1px solid var(--redo-brand)",
                  padding: "0 12px",
                  fontSize: 15,
                  fontFamily: FONT,
                  outline: "none",
                  boxSizing: "border-box",
                  color: "var(--redo-text-primary)",
                }}
              />
              <input
                value={editJob}
                onChange={(e) => setEditJob(e.target.value)}
                placeholder="직업"
                style={{
                  width: "100%",
                  height: 40,
                  borderRadius: 10,
                  border: "1px solid rgba(0,0,0,0.12)",
                  padding: "0 12px",
                  fontSize: 15,
                  fontFamily: FONT,
                  outline: "none",
                  boxSizing: "border-box",
                  color: "var(--redo-text-primary)",
                }}
              />
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <button
                  onClick={() => setEditing(false)}
                  style={{
                    flex: 1,
                    height: 36,
                    borderRadius: 10,
                    border: "1px solid rgba(0,0,0,0.12)",
                    background: "transparent",
                    color: "var(--redo-text-secondary)",
                    fontSize: 13,
                    cursor: "pointer",
                    fontFamily: FONT,
                  }}
                >
                  취소
                </button>
                <button
                  onClick={handleSaveProfile}
                  style={{
                    flex: 2,
                    height: 36,
                    borderRadius: 10,
                    border: "none",
                    background: "var(--redo-brand)",
                    color: "#fff",
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: "pointer",
                    fontFamily: FONT,
                  }}
                >
                  저장
                </button>
              </div>
            </div>
          ) : (
            /* ── View mode ── */
            <>
              <p
                style={{
                  fontSize: 18,
                  fontWeight: 500,
                  color: "var(--redo-text-primary)",
                  margin: 0,
                  fontFamily: FONT,
                }}
              >
                {name}
              </p>
              <p
                style={{
                  fontSize: 13,
                  fontWeight: 400,
                  color: "#888780",
                  margin: 0,
                  fontFamily: FONT,
                }}
              >
                {job}
              </p>
              <button
                onClick={handleEditStart}
                style={{
                  marginTop: 8,
                  height: 36,
                  paddingLeft: 16,
                  paddingRight: 16,
                  borderRadius: 10,
                  background: "transparent",
                  border: "1px solid var(--redo-brand)",
                  color: "var(--redo-brand)",
                  fontSize: 13,
                  fontWeight: 400,
                  cursor: "pointer",
                  fontFamily: FONT,
                }}
              >
                프로필 편집
              </button>
            </>
          )}
        </div>

        {/* ── 앱 설정 ── */}
        <SectionLabel label="앱 설정" />
        <div
          style={{
            background: "#ffffff",
            borderRadius: 14,
            margin: "0 16px",
            overflow: "hidden",
          }}
        >
          {/* 알림 설정 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              height: 52,
              paddingLeft: 16,
              paddingRight: 16,
              borderBottom: "0.5px solid rgba(0,0,0,0.06)",
            }}
          >
            <span
              style={{
                fontSize: 14,
                fontWeight: 400,
                color: "var(--redo-text-primary)",
                fontFamily: FONT,
              }}
            >
              알림 설정
            </span>
            <Toggle on={notifOn} onChange={setNotifOn} />
          </div>

          {/* 다크모드 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              height: 52,
              paddingLeft: 16,
              paddingRight: 16,
            }}
          >
            <span
              style={{
                fontSize: 14,
                fontWeight: 400,
                color: "var(--redo-text-primary)",
                fontFamily: FONT,
              }}
            >
              다크모드
            </span>
            <Toggle on={darkMode} onChange={handleDarkModeToggle} />
          </div>
        </div>

        {/* ── 데이터 ── */}
        <SectionLabel label="데이터" />
        <div
          style={{
            background: "#ffffff",
            borderRadius: 14,
            margin: "0 16px",
            overflow: "hidden",
          }}
        >
          <Row
            label="저장된 레퍼런스"
            trailing={
              <span
                style={{
                  fontSize: 13,
                  color: "#B4B2A9",
                  fontFamily: FONT,
                }}
              >
                {cards.length}개
              </span>
            }
          />
          <Row
            label="실행 완료"
            trailing={
              <span
                style={{
                  fontSize: 13,
                  color: "var(--redo-success)",
                  fontFamily: FONT,
                  fontWeight: 500,
                }}
              >
                {executedCardIds.size}개
              </span>
            }
          />
          <Row
            label="데이터 내보내기"
            trailing={<Chevron />}
            onClick={handleExport}
            noBorder
          />
        </div>

        {/* ── 계정 ── */}
        <SectionLabel label="계정" />
        <div
          style={{
            background: "#ffffff",
            borderRadius: 14,
            margin: "0 16px",
            overflow: "hidden",
          }}
        >
          <Row
            label="온보딩 다시 보기"
            trailing={<Chevron />}
            onClick={() => {
              window.location.href = window.location.pathname + "?onboarding=true";
            }}
          />

          {/* 연결된 플랫폼 */}
          <div
            onClick={() => showToast("준비 중이에요 🛠️")}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              height: 52,
              paddingLeft: 16,
              paddingRight: 16,
              borderBottom: "0.5px solid rgba(0,0,0,0.06)",
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {/* Pinterest icon */}
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  background: "#E60023",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", fontFamily: FONT }}>
                  P
                </span>
              </div>
              {/* Notion icon */}
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  background: "#191919",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", fontFamily: FONT }}>
                  N
                </span>
              </div>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 400,
                  color: "var(--redo-text-primary)",
                  fontFamily: FONT,
                }}
              >
                연결된 플랫폼
              </span>
            </div>
            <span
              style={{
                fontSize: 13,
                fontWeight: 400,
                color: "var(--redo-brand)",
                fontFamily: FONT,
              }}
            >
              연결 관리
            </span>
          </div>

          {/* 로그아웃 */}
          <Row label="로그아웃" danger onClick={handleLogout} noBorder />
        </div>

        <div style={{ height: 32 }} />
      </div>
    </div>
  );
}
