import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { DEMO_CREDENTIALS, useAuth } from "@/state/auth";
import { LogoIcon } from "@/components/icons";

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (user) return <Navigate to="/overview" replace />;

  const from = (location.state as { from?: string } | null)?.from ?? "/overview";

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const result = login(username.trim(), password);
    if (result.ok) {
      navigate(from, { replace: true });
    } else {
      setError(result.error ?? "LOGIN FAILED");
    }
  }

  return (
    <div className="login">
      <form className="login-card" onSubmit={onSubmit}>
        <div className="login-brand">
          <div className="brand-mark">
            <LogoIcon width={15} height={15} />
          </div>
          <div>
            <h1>AGENT OPS OS</h1>
            <p className="eyebrow">OBSERVABILITY CENTER</p>
          </div>
        </div>

        <div className="field">
          <label className="label">USERNAME</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            spellCheck={false}
            autoFocus
          />
        </div>
        <div className="field">
          <label className="label">PASSWORD</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>

        <button className="btn-primary" type="submit">
          ENTER OBSERVATORY
        </button>

        {error && <div className="login-error">{error}</div>}

        <div className="login-hint">
          PHASE 1 · FRONTEND PREVIEW · MOCK SESSION
          <br />
          DEMO LOGIN — <b>{DEMO_CREDENTIALS.username}</b> /{" "}
          <b>{DEMO_CREDENTIALS.password}</b>
        </div>
      </form>
    </div>
  );
}
