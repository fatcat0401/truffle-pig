import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiUser, jsonError } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { consumeApplyCredit } from "@/lib/usage";
import { inngest } from "@/lib/inngest/client";
import { logActivity } from "@/lib/activity";
import { PLANS, type PlanId } from "@/lib/plans";
import { canAutoApply } from "@/lib/types";

const bodySchema = z.object({ jobId: z.string().uuid() });

// Queue a new AI application
export async function POST(request: Request) {
    const { supabase, user } = await getApiUser();
    if (!user) return jsonError("Unauthorized", 401);

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) return jsonError("Invalid job id", 400);

    const { data: job } = await supabase.from("jobs").select("*").eq("id", parsed.data.jobId).single();
    if (!job) return jsonError("Job not found", 404);
    // SEEK / LinkedIn / Jora need the user's own login: only company careers pages (ATS) are automated
    if (!canAutoApply(job.platform)) return jsonError("Auto-apply only works for company careers pages. Apply on the job board yourself.", 400);

    const { data: existing } = await supabase
        .from("job_applications")
        .select("id")
        .eq("user_id", user.id)
        .eq("job_url", job.url)
        .neq("status", "failed")
        .limit(1);
    if (existing && existing.length > 0) return jsonError("You already applied to this job", 409);

    const [{ data: profile }, { count: resumeCount }] = await Promise.all([
        supabase.from("profiles").select("plan").eq("id", user.id).single(),
        supabase.from("resumes").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    ]);
    if (!resumeCount) return jsonError("Please upload a resume first", 400);

    const plan = (profile?.plan ?? "free") as PlanId;
    const allowed = await consumeApplyCredit(user.id, plan);
    if (!allowed) {
        return jsonError(
            `Daily limit reached (${PLANS[plan].dailyLimit} per day).${plan === "free" ? " Upgrade to Pro for more." : ""}`,
            429,
        );
    }

    const admin = createAdminClient();
    const { data: application, error } = await admin
        .from("job_applications")
        .insert({
            user_id: user.id,
            job_id: job.id,
            job_title: job.title,
            company: job.company,
            platform: job.platform,
            job_url: job.url,
            status: "queued",
        })
        .select("*")
        .single();
    if (error || !application) return jsonError(error?.message ?? "Could not create application", 500);

    try {
        await inngest.send({ name: "job/apply.requested", data: { applicationId: application.id } });
    } catch (err) {
        console.error("Inngest send failed", err);
        await admin
            .from("job_applications")
            .update({ status: "failed", error: "Could not reach the job queue. Is Inngest running?" })
            .eq("id", application.id);
        return jsonError("Could not queue the application", 502);
    }

    await logActivity(user.id, "apply", `Queued ${job.title}${job.company ? ` at ${job.company}` : ""}`);
    return NextResponse.json({ application });
}

// List my applications (used for live polling)
export async function GET() {
    const { supabase, user } = await getApiUser();
    if (!user) return jsonError("Unauthorized", 401);

    const { data, error } = await supabase
        .from("job_applications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);
    if (error) return jsonError(error.message, 500);

    return NextResponse.json({ applications: data });
}