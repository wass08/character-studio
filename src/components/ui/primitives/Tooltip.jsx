"use client";

import {
  Tooltip as ShadcnTooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Thin shim over the shadcn `Tooltip` primitives that keeps the
 * ergonomic `label`-prop API used across the editor chrome.
 *
 * The shadcn primitives use Radix under the hood; this shim only adds
 * the convenience of one-prop usage and the project's glass-panel
 * styling on the content. Callers stay unchanged:
 *
 *   <Tooltip label="Save character" side="bottom">
 *     <button>…</button>
 *   </Tooltip>
 *
 * Pass `label={null}` (or omit it) to render `children` without a
 * tooltip — this preserves the previous fall-through behaviour.
 *
 * The shadcn `TooltipProvider` is mounted once in `src/app/layout.js`.
 */
export const Tooltip = ({
  label,
  children,
  side = "right",
  align = "center",
  sideOffset = 10,
}) => {
  if (!label) return children;

  return (
    <ShadcnTooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent
        side={side}
        align={align}
        sideOffset={sideOffset}
        className="glass-panel pointer-events-none rounded-md bg-transparent px-3 py-1.5 text-[11px] font-medium tracking-tight text-white/90 shadow-xl select-none"
      >
        {label}
      </TooltipContent>
    </ShadcnTooltip>
  );
};
