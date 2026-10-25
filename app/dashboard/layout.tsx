import { redirect } from "next/navigation";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { AppSidebar } from "@/components/app-sidebar";
import { OnboardingModal } from "@/components/onboarding-modal";
import { createClient } from "@/lib/supabase/server";
import { getTodayUsage } from "@/lib/usage";
import type { PlanId } from "@/lib/plans";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/sign-in");

    const [{ data: profile }, { count: resumeCount }] = await Promise.all([
        supabase.from("profiles").select("full_name, plan").eq("id", user.id).single(),
        supabase.from("resumes").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    ]);

    const plan = (profile?.plan ?? "free") as PlanId;
    const usage = await getTodayUsage(user.id, plan);

    return (
        <SidebarProvider>
            <AppSidebar
                user={{
                    name: profile?.full_name ?? user.email ?? "User",
                    email: user.email ?? "",
                    avatarUrl: (user.user_metadata?.avatar_url as string | undefined) ?? null,
                }}
                usage={usage}
                plan={plan}
            />
            <SidebarInset>
                <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
                    <SidebarTrigger className="-ml-1" />
                    <Separator orientation="vertical" className="mr-2 h-4" />
                    <span className="text-sm text-muted-foreground">Truffle Pig</span>
                </header>
                <main className="flex-1 p-4 md:p-6">{children}</main>
            </SidebarInset>
            {/* First visit: block the dashboard until a resume is uploaded */}
            {!resumeCount && <OnboardingModal />}
        </SidebarProvider>
    );
}