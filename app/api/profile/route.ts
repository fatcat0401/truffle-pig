import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiUser, jsonError } from "@/lib/auth";
import { getCompleteness } from "@/lib/profile";
import { logActivity } from "@/lib/activity";
import type { Profile } from "@/lib/types";

const optionalText = z
    .string()
    .trim()
    .max(5000)
    .nullable()
    .transform((value) => (value === "" ? null : value));

const experienceSchema = z.object({
    company: z.string().trim().max(200),
    title: z.string().trim().max(200),
    location: optionalText,
    start_date: optionalText,
    end_date: optionalText,
    description: optionalText,
});

const educationSchema = z.object({
    school: z.string().trim().max(200),
    degree: optionalText,
    field: optionalText,
    start_date: optionalText,
    end_date: optionalText,
});

const projectSchema = z.object({
    name: z.string().trim().max(200),
    description: optionalText,
    url: optionalText,
});

const certificationSchema = z.object({
    name: z.string().trim().max(200),
    issuer: optionalText,
    date: optionalText,
});

// Only these fields can be changed from the profile page
const profileUpdateSchema = z
    .object({
        full_name: optionalText,
        phone: optionalText,
        location: optionalText,
        headline: optionalText,
        summary: optionalText,
        linkedin_url: optionalText,
        github_url: optionalText,
        portfolio_url: optionalText,
        skills: z.array(z.string().trim().min(1).max(60)).max(60),
        experience: z.array(experienceSchema).max(30),
        education: z.array(educationSchema).max(20),
        projects: z.array(projectSchema).max(20),
        certifications: z.array(certificationSchema).max(20),
        extra_answers: z.record(z.string(), z.string().max(5000)),
    })
    .partial();

export async function PATCH(request: Request) {
    const { supabase, user } = await getApiUser();
    if (!user) return jsonError("Unauthorized", 401);

    const parsed = profileUpdateSchema.safeParse(await request.json());
    if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Invalid data", 400);

    const { data: current } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (!current) return jsonError("Profile not found", 404);

    const merged = { ...(current as Profile), ...parsed.data } as Profile;

    const { data: profile, error } = await supabase
        .from("profiles")
        .update({
            ...parsed.data,
            completeness: getCompleteness(merged).percent,
            updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)
        .select("*")
        .single();

    if (error) return jsonError(error.message, 500);

    await logActivity(user.id, "profile", "Updated profile");
    return NextResponse.json({ profile });
}