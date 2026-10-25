import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiUser, jsonError } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

const bodySchema = z.object({ jobId: z.string().uuid() });

export async function POST(request: Request) {
    const { supabase, user } = await getApiUser();
    if (!user) return jsonError("Unauthorized", 401);

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) return jsonError("Invalid job id", 400);

    const { data: job } = await supabase.from("jobs").select("url, title, company").eq("id", parsed.data.jobId).single();
    if (!job) return jsonError("Job not found", 404);

    // Already saved? The same posting can exist under several searches, so compare by URL.
    const { data: existing } = await supabase
        .from("saved_jobs")
        .select("id, job:jobs!inner(url)")
        .eq("user_id", user.id)
        .eq("job.url", job.url)
        .limit(1);
    if (existing && existing.length > 0) return NextResponse.json({ saved: true, alreadySaved: true });

    const { error } = await supabase.from("saved_jobs").insert({ user_id: user.id, job_id: parsed.data.jobId });
    if (error) return jsonError(error.message, 500);

    await logActivity(user.id, "save", `Saved ${job.title}${job.company ? ` at ${job.company}` : ""}`);
    return NextResponse.json({ saved: true, alreadySaved: false });
}

export async function DELETE(request: Request) {
    const { supabase, user } = await getApiUser();
    if (!user) return jsonError("Unauthorized", 401);

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) return jsonError("Invalid job id", 400);

    // The same URL can exist under several searches: unsave all copies
    const { data: job } = await supabase.from("jobs").select("url").eq("id", parsed.data.jobId).single();
    const { data: sameUrl } = job
        ? await supabase.from("jobs").select("id").eq("url", job.url)
        : { data: [{ id: parsed.data.jobId }] };
    const ids = (sameUrl ?? []).map((row) => row.id);

    const { error } = await supabase.from("saved_jobs").delete().eq("user_id", user.id).in("job_id", ids);
    if (error) return jsonError(error.message, 500);

    return NextResponse.json({ saved: false });
}