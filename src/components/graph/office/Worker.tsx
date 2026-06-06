import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import type { VisualNode } from "@/types/visual";
import { statusColor, statusLabel } from "@/lib/theme";
import { isAliveStatus } from "../galaxy/util";
import { ShadowBlob } from "./props";
import {
  deskSlot,
  routeToHome,
  routeToZone,
  type DeskSlot,
  type Zone,
} from "./layout";

/** Imperative control surface the Office uses to drive each worker. */
export interface WorkerHandle {
  /** Send the worker to a station to operate a tool/skill/mcp/memory. */
  dispatch: (zone: Zone, label: string) => void;
  /** Small acknowledgement bob (agent-level event, no walking). */
  ping: () => void;
}

type Mode = "idle" | "toZone" | "working" | "toHome";

interface WorkerState {
  mode: Mode;
  path: THREE.Vector3[];
  wp: number;
  workUntil: number;
  zone: Zone | null;
  task: string;
  ping: number;
  walk: number; // gait phase
  yaw: number;
}

const SPEED = 2.7;
const WORK_TIME = 2.6;
const SKIN = "#e8b98c";
const tmp = new THREE.Vector3();

function lerpAngle(a: number, b: number, t: number): number {
  let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

export function Worker({
  node,
  index,
  count,
  paused,
  selected,
  dimmed,
  onSelect,
  register,
}: {
  node: VisualNode;
  index: number;
  count: number;
  paused: boolean;
  selected: boolean;
  dimmed: boolean;
  onSelect: (id: string | null) => void;
  register: (id: string, handle: WorkerHandle | null) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);
  const legLRef = useRef<THREE.Group>(null);
  const legRRef = useRef<THREE.Group>(null);
  const armLRef = useRef<THREE.Group>(null);
  const armRRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const [activity, setActivity] = useState<string | null>(null);

  const slot: DeskSlot = useMemo(() => deskSlot(index, count), [index, count]);
  const accent = statusColor(node.status);
  const alive = isAliveStatus(node.status);
  const lt = useRef(0);

  const st = useRef<WorkerState>({
    mode: "idle",
    path: [],
    wp: 0,
    workUntil: 0,
    zone: null,
    task: "",
    ping: 0,
    walk: 0,
    yaw: slot.facing,
  });

  // Place at the desk on mount and register the imperative handle.
  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.position.copy(slot.home);
      groupRef.current.rotation.y = slot.facing;
    }
    st.current.yaw = slot.facing;
    const handle: WorkerHandle = {
      dispatch: (zone, label) => {
        const s = st.current;
        if (s.mode === "toZone" || s.mode === "working") {
          // already out — just refresh the task + work timer
          s.workUntil = lt.current + WORK_TIME;
          s.task = label;
          setActivity(label);
          return;
        }
        s.zone = zone;
        s.task = label;
        s.path = routeToZone(slot.home, zone);
        s.wp = 0;
        s.mode = "toZone";
        setActivity(label);
      },
      ping: () => {
        st.current.ping = 1;
      },
    };
    register(node.id, handle);
    return () => register(node.id, null);
  }, [node.id, slot, register]);

  useFrame((_, delta) => {
    const g = groupRef.current;
    if (!g || paused) return;
    const d = Math.min(delta, 0.05);
    lt.current += d;
    const t = lt.current;
    const s = st.current;

    let moving = false;

    if (s.mode === "toZone" || s.mode === "toHome") {
      const target = s.path[s.wp];
      if (target) {
        tmp.subVectors(target, g.position);
        tmp.y = 0;
        const dist = tmp.length();
        if (dist < 0.08) {
          s.wp++;
          if (s.wp >= s.path.length) {
            if (s.mode === "toZone" && s.zone) {
              s.mode = "working";
              s.workUntil = t + WORK_TIME;
              s.yaw = s.zone.facing;
            } else {
              s.mode = "idle";
              s.yaw = slot.facing;
              setActivity(null);
            }
          }
        } else {
          tmp.normalize();
          g.position.addScaledVector(tmp, Math.min(dist, SPEED * d));
          s.yaw = Math.atan2(tmp.x, tmp.z);
          s.walk += d * 9;
          moving = true;
        }
      }
    } else if (s.mode === "working") {
      if (t >= s.workUntil) {
        s.mode = "toHome";
        s.path = routeToHome(slot.home);
        s.wp = 0;
        s.zone = null;
      }
    }

    // smooth turn
    g.rotation.y = lerpAngle(g.rotation.y, s.yaw, 0.18);

    // body bob + ping
    if (s.ping > 0) s.ping = Math.max(0, s.ping - d * 1.4);
    const body = bodyRef.current;
    if (body) {
      const bob = moving ? Math.abs(Math.sin(s.walk)) * 0.06 : 0;
      const idleBreath = Math.sin(t * 2) * 0.012;
      body.position.y = bob + idleBreath + s.ping * 0.18;
    }

    // legs
    const swing = moving ? Math.sin(s.walk) * 0.5 : 0;
    if (legLRef.current) legLRef.current.rotation.x = swing;
    if (legRRef.current) legRRef.current.rotation.x = -swing;

    // arms: walk-swing, or typing/operating when working/idle-at-desk
    const working = s.mode === "working";
    const atDesk = s.mode === "idle";
    if (armLRef.current && armRRef.current) {
      if (moving) {
        armLRef.current.rotation.x = -swing * 0.8;
        armRRef.current.rotation.x = swing * 0.8;
      } else if (working || atDesk) {
        const type = Math.sin(t * 9) * 0.18;
        armLRef.current.rotation.x = -1.1 + type;
        armRRef.current.rotation.x = -1.1 - type;
      } else {
        armLRef.current.rotation.x *= 0.9;
        armRRef.current.rotation.x *= 0.9;
      }
    }
  });

  const showLabel = selected || hovered || alive || activity !== null;
  const dimOpacity = dimmed ? 0.4 : 1;

  return (
    <group ref={groupRef}>
      <group
        ref={bodyRef}
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
        {/* torso */}
        <mesh position={[0, 0.62, 0]} castShadow>
          <capsuleGeometry args={[0.2, 0.34, 4, 10]} />
          <meshStandardMaterial color={accent} roughness={0.6} transparent opacity={dimOpacity} />
        </mesh>
        {/* head */}
        <mesh position={[0, 1.06, 0]} castShadow>
          <sphereGeometry args={[0.17, 16, 16]} />
          <meshStandardMaterial color={SKIN} roughness={0.7} transparent opacity={dimOpacity} />
        </mesh>
        {/* headset / status ring */}
        <mesh position={[0, 1.12, 0]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.185, 0.022, 8, 20]} />
          <meshBasicMaterial color={accent} toneMapped={false} transparent opacity={dimOpacity} />
        </mesh>
        {/* visor / eyes */}
        <mesh position={[0, 1.07, 0.15]}>
          <boxGeometry args={[0.14, 0.05, 0.03]} />
          <meshBasicMaterial color="#0a0c10" />
        </mesh>
        {/* arms */}
        <group ref={armLRef} position={[-0.24, 0.86, 0]}>
          <mesh position={[0, -0.16, 0.04]} castShadow>
            <capsuleGeometry args={[0.06, 0.26, 4, 8]} />
            <meshStandardMaterial color={accent} roughness={0.6} transparent opacity={dimOpacity} />
          </mesh>
        </group>
        <group ref={armRRef} position={[0.24, 0.86, 0]}>
          <mesh position={[0, -0.16, 0.04]} castShadow>
            <capsuleGeometry args={[0.06, 0.26, 4, 8]} />
            <meshStandardMaterial color={accent} roughness={0.6} transparent opacity={dimOpacity} />
          </mesh>
        </group>
        {/* legs */}
        <group ref={legLRef} position={[-0.1, 0.42, 0]}>
          <mesh position={[0, -0.2, 0]} castShadow>
            <capsuleGeometry args={[0.07, 0.24, 4, 8]} />
            <meshStandardMaterial color="#2a2f3a" roughness={0.7} transparent opacity={dimOpacity} />
          </mesh>
        </group>
        <group ref={legRRef} position={[0.1, 0.42, 0]}>
          <mesh position={[0, -0.2, 0]} castShadow>
            <capsuleGeometry args={[0.07, 0.24, 4, 8]} />
            <meshStandardMaterial color="#2a2f3a" roughness={0.7} transparent opacity={dimOpacity} />
          </mesh>
        </group>
        {/* status beacon */}
        <mesh position={[0, 1.4, 0]}>
          <sphereGeometry args={[0.06, 10, 10]} />
          <meshBasicMaterial color={accent} toneMapped={false} transparent opacity={dimOpacity} />
        </mesh>
      </group>

      <ShadowBlob scale={0.95} opacity={0.7 * dimOpacity} />

      {showLabel && (
        <Html position={[0, 1.75, 0]} center zIndexRange={[16, 0]} style={{ pointerEvents: "none" }}>
          <div className="map-callout office-label">
            <span className="mc-name">{node.label}</span>
            <span className="mc-stat">
              <span className="mc-dot" style={{ background: accent }} />
              {activity ?? statusLabel[node.status]}
            </span>
          </div>
        </Html>
      )}
    </group>
  );
}
