import { cn } from "@/lib/utils";

/**
 * Neutral CSS ring spinner. Monochrome theme → near-white on the dark UI.
 * Size/colour are tunable via `className`; defaults to a small thumbnail-sized
 * spinner. Used both for in-flight part swaps (over the asset thumbnail) and
 * as the engine-boot bridge before the 3D canvas can draw.
 */
const Spinner = ({ className }) => (
  <output
    aria-label="Loading"
    className={cn(
      "inline-block aspect-square h-6 w-6 animate-spin rounded-full border-2 border-white/25 border-t-white",
      className,
    )}
  />
);

export default Spinner;
