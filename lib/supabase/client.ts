import { createBrowserClient } from "@supabase/ssr";

// Used inside "use client" components (runs in the browser).
export function createClient() {
    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    );
}