import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { buildGraph, DEFAULT_CONFIG, type NetworkConfig } from "@/lib/graph";
import type { AgentDef, ToolFlavor } from "@/data/agents";
import {
  EVENT_TEMPLATES,
  SEED_AGENTS,
  SEED_CONNECTORS,
  SEED_EVENTS,
  SEED_SESSIONS,
} from "@/data/seed";
import type {
  AgentSummary,
  ConnectorStatus,
  NormalizedAgentEvent,
  NodeStatus,
  SessionEntry,
  VisualEdge,
  VisualNode,
} from "@/types/visual";

type ConnectionMode = "local" | "ssh";

interface LifecycleSlice {
  status: NodeStatus;
  label: string;
  count: number;
  pct: number;
}

interface Metrics {
  velocitySeries: number[];
  eventsPerMin: number;
  velocityTrend: number;
  lifecycle: LifecycleSlice[];
  totalEvents: number;
  latencySeries: number[];
  latencyMs: number;
  sync: number;
}

interface ObservatoryValue {
  nodes: VisualNode[];
  edges: VisualEdge[];
  events: NormalizedAgentEvent[];
  connectors: ConnectorStatus[];
  agents: AgentSummary[];
  sessions: SessionEntry[];
  metrics: Metrics;
  systemStatus: "operational" | "degraded" | "offline";
  mode: ConnectionMode;
  setMode: (m: ConnectionMode) => void;
  paused: boolean;
  setPaused: (p: boolean) => void;
  /** Append a sub-agent region to the live config (dynamic topology). */
  addAgent: () => void;
  /** Imperative pulse bus for the graph; returns an unsubscribe fn. */
  onFire: (cb: (edgeIds: string[]) => void) => () => void;
}

const ObservatoryContext = createContext<ObservatoryValue | null>(null);

const LIFECYCLE_ORDER: { status: NodeStatus; label: string }[] = [
  { status: "active", label: "ACTIVE" },
  { status: "executing", label: "EXECUTING" },
  { status: "thinking", label: "THINKING" },
  { status: "waiting", label: "WAITING" },
  { status: "complete", label: "COMPLETE" },
  { status: "error", label: "ERROR" },
];

function computeLifecycle(agents: AgentSummary[]): LifecycleSlice[] {
  const total = agents.length || 1;
  return LIFECYCLE_ORDER.map(({ status, label }) => {
    const count = agents.filter((a) => a.status === status).length;
    return { status, label, count, pct: Math.round((count / total) * 100) };
  }).filter((s) => s.count > 0);
}

let counter = 0;
const nextId = () => `ev-live-${Date.now()}-${counter++}`;

const NEW_AGENT_ROLES = ["PLANNER", "AUDITOR", "ROUTER", "SUMMARIZER", "WATCHER"];
const NEW_AGENT_STATUSES: NodeStatus[] = ["active", "thinking", "executing", "waiting"];
const NEW_TOOL_FLAVORS: ToolFlavor[] = ["tool", "skill", "mcp", "memory"];
let agentSeq = 50;

function makeAgent(): AgentDef {
  const n = agentSeq++;
  const status = NEW_AGENT_STATUSES[n % NEW_AGENT_STATUSES.length];
  const toolCount = 2 + (n % 2);
  return {
    id: `agent-${n}`,
    label: `AGENT-${n}`,
    role: NEW_AGENT_ROLES[n % NEW_AGENT_ROLES.length],
    status,
    tools: Array.from({ length: toolCount }, (_, j) => {
      const flavor = NEW_TOOL_FLAVORS[(n + j) % NEW_TOOL_FLAVORS.length];
      return {
        id: `t-${n}-${j}`,
        label: `${flavor.toUpperCase()}-${j}`,
        flavor,
        status: j === 0 ? status : "idle",
      };
    }),
  };
}

