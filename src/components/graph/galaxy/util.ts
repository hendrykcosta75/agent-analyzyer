import type { NodeStatus } from "@/types/visual";

/** Statuses that read as "live" — drives glow, motion and labels. */
export function isAliveStatus(s: NodeStatus): boolean {
  return s === "active" || s === "executing" || s === "thinking";
}
