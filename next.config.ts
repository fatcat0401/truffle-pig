import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // These packages use Node.js internals, so Next.js should not bundle them.
  // Stagehand finds its own files at runtime (new URL("../", import.meta.url)), which Turbopack cannot bundle.
  serverExternalPackages: ["playwright-core", "mammoth", "@browserbasehq/stagehand"],
  // The dev-tools button defaults to bottom-left, on top of the rail's account menu
  devIndicators: { position: "bottom-right" },
};

export default nextConfig;
