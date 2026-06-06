import * as THREE from "three";
import type { NodeFlavor } from "@/types/visual";

/**
 * Deterministic floor plan for the agent office.
 * Agents get a desk in the central open-plan area and walk out to themed work
 * stations (one per tool flavor) along the side walls whenever they activate a
 * tool / skill / mcp / memory. Inspired by Claw3D's "office for your AI team".
 */

export const ROOM = {
  width: 20,
  depth: 16,
  wallH: 3.4,
};

/** Z of the open corridor in front of the desks — workers step here first. */
export const LANE_Z = -1.0;

/** Desks sit at the back; this is the front face row Z (workers stand in front). */
const DESK_ROW_Z = -4.6;
const DESK_GAP_X = 2.8;
const DESK_ROW_GAP = 2.0;
const MAX_PER_ROW = 6;

export interface DeskSlot {
  /** Desk center (the furniture). */
  desk: THREE.Vector3;
  /** Where the worker stands/idles (just in front of the desk). */
  home: THREE.Vector3;
  /** Yaw so the worker faces the desk/monitor (looking toward -Z). */
  facing: number;
}

/** Stable desk position for the nth agent. */
export function deskSlot(index: number, count: number): DeskSlot {
  const perRow = Math.min(MAX_PER_ROW, Math.max(1, count));
  const col = index % perRow;
  const row = Math.floor(index / perRow);
  const cols = Math.min(perRow, count - row * perRow);
  // Stagger alternate rows so back-row workers don't line up with front desks.
  const stagger = row % 2 === 0 ? 0 : DESK_GAP_X / 2;
  const x = (col - (cols - 1) / 2) * DESK_GAP_X + stagger;
  const z = DESK_ROW_Z - row * DESK_ROW_GAP;
  return {
    desk: new THREE.Vector3(x, 0, z),
    home: new THREE.Vector3(x, 0, z + 1.05),
    facing: Math.PI, // forward axis is +Z, so PI faces -Z (toward the desk)
  };
}

export type ZoneKind = NodeFlavor; // "tool" | "skill" | "mcp" | "memory"

export interface Zone {
  kind: ZoneKind;
  label: string;
  accent: string;
  /** Where the equipment sits (against the wall). */
  equip: THREE.Vector3;
  /** Where the worker stands to operate it. */
  stand: THREE.Vector3;
  /** Yaw so the worker faces the equipment. */
  facing: number;
}

const SIDE_X = ROOM.width / 2 - 1.3;

function makeZone(kind: ZoneKind, label: string, accent: string, side: -1 | 1, z: number): Zone {
  const equip = new THREE.Vector3(side * SIDE_X, 0, z);
  const stand = new THREE.Vector3(side * (SIDE_X - 1.3), 0, z);
  // Face from the stand toward the equipment.
  const dir = equip.clone().sub(stand);
  return { kind, label, accent, equip, stand, facing: Math.atan2(dir.x, dir.z) };
}

/** The four work stations, keyed by tool flavor. */
export const ZONES: Record<ZoneKind, Zone> = {
  tool: makeZone("tool", "TOOLS BAY", "#8ac9ff", -1, 0.4),
  mcp: makeZone("mcp", "MCP / SERVERS", "#8cff6a", -1, 4.4),
  skill: makeZone("skill", "SKILLS LAB", "#ffd15e", 1, 0.4),
  memory: makeZone("memory", "MEMORY ARCHIVE", "#d8dbe6", 1, 4.4),
};

export const ZONE_LIST: Zone[] = [ZONES.tool, ZONES.skill, ZONES.mcp, ZONES.memory];

/** Gateway "CORE" presence — a status wall at the back behind the desks. */
export const CORE = new THREE.Vector3(0, 1.7, -ROOM.depth / 2 + 0.25);

/** Waypoints from a desk home out to a station (via the open corridor). */
export function routeToZone(home: THREE.Vector3, zone: Zone): THREE.Vector3[] {
  return [new THREE.Vector3(home.x, 0, LANE_Z), zone.stand.clone()];
}

/** Waypoints from a station back to the desk home. */
export function routeToHome(home: THREE.Vector3): THREE.Vector3[] {
  return [new THREE.Vector3(home.x, 0, LANE_Z), home.clone()];
}
