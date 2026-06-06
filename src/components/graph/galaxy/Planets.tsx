import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, Line } from "@react-three/drei";
import * as THREE from "three";
import type { VisualNode } from "@/types/visual";
import { statusColor, statusLabel } from "@/lib/theme";
import { isAliveStatus } from "./util";
import { orbitParams, orbitPosition, orbitRingPoints, planetRadius } from "./layout";

/* ----------------------------- shared assets ----------------------------- */

let glowTexture: THREE.CanvasTexture | null = null;
/** Soft white radial sprite used for every glow halo (tinted per body). */
function getGlowTexture(): THREE.CanvasTexture {
  if (glowTexture) return glowTexture;
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.25, "rgba(255,255,255,0.55)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  glowTexture = new THREE.CanvasTexture(canvas);
  glowTexture.colorSpace = THREE.SRGBColorSpace;
  return glowTexture;
}

const scratch = new THREE.Vector3();

/* ------------------------------- sim clock ------------------------------- */

/**
 * Advances a shared simulation time. Mounted first inside the Canvas so planets
 * and the particle field read an identical timestamp each frame (planets sit
 * exactly on their attractor centers).
 */
export function SimClock({
  simTimeRef,
  timeScale,
}: {
  simTimeRef: MutableRefObject<number>;
  timeScale: number;
}) {
  useFrame(() => {
    simTimeRef.current += (1 / 60) * timeScale;
  });
  return null;
}

/* --------------------------------- label --------------------------------- */

function PlanetLabel({ node, accent, offset }: { node: VisualNode; accent: string; offset: number }) {
  return (
    <Html position={[0, offset, 0]} center zIndexRange={[18, 0]} style={{ pointerEvents: "none" }}>
      <div className="map-callout galaxy-label">
        <span className="mc-name">{node.label}</span>
        {node.detail && <span className="mc-sub">{node.detail}</span>}
        <span className="mc-stat">
          <span className="mc-dot" style={{ background: accent }} />
          {statusLabel[node.status]}
        </span>
      </div>
    </Html>
  );
}

/* -------------------------------- planet --------------------------------- */

function Planet({
  node,
  index,
  count,
  simTimeRef,
  pulsesRef,
  selected,
  dimmed,
  onSelect,
}: {
  node: VisualNode;
  index: number;
  count: number;
  simTimeRef: MutableRefObject<number>;
  pulsesRef: MutableRefObject<Map<string, number>>;
  selected: boolean;
  dimmed: boolean;
  onSelect: (id: string | null) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Sprite>(null);
  const [hovered, setHovered] = useState(false);

  const params = useMemo(() => orbitParams(index, count), [index, count]);
  const ringPoints = useMemo(() => orbitRingPoints(params), [params]);
  const radius = planetRadius(node.status);
  const accent = statusColor(node.status);
  const alive = isAliveStatus(node.status);
  const showLabel = selected || hovered || alive;

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;
    const t = simTimeRef.current;
    orbitPosition(params, t, scratch);
    group.position.copy(scratch);

    const pulseAt = pulsesRef.current.get(node.id) ?? -1;
    const since = performance.now() - pulseAt;
    const pulse = pulseAt > 0 && since >= 0 && since < 900 ? 1 - since / 900 : 0;

    const mesh = meshRef.current;
    if (mesh) {
      mesh.rotation.y = t * 0.6;
      const s = (selected ? 1.3 : hovered ? 1.15 : 1) + pulse * 0.4;
      mesh.scale.setScalar(s);
      const mat = mesh.material as THREE.MeshStandardMaterial;
      const base = alive ? 1.35 : 0.7;
      mat.emissiveIntensity = (base + pulse * 1.6) * (dimmed ? 0.4 : 1);
    }
    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.SpriteMaterial;
      const baseO = (alive ? 0.4 : 0.22) + pulse * 0.4;
      mat.opacity = baseO * (dimmed ? 0.35 : 1);
      const gs = radius * (3.4 + pulse * 2);
      glowRef.current.scale.set(gs, gs, gs);
    }
  });

  return (
    <>
      <Line points={ringPoints} color={accent} lineWidth={1} transparent opacity={dimmed ? 0.04 : 0.1} />
      <group ref={groupRef}>
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
          <icosahedronGeometry args={[radius, 3]} />
          <meshStandardMaterial
            color={accent}
            emissive={accent}
            emissiveIntensity={alive ? 1.35 : 0.7}
            roughness={0.4}
            metalness={0.1}
          />
        </mesh>
        <sprite ref={glowRef} scale={[radius * 3.4, radius * 3.4, radius * 3.4]}>
          <spriteMaterial
            map={getGlowTexture()}
            color={accent}
            transparent
            opacity={0.5}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </sprite>
        {showLabel && <PlanetLabel node={node} accent={accent} offset={radius + 0.55} />}
      </group>
    </>
  );
}

/* --------------------------------- star ---------------------------------- */

function Star({
  node,
  selected,
  onSelect,
}: {
  node: VisualNode;
  selected: boolean;
  onSelect: (id: string | null) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Sprite>(null);
  const accent = statusColor(node.status);
  const radius = 0.55;

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (meshRef.current) {
      meshRef.current.rotation.y = t * 0.15;
      const s = (selected ? 1.12 : 1) * (1 + Math.sin(t * 1.4) * 0.04);
      meshRef.current.scale.setScalar(s);
    }
    if (glowRef.current) {
      const pulse = 1 + Math.sin(t * 1.4) * 0.08;
      const gs = radius * 5.5 * pulse;
      glowRef.current.scale.set(gs, gs, gs);
    }
  });

  return (
    <group>
      <mesh
        ref={meshRef}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "auto";
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(selected ? null : node.id);
        }}
      >
        <icosahedronGeometry args={[radius, 4]} />
        <meshStandardMaterial
          color={accent}
          emissive={accent}
          emissiveIntensity={2.2}
          roughness={0.3}
          metalness={0.15}
        />
      </mesh>
      <sprite ref={glowRef} scale={[radius * 5.5, radius * 5.5, radius * 5.5]}>
        <spriteMaterial
          map={getGlowTexture()}
          color={accent}
          transparent
          opacity={0.7}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </sprite>
      <PlanetLabel node={node} accent={accent} offset={radius + 0.7} />
    </group>
  );
}

/* -------------------------------- system --------------------------------- */

export function Planets({
  gateway,
  agents,
  simTimeRef,
  selectedId,
  onSelect,
  onFire,
}: {
  gateway: VisualNode | undefined;
  agents: VisualNode[];
  simTimeRef: MutableRefObject<number>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onFire: (cb: (edgeIds: string[]) => void) => () => void;
}) {
  const pulsesRef = useRef(new Map<string, number>());

  useEffect(() => {
    const unsub = onFire((edgeIds) => {
      const now = performance.now();
      agents.forEach((a) => {
        if (edgeIds.some((id) => id.includes(a.id))) pulsesRef.current.set(a.id, now);
      });
    });
    return unsub;
  }, [onFire, agents]);

  return (
    <group>
      {gateway && (
        <Star node={gateway} selected={selectedId === gateway.id} onSelect={onSelect} />
      )}
      {agents.map((node, i) => (
        <Planet
          key={node.id}
          node={node}
          index={i}
          count={agents.length}
          simTimeRef={simTimeRef}
          pulsesRef={pulsesRef}
          selected={selectedId === node.id}
          dimmed={selectedId !== null && selectedId !== node.id}
          onSelect={onSelect}
        />
      ))}
    </group>
  );
}
