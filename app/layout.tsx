import type { Metadata } from "next";
import { Figtree, Fraunces } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const figtree = Figtree({ variable: "--font-figtree", subsets: ["latin"] });
// Variable font with the SOFT and WONK axes, used for headings
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], axes: ["SOFT", "WONK", "opsz"] });

export const metadata: Metadata = {
  title: "Truffle Pig — Human-in-the-loop AI Job Hunting Agent",
  description: "A personal AI agent that finds jobs in Australia, drafts applications and asks you before it guesses.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // Font variables live on <html> because the font-sans rule is applied there
    <html lang="en" className={`${figtree.variable} ${fraunces.variable}`}>
      <body className="antialiased">
        {/* shadcn v4: the sidebar's tooltips need ONE provider around the whole app */}
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
