import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Grid, Html, Line, OrbitControls } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";
import type { VisualEdge, VisualNode } from "@/types/visual";
import { COLORS, edgeColor, statusColor } from "@/lib/theme";

interface SceneProps {
  nodes: VisualNode[];
  edges: VisualEdge[];
  onFire: (cb: (edgeIds: string[]) => void) => () => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

const SIZE: Record<string, number> = {
  gateway: 0.95,
  agent: 0.5,
  default: 0.28,
};

function nodeVec(n: VisualNode): THREE.Vector3 {
  return new THREE.Vector3(n.x ?? 0, n.y ?? 0, n.z ?? 0);
}

export function Scene({ nodes, edges, onFire, selectedId, onSelect }: SceneProps) {
  const positions = useMemo(() => {
    const map = new Map<string, THREE.Vector3>();
    nodes.forEach((n) => map.set(n.id, nodeVec(n)));
    return map;
  }, [nodes]);

  const curves = useMemo(() => {
    const map = new Map<string, THREE.QuadraticBezierCurve3>();
    edges.forEach((e) => {
      const a = positions.get(e.source);
      const b = positions.get(e.target);
      if (!a || !b) return;
      const mid = a.clone().lerp(b, 0.5);
      mid.y += a.distanceTo(b) * 0.18 + 0.4;
      map.set(e.id, new THREE.QuadraticBezierCurve3(a, mid, b));
    });
    return map;
  }, [edges, positions]);

  return (
    <>
      <color attach="background" args={["#040406"]} />
      <fog attach="fog" args={["#040406", 18, 40]} />
      <ambientLight intensity={0.35} />
      <pointLight position={[0, 12, 0]} intensity={40} color={COLORS.green} distance={40} />
      <pointLight position={[12, 8, 12]} intensity={20} color="#5b6cff" distance={50} />

      <Grid
        position={[0, -0.9, 0]}
        args={[60, 60]}
        cellSize={1.4}
        cellThickness={0.5}
        cellColor="#13331a"
        sectionSize={7}
        sectionThickness={1}
        sectionColor="#1d4a2a"
        fadeDistance={34}
        fadeStrength={1.5}
        infiniteGrid
      />

      <GraphEdges edges={edges} curves={curves} />
      <FlowPulses edges={edges} curves={curves} onFire={onFire} />

      {nodes.map((n) => (
        <GraphNode
          key={n.id}
          node={n}
          selected={selectedId === n.id}
          dimmed={selectedId !== null && selectedId !== n.id}
          onSelect={onSelect}
        />
      ))}

      <OrbitControls
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={8}
        maxDistance={32}
        minPolarAngle={0.25}
        maxPolarAngle={Math.PI / 2.25}
        target={[0, 0, 0]}
      />

      <EffectComposer>
        <Bloom
          intensity={1.05}
          luminanceThreshold={0.18}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
      </EffectComposer>
    </>
  );
}

/* ---------------- Nodes ---------------- */

function GraphNode({
  node,
  selected,
  dimmed,
  onSelect,
}: {
  node: VisualNode;
  selected: boolean;
  dimmed: boolean;
  onSelect: (id: string | null) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const color = statusColor(node.status);
  const size = SIZE[node.kind] ?? SIZE.default;
  const isAlive =
    node.status === "active" ||
    node.status === "executing" ||
    node.status === "thinking";
  const showLabel = node.kind !== "tool" || hovered || selected;

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (meshRef.current) {
      const pulse = isAlive ? 1 + Math.sin(t * 3 + (node.x ?? 0)) * 0.06 : 1;
      meshRef.current.scale.setScalar(pulse * (selected ? 1.25 : 1));
    }
    if (haloRef.current) {
      const mat = haloRef.current.material as THREE.MeshBasicMaterial;
      const base = node.status === "error" ? 0.22 : isAlive ? 0.16 : 0.06;
      mat.opacity = base + (isAlive ? Math.sin(t * 3) * 0.05 : 0);
    }
  });

  const emissiveIntensity =
    node.status === "error" ? 2.4 : isAlive ? 2.0 : node.kind === "gateway" ? 1.6 : 0.7;

