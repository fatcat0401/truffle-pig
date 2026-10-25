import { NextResponse } from "next/server";
import { z } from "zod";
import { Type, type Schema } from "@google/genai";
import { getApiUser, jsonError } from "@/lib/auth";
import { generateJson } from "@/lib/gemini";

const bodySchema = z.object({
    applicationId: z.string().uuid(),
    label: z.string().min(1).max(500),
    type: z.string().max(30),
    options: z.array(z.string().max(300)).max(100).default([]),
});

const schema: Schema = {
    type: Type.OBJECT,
    properties: { answer: { type: Type.STRING } },
    required: ["answer"],
};

export async function POST(request: Request) {
    const { supabase, user } = await getApiUser();
    if (!user) return jsonError("Unauthorized", 401);

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) return jsonError("Invalid request", 400);
    const { applicationId, label, options } = parsed.data;

    const [{ data: application }, { data: profile }] = await Promise.all([
        supabase.from("job_applications").select("job_title, company").eq("id", applicationId).eq("user_id", user.id).single(),
        supabase
            .from("profiles")
            .select("full_name, location, headline, summary, skills, experience, education")
            .eq("id", user.id)
            .single(),
    ]);
    if (!application || !profile) return jsonError("Not found", 404);

    const prompt = `You are helping a candidate answer a job application question.
Job: ${application.job_title} at ${application.company ?? "the company"}
Question: ${label}
${options.length
            ? `Answer with EXACTLY one of these options: ${options.join(" | ")}`
            : "Answer in first person, plain text, maximum 120 words."
        }
Base the answer on the candidate profile. If a fact is unknown (salary, visa, notice period), give an honest,
neutral answer the candidate can edit, e.g. "Open to discussion".

CANDIDATE PROFILE:
${JSON.stringify(profile)}`;

    try {
        const { answer } = await generateJson<{ answer: string }>([{ text: prompt }], schema);
        return NextResponse.json({ answer: answer.trim() });
    } catch (error) {
        console.error("Autofill failed", error);
        return jsonError("AI could not answer this question", 502);
    }
}