import type {
  AgentSummary,
  ConnectorStatus,
  NormalizedAgentEvent,
  SessionEntry,
} from "@/types/visual";
import { AGENTS, GATEWAY } from "@/data/agents";

const REL = (secondsAgo: number) =>
  new Date(Date.now() - secondsAgo * 1000).toISOString();

export const SEED_CONNECTORS: ConnectorStatus[] = [
  {
    id: GATEWAY.id,
    kind: "openclaw",
    name: "OPENCLAW GATEWAY",
    status: "operational",
    latencyMs: 41,
    protocolVersion: 4,
    lastSeenAt: REL(2),
    mode: "local",
  },
  {
    id: "hermes-stub",
    kind: "hermes",
    name: "HERMES AGENT",
    status: "offline",
    mode: "local",
  },
];

export const SEED_AGENTS: AgentSummary[] = AGENTS.map((a, i) => ({
  id: a.id,
  label: a.label,
  role: a.role,
  status: a.status,
  lastActivity: REL(4 + i * 7),
  sessions: [3, 5, 2, 1, 8, 2][i] ?? 1,
  tools: a.tools.map((t) => t.label),
  errors: a.status === "error" ? 1 : 0,
}));

export const SEED_SESSIONS: SessionEntry[] = [
  {
    id: "ses-982721",
    agentId: "agent-47",
    agentLabel: "AGENT-47",
    title: "PLAN · refactor auth module",
    status: "active",
    startedAt: REL(264),
    durationMs: 264_000,
    steps: 18,
  },
  {
    id: "ses-982722",
    agentId: "agent-12",
    agentLabel: "AGENT-12",
    title: "BUILD · apply migration batch",
    status: "executing",
    startedAt: REL(375),
    durationMs: 375_000,
    steps: 42,
  },
  {
    id: "ses-982723",
    agentId: "agent-31",
    agentLabel: "AGENT-31",
    title: "REVIEW · diff #4821",
    status: "thinking",
    startedAt: REL(98),
    durationMs: 98_000,
    steps: 9,
  },
  {
    id: "ses-982724",
    agentId: "agent-33",
    agentLabel: "AGENT-33",
    title: "RETRY · shell exec failed",
    status: "error",
    startedAt: REL(585),
    durationMs: 585_000,
    steps: 3,
  },
  {
    id: "ses-982725",
    agentId: "agent-08",
    agentLabel: "AGENT-08",
    title: "FETCH · crawl docs sitemap",
    status: "waiting",
    startedAt: REL(208),
    durationMs: 208_000,
    steps: 12,
  },
  {
    id: "ses-982719",
    agentId: "agent-19",
    agentLabel: "AGENT-19",
    title: "INDEX · embed 1.2k chunks",
    status: "complete",
    startedAt: REL(1240),
    durationMs: 642_000,
    steps: 27,
  },
];

export const SEED_EVENTS: NormalizedAgentEvent[] = [
  {
    id: "ev-1",
    connectorId: GATEWAY.id,
    source: "openclaw",
    type: "tool",
    severity: "info",
    ts: REL(3),
    actorId: "t-12-sh",
    summary: "AGENT-12 invoked SHELL · exit 0",
  },
  {
    id: "ev-2",
    connectorId: GATEWAY.id,
    source: "openclaw",
    type: "risk",
    severity: "error",
    ts: REL(11),
    actorId: "agent-33",
    summary: "AGENT-33 SHELL exec failed · retry 1/3",
  },
  {
    id: "ev-3",
    connectorId: GATEWAY.id,
    source: "openclaw",
    type: "agent",
    severity: "info",
    ts: REL(18),
    actorId: "agent-47",
    summary: "AGENT-47 dispatched subtask to AGENT-12",
  },
  {
    id: "ev-4",
    connectorId: GATEWAY.id,
    source: "openclaw",
    type: "session",
    severity: "info",
    ts: REL(26),
    actorId: "agent-19",
    summary: "AGENT-19 session complete · 1.2k chunks indexed",
  },
  {
    id: "ev-5",
    connectorId: GATEWAY.id,
    source: "openclaw",
    type: "message",
    severity: "debug",
    ts: REL(34),
    actorId: "agent-31",
    summary: "AGENT-31 reasoning · evaluating diff #4821",
  },
  {
    id: "ev-6",
    connectorId: GATEWAY.id,
    source: "openclaw",
    type: "heartbeat",
    severity: "debug",
    ts: REL(40),
    actorId: GATEWAY.id,
    summary: "GATEWAY heartbeat · 41ms",
  },
];

/** Pool of templates the simulator samples to mimic a live stream. */
export const EVENT_TEMPLATES: Array<
  Pick<NormalizedAgentEvent, "type" | "severity" | "summary" | "actorId">
> = [
  { type: "tool", severity: "info", actorId: "t-12-sh", summary: "AGENT-12 invoked SHELL · exit 0" },
  { type: "tool", severity: "info", actorId: "t-47-fs", summary: "AGENT-47 read 3 files via FS.READ" },
  { type: "message", severity: "debug", actorId: "agent-31", summary: "AGENT-31 reasoning step committed" },
  { type: "tool", severity: "info", actorId: "t-19-vec", summary: "AGENT-19 upserted vectors → VECTOR-DB" },
  { type: "agent", severity: "info", actorId: "agent-47", summary: "AGENT-47 planned 4 subtasks" },
  { type: "tool", severity: "warning", actorId: "t-08-http", summary: "AGENT-08 HTTP.FETCH 429 · backoff" },
  { type: "risk", severity: "error", actorId: "agent-33", summary: "AGENT-33 SHELL exec failed · retry" },
  { type: "session", severity: "info", actorId: "agent-12", summary: "AGENT-12 applied migration batch" },
  { type: "heartbeat", severity: "debug", actorId: GATEWAY.id, summary: "GATEWAY heartbeat" },
  { type: "tool", severity: "info", actorId: "t-12-write", summary: "AGENT-12 wrote FS.WRITE · 2 files" },
];
