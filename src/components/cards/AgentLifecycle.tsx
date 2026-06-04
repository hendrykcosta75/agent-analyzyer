import { useObservatory } from "@/state/observatory";
import { statusColor } from "@/lib/theme";

const R = 34;
const C = 2 * Math.PI * R;

export function AgentLifecycle() {
  const { metrics, agents } = useObservatory();
  const slices = metrics.lifecycle;
  const total = agents.length || 1;

  let offset = 0;
  const arcs = slices.map((s) => {
    const frac = s.count / total;
    const arc = {
      status: s.status,
      dash: frac * C,
      gap: C - frac * C,
      offset: -offset * C,
      color: statusColor(s.status),
    };
    offset += frac;
    return arc;
  });

  return (
    <div className="metric-card">
      <div className="card-head">
        <h3>AGENT LIFECYCLE</h3>
        <span className="eyebrow">DISTRIBUTION</span>
      </div>
      <div className="card-body">
        <div className="donut-wrap">
          <div className="donut">
            <svg viewBox="0 0 84 84">
              <circle
                cx="42"
                cy="42"
                r={R}
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="8"
              />
              {arcs.map((a) => (
                <circle
                  key={a.status}
                  cx="42"
                  cy="42"
                  r={R}
                  fill="none"
                  stroke={a.color}
                  strokeWidth="8"
                  strokeDasharray={`${a.dash} ${a.gap}`}
                  strokeDashoffset={a.offset}
                  transform="rotate(-90 42 42)"
                  strokeLinecap="butt"
                />
              ))}
            </svg>
            <div className="center">
              <div className="t">TOTAL</div>
              <div className="n">{total}</div>
            </div>
          </div>
          <div className="legend-list">
            {slices.map((s) => (
              <div className="li" key={s.status}>
                <span className="pct" style={{ color: statusColor(s.status) }}>
                  {s.count}
                </span>
                <span className="dot" style={{ background: statusColor(s.status) }} />
                <span className="name">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
