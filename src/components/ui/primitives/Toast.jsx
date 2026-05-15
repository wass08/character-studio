"use client";

import * as RadixToast from "@radix-ui/react-toast";
import { AnimatePresence, motion } from "motion/react";
import { create } from "zustand";
import { cn } from "./cn";

let toastId = 0;

const useToastStore = create((set, get) => ({
  toasts: [],
  push: (toast) => {
    const id = ++toastId;
    set({ toasts: [...get().toasts, { id, ...toast }] });
    return id;
  },
  dismiss: (id) =>
    set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

export const toast = (message, opts = {}) =>
  useToastStore.getState().push({ message, variant: "default", ...opts });
toast.success = (message, opts = {}) => toast(message, { ...opts, variant: "success" });
toast.error = (message, opts = {}) => toast(message, { ...opts, variant: "error" });

export const ToastProvider = ({ children }) => {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <RadixToast.Provider swipeDirection="right">
      {children}
      <AnimatePresence>
        {toasts.map((t) => (
          <RadixToast.Root
            key={t.id}
            duration={t.duration ?? 3200}
            onOpenChange={(open) => !open && dismiss(t.id)}
            asChild
            forceMount
          >
            <motion.li
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              className={cn(
                "glass-panel pointer-events-auto flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-white/90 shadow-2xl",
                t.variant === "success" && "ring-1 ring-emerald-400/30",
                t.variant === "error" && "ring-1 ring-rose-400/40",
              )}
            >
              {t.variant === "success" && (
                <span className="text-emerald-300">✓</span>
              )}
              {t.variant === "error" && (
                <span className="text-rose-300">!</span>
              )}
              <RadixToast.Description className="leading-snug">
                {t.message}
              </RadixToast.Description>
            </motion.li>
          </RadixToast.Root>
        ))}
      </AnimatePresence>
      <RadixToast.Viewport className="pointer-events-none fixed top-1/2 left-1/2 z-[200] flex w-[min(360px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2 outline-none" />
    </RadixToast.Provider>
  );
};
