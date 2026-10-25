import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isEmailAllowed } from "@/lib/allowed-emails";

export async function updateSession(request: NextRequest) {
    let response = NextResponse.next({ request });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
                    response = NextResponse.next({ request });
                    cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
                },
            },
        },
    );

    // Refreshes the login cookie if needed. Do not put code between createServerClient and getUser.
    let {
        data: { user },
    } = await supabase.auth.getUser();

    const path = request.nextUrl.pathname;

    // Signed in with an account that is not on the allow list: drop the session
    if (user && !isEmailAllowed(user.email)) {
        await supabase.auth.signOut(); // clears the auth cookies on `response`
        user = null;
        if (path.startsWith("/dashboard")) {
            const url = request.nextUrl.clone();
            url.pathname = "/sign-in";
            url.search = "?error=not_allowed";
            const redirect = NextResponse.redirect(url);
            response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
            return redirect;
        }
    }

    // Not signed in but trying to open the dashboard: go to sign-in
    if (!user && path.startsWith("/dashboard")) {
        const url = request.nextUrl.clone();
        url.pathname = "/sign-in";
        url.searchParams.set("next", path);
        return NextResponse.redirect(url);
    }

    // Already signed in but on the sign-in page: go to the dashboard
    if (user && path === "/sign-in") {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard/jobs";
        url.search = "";
        return NextResponse.redirect(url);
    }

    return response;
}