/**
 * Normalized visual model shared by the observatory UI.
 * Mirrors the protocol contract from the MVP plan so that the Phase 2
 * adapter can feed real OpenClaw/Hermes data without UI changes.
 */

export type ConnectorKind = "openclaw" | "hermes";

export type VisualNodeKind =
  | "gateway"
  | "agent"
  | "session"
  | "task"
  | "tool"
  | "artifact"
  | "memory"
  | "risk"
  | "hermes";

export type NodeStatus =
  | "idle"
  | "active"
  | "thinking"
  | "executing"
  | "waiting"
  | "error"
  | "complete";

/** Capability family for nodes attached to an agent. */
export type NodeFlavor = "tool" | "skill" | "mcp" | "memory";

export interface VisualNode {
  id: string;
  label: string;
  kind: VisualNodeKind;
  status: NodeStatus;
  /** Sub-label, e.g. tool family or agent role. */
  detail?: string;
  /** For tool-family nodes: distinguishes tool / skill / mcp / memory. */
  flavor?: NodeFlavor;
  x?: number;
  y?: number;
  z?: number;
  /** Graph parent: agents attach to the gateway, tools attach to an agent. */
  parentId?: string;
  /** Index of the owning agent cluster (0-based), used for layout sectors. */
  cluster?: number;
  metadata?: Record<string, unknown>;
  updatedAt: string;
}

export type EdgeStatus = "active" | "completed" | "risk" | "muted";

export interface VisualEdge {
  id: string;
  source: string;
  target: string;
  status: EdgeStatus;
  label?: string;
  /** 0..1, drives particle pulse speed. */
  velocity?: number;
  updatedAt: string;
}

export type EventType =
  | "health"
  | "agent"
  | "session"
  | "tool"
  | "message"
  | "heartbeat"
  | "risk"
  | "unknown";

export type Severity = "debug" | "info" | "warning" | "error";

export interface NormalizedAgentEvent {
  id: string;
  connectorId: string;
  source: ConnectorKind;
  type: EventType;
  severity: Severity;
  ts: string;
  rawType?: string;
  summary: string;
  /** Entity that emitted the event (agent / tool / gateway id). */
  actorId?: string;
  nodes?: VisualNode[];
  edges?: VisualEdge[];
  safePayload?: Record<string, unknown>;
}

export type ConnectorRuntimeStatus =
  | "offline"
  | "connecting"
  | "operational"
  | "degraded";

export interface ConnectorStatus {
  id: string;
  kind: ConnectorKind;
  name: string;
  status: ConnectorRuntimeStatus;
  latencyMs?: number;
  protocolVersion?: number;
  lastSeenAt?: string;
  /** local | ssh — surfaced in the header per the design spec. */
  mode: "local" | "ssh";
}

/** Read-only view model for the /agents screen. */
export interface AgentSummary {
  id: string;
  label: string;
  role: string;
  status: NodeStatus;
  lastActivity: string;
  sessions: number;
  tools: string[];
  errors: number;
}

export interface SessionEntry {
  id: string;
  agentId: string;
  agentLabel: string;
  title: string;
  status: NodeStatus;
  startedAt: string;
  durationMs: number;
  steps: number;
}
