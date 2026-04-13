import { useState } from "react";
import { signIn, signUp } from "../lib/auth";

type Mode = "login" | "signup";

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
          setError("가입 확인 이메일을 보냈어요. 확인 후 로그인해주세요.");
          setMode("login");
        }
      }
    } finally {
      setLoading(false);
    }
  };

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
            background: "#6A70FF",
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
            color: "#888780",
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
          onFocus={(e) => (e.currentTarget.style.borderColor = "#6A70FF")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "#E5E5E5")}
        />
        <input
          type="password"
          placeholder="비밀번호 (6자 이상)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
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
          onFocus={(e) => (e.currentTarget.style.borderColor = "#6A70FF")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "#E5E5E5")}
        />

        {/* Error message */}
        {error && (
          <p
            style={{
              fontSize: 13,
              color: error.includes("확인 이메일") ? "#1D9E75" : "#E53935",
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
            background: loading ? "#A9ACFF" : "#6A70FF",
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
          <span style={{ fontSize: 14, color: "#888780" }}>
            {mode === "login" ? "계정이 없으신가요?" : "이미 계정이 있으신가요?"}
          </span>
          <button
            type="button"
            onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(null); }}
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "#6A70FF",
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
            color: "#534AB7",
            background: "#EEEFFE",
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
