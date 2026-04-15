import { useState } from "react";
import { signIn, signUp } from "../lib/auth";

type Mode = "login" | "signup" | "profile";

const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Noto Sans KR', system-ui, sans-serif";

const OCCUPATIONS = [
  "디자이너", "개발자", "기획자", "마케터",
  "에디터", "학생", "크리에이터", "기타",
];

interface LoginScreenProps {
  onLoginSuccess: (userId: string) => void;
  onGuestMode: () => void;
}

export function LoginScreen({ onLoginSuccess, onGuestMode }: LoginScreenProps) {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 프로필 설정
  const [nickname, setNickname] = useState("");
  const [occupation, setOccupation] = useState<string>("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "login") {
        const result = await signIn(email, password);
        if (result.error) {
          setError(result.error);
        } else if (result.user) {
          onLoginSuccess(result.user.id);
        }
      } else {
        const result = await signUp(email, password);
        if (result.error) {
          setError(result.error);
        } else {
          // 회원가입 성공 → 프로필 설정 단계로
          setMode("profile");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleProfileComplete = () => {
    // 닉네임/직업 로컬스토리지에 저장
    if (nickname.trim()) {
      localStorage.setItem("redo_nickname", nickname.trim());
    }
    if (occupation) {
      localStorage.setItem("redo_occupation", occupation);
    }
    setError("가입 확인 이메일을 보냈어요. 확인 후 로그인해주세요.");
    setMode("login");
  };

  // ── 프로필 설정 화면 ──
  if (mode === "profile") {
    return (
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "#fff",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          fontFamily: FONT,
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div
            style={{
              width: 56,
              height: 56,
              background: "var(--redo-brand)",
              borderRadius: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <span style={{ fontSize: 24, fontWeight: 800, color: "#fff" }}>👋</span>
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "#1A1A2E", margin: 0, letterSpacing: -0.5 }}>
            반가워요!
          </h2>
          <p style={{ fontSize: 14, color: "var(--redo-text-secondary)", margin: "6px 0 0", lineHeight: 1.5 }}>
            나를 소개해봐요 (나중에 변경 가능해요)
          </p>
        </div>

        <div style={{ width: "100%", maxWidth: 360, display: "flex", flexDirection: "column", gap: 20 }}>
          {/* 닉네임 */}
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#1A1A2E", margin: "0 0 8px", letterSpacing: 0.2 }}>
              닉네임
            </p>
            <input
              type="text"
              placeholder="표시될 이름을 입력하세요"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={20}
              style={{
                width: "100%",
                padding: "13px 16px",
                fontSize: 15,
                border: "1.5px solid #E5E5E5",
                borderRadius: 12,
                outline: "none",
                boxSizing: "border-box",
                fontFamily: FONT,
                color: "#1A1A2E",
                background: "#FAFAFA",
                transition: "border-color 180ms",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--redo-brand)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#E5E5E5")}
            />
          </div>

          {/* 직업 */}
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#1A1A2E", margin: "0 0 10px", letterSpacing: 0.2 }}>
              직업/역할
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {OCCUPATIONS.map((occ) => {
                const isSelected = occupation === occ;
                return (
                  <button
                    key={occ}
                    type="button"
                    onClick={() => setOccupation(occ)}
                    style={{
                      height: 36,
                      padding: "0 16px",
                      borderRadius: 999,
                      border: isSelected ? "none" : "1.5px solid #E5E5E5",
                      background: isSelected ? "var(--redo-brand)" : "#FAFAFA",
                      color: isSelected ? "#fff" : "#1A1A2E",
                      fontSize: 13,
                      fontWeight: isSelected ? 600 : 400,
                      cursor: "pointer",
                      fontFamily: FONT,
                      transition: "all 150ms ease",
                    }}
                  >
                    {occ}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 완료 버튼 */}
          <button
            type="button"
            onClick={handleProfileComplete}
            style={{
              width: "100%",
              padding: "15px",
              fontSize: 16,
              fontWeight: 700,
              color: "#fff",
              background: "var(--redo-brand)",
              border: "none",
              borderRadius: 12,
              cursor: "pointer",
              fontFamily: FONT,
              marginTop: 4,
            }}
          >
            {nickname.trim() || occupation ? "완료" : "나중에 설정하기"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "#fff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      {/* Logo */}
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <div
          style={{
            width: 64,
            height: 64,
            background: "var(--redo-brand)",
            borderRadius: 18,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
          }}
        >
          <span style={{ fontSize: 28, fontWeight: 800, color: "#fff", letterSpacing: -1 }}>
            Re
          </span>
        </div>
        <h1
          style={{
            fontSize: 24,
            fontWeight: 800,
            color: "#1A1A2E",
            margin: 0,
            letterSpacing: -0.5,
          }}
        >
          ReDo
        </h1>
        <p
          style={{
            fontSize: 14,
            color: "var(--redo-text-secondary)",
            margin: "6px 0 0",
          }}
        >
          레퍼런스 활용 시스템
        </p>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        style={{ width: "100%", maxWidth: 360, display: "flex", flexDirection: "column", gap: 12 }}
      >
        <input
          type="email"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
          style={{
            width: "100%",
            padding: "14px 16px",
            fontSize: 15,
            border: "1.5px solid #E5E5E5",
            borderRadius: 12,
            outline: "none",
            boxSizing: "border-box",
            fontFamily: "inherit",
            color: "#1A1A2E",
            background: "#FAFAFA",
            transition: "border-color 180ms",
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "var(--redo-brand)")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "#E5E5E5")}
        />
        <input
          type="password"
          placeholder="비밀번호 (6자 이상)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          required
          minLength={6}
          style={{
            width: "100%",
            padding: "14px 16px",
            fontSize: 15,
            border: "1.5px solid #E5E5E5",
            borderRadius: 12,
            outline: "none",
            boxSizing: "border-box",
            fontFamily: "inherit",
            color: "#1A1A2E",
            background: "#FAFAFA",
            transition: "border-color 180ms",
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "var(--redo-brand)")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "#E5E5E5")}
        />

        {/* Error message */}
        {error && (
          <p
            style={{
              fontSize: 13,
              color: error.includes("확인 이메일") ? "var(--redo-success)" : "#E53935",
              margin: 0,
              textAlign: "center",
            }}
          >
            {error}
          </p>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "15px",
            fontSize: 16,
            fontWeight: 700,
            color: "#fff",
            background: loading ? "#A9ACFF" : "var(--redo-brand)",
            border: "none",
            borderRadius: 12,
            cursor: loading ? "not-allowed" : "pointer",
            fontFamily: "inherit",
            transition: "background 180ms",
            marginTop: 4,
          }}
        >
          {loading ? "처리 중..." : mode === "login" ? "로그인" : "회원가입"}
        </button>

        {/* Mode switch */}
        <div style={{ display: "flex", justifyContent: "center", gap: 4, marginTop: 4 }}>
          <span style={{ fontSize: 14, color: "var(--redo-text-secondary)" }}>
            {mode === "login" ? "계정이 없으신가요?" : "이미 계정이 있으신가요?"}
          </span>
          <button
            type="button"
            onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(null); }}
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "var(--redo-brand)",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              fontFamily: "inherit",
            }}
          >
            {mode === "login" ? "회원가입" : "로그인"}
          </button>
        </div>

        {/* Divider */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            margin: "8px 0",
          }}
        >
          <div style={{ flex: 1, height: 1, background: "#E5E5E5" }} />
          <span style={{ fontSize: 12, color: "#BCBAB5" }}>또는</span>
          <div style={{ flex: 1, height: 1, background: "#E5E5E5" }} />
        </div>

        {/* Guest mode */}
        <button
          type="button"
          onClick={onGuestMode}
          style={{
            width: "100%",
            padding: "14px",
            fontSize: 15,
            fontWeight: 600,
            color: "var(--redo-brand-dark)",
            background: "var(--redo-brand-light)",
            border: "none",
            borderRadius: 12,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          게스트로 둘러보기 →
        </button>
      </form>
    </div>
  );
}
