import type { NodeStatus } from "@/types/visual";

/**
 * Source-of-truth mock topology for Phase 1 (no backend).
 * The Phase 2 adapter will replace this with normalized Gateway events.
 */

export type ToolFlavor = "tool" | "skill" | "mcp" | "memory";

export interface ToolDef {
  id: string;
  label: string;
  flavor: ToolFlavor;
  status: NodeStatus;
}

export interface AgentDef {
  id: string;
  label: string;
  role: string;
  status: NodeStatus;
  tools: ToolDef[];
}

export const GATEWAY = {
  id: "gw-openclaw",
  label: "OPENCLAW-CORE",
  detail: "GATEWAY · PROTO 4",
};

export const AGENTS: AgentDef[] = [
  {
    id: "agent-47",
    label: "AGENT-47",
    role: "ORCHESTRATOR",
    status: "active",
    tools: [
      { id: "t-47-plan", label: "PLANNER", flavor: "skill", status: "active" },
      { id: "t-47-mem", label: "WORKING-MEM", flavor: "memory", status: "idle" },
      { id: "t-47-fs", label: "FS.READ", flavor: "tool", status: "complete" },
    ],
  },
  {
    id: "agent-12",
    label: "AGENT-12",
    role: "BUILDER",
    status: "executing",
    tools: [
      { id: "t-12-sh", label: "SHELL", flavor: "tool", status: "executing" },
      { id: "t-12-git", label: "GIT", flavor: "tool", status: "idle" },
      { id: "t-12-write", label: "FS.WRITE", flavor: "tool", status: "active" },
    ],
  },
  {
    id: "agent-31",
    label: "AGENT-31",
    role: "REVIEWER",
    status: "thinking",
    tools: [
      { id: "t-31-lint", label: "LINT", flavor: "tool", status: "idle" },
      { id: "t-31-test", label: "VITEST", flavor: "tool", status: "waiting" },
      { id: "t-31-read", label: "FS.READ", flavor: "tool", status: "complete" },
    ],
  },
  {
    id: "agent-08",
    label: "AGENT-08",
    role: "SCRAPER",
    status: "waiting",
    tools: [
      { id: "t-08-http", label: "HTTP.FETCH", flavor: "tool", status: "waiting" },
      { id: "t-08-browser", label: "BROWSER", flavor: "mcp", status: "idle" },
    ],
  },
  {
    id: "agent-19",
    label: "AGENT-19",
    role: "INDEXER",
    status: "complete",
    tools: [
      { id: "t-19-embed", label: "EMBED", flavor: "skill", status: "complete" },
      { id: "t-19-vec", label: "VECTOR-DB", flavor: "mcp", status: "complete" },
    ],
  },
  {
    id: "agent-33",
    label: "AGENT-33",
    role: "RETRY QUEUE",
    status: "error",
    tools: [
      { id: "t-33-sh", label: "SHELL", flavor: "tool", status: "error" },
      { id: "t-33-net", label: "NET.PROBE", flavor: "tool", status: "idle" },
    ],
  },
];
