import * as THREE from "three";
import type { NodeStatus } from "@/types/visual";

/**
 * Deterministic "solar system" layout for the orbit visualization.
 * The gateway is the central star at the origin; each agent is a planet on its
 * own inclined orbit. These params also feed the particle attractors so the
 * swirling nebula tracks the planets exactly.
 */

/** Orbital parameters for one agent planet. */
export interface OrbitParams {
  /** Orbit radius in world units. */
  radius: number;
  /** Starting angle (radians). */
  baseAngle: number;
  /** Angular speed (radians / second); outer planets move slower. */
  angularSpeed: number;
  /** Orbital-plane tilt around the X axis (radians). */
  incline: number;
}

/** Stable, index-driven orbit so the scene is reproducible across renders. */
export function orbitParams(index: number, count: number): OrbitParams {
  // Wrap radius so a large number of agents stays on screen.
  const lane = index % 7;
  const tier = Math.floor(index / 7);
  const radius = 2.6 + lane * 0.62 + tier * 0.28;
  const baseAngle = (index / Math.max(count, 1)) * Math.PI * 2 + index * 0.55;
  const angularSpeed = 0.16 * (2.8 / radius);
  const incline = ((index % 3) - 1) * 0.17 + Math.sin(index * 1.7) * 0.05;
  return { radius, baseAngle, angularSpeed, incline };
}

/** World position of a planet at time t (seconds). */
export function orbitPosition(
  p: OrbitParams,
  t: number,
  out: THREE.Vector3 = new THREE.Vector3(),
): THREE.Vector3 {
  const a = p.baseAngle + t * p.angularSpeed;
  const x = Math.cos(a) * p.radius;
  const z = Math.sin(a) * p.radius;
  // Rotate the (y,z) pair around the X axis to tilt the orbital plane.
  const ci = Math.cos(p.incline);
  const si = Math.sin(p.incline);
  out.set(x, -z * si, z * ci);
  return out;
}

/** Sampled points tracing a full orbit, for drawing the faint orbit ring. */
export function orbitRingPoints(p: OrbitParams, segments = 96): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  const ci = Math.cos(p.incline);
  const si = Math.sin(p.incline);
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    const x = Math.cos(a) * p.radius;
    const z = Math.sin(a) * p.radius;
    pts.push(new THREE.Vector3(x, -z * si, z * ci));
  }
  return pts;
}

/** Mass of the central star (gateway) — dominates the particle field. */
export const CENTER_MASS = 1.0e7;

/** Per-agent attractor mass, scaled by how "busy" the agent is. */
export function agentMass(status: NodeStatus): number {
  const base = 1.7e6;
  switch (status) {
    case "executing":
      return base * 1.6;
    case "active":
      return base * 1.35;
    case "thinking":
      return base * 1.1;
    case "error":
      return base * 1.45; // angry red eddy
    case "waiting":
      return base * 0.8;
    default:
      return base * 0.6;
  }
}

/** Visual radius of a planet body, by status. */
export function planetRadius(status: NodeStatus): number {
  switch (status) {
    case "executing":
    case "active":
      return 0.24;
    case "error":
      return 0.23;
    case "thinking":
      return 0.21;
    default:
      return 0.18;
  }
}
