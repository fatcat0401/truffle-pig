import { NextResponse } from "next/server";
import { getApiUser, jsonError } from "@/lib/auth";
import { parseResume, type ParsedResume } from "@/lib/resume";
import { mergeParsedResume } from "@/lib/profile";
import { logActivity } from "@/lib/activity";
import type { Profile } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const ALLOWED_TYPES: Record<string, string> = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};
const MAX_BYTES = 4 * 1024 * 1024; // Vercel rejects request bodies above ~4.5 MB

export async function POST(request: Request) {
    const { supabase, user } = await getApiUser();
    if (!user) return jsonError("Unauthorized", 401);

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return jsonError("No file uploaded", 400);

    const extension = ALLOWED_TYPES[file.type];
    if (!extension) return jsonError("Only PDF or DOCX files are allowed", 400);
    if (file.size > MAX_BYTES) return jsonError("File must be smaller than 4 MB", 400);

    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = `${user.id}/${Date.now()}.${extension}`;

    // 1) Keep the original file in Storage
    const { error: uploadError } = await supabase.storage
        .from("resumes")
        .upload(filePath, buffer, { contentType: file.type });
    if (uploadError) return jsonError(uploadError.message, 500);

    // 2) Let Gemini read it
    let parsed: ParsedResume;
    try {
        parsed = await parseResume(buffer, file.type);
    } catch (error) {
        console.error("Resume parsing failed", error);
        await supabase.storage.from("resumes").remove([filePath]);
        return jsonError("AI could not read this resume. Try another file.", 502);
    }

    // 3) Remember the file
    const { data: resume, error: insertError } = await supabase
        .from("resumes")
        .insert({
            user_id: user.id,
            file_path: filePath,
            file_name: file.name,
            mime_type: file.type,
            file_size: file.size,
            parsed,
        })
        .select("*")
        .single();
    if (insertError) return jsonError(insertError.message, 500);

    // 4) Fill the profile with what Gemini found
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (profile) {
        const { error: updateError } = await supabase
            .from("profiles")
            .update(mergeParsedResume(profile as Profile, parsed))
            .eq("id", user.id);
        if (updateError) return jsonError(updateError.message, 500);
    }

    await logActivity(user.id, "resume", `Uploaded ${file.name}`);
    return NextResponse.json({ resume });
}