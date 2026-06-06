import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard, ContactShadows, Html, Line, OrbitControls } from "@react-three/drei";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import * as THREE from "three";
import type { EdgeStatus, NodeStatus, VisualEdge, VisualNode } from "@/types/visual";
import { COLORS, edgeColor, statusColor, statusLabel } from "@/lib/theme";
import { getChipBorderTexture, getChipTexture, getGlyphTexture, glyphKeyFor } from "@/lib/glyphs";

export type MapView = "facility" | "routes" | "regions" | "flow";

interface SceneProps {
  nodes: VisualNode[];
  edges: VisualEdge[];
  onFire: (cb: (edgeIds: string[]) => void) => () => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  view: MapView;
  spin: boolean;
  highFx: boolean;
}

const SIZE: Record<string, number> = { gateway: 0.95, agent: 0.5, default: 0.24 };
const ROUTE_Y = 0.12;
const GROUND_Y = -0.5;
const CELL = 1.8;
const SPAN = 15;
const ROAD_EVERY = 3;
const BLOCK = CELL * ROAD_EVERY; // street spacing in world units

function isAlive(s: NodeStatus): boolean {
  return s === "active" || s === "executing" || s === "thinking";
}

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000;
}

function useGlowTexture(hex: string): THREE.CanvasTexture {
  return useMemo(() => {
    const size = 128;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, `${hex}dd`);
    g.addColorStop(0.3, `${hex}40`);
    g.addColorStop(1, `${hex}00`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [hex]);
}

/** Tileable street-grid texture for the facility ground plane. */
function useGridTexture(): THREE.CanvasTexture {
  return useMemo(() => {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#05070a";
    ctx.fillRect(0, 0, size, size);
    // minor lot lines
    ctx.strokeStyle = "rgba(150,170,190,0.05)";
    ctx.lineWidth = 1;
    const minor = size / ROAD_EVERY;
    for (let i = 0; i <= ROAD_EVERY; i++) {
      const p = i * minor;
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, size);
      ctx.moveTo(0, p);
      ctx.lineTo(size, p);
      ctx.stroke();
    }
    // main roads (tile border)
    ctx.strokeStyle = "rgba(150,170,190,0.12)";
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, size, size);
    // dashed centerline on the main road
    ctx.strokeStyle = "rgba(150,170,190,0.10)";
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 8]);
    ctx.beginPath();
    ctx.moveTo(size / 2, 0);
    ctx.lineTo(size / 2, size);
    ctx.moveTo(0, size / 2);
    ctx.lineTo(size, size / 2);
    ctx.stroke();
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    const repeat = (SPAN * 2 * CELL) / BLOCK;
    tex.repeat.set(repeat, repeat);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);
}

/* ---------------- Streets / routes ---------------- */

interface RoutePath {
  id: string;
  status: EdgeStatus;
  velocity: number;
  pts: THREE.Vector3[];
  cum: number[];
  total: number;
}

function snapToStreet(v: number): number {
  return Math.round(v / BLOCK) * BLOCK;
}

/** Z-shaped path whose mid-leg follows a street centerline. */
function buildRoutePoints(a: THREE.Vector3, b: THREE.Vector3): THREE.Vector3[] {
  const mid = snapToStreet((a.x + b.x) / 2);
  const raw = [
    new THREE.Vector3(a.x, ROUTE_Y, a.z),
    new THREE.Vector3(mid, ROUTE_Y, a.z),
    new THREE.Vector3(mid, ROUTE_Y, b.z),
    new THREE.Vector3(b.x, ROUTE_Y, b.z),
  ];
  const pts: THREE.Vector3[] = [];
  for (const p of raw) {
    if (!pts.length || pts[pts.length - 1].distanceTo(p) > 0.08) pts.push(p);
  }
  return pts.length > 1 ? pts : [raw[0], raw[raw.length - 1]];
}

function sampleRoute(r: RoutePath, u: number): THREE.Vector3 {
  const d = (u % 1) * r.total;
  for (let i = 0; i < r.pts.length - 1; i++) {
    if (d <= r.cum[i + 1]) {
      const seg = r.cum[i + 1] - r.cum[i] || 1;
      const t = (d - r.cum[i]) / seg;
      return r.pts[i].clone().lerp(r.pts[i + 1], t);
    }
  }
  return r.pts[r.pts.length - 1].clone();
}

