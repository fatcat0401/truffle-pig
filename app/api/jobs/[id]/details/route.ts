import { NextResponse } from "next/server";
import { getApiUser, jsonError } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchJobDetails, JobClosedError, type JobDetails } from "@/lib/job-details";
import { canAutoApply } from "@/lib/types";

export const maxDuration = 60;

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const { user } = await getApiUser();
    if (!user) return jsonError("Unauthorized", 401);

    const admin = createAdminClient();
    const { data: job } = await admin.from("jobs").select("*").eq("id", id).single();
    if (!job) return jsonError("Job not found", 404);

    // Already read once (by anyone): reuse it, no API or AI call
    if (job.details_fetched_at) return NextResponse.json({ job });
    // Only company careers pages (ATS) have a public API. LinkedIn: open the posting instead.
    if (!canAutoApply(job.platform)) return jsonError("Full details are only available for company careers pages", 400);

    let details: JobDetails;
    try {
        details = await fetchJobDetails(job.url, job.platform);
    } catch (error) {
        if (error instanceof JobClosedError) return jsonError("This job is closed. The company removed the posting.", 410);
        console.error("Job details failed", error);
        return jsonError("Could not read the job details", 502);
    }

    const patch = {
        description: details.description ?? job.description,
        location: details.location ?? job.location,
        salary: details.salary,
        job_type: details.job_type,
        experience_level: details.experience_level,
        tags: details.tags,
        details_fetched_at: new Date().toISOString(),
    };
    // The same posting may be stored under several searches: update all copies
    await admin.from("jobs").update(patch).eq("url", job.url);

    return NextResponse.json({ job: { ...job, ...patch } });
}