  return (
    <group position={[node.x ?? 0, node.y ?? 0, node.z ?? 0]}>
      <mesh
        ref={meshRef}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = "auto";
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(selected ? null : node.id);
        }}
      >
        {node.kind === "gateway" ? (
          <icosahedronGeometry args={[size, 0]} />
        ) : node.kind === "agent" ? (
          <octahedronGeometry args={[size, 0]} />
        ) : (
          <boxGeometry args={[size, size, size]} />
        )}
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={dimmed ? emissiveIntensity * 0.4 : emissiveIntensity}
          roughness={0.35}
          metalness={0.1}
          transparent
          opacity={dimmed ? 0.5 : 1}
        />
      </mesh>

      {/* Ground halo ring */}
      <mesh ref={haloRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.85, 0]}>
        <ringGeometry args={[size * 1.6, size * 2.2, 36]} />
        <meshBasicMaterial color={color} transparent opacity={0.12} side={THREE.DoubleSide} />
      </mesh>

      {showLabel && (
        <Html
          position={[0, size + 0.55, 0]}
          center
          style={{ pointerEvents: "none" }}
          zIndexRange={[10, 0]}
        >
          <div className={`node-label ${dimmed ? "dim" : ""}`}>
            <span className="nl-name">{node.label}</span>
            {node.detail && <span className="nl-detail">{node.detail}</span>}
          </div>
        </Html>
      )}
    </group>
  );
}

/* ---------------- Edges ---------------- */

function GraphEdges({
  edges,
  curves,
}: {
  edges: VisualEdge[];
  curves: Map<string, THREE.QuadraticBezierCurve3>;
}) {
  return (
    <>
      {edges.map((e) => {
        const curve = curves.get(e.id);
        if (!curve) return null;
        const pts = curve.getPoints(28);
        const color = e.status === "muted" ? COLORS.white : edgeColor(e.status);
        const opacity =
          e.status === "muted" ? 0.1 : e.status === "risk" ? 0.55 : 0.32;
        return (
          <Line
            key={e.id}
            points={pts}
            color={color}
            lineWidth={e.status === "risk" ? 1.4 : 1}
            transparent
            opacity={opacity}
          />
        );
      })}
    </>
  );
}

/* ---------------- Flow pulses ---------------- */

interface FlowDot {
  edgeId: string;
  phase: number;
  baseSpeed: number;
}

function FlowPulses({
  edges,
  curves,
  onFire,
}: {
  edges: VisualEdge[];
  curves: Map<string, THREE.QuadraticBezierCurve3>;
  onFire: (cb: (edgeIds: string[]) => void) => () => void;
}) {
  const firedRef = useRef(new Map<string, number>());

  useEffect(() => {
    const unsub = onFire((edgeIds) => {
      const now = performance.now();
      edgeIds.forEach((id, i) => firedRef.current.set(id, now + i * 140));
    });
    return unsub;
  }, [onFire]);

  const dots = useMemo<FlowDot[]>(() => {
    const list: FlowDot[] = [];
    edges.forEach((e) => {
      if (!curves.has(e.id)) return;
      const n = e.status === "muted" ? 1 : 2;
      for (let i = 0; i < n; i++) {
        list.push({
          edgeId: e.id,
          phase: i / n + Math.random() * 0.2,
          baseSpeed: 0.12 + (e.velocity ?? 0.3) * 0.4,
        });
      }
    });
    return list;
  }, [edges, curves]);

  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const edgeById = useMemo(
    () => new Map(edges.map((e) => [e.id, e])),
    [edges],
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const now = performance.now();
    dots.forEach((dot, i) => {
      const mesh = meshRefs.current[i];
      const curve = curves.get(dot.edgeId);
      if (!mesh || !curve) return;
      const edge = edgeById.get(dot.edgeId);

      const firedAt = firedRef.current.get(dot.edgeId) ?? -1;
      const sinceFire = now - firedAt;
      const fireBoost =
        firedAt > 0 && sinceFire >= 0 && sinceFire < 1400
          ? 1 - sinceFire / 1400
          : 0;

      const speed = dot.baseSpeed + fireBoost * 0.9;
      const u = (t * speed + dot.phase) % 1;
      const p = curve.getPoint(u);
      mesh.position.set(p.x, p.y, p.z);

      const muted = edge?.status === "muted";
      const baseVis = muted ? 0.0 : edge?.status === "risk" ? 0.9 : 0.55;
      const vis = Math.max(baseVis, fireBoost);
      const scale = (muted ? 0.05 : 0.09) + fireBoost * 0.16 + vis * 0.05;
      mesh.scale.setScalar(scale);

      const mat = mesh.material as THREE.MeshBasicMaterial;
      const fired = fireBoost > 0;
      const color =
        edge?.status === "risk"
          ? COLORS.red
          : fired
            ? COLORS.green
            : edge?.status === "completed"
              ? COLORS.white
              : edgeColor(edge?.status ?? "muted");
      mat.color.set(color);
      mat.opacity = Math.min(1, vis + fireBoost);
    });
  });

  return (
    <>
      {dots.map((_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            meshRefs.current[i] = el;
          }}
        >
          <sphereGeometry args={[1, 10, 10]} />
          <meshBasicMaterial color={COLORS.green} transparent opacity={0.6} toneMapped={false} />
        </mesh>
      ))}
    </>
  );
}
