import { ApplicationsList } from "@/components/applications/applications-list";
import { requireUser } from "@/lib/auth";
import type { JobApplication } from "@/lib/types";

export default async function ApplicationsPage() {
    const { supabase, user } = await requireUser();
    const { data } = await supabase
        .from("job_applications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);

    return (
        <div className="mx-auto max-w-5xl space-y-6">
            <div>
                <h1 className="text-3xl font-semibold text-truffle">Applications</h1>
                <p className="mt-1 text-muted-foreground">
                    Where each application is. The agent stops and waits for you whenever a form asks something it does not know.
                </p>
            </div>
            <ApplicationsList initial={(data ?? []) as JobApplication[]} />
        </div>
    );
}