import type { EdgeStatus, NodeStatus, VisualNodeKind } from "@/types/visual";

export const COLORS = {
  green: "#8cff6a",
  red: "#ff4b4b",
  amber: "#ffd15e",
  blue: "#8ac9ff",
  white: "#f4f5f4",
  dim: "#54564f",
} as const;

export function statusColor(status: NodeStatus): string {
  switch (status) {
    case "active":
    case "executing":
      return COLORS.green;
    case "thinking":
      return COLORS.blue;
    case "waiting":
      return COLORS.amber;
    case "error":
      return COLORS.red;
    case "complete":
      return COLORS.white;
    case "idle":
    default:
      return COLORS.dim;
  }
}

export function edgeColor(status: EdgeStatus): string {
  switch (status) {
    case "active":
      return COLORS.green;
    case "risk":
      return COLORS.red;
    case "completed":
      return COLORS.white;
    case "muted":
    default:
      return COLORS.dim;
  }
}

export const statusLabel: Record<NodeStatus, string> = {
  idle: "IDLE",
  active: "ACTIVE",
  thinking: "THINKING",
  executing: "EXECUTING",
  waiting: "WAITING",
  error: "ERROR",
  complete: "COMPLETE",
};

export const kindLabel: Record<VisualNodeKind, string> = {
  gateway: "GATEWAY",
  agent: "AGENT",
  session: "SESSION",
  task: "TASK",
  tool: "TOOL",
  artifact: "ARTIFACT",
  memory: "MEMORY",
  risk: "RISK",
  hermes: "HERMES",
};

/** CSS class for status-colored text/dots. */
export function statusToneClass(status: NodeStatus): string {
  switch (status) {
    case "active":
    case "executing":
      return "green";
    case "thinking":
      return "blue";
    case "waiting":
      return "amber";
    case "error":
      return "red";
    default:
      return "";
  }
}
