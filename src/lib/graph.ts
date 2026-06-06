import { AGENTS, GATEWAY, type AgentDef, type ToolDef } from "@/data/agents";
import type {
  EdgeStatus,
  NodeStatus,
  VisualEdge,
  VisualNode,
} from "@/types/visual";

/** Topology config (mirrors what an OpenClaw config snapshot will provide). */
export interface NetworkConfig {
  gateway: { id: string; label: string; detail?: string };
  agents: AgentDef[];
}

export const DEFAULT_CONFIG: NetworkConfig = { gateway: GATEWAY, agents: AGENTS };

/** Radius of the agent orbit around the gateway. */
const AGENT_RING = 6.3;
/** Distance a tool sits from its owning agent. */
const TOOL_RING = 2.45;
/**
 * Fraction of an agent's angular sector its tools are allowed to fan across.
 * Keeping this < 1 guarantees a gap between neighbouring clusters, so every
 * sub-agent keeps its own clearly separated "space".
 */
const TOOL_FAN = 0.66;

function edgeStatusFor(status: NodeStatus): EdgeStatus {
  switch (status) {
    case "active":
    case "executing":
    case "thinking":
      return "active";
    case "error":
      return "risk";
    case "complete":
      return "completed";
    default:
      return "muted";
  }
}

function velocityFor(status: NodeStatus): number {
  switch (status) {
    case "executing":
      return 1;
    case "active":
      return 0.78;
    case "thinking":
      return 0.5;
    case "error":
      return 0.4;
    default:
      return 0.18;
  }
}

export interface Graph {
  nodes: VisualNode[];
  edges: VisualEdge[];
}

/**
 * Deterministic isometric layout so the scene is stable across renders.
 * Driven by the network config, so changing the config (e.g. a new OpenClaw
 * snapshot) rebuilds the graph and the 3D scene reacts.
 */
export function buildGraph(
  config: NetworkConfig = DEFAULT_CONFIG,
  now = new Date().toISOString(),
): Graph {
  const { gateway, agents } = config;
  const nodes: VisualNode[] = [];
  const edges: VisualEdge[] = [];

  nodes.push({
    id: gateway.id,
    label: gateway.label,
    kind: "gateway",
    status: "active",
    detail: gateway.detail,
    x: 0,
    y: 0,
    z: 0,
    updatedAt: now,
  });

  const count = agents.length;
  const sector = (Math.PI * 2) / count;

  agents.forEach((agent: AgentDef, i) => {
    // Each agent owns one evenly-spaced sector of the ring.
    const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
    const ax = Math.cos(angle) * AGENT_RING;
    const az = Math.sin(angle) * AGENT_RING;

    nodes.push({
      id: agent.id,
      label: agent.label,
      kind: "agent",
      status: agent.status,
      detail: agent.role,
      x: ax,
      y: 0,
      z: az,
      parentId: gateway.id,
      cluster: i,
      updatedAt: now,
    });

    edges.push({
      id: `e-${gateway.id}-${agent.id}`,
      source: gateway.id,
      target: agent.id,
      status: edgeStatusFor(agent.status),
      velocity: velocityFor(agent.status),
      label: agent.role,
      updatedAt: now,
    });

    // Tools fan outward (away from the gateway) within the agent's own sector,
    // so each sub-agent's capabilities stay grouped inside its territory.
    const toolCount = agent.tools.length;
    const span = sector * TOOL_FAN;
    agent.tools.forEach((tool: ToolDef, j) => {
      const t = toolCount === 1 ? 0 : j / (toolCount - 1) - 0.5;
      const toolAngle = angle + t * span;
      // Slight radius stagger keeps labels legible without breaking the cluster.
      const ring = TOOL_RING + (j % 2 === 0 ? 0 : 0.55);
      const tx = ax + Math.cos(toolAngle) * ring;
      const tz = az + Math.sin(toolAngle) * ring;

      const kind = tool.flavor === "memory" ? "memory" : "tool";

      nodes.push({
        id: tool.id,
        label: tool.label,
        kind,
        status: tool.status,
        detail: tool.flavor.toUpperCase(),
        flavor: tool.flavor,
        x: tx,
        y: 0,
        z: tz,
        parentId: agent.id,
        cluster: i,
        updatedAt: now,
      });

      edges.push({
        id: `e-${agent.id}-${tool.id}`,
        source: agent.id,
        target: tool.id,
        status: edgeStatusFor(tool.status),
        velocity: velocityFor(tool.status),
        updatedAt: now,
      });
    });
  });

  return { nodes, edges };
}

export function indexNodes(nodes: VisualNode[]): Map<string, VisualNode> {
  return new Map(nodes.map((n) => [n.id, n]));
}
