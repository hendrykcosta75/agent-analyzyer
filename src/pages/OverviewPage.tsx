import { NetworkPanel } from "@/features/overview/NetworkPanel";
import { EventVelocity } from "@/components/cards/EventVelocity";
import { AgentLifecycle } from "@/components/cards/AgentLifecycle";
import { GatewayHealth } from "@/components/cards/GatewayHealth";

export function OverviewPage() {
  return (
    <>
      <NetworkPanel />
      <div className="cards">
        <EventVelocity />
        <AgentLifecycle />
        <GatewayHealth />
      </div>
    </>
  );
}