export function ObservatoryProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<NetworkConfig>(DEFAULT_CONFIG);

  // Topology is derived from config: a config change rebuilds the graph and
  // the 3D scene reacts (new regions animate in).
  const graph = useMemo(() => buildGraph(config), [config]);
  const nodes = graph.nodes;
  const edges = graph.edges;

  const addAgent = useCallback(() => {
    setConfig((prev) => ({ ...prev, agents: [...prev.agents, makeAgent()] }));
  }, []);
  const [events, setEvents] = useState<NormalizedAgentEvent[]>(SEED_EVENTS);
  const [connectors] = useState<ConnectorStatus[]>(SEED_CONNECTORS);
  const [agents] = useState<AgentSummary[]>(SEED_AGENTS);
  const [sessions] = useState<SessionEntry[]>(SEED_SESSIONS);
  const [mode, setMode] = useState<ConnectionMode>("local");
  const [paused, setPaused] = useState(false);

  const [metrics, setMetrics] = useState<Metrics>(() => ({
    velocitySeries: Array.from({ length: 48 }, (_, i) =>
      Math.round(38 + 26 * Math.abs(Math.sin(i / 3.5)) + (i % 5)),
    ),
    eventsPerMin: 52,
    velocityTrend: 9.2,
    lifecycle: computeLifecycle(SEED_AGENTS),
    totalEvents: 24_821,
    latencySeries: Array.from({ length: 32 }, (_, i) =>
      Math.round(40 + 8 * Math.sin(i / 2.2)),
    ),
    latencyMs: 41,
    sync: 98.7,
  }));

  // Imperative pulse bus so the heavy 3D scene never re-renders on events.
  const fireListeners = useRef(new Set<(edgeIds: string[]) => void>());
  const onFire = useCallback((cb: (edgeIds: string[]) => void) => {
    fireListeners.current.add(cb);
    return () => {
      fireListeners.current.delete(cb);
    };
  }, []);

  // Lookup: actor node -> chain of edge ids from the gateway outward.
  const edgeChainFor = useMemo(() => {
    const nodeById = new Map(nodes.map((n) => [n.id, n]));
    return (actorId?: string): string[] => {
      if (!actorId || !nodeById.has(actorId)) return [];
      const path: string[] = [];
      let cursor: string | undefined = actorId;
      let guard = 0;
      while (cursor && guard++ < 6) {
        path.unshift(cursor);
        cursor = nodeById.get(cursor)?.parentId;
      }
      const chain: string[] = [];
      for (let i = 1; i < path.length; i++) {
        chain.push(`e-${path[i - 1]}-${path[i]}`);
      }
      return chain;
    };
  }, [nodes]);

  useEffect(() => {
    if (paused) return;
    const interval = window.setInterval(() => {
      const tpl =
        EVENT_TEMPLATES[Math.floor(Math.random() * EVENT_TEMPLATES.length)];
      const event: NormalizedAgentEvent = {
        id: nextId(),
        connectorId: SEED_CONNECTORS[0].id,
        source: "openclaw",
        ts: new Date().toISOString(),
        ...tpl,
      };

      setEvents((prev) => [event, ...prev].slice(0, 60));

      const chain = edgeChainFor(event.actorId);
      if (chain.length) {
        fireListeners.current.forEach((cb) => cb(chain));
      }

      setMetrics((prev) => {
        const inc = Math.round(34 + Math.random() * 42);
        const velocitySeries = [...prev.velocitySeries.slice(1), inc];
        const latency = Math.round(36 + Math.random() * 14);
        const latencySeries = [...prev.latencySeries.slice(1), latency];
        return {
          ...prev,
          velocitySeries,
          eventsPerMin: inc,
          latencySeries,
          latencyMs: latency,
          totalEvents: prev.totalEvents + 1,
          sync: Math.min(99.9, 97 + Math.random() * 2.6),
        };
      });
    }, 1600);

    return () => window.clearInterval(interval);
  }, [paused, edgeChainFor]);

  const systemStatus = useMemo<"operational" | "degraded" | "offline">(() => {
    const gw = connectors.find((c) => c.kind === "openclaw");
    if (!gw || gw.status === "offline") return "offline";
    if (gw.status === "degraded") return "degraded";
    return "operational";
  }, [connectors]);

  const value = useMemo<ObservatoryValue>(
    () => ({
      nodes,
      edges,
      events,
      connectors,
      agents,
      sessions,
      metrics,
      systemStatus,
      mode,
      setMode,
      paused,
      setPaused,
      addAgent,
      onFire,
    }),
    [
      nodes,
      edges,
      events,
      connectors,
      agents,
      sessions,
      metrics,
      systemStatus,
      mode,
      paused,
      addAgent,
      onFire,
    ],
  );

  return (
    <ObservatoryContext.Provider value={value}>
      {children}
    </ObservatoryContext.Provider>
  );
}

export function useObservatory(): ObservatoryValue {
  const ctx = useContext(ObservatoryContext);
  if (!ctx) {
    throw new Error("useObservatory must be used within ObservatoryProvider");
  }
  return ctx;
}
