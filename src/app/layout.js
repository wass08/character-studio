import { Inter } from "next/font/google";
import * as Tooltip from "@radix-ui/react-tooltip";
import { ToastProvider } from "@/components/ui/primitives/Toast";
import GlobalChrome from "@/components/shell/GlobalChrome";
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
        <Tooltip.Provider
          delayDuration={150}
          skipDelayDuration={300}
          disableHoverableContent
        >
          <ToastProvider>
            {children}
            <GlobalChrome />
          </ToastProvider>
        </Tooltip.Provider>
      </body>
    </html>
  );
}
