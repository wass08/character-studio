"use client";

import * as RadixDialog from "@radix-ui/react-dialog";
import { cn } from "./cn";

export const Dialog = RadixDialog.Root;
export const DialogTrigger = RadixDialog.Trigger;
export const DialogClose = RadixDialog.Close;

export const DialogContent = ({ children, className, ...props }) => (
  <RadixDialog.Portal>
    <RadixDialog.Overlay className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm data-[state=open]:animate-tooltip-in" />
    <RadixDialog.Content
      {...props}
      className={cn(
        "glass-panel fixed top-1/2 left-1/2 z-[101] w-[min(420px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 rounded-2xl p-6 text-white/90 shadow-2xl",
        "data-[state=open]:animate-tooltip-in focus:outline-none",
        className,
      )}
    >
      {children}
    </RadixDialog.Content>
  </RadixDialog.Portal>
);

export const DialogTitle = ({ children, className }) => (
  <RadixDialog.Title
    className={cn("text-lg font-semibold tracking-tight", className)}
  >
    {children}
  </RadixDialog.Title>
);

export const DialogDescription = ({ children, className }) => (
  <RadixDialog.Description
    className={cn("mt-1 text-sm text-white/60", className)}
  >
    {children}
  </RadixDialog.Description>
);
