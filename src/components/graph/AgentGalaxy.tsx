import { Suspense, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { AttractorField } from "@/components/graph/galaxy/AttractorField";
import { Planets, SimClock } from "@/components/graph/galaxy/Planets";
import { FallbackGraph } from "@/components/graph/FallbackGraph";
import { useObservatory } from "@/state/observatory";
import { hasWebGL } from "@/lib/webgl";
import { COLORS, statusLabel } from "@/lib/theme";

const STATUS_LEGEND = [
  { tone: "green", label: "ACTIVE" },
  { tone: "blue", label: "THINKING" },
  { tone: "amber", label: "WAITING" },
  { tone: "red", label: "RISK / ERROR" },
  { tone: "", label: "COMPLETE / IDLE" },
] as const;

const NEBULA_A = "#1f3bff";
const NEBULA_B = COLORS.green;

export function AgentGalaxy() {
  const { nodes, edges, onFire } = useObservatory();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [spin, setSpin] = useState(true);
  const [paused, setPaused] = useState(false);
  const [dense, setDense] = useState(true);
  const wrapRef = useRef<HTMLDivElement>(null);
  const simTimeRef = useRef(0);
  const webgl = useMemo(() => hasWebGL(), []);

  const gateway = useMemo(() => nodes.find((n) => n.kind === "gateway"), [nodes]);
  const agents = useMemo(() => nodes.filter((n) => n.kind === "agent"), [nodes]);

  const size = dense ? 512 : 288; // particle count = size²; HD doubles fidelity
  const particleCount = size * size;
  const activeAgents = agents.filter(
    (a) => a.status === "active" || a.status === "executing",
  ).length;

  const selected = selectedId ? nodes.find((n) => n.id === selectedId) ?? null : null;
  const timeScale = paused ? 0 : 1;

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
          camera={{ position: [0, 8, 12], fov: 32 }}
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: false, stencil: false, depth: true }}
          onPointerMissed={() => setSelectedId(null)}
        >
          <color attach="background" args={["#030308"]} />
          <fog attach="fog" args={["#030308", 22, 60]} />
          <ambientLight intensity={0.4} />
          <directionalLight position={[6, 8, 4]} intensity={1.2} color="#dbe6f4" />
          <directionalLight position={[-8, -2, -6]} intensity={0.4} color="#3a4f86" />
          <pointLight position={[0, 0, 0]} intensity={8} color={NEBULA_B} distance={14} decay={2} />

          <Suspense fallback={null}>
            <SimClock simTimeRef={simTimeRef} timeScale={timeScale} />
            <AttractorField
              agents={agents}
              size={size}
              colorA={NEBULA_A}
              colorB={NEBULA_B}
              timeScale={timeScale}
              simTimeRef={simTimeRef}
            />
            <Planets
              gateway={gateway}
              agents={agents}
              simTimeRef={simTimeRef}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onFire={onFire}
            />
            <EffectComposer multisampling={0} stencilBuffer={false}>
              <Bloom intensity={0.9} luminanceThreshold={0.2} luminanceSmoothing={0.85} mipmapBlur />
            </EffectComposer>
          </Suspense>

          <OrbitControls
            makeDefault
            enablePan={false}
            enableDamping
            dampingFactor={0.08}
            autoRotate={spin}
            autoRotateSpeed={0.4}
            minDistance={4}
            maxDistance={34}
            maxPolarAngle={Math.PI - 0.35}
            minPolarAngle={0.35}
            target={[0, 0, 0]}
          />
        </Canvas>
      ) : (
        <>
          <div className="webgl-fallback-note">WEBGL UNAVAILABLE · 2D FALLBACK</div>
          <FallbackGraph nodes={nodes} edges={edges} />
        </>
      )}

      {/* Map controls */}
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
          title={paused ? "Resume simulation" : "Pause simulation"}
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
        <button
          className={`map-ctrl ${dense ? "active" : ""}`}
          onClick={() => setDense((d) => !d)}
          title="Toggle particle density"
        >
          HD
        </button>
        <button className="map-ctrl" onClick={toggleFullscreen} title="Fullscreen" aria-label="Fullscreen">
          <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.4">
            <path d="M2 6V2h4M14 6V2h-4M2 10v4h4M14 10v4h-4" />
          </svg>
        </button>
      </div>

      <div className="canvas-hud">
        <div className="hud-chip">
          <span className="dot green live-dot" /> {activeAgents}/{agents.length} PLANETS ACTIVE
        </div>
        <div className="hud-chip">{(particleCount / 1000).toFixed(0)}K PARTICLES</div>
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
