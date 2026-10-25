import { NonRetriableError } from "inngest";
import { inngest } from "@/lib/inngest/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { detectFormFields } from "@/lib/apply/detect";
import { mapFieldsToValues } from "@/lib/apply/map";
import { fillAndSubmit } from "@/lib/apply/fill";
import { logActivity } from "@/lib/activity";
import type { JobApplication, Profile } from "@/lib/types";

async function updateApplication(id: string, patch: Partial<JobApplication>) {
    const admin = createAdminClient();
    const { error } = await admin
        .from("job_applications")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", id);
    if (error) throw new Error(error.message);
}

async function loadContext(applicationId: string) {
    const admin = createAdminClient();
    const { data: application } = await admin.from("job_applications").select("*").eq("id", applicationId).single();
    if (!application) throw new NonRetriableError("Application not found");

    const [{ data: profile }, { data: resume }] = await Promise.all([
        admin.from("profiles").select("*").eq("id", application.user_id).single(),
        admin
            .from("resumes")
            .select("file_path, file_name")
            .eq("user_id", application.user_id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
    ]);
    if (!profile) throw new NonRetriableError("Profile not found");
    if (!resume) throw new NonRetriableError("Please upload a resume first");

    return {
        application: application as JobApplication,
        profile: profile as Profile,
        resumePath: resume.file_path as string,
        resumeName: resume.file_name as string,
    };
}

export const applyToJob = inngest.createFunction(
    {
        id: "apply-to-job",
        retries: 1,
        concurrency: { limit: 2 }, // max 2 cloud browsers at the same time
        onFailure: async ({ event, error }) => {
            const { applicationId } = event.data.event.data as { applicationId: string };
            await updateApplication(applicationId, { status: "failed", error: error.message });
        },
    },
    { event: "job/apply.requested" },
    async ({ event, step }) => {
        const { applicationId } = event.data as { applicationId: string };

        const ctx = await step.run("load-application", () => loadContext(applicationId));

        await step.run("mark-detecting", () =>
            updateApplication(applicationId, { status: "detecting_fields", error: null }),
        );

        const detected = await step.run("detect-fields", () =>
            detectFormFields(ctx.application.job_url, ctx.application.platform),
        );

        const mapping = await step.run("map-fields", () =>
            mapFieldsToValues(detected.fields, ctx.profile, ctx.application.answers ?? {}, ctx.application),
        );

        // Something required is unknown: stop and ask the user
        if (mapping.missing.length > 0) {
            await step.run("mark-missing-info", () =>
                updateApplication(applicationId, {
                    status: "missing_info",
                    detected_fields: detected.fields,
                    missing_fields: mapping.missing,
                    browserbase_session_id: detected.sessionId,
                }),
            );
            await step.run("log-missing-info", () =>
                logActivity(ctx.application.user_id, "apply", `${ctx.application.job_title}: needs your answers`),
            );
            return { status: "missing_info", missing: mapping.missing.length };
        }

        await step.run("mark-in-progress", () =>
            updateApplication(applicationId, { status: "in_progress", detected_fields: detected.fields }),
        );

        const result = await step.run("fill-and-submit", () =>
            fillAndSubmit({
                applyUrl: detected.applyUrl,
                fields: detected.fields,
                values: mapping.values,
                resumePath: ctx.resumePath,
                resumeName: ctx.resumeName,
                dryRun: process.env.APPLY_DRY_RUN !== "false",
            }),
        );

        await step.run("mark-done", () =>
            updateApplication(applicationId, {
                status: result.submitted ? "submitted" : "dry_run_complete",
                browserbase_session_id: result.sessionId,
                error: result.note,
                submitted_at: result.submitted ? new Date().toISOString() : null,
            }),
        );

        await step.run("log-done", () =>
            logActivity(
                ctx.application.user_id,
                "apply",
                `${result.submitted ? "Applied to" : "Dry run for"} ${ctx.application.job_title}${ctx.application.company ? ` at ${ctx.application.company}` : ""
                }`,
            ),
        );

        return result;
    },
);