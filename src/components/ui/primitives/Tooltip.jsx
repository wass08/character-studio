"use client";

import * as RadixTooltip from "@radix-ui/react-tooltip";

export const Tooltip = ({
  label,
  children,
  side = "right",
  align = "center",
  sideOffset = 10,
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
          className="glass-panel pointer-events-none z-[1000] rounded-md px-3 py-1.5 text-[11px] font-medium tracking-tight text-white/90 shadow-xl select-none"
        >
          {label}
          <RadixTooltip.Arrow className="fill-[rgba(18,18,22,0.55)]" />
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  );
};
