import Link from "next/link";
import { Bot } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GoogleSignInButton } from "@/components/google-sign-in-button";

export default async function SignInPage({
    searchParams,
}: {
    searchParams: Promise<{ next?: string; error?: string }>;
}) {
    const { next, error } = await searchParams;

    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
            <Card className="w-full max-w-sm">
                <CardHeader className="items-center text-center">
                    <Link href="/" className="mx-auto mb-2 flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                        <Bot className="size-6" />
                    </Link>
                    <CardTitle className="text-2xl">Welcome to Truffle Pig</CardTitle>
                    <CardDescription>Sign in to find matching jobs and let AI apply for you.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {error && (
                        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                            {error === "not_allowed"
                                ? "This is a personal app. Your Google account is not on the allow list."
                                : "Sign in failed. Please try again."}
                        </p>
                    )}
                    <GoogleSignInButton next={next} />
                    <p className="text-center text-xs text-muted-foreground">
                        We only use your Google account to sign you in.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}