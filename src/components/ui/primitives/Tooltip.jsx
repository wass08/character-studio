"use client";

import * as RadixTooltip from "@radix-ui/react-tooltip";

export const Tooltip = ({
  label,
  children,
  side = "right",
  align = "center",
  sideOffset = 8,
}) => {
  if (!label) return children;

  return (
    <RadixTooltip.Root>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          side={side}
          align={align}
          sideOffset={sideOffset}
          className="glass-panel z-[1000] rounded-md px-2.5 py-1.5 text-xs font-medium tracking-tight text-panel-fg shadow-xl select-none data-[state=delayed-open]:data-[side=bottom]:animate-in data-[state=delayed-open]:data-[side=top]:animate-in data-[state=delayed-open]:data-[side=left]:animate-in data-[state=delayed-open]:data-[side=right]:animate-in"
        >
          {label}
          <RadixTooltip.Arrow className="fill-[rgba(18,18,22,0.55)]" />
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  );
};
