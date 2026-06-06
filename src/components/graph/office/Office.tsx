import { useCallback, useEffect, useMemo, useRef } from "react";
import type { VisualEdge, VisualNode } from "@/types/visual";
import { statusColor } from "@/lib/theme";
import { isAliveStatus } from "../galaxy/util";
import { CoreScreen, Desk, Floor, Plant, Walls, ZoneStations } from "./props";
import { Worker, type WorkerHandle } from "./Worker";
import { deskSlot, ZONES, type ZoneKind } from "./layout";

export function Office({
  gateway,
  agents,
  nodes,
  edges,
  paused,
  selectedId,
  onSelect,
  onFire,
}: {
  gateway: VisualNode | undefined;
  agents: VisualNode[];
  nodes: VisualNode[];
  edges: VisualEdge[];
  paused: boolean;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onFire: (cb: (edgeIds: string[]) => void) => () => void;
}) {
  const workersRef = useRef(new Map<string, WorkerHandle>());

  const register = useCallback((id: string, handle: WorkerHandle | null) => {
    if (handle) workersRef.current.set(id, handle);
    else workersRef.current.delete(id);
  }, []);

  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const edgeById = useMemo(() => new Map(edges.map((e) => [e.id, e])), [edges]);

  // Translate live activity into worker movement: a fired tool edge sends the
  // owning agent to the matching station; an agent-level event just pings them.
  useEffect(() => {
    return onFire((edgeIds) => {
      edgeIds.forEach((eid) => {
        const edge = edgeById.get(eid);
        if (!edge) return;
        const target = nodeById.get(edge.target);
        const source = nodeById.get(edge.source);
        if (!target) return;
        if ((target.kind === "tool" || target.kind === "memory") && source?.kind === "agent") {
          const flavor = (target.flavor ?? "tool") as ZoneKind;
          const zone = ZONES[flavor] ?? ZONES.tool;
          workersRef.current.get(source.id)?.dispatch(zone, target.label);
        } else if (target.kind === "agent") {
          workersRef.current.get(target.id)?.ping();
        }
      });
    });
  }, [onFire, edgeById, nodeById]);

  const count = agents.length;

  return (
    <group>
      <Floor />
      <Walls />
      <ZoneStations />
      {gateway && <CoreScreen label={gateway.label} />}

      <Plant position={[-9, 0, 6.6]} />
      <Plant position={[9, 0, 6.6]} />

      {agents.map((node, i) => {
        const slot = deskSlot(i, count);
        const alive = isAliveStatus(node.status);
        return (
          <Desk
            key={`desk-${node.id}`}
            position={slot.desk}
            facing={slot.facing}
            screen={statusColor(node.status)}
            bright={alive ? 1.4 : 0.45}
          />
        );
      })}

      {agents.map((node, i) => (
        <Worker
          key={node.id}
          node={node}
          index={i}
          count={count}
          paused={paused}
          selected={selectedId === node.id}
          dimmed={selectedId !== null && selectedId !== node.id}
          onSelect={onSelect}
          register={register}
        />
      ))}
    </group>
  );
}
