import { useState, type ReactNode } from "react";
import { AgentNetwork } from "@/components/graph/AgentNetwork";
import { AgentGalaxy } from "@/components/graph/AgentGalaxy";
import { AgentOffice } from "@/components/graph/AgentOffice";
import { useObservatory } from "@/state/observatory";
import { statusColor, statusLabel, statusToneClass } from "@/lib/theme";
import { clock, duration, timeAgo } from "@/lib/time";
import { AGENTS } from "@/data/agents";
import { CubeIcon, ExpandIcon, SlidersIcon } from "@/components/icons";

const TABS = ["GRAPH", "ORBIT", "OFFICE", "RUNS", "TOOLS", "TRACE"] as const;
type Tab = (typeof TABS)[number];

export function NetworkPanel() {
  const [tab, setTab] = useState<Tab>("GRAPH");

  return (
    <section className="panel network-panel">
      <div className="network-top">
        <div>
          <h2>AGENT NETWORK</h2>
          <p className="label">REAL-TIME AGENT WORKFLOW MAP</p>
        </div>
        <div className="network-toolbar">
          <div className="tabs">
            {TABS.map((t) => (
              <button
                key={t}
                className={t === tab ? "active" : ""}
                onClick={() => setTab(t)}
              >
                {t}
              </button>
            ))}
          </div>
          <button className="icon-btn" title="View mode">
            <CubeIcon width={15} height={15} />
          </button>
          <button className="icon-btn" title="Fit">
            <ExpandIcon width={15} height={15} />
          </button>
          <button className="icon-btn" title="Display options">
            <SlidersIcon width={15} height={15} />
          </button>
        </div>
      </div>

      {tab === "GRAPH" && <AgentNetwork />}
      {tab === "ORBIT" && <AgentGalaxy />}
      {tab === "OFFICE" && <AgentOffice />}
      {tab === "RUNS" && <RunsPane />}
      {tab === "TOOLS" && <ToolsPane />}
      {tab === "TRACE" && <TracePane />}
    </section>
  );
}

function PaneShell({ children }: { children: ReactNode }) {
  return (
    <div className="canvas-wrap">
      <div className="tab-pane">{children}</div>
    </div>
  );
}

function RunsPane() {
  const { sessions } = useObservatory();
  return (
    <PaneShell>
      <p className="pane-group-title">ACTIVE & RECENT RUNS</p>
      <table className="dtable">
        <thead>
          <tr>
            <th>SESSION</th>
            <th>AGENT</th>
            <th>STATUS</th>
            <th>STEPS</th>
            <th>DURATION</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((s) => (
            <tr key={s.id}>
              <td className="strong">{s.title}</td>
              <td>{s.agentLabel}</td>
              <td>
                <span className={`chip`} style={{ color: statusColor(s.status) }}>
                  <span className={`dot ${statusToneClass(s.status)}`} />
                  {statusLabel[s.status]}
                </span>
              </td>
              <td>{s.steps}</td>
              <td>{duration(s.durationMs)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </PaneShell>
  );
}

function ToolsPane() {
  return (
    <PaneShell>
      <p className="pane-group-title">TOOLS · SKILLS · MCP — BY AGENT</p>
      <div className="tools-grid">
        {AGENTS.flatMap((agent) =>
          agent.tools.map((tool) => (
            <div className="tool-cell" key={tool.id}>
              <div className="tc-top">
                <span className="tc-name">{tool.label}</span>
                <span className={`dot ${statusToneClass(tool.status)}`} />
              </div>
              <div className="tc-owner">
                {tool.flavor.toUpperCase()} · {agent.label}
              </div>
            </div>
          )),
        )}
      </div>
    </PaneShell>
  );
}

function TracePane() {
  const { events } = useObservatory();
  return (
    <PaneShell>
      <p className="pane-group-title">LIVE EVENT TRACE</p>
      <div className="event-list">
        {events.map((e) => (
          <div className="event-row" key={e.id}>
            <span className="ts" title={e.ts}>
              {clock(e.ts)}
            </span>
            <span
              className={`dot ${
                e.severity === "error"
                  ? "red"
                  : e.severity === "warning"
                    ? "amber"
                    : "green"
              }`}
            />
            <span className="summary">{e.summary}</span>
            <span className="type">
              {e.type.toUpperCase()} · {timeAgo(e.ts)}
            </span>
          </div>
        ))}
      </div>
    </PaneShell>
  );
}
