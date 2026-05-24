"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "../primitives/Dialog";
import { Spinner } from "../primitives/Spinner";
import { toast } from "../primitives/Toast";

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const AuthDialog = () => {
  const open = useAuthStore((s) => s.loginDialogOpen);
  const setOpen = useAuthStore((s) => s.setLoginDialogOpen);
  const otpId = useAuthStore((s) => s.otpId);
  const otpEmail = useAuthStore((s) => s.otpEmail);
  const requestOtp = useAuthStore((s) => s.requestOtp);
  const verifyOtp = useAuthStore((s) => s.verifyOtp);
  const resetOtp = useAuthStore((s) => s.resetOtp);
  const requestPending = useAuthStore((s) => s.otpRequestPending);
  const verifyPending = useAuthStore((s) => s.otpVerifyPending);

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");

  const onRequest = async (e) => {
    e.preventDefault();
    if (!EMAIL_RX.test(email)) {
      toast.error("Enter a valid email");
      return;
    }
    try {
      await requestOtp(email);
      toast.success("Check your inbox for the code");
    } catch (err) {
      toast.error(err?.message || "Failed to send code");
    }
  };

  const onVerify = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    try {
      await verifyOtp(code.trim());
      toast.success("Signed in");
      setCode("");
      setEmail("");
    } catch (err) {
      toast.error(err?.message || "Invalid code");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) {
          setCode("");
          resetOtp();
        }
      }}
    >
      <DialogContent>
        <DialogTitle>Sign in</DialogTitle>
        <DialogDescription>
          {otpId
            ? `Enter the code we sent to ${otpEmail}.`
            : "We'll email you a one-time code."}
        </DialogDescription>

        {!otpId ? (
          <form onSubmit={onRequest} className="mt-5 flex flex-col gap-3">
            <input
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-white/35 focus:outline-none"
            />
            <Button
              type="submit"
              variant="default"
              disabled={requestPending}
              className="h-auto gap-2 rounded-lg bg-white/15 px-4 py-2.5 text-sm font-medium tracking-tight text-white ring-1 ring-white/25 transition-colors hover:bg-white/20 disabled:opacity-60"
            >
              {requestPending && <Spinner />}
              <span>Send code</span>
            </Button>
          </form>
        ) : (
          <form onSubmit={onVerify} className="mt-5 flex flex-col gap-3">
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="6-digit code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoFocus
              className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 text-center text-lg tracking-[0.5em] text-white placeholder:text-white/30 focus:border-white/35 focus:outline-none"
            />
            <Button
              type="submit"
              variant="default"
              disabled={verifyPending}
              className="h-auto gap-2 rounded-lg bg-white/15 px-4 py-2.5 text-sm font-medium tracking-tight text-white ring-1 ring-white/25 transition-colors hover:bg-white/20 disabled:opacity-60"
            >
              {verifyPending && <Spinner />}
              <span>Verify</span>
            </Button>
            <Button
              type="button"
              variant="link"
              onClick={resetOtp}
              className="h-auto p-0 text-xs font-normal text-white/55 hover:text-white/80 hover:no-underline"
            >
              Use a different email
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AuthDialog;
