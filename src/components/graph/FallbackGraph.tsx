import { useMemo } from "react";
import type { VisualEdge, VisualNode } from "@/types/visual";
import { edgeColor, statusColor } from "@/lib/theme";

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
 * status colors and animated flow pulses as the 3D scene.
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

  const radius: Record<string, number> = {
    gateway: 13,
    agent: 8,
  };

  return (
    <svg className="fallback-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
      <defs>
        <radialGradient id="fb-core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#8cff6a" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#8cff6a" stopOpacity="0" />
        </radialGradient>
      </defs>

      {edges.map((e) => {
        const a = pos.get(e.source);
        const b = pos.get(e.target);
        if (!a || !b) return null;
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2 - 26;
        const d = `M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`;
        const muted = e.status === "muted";
        const color = muted ? "#ffffff" : edgeColor(e.status);
        const animate = e.status === "active" || e.status === "risk";
        const dur = `${2.6 - (e.velocity ?? 0.3) * 1.4}s`;
        return (
          <g key={e.id}>
            <path
              d={d}
              fill="none"
              stroke={color}
              strokeWidth={e.status === "risk" ? 1.6 : 1}
              strokeOpacity={muted ? 0.1 : e.status === "risk" ? 0.5 : 0.3}
            />
            {animate && (
              <circle r={3} fill={color}>
                <animateMotion dur={dur} repeatCount="indefinite" path={d} />
                <animate
                  attributeName="opacity"
                  values="0;1;0"
                  dur={dur}
                  repeatCount="indefinite"
                />
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
        return (
          <g key={n.id}>
            {n.kind === "gateway" && (
              <circle cx={p.x} cy={p.y} r={42} fill="url(#fb-core)" />
            )}
            <circle
              cx={p.x}
              cy={p.y}
              r={r}
              fill={color}
              stroke={color}
              strokeWidth={1.5}
              opacity={0.92}
            >
              {(n.status === "active" || n.status === "executing") && (
                <animate
                  attributeName="r"
                  values={`${r};${r + 2};${r}`}
                  dur="1.6s"
                  repeatCount="indefinite"
                />
              )}
            </circle>
            {(isAgentish || n.kind === "memory") && (
              <text className="fb-label" x={p.x} y={p.y - r - 6} textAnchor="middle">
                {n.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
