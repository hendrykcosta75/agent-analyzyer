import { useObservatory } from "@/state/observatory";

export function EventVelocity() {
  const { metrics } = useObservatory();
  const max = Math.max(...metrics.velocitySeries, 1);

  return (
    <div className="metric-card">
      <div className="card-head">
        <h3>EVENT VELOCITY</h3>
        <span className="eyebrow">EVENTS / MIN</span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline" }}>
        <span className="big">{metrics.eventsPerMin}</span>
        <span className="delta text-green">↑ {metrics.velocityTrend}%</span>
      </div>
      <div className="card-body">
        <div className="bars">
          {metrics.velocitySeries.map((v, i) => (
            <div
              key={i}
              className="bar"
              style={{ height: `${Math.max(4, (v / max) * 100)}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
