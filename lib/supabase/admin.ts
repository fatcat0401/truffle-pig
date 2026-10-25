import "server-only";
import { createClient } from "@supabase/supabase-js";

// Master key client. Bypasses RLS, so ONLY use on the server after you checked who the user is.
export function createAdminClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SECRET_KEY!,
        { auth: { persistSession: false, autoRefreshToken: false } },
    );
}