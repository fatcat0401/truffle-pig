import "server-only";
import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isEmailAllowed } from "@/lib/allowed-emails";

// For pages: returns the user or sends them to /sign-in
export async function requireUser() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/sign-in");
    if (!isEmailAllowed(user.email)) redirect("/sign-in?error=not_allowed");
    return { supabase, user };
}

// For API routes: returns user = null when signed out or not on the allow list (route then answers 401).
// Middleware only guards /dashboard pages, so API routes check the allow list themselves.
export async function getApiUser() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    return { supabase, user: user && isEmailAllowed(user.email) ? user : null };
}

export function jsonError(message: string, status: number) {
    return NextResponse.json({ error: message }, { status });
}