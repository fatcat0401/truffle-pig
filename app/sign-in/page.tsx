import Link from "next/link";
import { SnoutMark } from "@/components/brand/logo";
import { GoogleSignInButton } from "@/components/google-sign-in-button";

export default async function SignInPage({
    searchParams,
}: {
    searchParams: Promise<{ next?: string; error?: string }>;
}) {
    const { next, error } = await searchParams;

    return (
        <div className="flex min-h-svh items-center justify-center bg-soil p-4">
            <div className="w-full max-w-sm rounded-xl bg-card p-8 text-card-foreground shadow-2xl shadow-black/40">
                <Link href="/" aria-label="Truffle Pig home" className="inline-block">
                    <SnoutMark className="size-10 text-truffle" />
                </Link>
                <h1 className="mt-5 text-3xl font-semibold">Sign in</h1>
                <p className="mt-2 text-muted-foreground">Truffle Pig is a personal app. Only allowed Google accounts can enter.</p>
                {error && (
                    <p role="alert" className="mt-5 rounded-md bg-rust/10 p-3 text-sm text-rust">
                        {error === "not_allowed"
                            ? "This Google account is not on the allow list."
                            : "Google sign-in did not finish. Try again."}
                    </p>
                )}
                <div className="mt-6">
                    <GoogleSignInButton next={next} />
                </div>
            </div>
        </div>
    );
}
