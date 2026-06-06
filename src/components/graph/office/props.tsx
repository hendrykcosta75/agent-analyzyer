import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { CORE, ROOM, ZONE_LIST, type Zone } from "./layout";

/* ----------------------------- shared assets ----------------------------- */

let shadowTex: THREE.CanvasTexture | null = null;
/** Soft round blob used as a cheap fake contact shadow. */
export function getShadowTexture(): THREE.CanvasTexture {
  if (shadowTex) return shadowTex;
  const s = 96;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, "rgba(0,0,0,0.5)");
  g.addColorStop(0.6, "rgba(0,0,0,0.22)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  shadowTex = new THREE.CanvasTexture(c);
  return shadowTex;
}

let cityTex: THREE.CanvasTexture | null = null;
/** A night skyline seen through the office windows (warm dots on deep blue). */
function getCityTexture(): THREE.CanvasTexture {
  if (cityTex) return cityTex;
  const w = 256;
  const h = 128;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#070b18");
  sky.addColorStop(1, "#101a33");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  // distant buildings
  let x = 0;
  while (x < w) {
    const bw = 10 + Math.random() * 22;
    const bh = 24 + Math.random() * 80;
    ctx.fillStyle = "#0a1020";
    ctx.fillRect(x, h - bh, bw, bh);
    for (let wy = h - bh + 4; wy < h - 4; wy += 7) {
      for (let wx = x + 3; wx < x + bw - 3; wx += 6) {
        if (Math.random() > 0.45) {
          ctx.fillStyle = Math.random() > 0.3 ? "rgba(255,210,150,0.9)" : "rgba(150,200,255,0.8)";
          ctx.fillRect(wx, wy, 2.4, 3);
        }
      }
    }
    x += bw + 2;
  }
  cityTex = new THREE.CanvasTexture(c);
  cityTex.colorSpace = THREE.SRGBColorSpace;
  return cityTex;
}

/** Fake contact shadow quad laid on the floor. */
export function ShadowBlob({ scale = 1, opacity = 1 }: { scale?: number; opacity?: number }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} renderOrder={1}>
      <planeGeometry args={[scale, scale]} />
      <meshBasicMaterial
        map={getShadowTexture()}
        transparent
        opacity={opacity}
        depthWrite={false}
      />
    </mesh>
  );
}

/* -------------------------------- shell ---------------------------------- */

export function Floor() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[ROOM.width, ROOM.depth]} />
        <meshStandardMaterial color="#15171d" roughness={0.95} metalness={0} />
      </mesh>
      {/* carpet runner down the working corridor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 1.2]}>
        <planeGeometry args={[ROOM.width - 4, 5.5]} />
        <meshStandardMaterial color="#1b2a24" roughness={1} />
      </mesh>
    </group>
  );
}

export function Walls() {
  const half = ROOM.depth / 2;
  const halfW = ROOM.width / 2;
  return (
    <group>
      {/* back wall */}
      <mesh position={[0, ROOM.wallH / 2, -half]} receiveShadow>
        <boxGeometry args={[ROOM.width, ROOM.wallH, 0.2]} />
        <meshStandardMaterial color="#1d2029" roughness={0.9} />
      </mesh>
      {/* side walls */}
      <mesh position={[-halfW, ROOM.wallH / 2, 0]} receiveShadow>
        <boxGeometry args={[0.2, ROOM.wallH, ROOM.depth]} />
        <meshStandardMaterial color="#191c24" roughness={0.9} />
      </mesh>
      <mesh position={[halfW, ROOM.wallH / 2, 0]} receiveShadow>
        <boxGeometry args={[0.2, ROOM.wallH, ROOM.depth]} />
        <meshStandardMaterial color="#191c24" roughness={0.9} />
      </mesh>
      {/* night windows on the back wall */}
      <mesh position={[-5, ROOM.wallH * 0.6, -half + 0.12]}>
        <planeGeometry args={[4.4, 1.7]} />
        <meshBasicMaterial map={getCityTexture()} toneMapped={false} />
      </mesh>
      <mesh position={[5, ROOM.wallH * 0.6, -half + 0.12]}>
        <planeGeometry args={[4.4, 1.7]} />
        <meshBasicMaterial map={getCityTexture()} toneMapped={false} />
      </mesh>
      {/* window frames */}
      {[-5, 5].map((x) => (
        <mesh key={x} position={[x, ROOM.wallH * 0.6, -half + 0.13]}>
          <boxGeometry args={[4.5, 0.06, 0.06]} />
          <meshStandardMaterial color="#2a2e38" />
        </mesh>
      ))}
    </group>
  );
}