export function Scene({ nodes, edges, onFire, selectedId, onSelect, view, spin, highFx }: SceneProps) {
  const positions = useMemo(() => {
    const map = new Map<string, THREE.Vector3>();
    nodes.forEach((n) => map.set(n.id, new THREE.Vector3(n.x ?? 0, n.y ?? 0, n.z ?? 0)));
    return map;
  }, [nodes]);

  const routes = useMemo<RoutePath[]>(() => {
    const list: RoutePath[] = [];
    edges.forEach((e) => {
      const a = positions.get(e.source);
      const b = positions.get(e.target);
      if (!a || !b) return;
      const pts = buildRoutePoints(a, b);
      const cum = [0];
      for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + pts[i - 1].distanceTo(pts[i]));
      list.push({ id: e.id, status: e.status, velocity: e.velocity ?? 0.3, pts, cum, total: cum[cum.length - 1] || 1 });
    });
    return list;
  }, [edges, positions]);

  const glow = useGlowTexture(COLORS.green);
  const grid = useGridTexture();

  const routeBoost = view === "routes" ? 1 : 0;
  const regionBoost = view === "regions" ? 1 : 0;
  const flowBoost = view === "flow" ? 1 : 0;

  return (
    <>
      <color attach="background" args={["#040507"]} />
      <fog attach="fog" args={["#040507", 18, 52]} />
      <ambientLight intensity={0.18} />
      <hemisphereLight intensity={0.22} color="#9fb6d4" groundColor="#05070a" />
      <directionalLight position={[10, 18, 6]} intensity={1.35} color="#dbe6f4" />
      <directionalLight position={[-12, 8, -8]} intensity={0.3} color="#34507a" />
      <pointLight position={[0, 7, 0]} intensity={16} color={COLORS.green} distance={22} decay={2} />

      {/* Facility ground with street grid */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, GROUND_Y, 0]} receiveShadow>
        <planeGeometry args={[SPAN * 2 * CELL, SPAN * 2 * CELL]} />
        <meshStandardMaterial map={grid} roughness={0.95} metalness={0.02} color="#0a0d12" />
      </mesh>

      <ContactShadows
        position={[0, GROUND_Y + 0.02, 0]}
        scale={SPAN * 2 * CELL}
        resolution={512}
        blur={2.4}
        far={5}
        opacity={0.55}
        color="#000000"
        frames={1}
      />

      {/* Hub light pool */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, GROUND_Y + 0.025, 0]}>
        <planeGeometry args={[10, 10]} />
        <meshBasicMaterial map={glow} transparent opacity={0.6} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>

      <RouteLines routes={routes} boost={routeBoost} />
      <JunctionDots routes={routes} />
      <FlowParticles routes={routes} sampleRoute={sampleRoute} onFire={onFire} flowBoost={flowBoost} />

      {nodes.map((n) => (
        <GraphNode
          key={n.id}
          node={n}
          selected={selectedId === n.id}
          dimmed={selectedId !== null && selectedId !== n.id}
          onSelect={onSelect}
          view={view}
          regionBoost={regionBoost}
        />
      ))}

      <OrbitControls
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        autoRotate={spin}
        autoRotateSpeed={0.32}
        minDistance={11}
        maxDistance={40}
        minPolarAngle={0.45}
        maxPolarAngle={Math.PI / 2.5}
        target={[0, 0, 0]}
      />

      <EffectComposer multisampling={highFx ? 4 : 0} stencilBuffer={false}>
        <Bloom intensity={0.95} luminanceThreshold={0.22} luminanceSmoothing={0.9} mipmapBlur />
      </EffectComposer>
    </>
  );
}

/* ---------------- Routes ---------------- */

