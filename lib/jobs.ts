import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { searchBrave } from "@/lib/brave";
import type { Job, Platform, Profile } from "@/lib/types";

const CACHE_MS = 6 * 60 * 60 * 1000; // 6 hours

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// What to search for when the user did not type anything
export function buildSearchQuery(profile: Pick<Profile, "headline" | "experience"> | null) {
    return profile?.headline?.trim() || profile?.experience?.[0]?.title?.trim() || "software engineer";
}

// Search engines know cities, not suburbs or postcodes: "Giralang ACT 2617" -> "Canberra".
// A suburb in the query only adds noise, so a state code or name becomes its capital city.
const STATE_CITIES = [
    { code: "ACT", name: "australian capital territory", city: "Canberra" },
    { code: "NSW", name: "new south wales", city: "Sydney" },
    { code: "VIC", name: "victoria", city: "Melbourne" },
    { code: "QLD", name: "queensland", city: "Brisbane" },
    { code: "WA", name: "western australia", city: "Perth" },
    { code: "SA", name: "south australia", city: "Adelaide" },
    { code: "TAS", name: "tasmania", city: "Hobart" },
    { code: "NT", name: "northern territory", city: "Darwin" },
];

export function buildSearchPlace(location: string | null | undefined) {
    const text = (location ?? "").replace(/\d+/g, " ").replace(/\s+/g, " ").trim();
    const lower = text.toLowerCase();
    // Codes are matched in CAPITALS only, so words like "Sa" or "Wa" in a place name do not count
    const state = STATE_CITIES.find((s) => new RegExp(`\\b${s.code}\\b`).test(text) || lower.includes(s.name));
    if (state) return state.city;
    return text.replace(/[\s,]+$/, "") || "Australia";
}

function cacheKey(platform: Platform, query: string) {
    return `${platform}:${query.toLowerCase().replace(/\s+/g, " ").trim()}`;
}

export async function getJobs(query: string, platforms: Platform[]) {
    const admin = createAdminClient();
    const all: Job[] = [];
    let calledBrave = false;

    for (const platform of platforms) {
        const key = cacheKey(platform, query);

        // 1) Look in the notebook: did we search this less than 6 hours ago?
        const { data: search } = await admin
            .from("job_searches")
            .select("last_fetched_at")
            .eq("query_key", key)
            .maybeSingle();
        const isFresh = search && Date.now() - new Date(search.last_fetched_at).getTime() < CACHE_MS;

        // 2) Too old or never searched: ask Brave and write the results down
        if (!isFresh) {
            try {
                if (calledBrave) await sleep(1100); // free plan allows 1 request per second
                const found = await searchBrave(query, platform);
                calledBrave = true;
                const now = new Date().toISOString();

                if (found.length > 0) {
                    // Jobs someone already opened with "Details" have the full description from the careers site.
                    // Do not overwrite it with Brave's 2-line snippet.
                    const { data: detailed } = await admin
                        .from("jobs")
                        .select("url")
                        .eq("query_key", key)
                        .not("details_fetched_at", "is", null);
                    const keepDetails = new Set((detailed ?? []).map((row) => row.url));

                    const fresh = found.filter((job) => !keepDetails.has(job.url));
                    const refreshed = found
                        .filter((job) => keepDetails.has(job.url))
                        .map(({ description: _d, location: _l, ...job }) => job);

                    // Two separate upserts: every row in one upsert must have the same columns
                    for (const rows of [fresh, refreshed]) {
                        if (rows.length === 0) continue;
                        await admin
                            .from("jobs")
                            .upsert(
                                rows.map((job) => ({ ...job, query_key: key, last_fetched_at: now })),
                                { onConflict: "query_key,url" },
                            );
                    }
                }
                await admin.from("job_searches").upsert({ query_key: key, last_fetched_at: now, result_count: found.length });
            } catch (error) {
                console.error(`Job search failed for ${platform}`, error);
                continue;
            }
        }

        // 3) Read the notebook
        const since = new Date(Date.now() - CACHE_MS).toISOString();
        const { data } = await admin
            .from("jobs")
            .select("*")
            .eq("query_key", key)
            .gte("last_fetched_at", since);
        all.push(...((data ?? []) as Job[]));
    }

    // The same posting can show up twice: keep one per URL
    const unique = Array.from(new Map(all.map((job) => [job.url, job])).values());
    return { jobs: unique, calledBrave };
}