/* --------------------------------- desk ---------------------------------- */

export function Desk({
  position,
  facing,
  screen,
  bright,
}: {
  position: THREE.Vector3;
  facing: number;
  screen: string;
  bright: number;
}) {
  const screenRef = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (screenRef.current) {
      const flick = 0.8 + 0.2 * Math.sin(clock.elapsedTime * 6 + position.x);
      screenRef.current.emissiveIntensity = bright * flick;
    }
  });
  return (
    <group position={position} rotation={[0, facing, 0]}>
      {/* desktop */}
      <mesh position={[0, 0.74, 0]} castShadow>
        <boxGeometry args={[1.7, 0.07, 0.85]} />
        <meshStandardMaterial color="#6b4a30" roughness={0.7} />
      </mesh>
      {/* legs */}
      {[
        [-0.78, -0.38],
        [0.78, -0.38],
        [-0.78, 0.38],
        [0.78, 0.38],
      ].map(([lx, lz], i) => (
        <mesh key={i} position={[lx, 0.37, lz]}>
          <boxGeometry args={[0.07, 0.74, 0.07]} />
          <meshStandardMaterial color="#3a3027" />
        </mesh>
      ))}
      {/* monitor on the far (-Z) side, screen facing the worker (+Z) */}
      <mesh position={[0, 1.12, -0.28]}>
        <boxGeometry args={[0.92, 0.56, 0.05]} />
        <meshStandardMaterial color="#0c0d10" roughness={0.5} />
      </mesh>
      <mesh position={[0, 1.12, -0.25]}>
        <planeGeometry args={[0.82, 0.46]} />
        <meshStandardMaterial
          ref={screenRef}
          color={screen}
          emissive={screen}
          emissiveIntensity={bright}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0, 0.81, -0.28]}>
        <boxGeometry args={[0.1, 0.18, 0.1]} />
        <meshStandardMaterial color="#15171c" />
      </mesh>
      {/* keyboard */}
      <mesh position={[0, 0.78, 0.12]}>
        <boxGeometry args={[0.5, 0.03, 0.18]} />
        <meshStandardMaterial color="#20242c" />
      </mesh>
      {/* chair */}
      <group position={[0, 0, 0.95]}>
        <mesh position={[0, 0.48, 0]}>
          <boxGeometry args={[0.5, 0.08, 0.5]} />
          <meshStandardMaterial color="#23262e" />
        </mesh>
        <mesh position={[0, 0.78, 0.22]}>
          <boxGeometry args={[0.5, 0.55, 0.08]} />
          <meshStandardMaterial color="#23262e" />
        </mesh>
        <mesh position={[0, 0.24, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.48, 8]} />
          <meshStandardMaterial color="#15171c" />
        </mesh>
      </group>
      <ShadowBlob scale={2.6} opacity={0.8} />
    </group>
  );
}

/* ----------------------------- zone stations ----------------------------- */

