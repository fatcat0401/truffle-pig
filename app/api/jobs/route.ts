import { NextResponse } from "next/server";
import { getApiUser, jsonError } from "@/lib/auth";
import { buildSearchPlace, buildSearchQuery, getJobs } from "@/lib/jobs";
import { matchJob } from "@/lib/match";
import { logActivity } from "@/lib/activity";
import { buildBoardSearchLinks } from "@/lib/job-boards";
import { PLATFORMS, type Platform } from "@/lib/types";

export const maxDuration = 60;

const VALID = new Set<string>(PLATFORMS.map((p) => p.id));

export async function GET(request: Request) {
    const { supabase, user } = await getApiUser();
    if (!user) return jsonError("Unauthorized", 401);

    const { searchParams } = new URL(request.url);
    const requested = (searchParams.get("platforms") ?? "").split(",").filter((p) => VALID.has(p)) as Platform[];
    const platforms = requested.length ? requested : PLATFORMS.map((p) => p.id);

    const { data: profile } = await supabase
        .from("profiles")
        .select("headline, experience, skills, location")
        .eq("id", user.id)
        .single();

    const typed = searchParams.get("q")?.trim();
    // Always search in the user's city (from the profile), or anywhere in Australia
    const place = buildSearchPlace(profile?.location);
    const role = (typed || buildSearchQuery(profile)).replace(/"/g, "").trim().slice(0, 80);
    // Quotes: Brave must find the whole role, not just one of its words ("ai" matches everything)
    const query = `"${role}" ${place}`.slice(0, 120);

    const { jobs, calledBrave } = await getJobs(query, platforms);
    const skills: string[] = profile?.skills ?? [];
    const withMatch = jobs
        .map((job) => ({ ...job, ...matchJob(job, skills) }))
        .sort((a, b) => b.match - a.match);

    // Only log real searches (new data from Brave), not every page refresh
    if (calledBrave) await logActivity(user.id, "search", `Fetched ${jobs.length} jobs for ${query}`);

    const [{ data: saved }, { data: applied }] = await Promise.all([
        supabase.from("saved_jobs").select("job:jobs(url)").eq("user_id", user.id),
        supabase.from("job_applications").select("job_url").eq("user_id", user.id).neq("status", "failed"),
    ]);

    return NextResponse.json({
        query,
        calledBrave,
        jobs: withMatch,
        boardLinks: buildBoardSearchLinks(role, place),
        savedUrls: (saved ?? []).map((row) => (row.job as unknown as { url: string } | null)?.url).filter(Boolean),
        appliedUrls: (applied ?? []).map((row) => row.job_url),
    });
}