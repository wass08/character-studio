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
 * the editor's AssetsBox (everything outside /create) would never resolve
 * the configurator's `loading` flag, leaving the intro screen stuck.
 *
 * Routes that own the full viewport (editor, /play/*) opt into
 * `body.fullscreen-app` so the document doesn't scroll behind their canvas.
 */
const FULLSCREEN_PREFIXES = ["/create", "/play"];

const GlobalChrome = () => {
  const pathname = usePathname();
  const fetchCategories = useConfiguratorStore((s) => s.fetchCategories);
  const gender = useConfiguratorStore((s) => s.gender);

  useEffect(() => {
    fetchCategories().catch(() => {});
  }, [fetchCategories, gender]);

  useEffect(() => {
    const fullscreen = FULLSCREEN_PREFIXES.some((p) => pathname?.startsWith(p));
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
