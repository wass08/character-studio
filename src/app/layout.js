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

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
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
