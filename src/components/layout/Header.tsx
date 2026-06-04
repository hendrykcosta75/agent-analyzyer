import { useObservatory } from "@/state/observatory";
import { useAuth } from "@/state/auth";
import { LogoIcon, LogoutIcon } from "@/components/icons";

const STATUS_LABEL = {
  operational: "OPERATIONAL",
  degraded: "DEGRADED",
  offline: "OFFLINE",
} as const;

const STATUS_TONE = {
  operational: "green",
  degraded: "amber",
  offline: "red",
} as const;

export function Header() {
  const { systemStatus, metrics, mode, setMode } = useObservatory();
  const { logout } = useAuth();
  const tone = STATUS_TONE[systemStatus];

  return (
    <header className="header">
      <div className="header-left">
        <div className="brand-mark">
          <LogoIcon width={15} height={15} />
        </div>
        <span className="brand-name">AGENT-OPS-OS</span>
        <span className="brand-ver">v0.1.0</span>
      </div>

      <div className="header-right">
        <div className="stat-group">
          <span className="label">SYSTEM STATUS</span>
          <span className={`dot ${tone} live-dot`} />
          <span className={`value text-${tone}`}>{STATUS_LABEL[systemStatus]}</span>
        </div>

        <div className="stat-group">
          <span className="label">SYNC</span>
          <span className="value">{metrics.sync.toFixed(1)}%</span>
          <div className="sync-wave" aria-hidden>
            {Array.from({ length: 14 }).map((_, i) => (
              <span key={i} style={{ animationDelay: `${i * 0.07}s` }} />
            ))}
          </div>
        </div>

        <div className="stat-group">
          <span className="label">GATEWAY</span>
          <div className="mode-toggle">
            <button
              className={mode === "local" ? "active" : ""}
              onClick={() => setMode("local")}
            >
              LOCAL
            </button>
            <button
              className={mode === "ssh" ? "active" : ""}
              onClick={() => setMode("ssh")}
            >
              SSH
            </button>
          </div>
        </div>

        <button className="icon-btn" onClick={logout} title="Sign out">
          <LogoutIcon width={15} height={15} />
        </button>
      </div>
    </header>
  );
}