function RackLights({ accent }: { accent: string }) {
  const ref = useRef<THREE.Group>(null);
  const dots = useMemo(
    () => Array.from({ length: 12 }, (_, i) => ({ y: 0.4 + (i % 6) * 0.28, x: i < 6 ? -0.18 : 0.18, ph: i })),
    [],
  );
  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g) return;
    g.children.forEach((m, i) => {
      const mat = (m as THREE.Mesh).material as THREE.MeshBasicMaterial;
      mat.opacity = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(clock.elapsedTime * 4 + dots[i].ph));
    });
  });
  return (
    <group ref={ref}>
      {dots.map((d, i) => (
        <mesh key={i} position={[d.x, d.y, 0.31]}>
          <boxGeometry args={[0.07, 0.07, 0.02]} />
          <meshBasicMaterial color={i % 3 === 0 ? accent : "#8cff6a"} transparent toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

function ZoneStation({ zone }: { zone: Zone }) {
  const { kind, equip, accent } = zone;
  return (
    <group position={equip} rotation={[0, zone.facing + Math.PI, 0]}>
      {kind === "mcp" && (
        <group>
          {[-0.5, 0, 0.5].map((z) => (
            <group key={z} position={[0, 0, z]}>
              <mesh position={[0, 0.9, 0]} castShadow>
                <boxGeometry args={[0.7, 1.8, 0.5]} />
                <meshStandardMaterial color="#181b22" metalness={0.4} roughness={0.5} />
              </mesh>
              <RackLights accent={accent} />
            </group>
          ))}
        </group>
      )}
      {kind === "tool" && (
        <group>
          {/* pegboard */}
          <mesh position={[0, 1.5, -0.1]}>
            <boxGeometry args={[0.12, 1.3, 1.6]} />
            <meshStandardMaterial color="#243140" />
          </mesh>
          {/* workbench */}
          <mesh position={[0, 0.78, 0]} castShadow>
            <boxGeometry args={[0.7, 0.1, 1.7]} />
            <meshStandardMaterial color="#5a4a38" roughness={0.7} />
          </mesh>
          {[-0.5, 0.4].map((z, i) => (
            <mesh key={i} position={[0, 1.0, z]}>
              <boxGeometry args={[0.06, 0.3, 0.06]} />
              <meshBasicMaterial color={accent} toneMapped={false} />
            </mesh>
          ))}
        </group>
      )}
      {kind === "skill" && (
        <group>
          {/* whiteboard */}
          <mesh position={[0, 1.4, 0]} castShadow>
            <boxGeometry args={[0.1, 1.5, 2.0]} />
            <meshStandardMaterial color="#e8ecf2" roughness={0.4} />
          </mesh>
          {[0.5, 0.0, -0.45].map((z, i) => (
            <mesh key={i} position={[-0.06, 1.5 - i * 0.35, z]}>
              <boxGeometry args={[0.02, 0.04, 0.7 - i * 0.1]} />
              <meshBasicMaterial color={accent} toneMapped={false} />
            </mesh>
          ))}
        </group>
      )}
      {kind === "memory" && (
        <group>
          {/* shelves */}
          <mesh position={[0, 1.2, 0]} castShadow>
            <boxGeometry args={[0.6, 2.2, 2.0]} />
            <meshStandardMaterial color="#2a2620" roughness={0.8} />
          </mesh>
          {[0.45, 1.05, 1.65].map((y) =>
            [-0.6, -0.2, 0.2, 0.6].map((z, j) => (
              <mesh key={`${y}-${z}`} position={[0.05, y, z]}>
                <boxGeometry args={[0.42, 0.4, 0.28]} />
                <meshStandardMaterial color={j % 2 ? "#7a5a3a" : "#4a5a6a"} />
              </mesh>
            )),
          )}
          <mesh position={[0.32, 2.45, 0]}>
            <boxGeometry args={[0.05, 0.05, 1.6]} />
            <meshBasicMaterial color={accent} toneMapped={false} />
          </mesh>
        </group>
      )}
      <ShadowBlob scale={3.0} opacity={0.7} />
    </group>
  );
}

export function ZoneStations() {
  return (
    <group>
      {ZONE_LIST.map((z) => (
        <group key={z.kind}>
          <ZoneStation zone={z} />
          <Html
            position={[z.equip.x, 2.7, z.equip.z]}
            center
            zIndexRange={[14, 0]}
            style={{ pointerEvents: "none" }}
          >
            <div className="map-callout office-zone">
              <span className="mc-name" style={{ color: z.accent }}>
                {z.label}
              </span>
            </div>
          </Html>
        </group>
      ))}
    </group>
  );
}

/* ------------------------------ gateway core ----------------------------- */

export function CoreScreen({ label }: { label: string }) {
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (matRef.current) {
      matRef.current.emissiveIntensity = 0.9 + 0.3 * Math.sin(clock.elapsedTime * 1.5);
    }
  });
  return (
    <group position={[CORE.x, 0, CORE.z]}>
      <mesh position={[0, 1.9, 0]}>
        <boxGeometry args={[4.6, 1.9, 0.12]} />
        <meshStandardMaterial color="#0c1410" />
      </mesh>
      <mesh position={[0, 1.9, 0.08]}>
        <planeGeometry args={[4.3, 1.6]} />
        <meshStandardMaterial
          ref={matRef}
          color="#0c2418"
          emissive="#8cff6a"
          emissiveIntensity={1}
          toneMapped={false}
        />
      </mesh>
      <Html position={[0, 1.9, 0.12]} center zIndexRange={[15, 0]} style={{ pointerEvents: "none" }}>
        <div className="office-core-label">
          <span>{label}</span>
          <span className="ocl-sub">GATEWAY · CORE</span>
        </div>
      </Html>
    </group>
  );
}

/* -------------------------------- plants --------------------------------- */

export function Plant({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.22, 0.18, 0.4, 10]} />
        <meshStandardMaterial color="#3a3027" />
      </mesh>
      <mesh position={[0, 0.7, 0]}>
        <icosahedronGeometry args={[0.42, 0]} />
        <meshStandardMaterial color="#2f6b3a" roughness={0.9} flatShading />
      </mesh>
      <ShadowBlob scale={1.2} opacity={0.6} />
    </group>
  );
}
