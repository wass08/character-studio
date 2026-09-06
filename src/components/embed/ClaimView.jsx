"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import HubHeader from "@/components/shell/HubHeader";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/primitives/Toast";
import { useAuthStore } from "@/stores/useAuthStore";
import { pb } from "@/stores/useConfiguratorStore";

/**
 * /claim?code=… — opened from the embed in a first-party tab. The visitor
 * signs in (OTP dialog), then the code is redeemed and the guest character
 * becomes theirs. Codes are single-use and expire after ~15 minutes.
 */
export default function ClaimView() {
  const params = useSearchParams();
  const router = useRouter();
  const code = (params.get("code") || "").trim();

  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const setLoginDialogOpen = useAuthStore((s) => s.setLoginDialogOpen);

  const [status, setStatus] = useState("idle"); // idle | claiming | done | error
  const [error, setError] = useState(null);
  const [character, setCharacter] = useState(null);
  const attempted = useRef(false);

  // Redeem as soon as we have both a code and a session, once.
  useEffect(() => {
    if (!code || !isLoggedIn || attempted.current) return;
    attempted.current = true;
    setStatus("claiming");
    (async () => {
      try {
        const response = await fetch("/api/embed/claim", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            Authorization: `Bearer ${pb.authStore.token}`,
          },
          body: JSON.stringify({ code }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload?.error || "Couldn't claim this character");
        }
        setCharacter(payload.character);
        setStatus("done");
        toast.success(`"${payload.character.name}" is now in your studio`);
        router.replace(`/c/${payload.character.id}`);
      } catch (e) {
        setError(e?.message || "Couldn't claim this character");
        setStatus("error");
      }
    })();
  }, [code, isLoggedIn, router]);

  const body = () => {
    if (!code) {
      return (
        <>
          <h1 className="text-2xl font-semibold tracking-tight">
            Missing claim code
          </h1>
          <p className="text-sm text-white/55">
            Open this page from the "Save to Character Studio" button in the
            creator.
          </p>
        </>
      );
    }
    if (status === "error") {
      return (
        <>
          <h1 className="text-2xl font-semibold tracking-tight">
            Couldn't save this character
          </h1>
          <p className="text-sm text-white/55">{error}</p>
          <p className="text-sm text-white/55">
            Go back to the creator and press "Save to Character Studio" again to
            get a fresh code.
          </p>
        </>
      );
    }
    if (status === "done" && character) {
      return (
        <>
          <h1 className="text-2xl font-semibold tracking-tight">
            "{character.name}" is yours
          </h1>
          <p className="text-sm text-white/55">Taking you to its page…</p>
        </>
      );
    }
    if (status === "claiming") {
      return (
        <>
          <h1 className="text-2xl font-semibold tracking-tight">
            Saving to your account…
          </h1>
          <p className="text-sm text-white/55">One moment.</p>
        </>
      );
    }
    return (
      <>
        <h1 className="text-2xl font-semibold tracking-tight">
          Save this character to your account
        </h1>
        <p className="text-sm text-white/55">
          Sign in with your email and the character you just made will be added
          to your studio. No password needed, we send a one-time code.
        </p>
        <Button
          type="button"
          onClick={() => setLoginDialogOpen(true)}
          className="mt-2 h-10 rounded-lg px-5 text-sm font-semibold"
        >
          Sign in to save it
        </Button>
      </>
    );
  };

  return (
    <main className="min-h-screen hub-bg text-white">
      <HubHeader />
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-6 py-32 text-center">
        <div className="text-[10px] font-semibold tracking-[0.18em] text-white/45 uppercase">
          Character Studio
        </div>
        {body()}
        <Link
          href="/studio"
          className="mt-6 text-xs text-white/45 underline-offset-2 hover:text-white hover:underline"
        >
          Go to my characters
        </Link>
      </div>
    </main>
  );
}
