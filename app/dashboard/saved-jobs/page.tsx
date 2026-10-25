import { SavedJobsList } from "@/components/jobs/saved-jobs-list";
import { requireUser } from "@/lib/auth";
import { matchJob } from "@/lib/match";
import type { Job } from "@/lib/types";

export default async function SavedJobsPage() {
    const { supabase, user } = await requireUser();

    const [{ data: saved }, { data: profile }, { data: applied }] = await Promise.all([
        supabase
            .from("saved_jobs")
            .select("created_at, job:jobs(*)")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false }),
        supabase.from("profiles").select("skills").eq("id", user.id).single(),
        supabase.from("job_applications").select("job_url").eq("user_id", user.id).neq("status", "failed"),
    ]);

    const skills: string[] = profile?.skills ?? [];
    const jobs = (saved ?? [])
        .map((row) => row.job as unknown as Job | null)
        .filter((job): job is Job => job !== null)
        .map((job) => ({ ...job, ...matchJob(job, skills) }));

    return (
        <div className="mx-auto max-w-7xl space-y-6">
            <div>
                <h1 className="text-3xl font-semibold text-truffle">Saved jobs</h1>
                <p className="mt-1 text-muted-foreground">Jobs you put aside to apply to later.</p>
            </div>
            <SavedJobsList jobs={jobs} appliedUrls={(applied ?? []).map((a) => a.job_url)} />
        </div>
    );
}