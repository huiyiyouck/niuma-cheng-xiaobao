import * as Tooltip from "@radix-ui/react-tooltip";

interface Placement {
  space: string;
  channel: string;
}

interface PlacementTooltipProps {
  placements: Placement[];
  children: React.ReactNode;
}

export function PlacementTooltip({ placements, children }: PlacementTooltipProps) {
  if (placements.length === 0) {
    return <>{children}</>;
  }

  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          className="bg-popover border border-border rounded-md shadow-lg p-3 max-w-xs z-[100]"
          sideOffset={5}
        >
          <div className="space-y-1">
            {placements.map((p, idx) => (
              <div key={idx} className="text-xs whitespace-nowrap">
                {p.space} / {p.channel}
              </div>
            ))}
          </div>
          <Tooltip.Arrow className="fill-border" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
