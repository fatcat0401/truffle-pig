import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Google sends the user back here with ?code=... We swap the code for a session cookie.
export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");
    const nextParam = searchParams.get("next") ?? "/dashboard/jobs";
    // Only allow relative paths so nobody can redirect users to another website
    const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/dashboard/jobs";

    if (code) {
        const supabase = await createClient();
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
            return NextResponse.redirect(`${origin}${next}`);
        }
    }

    return NextResponse.redirect(`${origin}/sign-in?error=auth`);
}