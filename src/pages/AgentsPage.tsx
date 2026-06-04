import { useObservatory } from "@/state/observatory";
import { statusColor, statusLabel, statusToneClass } from "@/lib/theme";
import { timeAgo } from "@/lib/time";
import { LockIcon } from "@/components/icons";

export function AgentsPage() {
  const { agents } = useObservatory();
  const active = agents.filter(
    (a) => a.status === "active" || a.status === "executing" || a.status === "thinking",
  ).length;
  const errors = agents.reduce((sum, a) => sum + a.errors, 0);
  const totalSessions = agents.reduce((sum, a) => sum + a.sessions, 0);

  return (
    <div className="page">
      <div className="stat-row">
        <Tile label="TOTAL AGENTS" value={agents.length} />
        <Tile label="WORKING NOW" value={active} tone="var(--green)" />
        <Tile label="OPEN SESSIONS" value={totalSessions} tone="var(--blue)" />
        <Tile label="ERRORS" value={errors} tone={errors ? "var(--red)" : undefined} />
      </div>

      <section className="panel page-panel">
        <div className="section-head">
          <div>
            <h2>AGENTS</h2>
            <p className="label">READ-ONLY · OBSERVED VIA GATEWAY EVENTS</p>
          </div>
          <span className="readonly-banner">
            <LockIcon width={13} height={13} /> READ-ONLY
          </span>
        </div>
        <div className="page-scroll">
          <table className="dtable">
            <thead>
              <tr>
                <th>AGENT</th>
                <th>ROLE</th>
                <th>STATUS</th>
                <th>LAST ACTIVITY</th>
                <th>SESSIONS</th>
                <th>TOOLS</th>
                <th>ERRORS</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((a) => (
                <tr key={a.id}>
                  <td className="strong">{a.label}</td>
                  <td>{a.role}</td>
                  <td>
                    <span className="chip" style={{ color: statusColor(a.status) }}>
                      <span className={`dot ${statusToneClass(a.status)}`} />
                      {statusLabel[a.status]}
                    </span>
                  </td>
                  <td>{timeAgo(a.lastActivity)}</td>
                  <td>{a.sessions}</td>
                  <td>
                    <div className="tool-tags">
                      {a.tools.map((t) => (
                        <span className="tool-tag" key={t}>
                          {t}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className={a.errors ? "text-red" : ""}>{a.errors}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Tile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <div className="stat-tile">
      <span className="label">{label}</span>
      <div className="n" style={tone ? { color: tone } : undefined}>
        {value}
      </div>
    </div>
  );
}