function RouteLines({ routes, boost }: { routes: RoutePath[]; boost: number }) {
  return (
    <>
      {routes.map((r) => {
        const color = r.status === "muted" ? COLORS.dim : edgeColor(r.status);
        const baseOpacity = r.status === "muted" ? 0.14 : r.status === "risk" ? 0.6 : 0.42;
        const opacity = Math.min(1, baseOpacity + boost * 0.3);
        const width = (r.status === "risk" ? 1.6 : 1.1) + boost * 0.8;
        return (
          <Line key={r.id} points={r.pts} color={color} lineWidth={width} transparent opacity={opacity} />
        );
      })}
    </>
  );
}

/** Small markers at street corners / endpoints. */
function JunctionDots({ routes }: { routes: RoutePath[] }) {
  const dots = useMemo(() => {
    const list: { p: THREE.Vector3; status: EdgeStatus }[] = [];
    routes.forEach((r) => {
      if (r.status === "muted") return;
      r.pts.forEach((p, i) => {
        if (i === 0) return; // skip the source (hub/agent)
        list.push({ p, status: r.status });
      });
    });
    return list;
  }, [routes]);

  return (
    <>
      {dots.map((d, i) => (
        <mesh key={i} position={[d.p.x, ROUTE_Y, d.p.z]}>
          <sphereGeometry args={[0.045, 8, 8]} />
          <meshBasicMaterial color={edgeColor(d.status)} transparent opacity={0.6} toneMapped={false} />
        </mesh>
      ))}
    </>
  );
}

function FlowParticles({
  routes,
  sampleRoute: sample,
  onFire,
  flowBoost,
}: {
  routes: RoutePath[];
  sampleRoute: (r: RoutePath, u: number) => THREE.Vector3;
  onFire: (cb: (edgeIds: string[]) => void) => () => void;
  flowBoost: number;
}) {
  const firedRef = useRef(new Map<string, number>());

  useEffect(() => {
    const unsub = onFire((edgeIds) => {
      const now = performance.now();
      edgeIds.forEach((id, i) => firedRef.current.set(id, now + i * 140));
    });
    return unsub;
  }, [onFire]);

  const dots = useMemo(() => {
    const list: { routeIdx: number; phase: number; baseSpeed: number }[] = [];
    routes.forEach((r, idx) => {
      const n = r.status === "muted" ? 1 : 2 + flowBoost * 2;
      for (let i = 0; i < n; i++) {
        list.push({ routeIdx: idx, phase: i / n + Math.random() * 0.2, baseSpeed: 0.1 + r.velocity * 0.4 });
      }
    });
    return list;
  }, [routes, flowBoost]);

  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const now = performance.now();
    const speedMul = 1 + flowBoost * 0.8;
    dots.forEach((dot, i) => {
      const mesh = meshRefs.current[i];
      const r = routes[dot.routeIdx];
      if (!mesh || !r) return;
      const firedAt = firedRef.current.get(r.id) ?? -1;
      const since = now - firedAt;
      const boost = firedAt > 0 && since >= 0 && since < 1400 ? 1 - since / 1400 : 0;
      const speed = (dot.baseSpeed + boost * 0.9) * speedMul;
      const p = sample(r, t * speed + dot.phase);
      mesh.position.set(p.x, p.y, p.z);
      const muted = r.status === "muted";
      const baseVis = muted ? 0 : r.status === "risk" ? 0.9 : 0.6;
      const vis = Math.max(baseVis, boost);
      mesh.scale.setScalar((muted ? 0.04 : 0.09) + boost * 0.16 + vis * 0.04);
      const mat = mesh.material as THREE.MeshBasicMaterial;
      const color =
        r.status === "risk" ? COLORS.red : boost > 0 ? COLORS.green : r.status === "completed" ? COLORS.white : edgeColor(r.status);
      mat.color.set(color);
      mat.opacity = Math.min(1, vis + boost);
    });
  });

  return (
    <>
      {dots.map((_, i) => (
        <mesh key={i} ref={(el) => { meshRefs.current[i] = el; }}>
          <sphereGeometry args={[1, 10, 10]} />
          <meshBasicMaterial color={COLORS.green} transparent opacity={0.6} toneMapped={false} />
        </mesh>
      ))}
    </>
  );
}

/* ---------------- Nodes ---------------- */

