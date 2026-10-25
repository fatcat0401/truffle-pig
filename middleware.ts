import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
    return updateSession(request);
}

export const config = {
    // Run on every page except static files and the two webhook endpoints.
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|api/inngest|api/stripe/webhook|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};