import { AGENTS, GATEWAY, type AgentDef, type ToolDef } from "@/data/agents";
import type {
  EdgeStatus,
  NodeStatus,
  VisualEdge,
  VisualNode,
} from "@/types/visual";

const AGENT_RING = 6.6;
const TOOL_RING = 2.5;
const TOOL_SPREAD = Math.PI * 0.62;

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

/** Deterministic isometric layout so the scene is stable across renders. */
export function buildGraph(now = new Date().toISOString()): Graph {
  const nodes: VisualNode[] = [];
  const edges: VisualEdge[] = [];

  nodes.push({
    id: GATEWAY.id,
    label: GATEWAY.label,
    kind: "gateway",
    status: "active",
    detail: GATEWAY.detail,
    x: 0,
    y: 0,
    z: 0,
    updatedAt: now,
  });

  const count = AGENTS.length;

  AGENTS.forEach((agent: AgentDef, i) => {
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
      parentId: GATEWAY.id,
      updatedAt: now,
    });

    edges.push({
      id: `e-${GATEWAY.id}-${agent.id}`,
      source: GATEWAY.id,
      target: agent.id,
      status: edgeStatusFor(agent.status),
      velocity: velocityFor(agent.status),
      label: agent.role,
      updatedAt: now,
    });

    const toolCount = agent.tools.length;
    agent.tools.forEach((tool: ToolDef, j) => {
      const offset =
        toolCount === 1
          ? 0
          : (j / (toolCount - 1) - 0.5) * TOOL_SPREAD;
      const toolAngle = angle + offset;
      const tx = ax + Math.cos(toolAngle) * TOOL_RING;
      const tz = az + Math.sin(toolAngle) * TOOL_RING;

      const kind = tool.flavor === "memory" ? "memory" : "tool";

      nodes.push({
        id: tool.id,
        label: tool.label,
        kind,
        status: tool.status,
        detail: tool.flavor.toUpperCase(),
        x: tx,
        y: 0,
        z: tz,
        parentId: agent.id,
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