function IconChip({ glyphKey, color, base }: { glyphKey: ReturnType<typeof glyphKeyFor>; color: string; base: number }) {
  const chip = getChipTexture();
  const border = getChipBorderTexture();
  const glyph = getGlyphTexture(glyphKey);
  return (
    <group>
      <mesh renderOrder={1}>
        <planeGeometry args={[base, base]} />
        <meshBasicMaterial map={chip} transparent opacity={0.92} color="#080b10" depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, 0.001]} renderOrder={2}>
        <planeGeometry args={[base, base]} />
        <meshBasicMaterial map={border} transparent opacity={0.95} color={color} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, 0.002]} renderOrder={3}>
        <planeGeometry args={[base * 0.62, base * 0.62]} />
        <meshBasicMaterial map={glyph} transparent opacity={1} color={color} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

function GraphNode({
  node,
  selected,
  dimmed,
  onSelect,
  view,
  regionBoost,
}: {
  node: VisualNode;
  selected: boolean;
  dimmed: boolean;
  onSelect: (id: string | null) => void;
  view: MapView;
  regionBoost: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const markerRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const sweepRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const bornRef = useRef<number | null>(null);

  const color = statusColor(node.status);
  const size = SIZE[node.kind] ?? SIZE.default;
  const alive = isAlive(node.status);
  const error = node.status === "error";
  const isGateway = node.kind === "gateway";
  const isAgentish = node.kind === "agent" || isGateway;
  const seed = (node.x ?? 0) + (node.z ?? 0);
  const elevation = isGateway ? 0.75 : node.kind === "agent" ? 0.6 : 0.46;
  const chipBase = node.kind === "agent" ? 0.95 : 0.66;
  const glyphKey = glyphKeyFor(node.kind, node.flavor);

  // Callouts: gateway + agents always; tools only on hover/select.
  const showCallout = isAgentish || hovered || selected;

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (bornRef.current === null) bornRef.current = t;
    const age = t - bornRef.current;
    const grow = Math.min(1, age / 0.6);
    const ease = 1 - Math.pow(1 - grow, 3); // ease-out cubic enter

    const mesh = meshRef.current;
    if (mesh && isGateway) {
      mesh.rotation.y = t * 0.2;
      mesh.scale.setScalar(ease * (1 + Math.sin(t * 1.6) * 0.05) * (selected ? 1.15 : 1));
    }

    const marker = markerRef.current;
    if (marker) {
      const work = node.status === "executing" || node.status === "active";
      const pulse = alive ? 1 + Math.sin(t * 2.6 + seed) * 0.05 : 1;
      const s = ease * pulse * (selected ? 1.25 : hovered ? 1.12 : 1);
      marker.scale.setScalar(s);
      marker.position.y = work ? Math.sin(t * 2.2 + seed) * 0.04 : 0;
    }

    if (ringRef.current) {
      const mat = ringRef.current.material as THREE.MeshBasicMaterial;
      const base = error ? 0.3 : alive ? 0.22 : 0.08;
      const region = isAgentish ? regionBoost * 0.28 : 0;
      mat.opacity = (base + region + (alive ? Math.sin(t * 1.8 + seed) * 0.05 : 0)) * (dimmed ? 0.4 : 1) * ease;
    }
    if (sweepRef.current) {
      sweepRef.current.rotation.z = -t * (node.status === "executing" ? 1.1 : 0.6) + seed;
    }
  });

  const emissive = error ? 2.4 : alive ? 1.9 : isGateway ? 1.6 : 0.6;
  const padR = isGateway ? 2.2 : node.kind === "agent" ? 1.5 : 0.62;

  return (
    <group position={[node.x ?? 0, 0, node.z ?? 0]}>
      {/* Ring-target pad on the ground */}
      <group position={[0, GROUND_Y + 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <mesh>
          <circleGeometry args={[padR, 48]} />
          <meshBasicMaterial color={color} transparent opacity={0.04 + (isAgentish ? regionBoost * 0.05 : 0)} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
        <mesh ref={ringRef}>
          <ringGeometry args={[padR - 0.03, padR, 64]} />
          <meshBasicMaterial color={color} transparent depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
        </mesh>
        <mesh>
          <ringGeometry args={[padR * 0.5, padR * 0.5 + 0.02, 48]} />
          <meshBasicMaterial color={color} transparent opacity={0.12} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
        {(alive || error) && isAgentish && (
          <mesh ref={sweepRef}>
            <ringGeometry args={[padR * 0.5, padR, 32, 1, 0, 0.55]} />
            <meshBasicMaterial color={color} transparent opacity={0.12} depthWrite={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} toneMapped={false} />
          </mesh>
        )}
      </group>

      {isGateway ? (
        <mesh
          ref={meshRef}
          position={[0, GROUND_Y + elevation, 0]}
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
          <boxGeometry args={[size, size, size]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={dimmed ? emissive * 0.35 : emissive}
            roughness={0.35}
            metalness={0.2}
            transparent
            opacity={dimmed ? 0.5 : 1}
          />
        </mesh>
      ) : (
        <Billboard position={[0, GROUND_Y + elevation, 0]}>
          <group
            ref={markerRef}
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
            <group visible={!dimmed || selected}>
              <IconChip glyphKey={glyphKey} color={color} base={chipBase} />
            </group>
            {dimmed && !selected && (
              <mesh>
                <planeGeometry args={[chipBase, chipBase]} />
                <meshBasicMaterial map={getChipTexture()} transparent opacity={0.18} color={color} depthWrite={false} toneMapped={false} />
              </mesh>
            )}
          </group>
        </Billboard>
      )}

      {showCallout && (view !== "regions" || isAgentish) && (
        <Callout node={node} dimmed={dimmed && !selected} markerY={GROUND_Y + elevation} />
      )}
    </group>
  );
}

/* ---------------- Leader-line callouts ---------------- */

function calloutFields(node: VisualNode): { name: string; sub?: string; metric?: string } {
  if (node.kind === "gateway") {
    return { name: node.label, sub: node.detail, metric: `${28 + Math.floor(hashStr(node.id) * 90)}ms` };
  }
  if (node.kind === "agent") {
    return { name: node.detail ?? node.label, sub: node.label };
  }
  const flavorLabel = (node.flavor ?? "tool").toUpperCase();
  const metric =
    node.flavor === "mcp" || node.kind === "memory" ? `${30 + Math.floor(hashStr(node.id) * 140)}ms` : undefined;
  return { name: node.label, sub: flavorLabel, metric };
}

function Callout({ node, dimmed, markerY }: { node: VisualNode; dimmed: boolean; markerY: number }) {
  const x = node.x ?? 0;
  const z = node.z ?? 0;
  const len = Math.hypot(x, z) || 1;
  const dirX = node.kind === "gateway" ? 0.55 : x / len;
  const dirZ = node.kind === "gateway" ? -0.7 : z / len;
  const out = node.kind === "agent" ? 1.7 : node.kind === "gateway" ? 1.9 : 1.1;
  const up = node.kind === "gateway" ? 1.7 : 1.2;

  const anchor = new THREE.Vector3(dirX * out, markerY + up, dirZ * out);
  const start = new THREE.Vector3(0, markerY + 0.1, 0);
  const elbow = new THREE.Vector3(anchor.x, markerY + up * 0.55, anchor.z);
  const side = anchor.x >= 0 ? "right" : "left";

  const { name, sub, metric } = calloutFields(node);
  const tone = statusColor(node.status);

  return (
    <group>
      <Line
        points={[start, elbow, anchor]}
        color={COLORS.white}
        lineWidth={1}
        transparent
        opacity={dimmed ? 0.12 : 0.4}
      />
      <Html position={[anchor.x, anchor.y, anchor.z]} center={false} zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
        <div className={`map-callout ${side} ${dimmed ? "dim" : ""}`}>
          <span className="mc-name">{name}</span>
          {sub && <span className="mc-sub">{sub}</span>}
          <span className="mc-stat">
            <span className="mc-dot" style={{ background: tone }} />
            {statusLabel[node.status]}
            {metric && <span className="mc-metric">{metric}</span>}
          </span>
        </div>
      </Html>
    </group>
  );
}
