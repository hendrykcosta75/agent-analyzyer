import { useMemo } from "react";
import { useObservatory } from "@/state/observatory";
import { clock, timeAgo } from "@/lib/time";
import { LockIcon, RisksIcon } from "@/components/icons";

export function RisksPage() {
  const { events } = useObservatory();

  const risks = useMemo(
    () =>
      events.filter((e) => e.severity === "error" || e.severity === "warning"),
    [events],
  );

  const critical = risks.filter((e) => e.severity === "error").length;
  const warnings = risks.filter((e) => e.severity === "warning").length;

  return (
    <div className="page">
      <div className="stat-row">
        <div className="stat-tile">
          <span className="label">OPEN RISKS</span>
          <div className="n" style={{ color: risks.length ? "var(--red)" : undefined }}>
            {risks.length}
          </div>
        </div>
        <div className="stat-tile">
          <span className="label">CRITICAL</span>
          <div className="n text-red">{critical}</div>
        </div>
        <div className="stat-tile">
          <span className="label">WARNINGS</span>
          <div className="n text-amber">{warnings}</div>
        </div>
        <div className="stat-tile">
          <span className="label">MITIGATION</span>
          <div className="n" style={{ fontSize: 14, paddingTop: 8 }}>
            OBSERVE-ONLY
          </div>
        </div>
      </div>

      <section className="panel page-panel">
        <div className="section-head">
          <div>
            <h2>RISKS & ERRORS</h2>
            <p className="label">NO OPERATIONAL ACTIONS IN MVP</p>
          </div>
          <span className="readonly-banner">
            <LockIcon width={13} height={13} /> READ-ONLY
          </span>
        </div>
        <div className="page-scroll">
          {risks.length === 0 ? (
            <div className="empty">NO RISKS DETECTED</div>
          ) : (
            <div className="event-list">
              {risks.map((e) => (
                <div className="event-row" key={e.id} style={{ gridTemplateColumns: "64px 18px 1fr auto" }}>
                  <span className="ts">{clock(e.ts)}</span>
                  <span className={`dot ${e.severity === "error" ? "red" : "amber"}`} />
                  <span className="summary" style={{ color: "var(--text-0)" }}>
                    <RisksIcon
                      width={12}
                      height={12}
                      style={{
                        verticalAlign: "-2px",
                        marginRight: 8,
                        color: e.severity === "error" ? "var(--red)" : "var(--amber)",
                      }}
                    />
                    {e.summary}
                  </span>
                  <span className="type" style={{ color: e.severity === "error" ? "var(--red)" : "var(--amber)" }}>
                    {e.severity.toUpperCase()} · {timeAgo(e.ts)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
