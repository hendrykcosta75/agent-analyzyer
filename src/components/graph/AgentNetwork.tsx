import { Suspense, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Scene, type MapView } from "@/components/graph/Scene";
import { FallbackGraph } from "@/components/graph/FallbackGraph";
import { useObservatory } from "@/state/observatory";
import { hasWebGL } from "@/lib/webgl";
import { statusLabel } from "@/lib/theme";

const STATUS_LEGEND = [
  { tone: "green", label: "ACTIVE" },
  { tone: "blue", label: "THINKING" },
  { tone: "amber", label: "WAITING" },
  { tone: "red", label: "RISK / ERROR" },
  { tone: "", label: "COMPLETE / IDLE" },
] as const;

const VIEWS: { id: MapView; label: string }[] = [
  { id: "facility", label: "FACILITY" },
  { id: "routes", label: "ROUTES" },
  { id: "regions", label: "REGIONS" },
  { id: "flow", label: "FLOW" },
];

export function AgentNetwork() {
  const { nodes, edges, onFire, addAgent } = useObservatory();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<MapView>("facility");
  const [spin, setSpin] = useState(true);
  const [highFx, setHighFx] = useState(true);
  const wrapRef = useRef<HTMLDivElement>(null);
  const webgl = useMemo(() => hasWebGL(), []);

  const selected = selectedId ? nodes.find((n) => n.id === selectedId) ?? null : null;

  const counts = useMemo(() => {
    const agents = nodes.filter((n) => n.kind === "agent").length;
    const activeAgents = nodes.filter(
      (n) => n.kind === "agent" && (n.status === "active" || n.status === "executing"),
    ).length;
    const caps = nodes.filter((n) => n.kind === "tool" || n.kind === "memory").length;
    return { agents, activeAgents, caps };
  }, [nodes]);

  const toggleFullscreen = () => {
    const el = wrapRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen?.();
  };

  return (
    <div className="canvas-wrap" ref={wrapRef}>
      {webgl ? (
        <Canvas
          camera={{ position: [15, 13, 16], fov: 36 }}
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: false, stencil: false, depth: true }}
          onPointerMissed={() => setSelectedId(null)}
        >
          <Suspense fallback={null}>
            <Scene
              nodes={nodes}
              edges={edges}
              onFire={onFire}
              selectedId={selectedId}
              onSelect={setSelectedId}
              view={view}
              spin={spin}
              highFx={highFx}
            />
          </Suspense>
        </Canvas>
      ) : (
        <>
          <div className="webgl-fallback-note">WEBGL UNAVAILABLE · 2D FALLBACK</div>
          <FallbackGraph nodes={nodes} edges={edges} />
        </>
      )}

      {/* View tabs */}
      <div className="map-tabs">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            className={`map-tab ${view === v.id ? "active" : ""}`}
            onClick={() => setView(v.id)}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Map controls */}
      <div className="map-controls">
        <button
          className={`map-ctrl ${spin ? "active" : ""}`}
          onClick={() => setSpin((s) => !s)}
          title="Toggle auto-orbit"
        >
          3D
        </button>
        <button className="map-ctrl" onClick={toggleFullscreen} title="Fullscreen" aria-label="Fullscreen">
          <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.4">
            <path d="M2 6V2h4M14 6V2h-4M2 10v4h4M14 10v4h-4" />
          </svg>
        </button>
        <button
          className={`map-ctrl ${highFx ? "active" : ""}`}
          onClick={() => setHighFx((q) => !q)}
          title="Toggle high-detail effects (AO / AA)"
          aria-label="Quality"
        >
          <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.4">
            <path d="M2 4h12M2 8h12M2 12h12" />
            <circle cx="6" cy="4" r="1.6" fill="currentColor" stroke="none" />
            <circle cx="10" cy="8" r="1.6" fill="currentColor" stroke="none" />
            <circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none" />
          </svg>
        </button>
      </div>

      <div className="canvas-hud">
        <div className="hud-chip">
          <span className="dot green live-dot" /> {counts.activeAgents}/{counts.agents} AGENTS ACTIVE
        </div>
        <div className="hud-chip">
          {counts.caps} CAPABILITIES · {edges.length} LINKS
        </div>
        {selected && (
          <div className="hud-chip" style={{ borderColor: "var(--line-strong)" }}>
            {selected.label} · {statusLabel[selected.status]}
          </div>
        )}
        <button className="hud-chip hud-action" onClick={addAgent} title="Simulate an OpenClaw config change">
          + ADD REGION
        </button>
      </div>

      <div className="canvas-legend">
        <div className="legend-title">STATUS</div>
        {STATUS_LEGEND.map((l) => (
          <div className="item" key={l.label}>
            <span className={`dot ${l.tone}`} />
            {l.label}
          </div>
        ))}
      </div>
    </div>
  );
}
