import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isEmailAllowed } from "@/lib/allowed-emails";

// Google sends the user back here with ?code=... We swap the code for a session cookie.
export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");
    const nextParam = searchParams.get("next") ?? "/dashboard/jobs";
    // Only allow relative paths so nobody can redirect users to another website
    const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/dashboard/jobs";

    if (code) {
        const supabase = await createClient();
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
            // Personal app: anyone not on the allow list is signed straight back out
            if (!isEmailAllowed(data.user?.email)) {
                await supabase.auth.signOut();
                return NextResponse.redirect(`${origin}/sign-in?error=not_allowed`);
            }
            return NextResponse.redirect(`${origin}${next}`);
        }
    }

    return NextResponse.redirect(`${origin}/sign-in?error=auth`);
}