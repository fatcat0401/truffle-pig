import "server-only";
import { Type, type Schema } from "@google/genai";
import { generateJson } from "@/lib/gemini";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeLabel } from "@/lib/apply/shared";
import type { FormField, MissingField, Platform, Profile } from "@/lib/types";

export type FieldMapping = { values: Record<string, string>; missing: MissingField[] };

// Simple profile facts a text box can be filled with. These are what
// field_label_maps remembers: "label X on platform Y = profile fact Z".
const PROFILE_KEYS = [
    "full_name", "first_name", "last_name", "email", "phone", "location",
    "headline", "summary", "linkedin_url", "github_url", "portfolio_url",
] as const;
type ProfileKey = (typeof PROFILE_KEYS)[number];
const TEXT_TYPES = new Set(["text", "email", "tel", "url", "textarea"]);

function valueFromProfile(key: ProfileKey, profile: Profile): string | null {
    const [first, ...rest] = (profile.full_name ?? "").trim().split(/\s+/);
    if (key === "first_name") return first || null;
    if (key === "last_name") return rest.join(" ") || null;
    return profile[key] ?? null;
}

const schema: Schema = {
    type: Type.OBJECT,
    properties: {
        answers: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    key: { type: Type.STRING },
                    value: { type: Type.STRING, nullable: true },
                    // Which simple profile fact the value came from (null for anything else)
                    profile_key: { type: Type.STRING, nullable: true, enum: [...PROFILE_KEYS] },
                },
                required: ["key", "value", "profile_key"],
            },
        },
    },
    required: ["answers"],
};

export async function mapFieldsToValues(
    fields: FormField[],
    profile: Profile,
    answers: Record<string, string>,
    job: { job_title: string; company: string | null; platform: Platform },
): Promise<FieldMapping> {
    const values: Record<string, string> = {};
    const admin = createAdminClient();

    // 1) Answers the user already typed (for this application or in the past)
    const savedByLabel = new Map(
        Object.entries(profile.extra_answers ?? {}).map(([label, answer]) => [normalizeLabel(label), answer]),
    );
    const unknown: FormField[] = [];
    for (const field of fields) {
        if (field.type === "file") continue; // the resume is attached separately
        const known = answers[field.key] ?? savedByLabel.get(normalizeLabel(field.label));
        if (known) values[field.key] = known;
        else unknown.push(field);
    }

    // 2) Labels we have seen before (on this platform, by any user): no AI needed
    const textLabels = unknown.filter((f) => TEXT_TYPES.has(f.type)).map((f) => normalizeLabel(f.label));
    const { data: learned } = textLabels.length
        ? await admin
            .from("field_label_maps")
            .select("label_norm, profile_key")
            .eq("platform", job.platform)
            .in("label_norm", textLabels)
        : { data: [] };
    const keyByLabel = new Map((learned ?? []).map((row) => [row.label_norm, row.profile_key as ProfileKey]));

    const toAsk: FormField[] = [];
    for (const field of unknown) {
        const profileKey = TEXT_TYPES.has(field.type) ? keyByLabel.get(normalizeLabel(field.label)) : undefined;
        const value = profileKey ? valueFromProfile(profileKey, profile) : null;
        if (value) values[field.key] = value;
        else toAsk.push(field);
    }

    // 3) Ask Gemini to fill the rest from the profile
    if (toAsk.length > 0) {
        const candidate = {
            full_name: profile.full_name,
            email: profile.email,
            phone: profile.phone,
            location: profile.location,
            headline: profile.headline,
            summary: profile.summary,
            linkedin_url: profile.linkedin_url,
            github_url: profile.github_url,
            portfolio_url: profile.portfolio_url,
            skills: profile.skills,
            experience: profile.experience,
            education: profile.education,
        };
        const questions = toAsk.map((f) => ({
            key: f.key,
            label: f.label,
            type: f.type,
            options: f.options.map((o) => o.label),
        }));

        const prompt = `You are filling out a job application form for ${job.job_title} at ${job.company ?? "a company"}.
For EVERY field below, return { key, value }.
Rules:
- Use ONLY facts from the candidate profile. Never invent facts.
- Split full_name for "First name" / "Last name" fields.
- For select or radio fields, value must be exactly one of the given options.
- For a single checkbox, value is "yes" only if clearly true from the profile, otherwise null.
- If the profile does not answer it (salary, visa, start date, "why do you want to work here", demographics...), value = null.
- profile_key = the profile fact you copied the value from (first_name / last_name for a split name), otherwise null.

CANDIDATE PROFILE:
${JSON.stringify(candidate)}

FIELDS:
${JSON.stringify(questions)}`;

        const result = await generateJson<{
            answers: { key: string; value: string | null; profile_key: ProfileKey | null }[];
        }>([{ text: prompt }], schema);
        const askedByKey = new Map(toAsk.map((f) => [f.key, f]));
        const toRemember: { platform: Platform; label_norm: string; profile_key: ProfileKey; updated_at: string }[] = [];

        for (const answer of result.answers) {
            const field = askedByKey.get(answer.key);
            if (!answer.value || !field) continue;
            values[answer.key] = answer.value;

            // Remember the label only if the value really is that profile fact
            if (
                answer.profile_key &&
                TEXT_TYPES.has(field.type) &&
                valueFromProfile(answer.profile_key, profile) === answer.value
            ) {
                toRemember.push({
                    platform: job.platform,
                    label_norm: normalizeLabel(field.label),
                    profile_key: answer.profile_key,
                    updated_at: new Date().toISOString(),
                });
            }
        }

        if (toRemember.length > 0) {
            // One row per label: Postgres refuses an upsert that touches the same row twice
            const rows = Array.from(new Map(toRemember.map((row) => [row.label_norm, row])).values());
            const { error } = await admin.from("field_label_maps").upsert(rows, { onConflict: "platform,label_norm" });
            if (error) console.error("Could not save field label maps", error.message);
        }
    }

    // 4) Required fields that are still empty = we must ask the user
    const missing = fields
        .filter((f) => f.required && f.type !== "file" && !values[f.key])
        .map(({ key, label, type, required, options }) => ({ key, label, type, required, options }));

    return { values, missing };
}