import { Suspense, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Scene } from "@/components/graph/Scene";
import { FallbackGraph } from "@/components/graph/FallbackGraph";
import { useObservatory } from "@/state/observatory";
import { hasWebGL } from "@/lib/webgl";
import { statusLabel } from "@/lib/theme";

const LEGEND = [
  { tone: "green", label: "ACTIVE" },
  { tone: "blue", label: "THINKING" },
  { tone: "amber", label: "WAITING" },
  { tone: "red", label: "RISK / ERROR" },
  { tone: "", label: "COMPLETE / IDLE" },
] as const;

export function AgentNetwork() {
  const { nodes, edges, onFire } = useObservatory();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const webgl = useMemo(() => hasWebGL(), []);

  const selected = selectedId
    ? nodes.find((n) => n.id === selectedId) ?? null
    : null;

  const counts = useMemo(() => {
    const agents = nodes.filter((n) => n.kind === "agent").length;
    const tools = nodes.filter((n) => n.kind === "tool" || n.kind === "memory").length;
    return { agents, tools };
  }, [nodes]);

  return (
    <div className="canvas-wrap">
      {webgl ? (
        <Canvas
          camera={{ position: [11, 10, 13], fov: 38 }}
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: false }}
          onPointerMissed={() => setSelectedId(null)}
        >
          <Suspense fallback={null}>
            <Scene
              nodes={nodes}
              edges={edges}
              onFire={onFire}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          </Suspense>
        </Canvas>
      ) : (
        <>
          <div className="webgl-fallback-note">WEBGL UNAVAILABLE · 2D FALLBACK</div>
          <FallbackGraph nodes={nodes} edges={edges} />
        </>
      )}

      <div className="canvas-hud">
        <div className="hud-chip">
          <span className="dot green live-dot" /> {counts.agents} AGENTS
        </div>
        <div className="hud-chip">{counts.tools} TOOLS · {edges.length} LINKS</div>
        {selected && (
          <div className="hud-chip" style={{ borderColor: "var(--line-strong)" }}>
            {selected.label} · {statusLabel[selected.status]}
          </div>
        )}
      </div>

      <div className="canvas-legend">
        {LEGEND.map((l) => (
          <div className="item" key={l.label}>
            <span className={`dot ${l.tone}`} />
            {l.label}
          </div>
        ))}
      </div>
    </div>
  );
}
