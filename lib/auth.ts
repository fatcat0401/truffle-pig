import "server-only";
import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// For pages: returns the user or sends them to /sign-in
export async function requireUser() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/sign-in");
    return { supabase, user };
}

// For API routes: returns user = null when signed out (route then answers 401)
export async function getApiUser() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    return { supabase, user };
}

export function jsonError(message: string, status: number) {
    return NextResponse.json({ error: message }, { status });
}