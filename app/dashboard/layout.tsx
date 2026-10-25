import { redirect } from "next/navigation";
import { AppSidebar, UserMenu } from "@/components/app-sidebar";
import { Wordmark } from "@/components/brand/logo";
import { OnboardingModal } from "@/components/onboarding-modal";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/sign-in");

    const [{ data: profile }, { count: resumeCount }] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", user.id).single(),
        supabase.from("resumes").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    ]);

    const menuUser = {
        name: profile?.full_name ?? user.email ?? "User",
        email: user.email ?? "",
        avatarUrl: (user.user_metadata?.avatar_url as string | undefined) ?? null,
    };

    return (
        <div className="flex min-h-svh">
            <AppSidebar user={menuUser} />
            <div className="min-w-0 flex-1">
                {/* Phone only: the rail becomes a bottom bar, so brand + account live up here */}
                <header className="flex h-14 items-center justify-between border-b px-4 md:hidden">
                    <Wordmark />
                    <UserMenu user={menuUser} side="bottom" />
                </header>
                <main className="px-4 pt-6 pb-24 md:px-8 md:pt-8 md:pb-8">{children}</main>
            </div>
            {/* First visit: block the dashboard until a resume is uploaded */}
            {!resumeCount && <OnboardingModal />}
        </div>
    );
}
