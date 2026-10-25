import { JobBoard } from "@/components/jobs/job-board";
import { requireUser } from "@/lib/auth";
import { getRecentActivity } from "@/lib/activity";

export default async function JobsPage() {
    const { supabase, user } = await requireUser();
    const [{ data: profile }, activity] = await Promise.all([
        supabase.from("profiles").select("headline, skills, completeness").eq("id", user.id).single(),
        getRecentActivity(user.id),
    ]);

    return (
        <div className="mx-auto max-w-7xl space-y-6">
            <div>
                <h1 className="text-3xl font-semibold text-truffle">Jobs</h1>
                <p className="mt-1 text-muted-foreground">Fresh postings from the past month, ranked by how well they match your skills.</p>
            </div>
            <JobBoard
                profile={{
                    headline: profile?.headline ?? null,
                    skills: profile?.skills ?? [],
                    completeness: profile?.completeness ?? 0,
                }}
                activity={activity}
            />
        </div>
    );
}