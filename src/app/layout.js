import { Inter } from "next/font/google";
import GlobalChrome from "@/components/shell/GlobalChrome";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata = {
  title: "Character Studio",
  description: "A studio for building, playing, and sharing characters.",
};

// Every first load opens three origins before a character can appear: the
// app, PocketBase (catalog + records) and the R2 CDN (bakes, assets,
// animations). Warming those TLS connections in the document head shaves
// the cold handshake (~1 s to PocketBase from the US) off the critical path.
const preconnectOrigins = () => {
  const origins = new Set();
  for (const raw of [
    process.env.NEXT_PUBLIC_POCKETBASE_URL,
    process.env.R2_PUBLIC_URL,
  ]) {
    if (!raw) continue;
    try {
      const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
      origins.add(url.origin);
    } catch {
      // ignore malformed env values
    }
  }
  return [...origins];
};

export default function RootLayout({ children }) {
  const origins = preconnectOrigins();
  return (
    <html lang="en" className="dark">
      <head>
        {origins.map((origin) => (
          <link key={origin} rel="preconnect" href={origin} crossOrigin="" />
        ))}
        {origins.map((origin) => (
          <link key={`dns-${origin}`} rel="dns-prefetch" href={origin} />
        ))}
      </head>
      <body className={`${inter.variable} antialiased`}>
        <TooltipProvider
          delayDuration={150}
          skipDelayDuration={300}
          disableHoverableContent
        >
          {children}
          <GlobalChrome />
          <Toaster />
        </TooltipProvider>
      </body>
    </html>
  );
}
