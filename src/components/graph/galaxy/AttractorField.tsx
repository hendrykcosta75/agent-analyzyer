import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { VisualNode } from "@/types/visual";
import {
  buildGalaxyCompute,
  createParticleGeometry,
  createParticleMaterial,
  MAX_ATTRACTORS,
  type GalaxyCompute,
} from "./particles";
import { agentMass, CENTER_MASS, orbitParams, orbitPosition } from "./layout";

interface AttractorFieldProps {
  agents: VisualNode[];
  /** Compute texture edge length; particle count = size². */
  size: number;
  colorA: string;
  colorB: string;
  /** Multiplies the per-frame simulation step (pause/slow-mo). */
  timeScale: number;
  /** Shared simulation time so planets sit exactly on their attractors. */
  simTimeRef: MutableRefObject<number>;
}

const SPAWN_BOX = new THREE.Vector3(11, 0.6, 11);
const BOUND = 17;
const scratch = new THREE.Vector3();

export function AttractorField({ agents, size, colorA, colorB, timeScale, simTimeRef }: AttractorFieldProps) {
  const gl = useThree((s) => s.gl);
  const dpr = useThree((s) => s.viewport.dpr);

  const built = useMemo<GalaxyCompute | null>(() => {
    try {
      return buildGalaxyCompute(gl, size, { box: SPAWN_BOX, bound: BOUND });
    } catch (err) {
      console.warn("[galaxy] GPGPU compute unavailable, using fallback:", err);
      return null;
    }
  }, [gl, size]);

  const geometry = useMemo(() => createParticleGeometry(size), [size]);
  const material = useMemo(
    () => createParticleMaterial(colorA, colorB, dpr),
    // colors updated imperatively below; rebuild only on size to keep refs stable
    [size], // eslint-disable-line react-hooks/exhaustive-deps
  );

  useEffect(() => {
    material.uniforms.uColorA.value.set(colorA);
    material.uniforms.uColorB.value.set(colorB);
  }, [material, colorA, colorB]);

  useEffect(() => {
    material.uniforms.uPixelRatio.value = dpr;
  }, [material, dpr]);

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
      built?.gpu.dispose();
    };
  }, [geometry, material, built]);

  // Keep planet count stable for the loop without re-subscribing each render.
  const agentsRef = useRef(agents);
  agentsRef.current = agents;

  useFrame(() => {
    if (!built) return;
    const list = agentsRef.current;
    const u = built.velVar.material.uniforms;
    const attractors = u.uAttractors.value as THREE.Vector3[];
    const axes = u.uAxes.value as THREE.Vector3[];
    const masses = u.uMasses.value as Float32Array;

    // Read the shared clock (advanced by <SimClock/> earlier this frame).
    const t = simTimeRef.current;

    // Central star (gateway) at the origin.
    attractors[0].set(0, 0, 0);
    axes[0].set(0, 1, 0);
    masses[0] = CENTER_MASS;

    let n = 1;
    for (let i = 0; i < list.length && n < MAX_ATTRACTORS; i++) {
      const p = orbitParams(i, list.length);
      orbitPosition(p, t, scratch);
      attractors[n].copy(scratch);
      axes[n].set(0, 1, 0);
      masses[n] = agentMass(list[i].status);
      n++;
    }
    u.uAttractorCount.value = n;

    const dt = (1 / 60) * timeScale;
    built.posVar.material.uniforms.uDelta.value = dt;
    built.velVar.material.uniforms.uDelta.value = dt;

    built.gpu.compute();
    material.uniforms.uPosition.value = built.gpu.getCurrentRenderTarget(built.posVar).texture;
    material.uniforms.uVelocity.value = built.gpu.getCurrentRenderTarget(built.velVar).texture;
  });

  if (!built) return <FallbackCloud colorA={colorA} timeScale={timeScale} />;

  return (
    <points geometry={geometry} material={material} frustumCulled={false} renderOrder={2} />
  );
}

/** Lightweight degraded mode when float-texture compute isn't available. */
function FallbackCloud({ colorA, timeScale }: { colorA: string; timeScale: number }) {
  const ref = useRef<THREE.Points>(null);
  const geometry = useMemo(() => {
    const count = 6000;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = Math.pow(Math.random(), 0.6) * 7;
      const a = Math.random() * Math.PI * 2;
      positions[i * 3] = Math.cos(a) * r;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 0.6;
      positions[i * 3 + 2] = Math.sin(a) * r;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, []);

  useFrame(() => {
    if (ref.current) ref.current.rotation.y += 0.0015 * timeScale;
  });

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <points ref={ref} geometry={geometry} renderOrder={2}>
      <pointsMaterial
        size={0.035}
        color={colorA}
        transparent
        opacity={0.7}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
}
