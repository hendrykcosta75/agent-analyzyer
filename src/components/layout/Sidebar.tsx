import type { CSSProperties } from "react";
import { NavLink } from "react-router-dom";
import { useObservatory } from "@/state/observatory";
import { statusColor, statusLabel } from "@/lib/theme";
import { timeAgo } from "@/lib/time";
import {
  AgentsIcon,
  OverviewIcon,
  RisksIcon,
  SearchIcon,
  SessionsIcon,
} from "@/components/icons";

export function Sidebar() {
  const { agents, events } = useObservatory();
  const riskCount = events.filter((e) => e.severity === "error").length;

  return (
    <aside className="sidebar">
      <div className="sidebar-title">
        <h1>AGENT OPS OS</h1>
        <p className="eyebrow">OBSERVABILITY CENTER</p>
      </div>

      <div className="search">
        <SearchIcon />
        <input placeholder="Search agents, sessions, tools…" spellCheck={false} />
      </div>

      <div className="live-agents">
        <div className="panel-head">
          <span className="label">LIVE AGENTS</span>
          <NavLink to="/agents" className="link">
            VIEW ALL
          </NavLink>
        </div>
        <div className="live-agents-scroll">
          {agents.map((a) => {
            const accent = statusColor(a.status);
            return (
              <div
                key={a.id}
                className="agent-card"
                style={{ "--accent": accent } as CSSProperties}
              >
                <div className="row">
                  <span className="id">{a.label}</span>
                  <span className="status">{statusLabel[a.status]}</span>
                </div>
                <div className="meta">
                  <div>
                    <div className="k">LAST ACTIVITY</div>
                    <div className="v">{timeAgo(a.lastActivity)}</div>
                  </div>
                  <div>
                    <div className="k">ROLE</div>
                    <div className="v">{a.role}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <nav className="nav">
        <NavLink to="/overview">
          <OverviewIcon /> OVERVIEW
        </NavLink>
        <NavLink to="/agents">
          <AgentsIcon /> AGENTS
        </NavLink>
        <NavLink to="/sessions">
          <SessionsIcon /> SESSIONS
        </NavLink>
        <NavLink to="/risks">
          <RisksIcon /> RISKS
          {riskCount > 0 && <span className="badge">{riskCount}</span>}
        </NavLink>
      </nav>
    </aside>
  );
}
