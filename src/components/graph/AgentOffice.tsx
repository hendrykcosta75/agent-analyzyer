import { Suspense, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { Office } from "@/components/graph/office/Office";
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

export function AgentOffice() {
  const { nodes, edges, onFire } = useObservatory();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [spin, setSpin] = useState(false);
  const [paused, setPaused] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const webgl = useMemo(() => hasWebGL(), []);

  const gateway = useMemo(() => nodes.find((n) => n.kind === "gateway"), [nodes]);
  const agents = useMemo(() => nodes.filter((n) => n.kind === "agent"), [nodes]);

  const activeAgents = agents.filter(
    (a) => a.status === "active" || a.status === "executing",
  ).length;

  const selected = selectedId ? nodes.find((n) => n.id === selectedId) ?? null : null;

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
          shadows
          camera={{ position: [0, 11, 15], fov: 36 }}
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: false, stencil: false, depth: true }}
          onPointerMissed={() => setSelectedId(null)}
        >
          <color attach="background" args={["#070810"]} />
          <fog attach="fog" args={["#070810", 28, 60]} />
          <hemisphereLight args={["#cfd9ee", "#0b0d14", 0.7]} />
          <ambientLight intensity={0.35} />
          <directionalLight
            position={[8, 14, 8]}
            intensity={1.1}
            color="#fff4e0"
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
            shadow-camera-left={-14}
            shadow-camera-right={14}
            shadow-camera-top={14}
            shadow-camera-bottom={-14}
            shadow-camera-near={1}
            shadow-camera-far={40}
          />
          <directionalLight position={[-10, 6, -4]} intensity={0.3} color="#5f7bd0" />
          <pointLight position={[0, 4.5, 1]} intensity={18} color="#ffdca8" distance={16} decay={2} />

          <Suspense fallback={null}>
            <Office
              gateway={gateway}
              agents={agents}
              nodes={nodes}
              edges={edges}
              paused={paused}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onFire={onFire}
            />
            <EffectComposer multisampling={0} stencilBuffer={false}>
              <Bloom intensity={0.6} luminanceThreshold={0.4} luminanceSmoothing={0.85} mipmapBlur />
            </EffectComposer>
          </Suspense>

          <OrbitControls
            makeDefault
            enablePan={false}
            enableDamping
            dampingFactor={0.08}
            autoRotate={spin}
            autoRotateSpeed={0.3}
            minDistance={8}
            maxDistance={32}
            maxPolarAngle={Math.PI / 2 - 0.08}
            minPolarAngle={0.25}
            target={[0, 1, 0.5]}
          />
        </Canvas>
      ) : (
        <>
          <div className="webgl-fallback-note">WEBGL UNAVAILABLE · 2D FALLBACK</div>
          <FallbackGraph nodes={nodes} edges={edges} />
        </>
      )}

      <div className="map-controls">
        <button
          className={`map-ctrl ${spin ? "active" : ""}`}
          onClick={() => setSpin((s) => !s)}
          title="Toggle auto-orbit"
        >
          3D
        </button>
        <button
          className={`map-ctrl ${!paused ? "active" : ""}`}
          onClick={() => setPaused((p) => !p)}
          title={paused ? "Resume office" : "Pause office"}
          aria-label="Play / pause"
        >
          {paused ? (
            <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
              <path d="M4 3l9 5-9 5z" />
            </svg>
          ) : (
            <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
              <rect x="4" y="3" width="3" height="10" />
              <rect x="9" y="3" width="3" height="10" />
            </svg>
          )}
        </button>
        <button className="map-ctrl" onClick={toggleFullscreen} title="Fullscreen" aria-label="Fullscreen">
          <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.4">
            <path d="M2 6V2h4M14 6V2h-4M2 10v4h4M14 10v4h-4" />
          </svg>
        </button>
      </div>

      <div className="canvas-hud">
        <div className="hud-chip">
          <span className="dot green live-dot" /> {activeAgents}/{agents.length} AGENTS WORKING
        </div>
        <div className="hud-chip">{agents.length} DESKS · 4 STATIONS</div>
        {selected && (
          <div className="hud-chip" style={{ borderColor: "var(--line-strong)" }}>
            {selected.label} · {statusLabel[selected.status]}
          </div>
        )}
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
