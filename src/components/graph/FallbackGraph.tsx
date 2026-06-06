import { useMemo } from "react";
import type { VisualEdge, VisualNode } from "@/types/visual";
import { edgeColor, statusColor, statusLabel } from "@/lib/theme";

const W = 1000;
const H = 620;
const K = 21;
const CX = W / 2;
const CY = H / 2 + 30;

/** Orthographic isometric projection of the (x, z) plane. */
function project(n: { x?: number; y?: number; z?: number }) {
  const x = n.x ?? 0;
  const y = n.y ?? 0;
  const z = n.z ?? 0;
  return {
    x: CX + (x - z) * K,
    y: CY + (x + z) * K * 0.5 - y * K,
  };
}

/**
 * 2D SVG fallback used when WebGL is unavailable. Keeps the same topology,
 * per-agent territories, status colors and animated flow pulses as the 3D
 * scene so the two renderers stay visually aligned.
 */
export function FallbackGraph({
  nodes,
  edges,
}: {
  nodes: VisualNode[];
  edges: VisualEdge[];
}) {
  const pos = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    nodes.forEach((n) => map.set(n.id, project(n)));
    return map;
  }, [nodes]);

  const territories = useMemo(
    () =>
      nodes
        .filter((n) => n.kind === "agent")
        .map((a) => {
          const x = a.x ?? 0;
          const z = a.z ?? 0;
          const len = Math.hypot(x, z) || 1;
          const push = 1.0;
          const c = project({ x: x + (x / len) * push, z: z + (z / len) * push });
          return { id: a.id, status: a.status, c, r: 2.4 * K };
        }),
    [nodes],
  );

  const radius: Record<string, number> = { gateway: 13, agent: 8 };

  return (
    <svg className="fallback-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
      <defs>
        <radialGradient id="fb-core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#8cff6a" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#8cff6a" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Per-agent territories */}
      {territories.map((t) => {
        const color = statusColor(t.status);
        return (
          <g key={`terr-${t.id}`}>
            <ellipse
              cx={t.c.x}
              cy={t.c.y}
              rx={t.r}
              ry={t.r * 0.5}
              fill={color}
              fillOpacity={0.03}
              stroke={color}
              strokeOpacity={0.16}
              strokeWidth={1}
            />
            <ellipse
              cx={t.c.x}
              cy={t.c.y}
              rx={t.r * 0.34}
              ry={t.r * 0.34 * 0.5}
              fill="none"
              stroke={color}
              strokeOpacity={0.1}
              strokeWidth={1}
            />
          </g>
        );
      })}

      {edges.map((e) => {
        const a = pos.get(e.source);
        const b = pos.get(e.target);
        if (!a || !b) return null;
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2 - 24;
        const d = `M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`;
        const muted = e.status === "muted";
        const color = muted ? "#54564f" : edgeColor(e.status);
        const animate = e.status === "active" || e.status === "risk";
        const dur = `${2.6 - (e.velocity ?? 0.3) * 1.4}s`;
        return (
          <g key={e.id}>
            <path
              d={d}
              fill="none"
              stroke={color}
              strokeWidth={e.status === "risk" ? 1.4 : 1}
              strokeOpacity={muted ? 0.1 : e.status === "risk" ? 0.5 : 0.3}
            />
            {animate && (
              <circle r={3} fill={color}>
                <animateMotion dur={dur} repeatCount="indefinite" path={d} />
                <animate attributeName="opacity" values="0;1;0" dur={dur} repeatCount="indefinite" />
              </circle>
            )}
          </g>
        );
      })}

      {nodes.map((n) => {
        const p = pos.get(n.id);
        if (!p) return null;
        const color = statusColor(n.status);
        const r = radius[n.kind] ?? 5;
        const isAgentish = n.kind === "gateway" || n.kind === "agent";
        const animate = n.status === "active" || n.status === "executing";
        return (
          <g key={n.id}>
            {n.kind === "gateway" && <circle cx={p.x} cy={p.y} r={42} fill="url(#fb-core)" />}
            <FbNode node={n} x={p.x} y={p.y} r={r} color={color} animate={animate} />
            {isAgentish && <FbCallout node={n} x={p.x} y={p.y} r={r} color={color} flip={p.x < CX} />}
          </g>
        );
      })}
    </svg>
  );
}

/** Leader-line callout mirroring the 3D scene's labels. */
function FbCallout({
  node,
  x,
  y,
  r,
  color,
  flip,
}: {
  node: VisualNode;
  x: number;
  y: number;
  r: number;
  color: string;
  flip: boolean;
}) {
  const dir = flip ? -1 : 1;
  const ax = x + dir * 26;
  const ay = y - 34;
  const anchor = flip ? "end" : "start";
  const name = node.kind === "agent" ? node.detail ?? node.label : node.label;
  const sub = node.kind === "agent" ? node.label : node.detail;
  return (
    <g className="fb-callout">
      <polyline
        points={`${x + dir * (r + 2)},${y - r} ${ax},${y - 18} ${ax},${ay}`}
        fill="none"
        stroke="#f4f5f4"
        strokeOpacity={0.32}
        strokeWidth={1}
      />
      <text x={flip ? ax - 6 : ax + 6} y={ay} textAnchor={anchor}>
        <tspan className="fb-cn">{name}</tspan>
        {sub && (
          <tspan className="fb-cs" x={flip ? ax - 6 : ax + 6} dy="10">
            {sub}
          </tspan>
        )}
        <tspan className="fb-ct" x={flip ? ax - 6 : ax + 6} dy="10" fill={color}>
          {statusLabel[node.status]}
        </tspan>
      </text>
    </g>
  );
}

/** Minimal shape per node flavor, mirroring the 3D geometry language. */
function FbNode({
  node,
  x,
  y,
  r,
  color,
  animate,
}: {
  node: VisualNode;
  x: number;
  y: number;
  r: number;
  color: string;
  animate: boolean;
}) {
  const common = {
    fill: color,
    stroke: color,
    strokeWidth: 1.2,
    opacity: 0.92,
  };
  const pulse = animate ? (
    <animate attributeName="opacity" values="0.92;0.55;0.92" dur="1.6s" repeatCount="indefinite" />
  ) : null;

  if (node.kind === "gateway" || node.kind === "agent") {
    return (
      <circle cx={x} cy={y} r={r} {...common}>
        {animate && (
          <animate attributeName="r" values={`${r};${r + 2};${r}`} dur="1.6s" repeatCount="indefinite" />
        )}
      </circle>
    );
  }

  const s = 5;
  switch (node.flavor) {
    case "skill":
      return (
        <polygon points={`${x},${y - s} ${x - s},${y + s} ${x + s},${y + s}`} {...common}>
          {pulse}
        </polygon>
      );
    case "memory":
      return (
        <circle cx={x} cy={y} r={s * 0.9} {...common}>
          {pulse}
        </circle>
      );
    case "mcp":
      return (
        <polygon points={`${x},${y - s} ${x + s},${y} ${x},${y + s} ${x - s},${y}`} {...common}>
          {pulse}
        </polygon>
      );
    default:
      return (
        <rect x={x - s} y={y - s} width={s * 2} height={s * 2} {...common}>
          {pulse}
        </rect>
      );
  }
}
