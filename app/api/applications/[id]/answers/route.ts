import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiUser, jsonError } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { inngest } from "@/lib/inngest/client";
import { cleanLabel } from "@/lib/apply/shared";
import type { MissingField } from "@/lib/types";

const bodySchema = z.object({
    answers: z.record(z.string(), z.string().trim().max(5000)),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const { supabase, user } = await getApiUser();
    if (!user) return jsonError("Unauthorized", 401);

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) return jsonError("Invalid answers", 400);
    const answers = Object.fromEntries(Object.entries(parsed.data.answers).filter(([, v]) => v));

    const { data: application } = await supabase
        .from("job_applications")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();
    if (!application) return jsonError("Application not found", 404);
    if (application.status !== "missing_info") return jsonError("This application is not waiting for answers", 409);

    const missing = (application.missing_fields ?? []) as MissingField[];
    const unanswered = missing.filter((f) => f.required && !answers[f.key]);
    if (unanswered.length > 0) return jsonError(`Please answer: ${unanswered.map((f) => f.label).join(", ")}`, 400);

    // Remember the answers so the agent can reuse them for future applications
    const { data: profile } = await supabase.from("profiles").select("extra_answers").eq("id", user.id).single();
    const extraAnswers: Record<string, string> = { ...(profile?.extra_answers ?? {}) };
    for (const field of missing) {
        if (answers[field.key]) extraAnswers[cleanLabel(field.label)] = answers[field.key];
    }
    await supabase
        .from("profiles")
        .update({ extra_answers: extraAnswers, updated_at: new Date().toISOString() })
        .eq("id", user.id);

    // Put the application back in the queue
    const admin = createAdminClient();
    const { error } = await admin
        .from("job_applications")
        .update({
            answers: { ...(application.answers ?? {}), ...answers },
            missing_fields: [],
            status: "queued",
            error: null,
            updated_at: new Date().toISOString(),
        })
        .eq("id", id);
    if (error) return jsonError(error.message, 500);

    await inngest.send({ name: "job/apply.requested", data: { applicationId: id } });
    return NextResponse.json({ ok: true });
}