"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import AuthDialog from "@/components/ui/AuthDialog/AuthDialog";
import AuthBootstrapper from "@/components/ui/AuthBootstrapper";
import { useConfiguratorStore } from "@/stores/useConfiguratorStore";

/**
 * Auth dialog and main-character auto-load are mounted once for the whole
 * app so any route can trigger sign-in and the active character travels
 * between routes without reloading.
 *
 * Also primes the asset catalog — without this, routes that don't render
 * the editor's AssetsBox (everything outside /editor) would never resolve
 * the configurator's `loading` flag, leaving the intro screen stuck.
 *
 * Routes that own the full viewport (editor, per-character /c/[id]/try/*)
 * opt into `body.fullscreen-app` so the document doesn't scroll behind
 * their canvas.
 */
const FULLSCREEN_PREFIXES = ["/editor"];
// Per-character experiments — render in their own viewport. Match
// /c/<id>/try/<experiment> via a starts-with check on `/c/` plus a
// substring scan, since usePathname can't parse params here.
const isExperimentPath = (path) =>
  !!path && path.startsWith("/c/") && path.includes("/try/");

const GlobalChrome = () => {
  const pathname = usePathname();
  const fetchCategories = useConfiguratorStore((s) => s.fetchCategories);
  const gender = useConfiguratorStore((s) => s.gender);

  useEffect(() => {
    fetchCategories().catch(() => {});
  }, [fetchCategories, gender]);

  useEffect(() => {
    const fullscreen =
      FULLSCREEN_PREFIXES.some((p) => pathname?.startsWith(p)) ||
      isExperimentPath(pathname);
    document.body.classList.toggle("fullscreen-app", fullscreen);
    return () => document.body.classList.remove("fullscreen-app");
  }, [pathname]);

  return (
    <>
      <AuthDialog />
      <AuthBootstrapper />
    </>
  );
};

export default GlobalChrome;
