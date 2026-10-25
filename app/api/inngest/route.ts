import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { applyToJob } from "@/lib/inngest/functions";

// Browser automation is slow: allow up to 5 minutes per request on Vercel
export const maxDuration = 300;

export const { GET, POST, PUT } = serve({
    client: inngest,
    functions: [applyToJob],
});