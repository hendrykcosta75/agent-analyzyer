import { useMemo } from "react";
import { useObservatory } from "@/state/observatory";
import { statusColor, statusLabel } from "@/lib/theme";
import { clock, duration } from "@/lib/time";
import { LockIcon } from "@/components/icons";

export function SessionsPage() {
  const { sessions } = useObservatory();

  const ordered = useMemo(
    () =>
      [...sessions].sort(
        (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
      ),
    [sessions],
  );

  return (
    <div className="page">
      <section className="panel page-panel">
        <div className="section-head">
          <div>
            <h2>SESSIONS</h2>
            <p className="label">EXECUTION TIMELINE · READ-ONLY</p>
          </div>
          <span className="readonly-banner">
            <LockIcon width={13} height={13} /> READ-ONLY
          </span>
        </div>
        <div className="page-scroll">
          <div className="timeline">
            {ordered.map((s, i) => {
              const color = statusColor(s.status);
              return (
                <div className="tl-item" key={s.id}>
                  <div className="when">{clock(s.startedAt)}</div>
                  <div className="tl-rail">
                    <span
                      className="node"
                      style={{ background: color, boxShadow: `0 0 8px ${color}` }}
                    />
                    {i < ordered.length - 1 && <span className="line" />}
                  </div>
                  <div className="tl-card" style={{ borderLeft: `2px solid ${color}` }}>
                    <div className="t">{s.title}</div>
                    <div className="sub">
                      <span>{s.agentLabel}</span>
                      <span style={{ color }}>{statusLabel[s.status]}</span>
                      <span>{s.steps} STEPS</span>
                      <span>{duration(s.durationMs)}</span>
                      <span className="mono">{s.id.toUpperCase()}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
