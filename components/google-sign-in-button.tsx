"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function GoogleSignInButton({ next = "/dashboard/jobs" }: { next?: string }) {
    const [loading, setLoading] = useState(false);

    async function handleSignIn() {
        setLoading(true);
        const supabase = createClient();
        const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
            },
        });
        // On success the browser leaves this page, so we only handle the error case.
        if (error) {
            toast.error(error.message);
            setLoading(false);
        }
    }

    return (
        <Button onClick={handleSignIn} disabled={loading} variant="outline" size="lg" className="w-full">
            {loading ? (
                <Loader2 className="size-4 animate-spin" />
            ) : (
                <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
                    <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.4-1.6 4-5.5 4-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.3 14.6 2.3 12 2.3 6.7 2.3 2.4 6.6 2.4 12s4.3 9.7 9.6 9.7c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12z" />
                </svg>
            )}
            Continue with Google
        </Button>
    );
}