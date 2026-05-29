"use client";

import {
  Dialog as ShadcnDialog,
  DialogClose as ShadcnDialogClose,
  DialogContent as ShadcnDialogContent,
  DialogDescription as ShadcnDialogDescription,
  DialogTitle as ShadcnDialogTitle,
  DialogTrigger as ShadcnDialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * Thin shim over the shadcn `Dialog` primitives that keeps the existing
 * call-site API (AuthDialog, SaveDialog) plus the project's glass-panel
 * styling on the content + the muted-white-on-zinc typography on title
 * and description.
 *
 * Re-exports `Dialog`, `DialogTrigger`, `DialogClose` unchanged.
 * `DialogContent`, `DialogTitle`, `DialogDescription` apply the same
 * className overrides the bespoke version had.
 *
 * The shadcn DialogContent renders its own close button by default;
 * the bespoke didn't. We hide it via `showCloseButton={false}` to keep
 * the visual identical — call sites that want a close affordance can
 * render their own (or opt back in by passing showCloseButton on this
 * shim's DialogContent).
 */
export const Dialog = ShadcnDialog;
export const DialogTrigger = ShadcnDialogTrigger;
export const DialogClose = ShadcnDialogClose;

export const DialogContent = ({
  children,
  className,
  showCloseButton = false,
  ...props
}) => (
  <ShadcnDialogContent
    {...props}
    showCloseButton={showCloseButton}
    className={cn(
      "glass-panel w-[min(420px,calc(100vw-32px))] rounded-2xl border-none bg-transparent p-6 text-white/90 shadow-2xl sm:max-w-none",
      className,
    )}
  >
    {children}
  </ShadcnDialogContent>
);

export const DialogTitle = ({ children, className }) => (
  <ShadcnDialogTitle
    className={cn("text-lg font-semibold tracking-tight", className)}
  >
    {children}
  </ShadcnDialogTitle>
);

export const DialogDescription = ({ children, className }) => (
  <ShadcnDialogDescription
    className={cn("mt-1 text-sm text-white/60", className)}
  >
    {children}
  </ShadcnDialogDescription>
);
