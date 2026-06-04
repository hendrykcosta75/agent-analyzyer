import { useObservatory } from "@/state/observatory";

const W = 240;
const H = 70;

export function GatewayHealth() {
  const { metrics, connectors } = useObservatory();
  const series = metrics.latencySeries;
  const max = Math.max(...series, 1);
  const min = Math.min(...series, 0);
  const span = Math.max(1, max - min);

  const points = series
    .map((v, i) => {
      const x = (i / (series.length - 1)) * W;
      const y = H - ((v - min) / span) * (H - 8) - 4;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const gw = connectors.find((c) => c.kind === "openclaw");

  return (
    <div className="metric-card">
      <div className="card-head">
        <h3>GATEWAY HEALTH</h3>
        <span className="eyebrow">{gw?.name ?? "OPENCLAW GATEWAY"}</span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span className="big">{metrics.latencyMs}</span>
        <span className="delta text-blue">ms RTT</span>
      </div>
      <div className="card-body">
        <svg className="spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
          <defs>
            <linearGradient id="gw-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8ac9ff" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#8ac9ff" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon points={`0,${H} ${points} ${W},${H}`} fill="url(#gw-fill)" />
          <polyline
            points={points}
            fill="none"
            stroke="#8ac9ff"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}
