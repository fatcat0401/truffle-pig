import "server-only";
import type { Platform } from "@/lib/types";

// Brave ignores "site:" filters that contain a path (site:linkedin.com/jobs), so use the bare
// domain and let JOB_URL_PATTERNS keep only real job pages.
const PLATFORM_SITES: Record<Platform, string[]> = {
    // Job board: we only READ search-engine results, never scrape the site
    linkedin: ["linkedin.com"],
    // Company careers pages (ATS): the robot can apply here
    greenhouse: ["boards.greenhouse.io", "job-boards.greenhouse.io"],
    lever: ["jobs.lever.co"],
    workable: ["apply.workable.com"],
};

// Only keep links that look like a single job posting (not a list or search page)
const JOB_URL_PATTERNS: Record<Platform, RegExp> = {
    linkedin: /linkedin\.com\/jobs\/view\/[^?#]*\d{6,}/,
    greenhouse: /greenhouse\.io\/[^/]+\/jobs\/\d+/,
    lever: /jobs\.lever\.co\/[^/]+\/[0-9a-f-]{36}/i,
    workable: /apply\.workable\.com\/[^/]+\/j\/[A-Z0-9]+/i,
};


type BraveResult = {
    title: string;
    url: string;
    description?: string;
    age?: string;
    page_age?: string;
    meta_url?: { favicon?: string };
    profile?: { img?: string };
};

export type ScoutedJob = {
    platform: Platform;
    title: string;
    company: string | null;
    location: string | null;
    url: string;
    description: string | null;
    posted_at: string | null;
    company_logo: string | null;
};

export async function searchBrave(query: string, platform: Platform): Promise<ScoutedJob[]> {
    const sites = PLATFORM_SITES[platform].map((site) => `site:${site}`).join(" OR ");
    const url = new URL("https://api.search.brave.com/res/v1/web/search");
    url.searchParams.set("q", `(${sites}) ${query}`);
    url.searchParams.set("count", "20");
    url.searchParams.set("country", "AU"); // prefer Australian results
    url.searchParams.set("freshness", "pm"); // past month: "past week" left too few jobs

    const res = await fetch(url, {
        headers: {
            Accept: "application/json",
            "X-Subscription-Token": process.env.BRAVE_SEARCH_API_KEY!,
        },
        cache: "no-store",
    });
    if (!res.ok) throw new Error(`Brave Search failed (${res.status})`);

    const data = (await res.json()) as { web?: { results?: BraveResult[] } };
    const results = data.web?.results ?? [];

    return results
        .filter((r) => JOB_URL_PATTERNS[platform].test(r.url))
        .map((r) => ({
            platform,
            ...(platform === "linkedin" ? parseLinkedInTitle(stripHtml(r.title)) : parseAtsResult(r)),
            url: r.url.split("?")[0],
            description: cleanSnippet(r.description),
            posted_at: r.page_age ?? r.age ?? null,
            // Small icon Brave already found for this site. Free, no extra request.
            company_logo: r.meta_url?.favicon ?? r.profile?.img ?? null,
        }));
}

function stripHtml(text: string) {
    return text.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").trim();
}

// LinkedIn gives every job the same advert as its snippet ("64% of job seekers get hired
// through a referral..."). It says nothing about the job, so drop it: match % then uses the title.
const BOILERPLATE = /job seekers get hired through a referral|use linkedin jobs to boost/i;

export function cleanSnippet(text?: string) {
    if (!text) return null;
    const clean = stripHtml(text);
    return BOILERPLATE.test(clean) ? null : clean;
}

// "Job Application for Frontend Engineer at Figma" -> "Frontend Engineer"
// "Figma - Frontend Engineer" -> "Frontend Engineer"
export function cleanTitle(title: string) {
    let t = title.replace(/^job application for\s+/i, "").replace(/\s+at\s+[^|–-]+$/i, "");
    const parts = t.split(/\s+[-–|]\s+/);
    if (parts.length > 1) t = parts.sort((a, b) => b.length - a.length)[0];
    return t.trim();
}

// Careers page: title from the page title, company from the URL
function parseAtsResult(r: BraveResult) {
    return { title: cleanTitle(stripHtml(r.title)), company: companyFromUrl(r.url), location: null };
}

export function companyFromUrl(url: string) {
    // The first part of the path is the company slug: jobs.lever.co/<company>/...
    const slug = new URL(url).pathname.split("/").filter(Boolean)[0];
    if (!slug) return null;
    return slug.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// LinkedIn puts everything in the page title. Formats seen in real Brave results:
//   "Hays hiring Data Engineer in Sydney, New South Wales ..."
//   "Data Engineer at Macquarie Group — Sydney, New South ..."
//   "Senior Data Engineer - Financial Services at EY"
//   "Senior Data Engineer - Xeneta"
export function parseLinkedInTitle(raw: string) {
    const t = raw.replace(/\s*\|\s*LinkedIn\s*$/i, "").replace(/\s*(\.\.\.|…)\s*$/, "").trim();
    const clean = (s: string) => s.replace(/[\s,]+$/, "").trim();

    const hiring = t.match(/^(.+?)\s+hiring\s+(.+?)\s+in\s+(.+)$/i);
    if (hiring) return { company: clean(hiring[1]), title: clean(hiring[2]), location: clean(hiring[3]) };

    const atWithPlace = t.match(/^(.+)\s+at\s+(.+?)\s+[—–]\s+(.+)$/i);
    if (atWithPlace) return { title: clean(atWithPlace[1]), company: clean(atWithPlace[2]), location: clean(atWithPlace[3]) };

    const at = t.match(/^(.+)\s+at\s+([^—–-]+)$/i);
    if (at) return { title: clean(at[1]), company: clean(at[2]), location: null };

    // "Title - Company": the last part is usually the company, unless it is a job detail
    const parts = t.split(/\s+[-–]\s+/);
    const last = parts[parts.length - 1];
    const isDetail = /citizen|contract|remote|hybrid|part[- ]?time|full[- ]?time|permanent|clearance|visa/i.test(last);
    if (parts.length > 1 && !isDetail) {
        return { title: clean(parts.slice(0, -1).join(" - ")), company: clean(last), location: null };
    }

    return { title: t, company: null, location: null };
}