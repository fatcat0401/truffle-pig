import "server-only";
import { Type, type Schema } from "@google/genai";
import { generateJson } from "@/lib/gemini";
import type { Platform } from "@/lib/types";

export type JobDetails = {
    location: string | null;
    salary: string | null;
    job_type: string | null;
    experience_level: string | null;
    tags: string[];
    description: string | null;
};

// Thrown when the careers site says the posting no longer exists (HTTP 404)
export class JobClosedError extends Error { }

// Greenhouse, Lever and Workable all publish a free, public JSON API for every job
// on a company's careers page. No key, no scraping: we ask for the same data the
// careers page itself shows.
export async function fetchJobDetails(url: string, platform: Platform): Promise<JobDetails> {
    const base = await fetchFromAts(url, platform);
    // The APIs rarely say "Junior/Senior" or list skills: let Gemini read the description once.
    // Gemini can be slow (we saw 150 s): after 15 s skip it and keep the careers-site data alone.
    const extra = base.description
        ? await withTimeout(extractLevelAndTags(base.description), GEMINI_TIMEOUT_MS).catch((error) => {
              console.error("Level and tags skipped", error);
              return NO_EXTRA;
          })
        : NO_EXTRA;
    return { ...base, job_type: base.job_type ?? extra.job_type, experience_level: extra.experience_level, tags: extra.tags };
}

type AtsData = Omit<JobDetails, "experience_level" | "tags">;
type Extra = { experience_level: string | null; job_type: string | null; tags: string[] };

const GEMINI_TIMEOUT_MS = 15_000;
const NO_EXTRA: Extra = { experience_level: null, job_type: null, tags: [] };

// Reject if the promise takes longer than `ms`. The slow call keeps running, we just stop waiting.
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    let timer: ReturnType<typeof setTimeout>;
    const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`Timed out after ${ms} ms`)), ms);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function fetchFromAts(url: string, platform: Platform): Promise<AtsData> {
    if (platform === "greenhouse") {
        // job-boards.greenhouse.io/<board>/jobs/<id>
        const [, board, id] = url.match(/greenhouse\.io\/([^/]+)\/jobs\/(\d+)/) ?? [];
        const d = await getJson(`https://boards-api.greenhouse.io/v1/boards/${board}/jobs/${id}?pay_transparency=true`);
        const pay = (d.pay_input_ranges ?? [])[0];
        return {
            location: d.location?.name ?? null,
            salary: pay ? `${pay.currency_type} ${money(pay.min_cents / 100)}–${money(pay.max_cents / 100)}` : null,
            job_type: null,
            description: htmlToText(d.content), // Greenhouse sends HTML that is itself HTML-escaped
        };
    }
    if (platform === "lever") {
        // jobs.lever.co/<company>/<uuid>
        const [, company, id] = url.match(/jobs\.lever\.co\/([^/]+)\/([0-9a-f-]{36})/i) ?? [];
        const d = await getJson(`https://api.lever.co/v0/postings/${company}/${id}`);
        const s = d.salaryRange;
        return {
            location: d.categories?.location ?? null,
            // interval looks like "per-year-salary" -> "per year"
            salary: s ? `${s.currency} ${money(s.min)}–${money(s.max)} ${String(s.interval ?? "").replace(/-salary$/, "").replace(/-/g, " ")}`.trim() : null,
            job_type: d.categories?.commitment ?? null,
            description: d.descriptionPlain ?? null,
        };
    }
    if (platform === "workable") {
        // apply.workable.com/<account>/j/<shortcode>
        const [, account, code] = url.match(/apply\.workable\.com\/([^/]+)\/j\/([A-Z0-9]+)/i) ?? [];
        const d = await getJson(`https://apply.workable.com/api/v2/accounts/${account}/jobs/${code}`);
        const place = [d.location?.city, d.location?.region, d.location?.country].filter(Boolean).join(", ");
        return {
            location: place || null,
            salary: null,
            job_type: WORKABLE_TYPES[d.type] ?? null,
            description: htmlToText([d.description, d.requirements].filter(Boolean).join("\n")),
        };
    }
    throw new Error(`Details are not available for ${platform}`);
}

const WORKABLE_TYPES: Record<string, string> = {
    full: "Full-time",
    part: "Part-time",
    contract: "Contract",
    temporary: "Temporary",
    other: "Other",
};

async function getJson(url: string) {
    const res = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" });
    if (res.status === 404) throw new JobClosedError("This job is no longer open");
    if (!res.ok) throw new Error(`Careers API failed (${res.status})`);
    return res.json();
}

const money = (n: number) => Math.round(n).toLocaleString("en-AU");

// "&lt;p&gt;Hello &amp;amp; welcome&lt;/p&gt;" -> "Hello & welcome"
export function htmlToText(value: string | null | undefined) {
    if (!value) return null;
    const decode = (s: string) =>
        s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
    const html = value.includes("&lt;") ? decode(value) : value;
    const text = decode(html.replace(/<(br|\/p|\/li|\/h\d)[^>]*>/gi, "\n").replace(/<[^>]+>/g, ""));
    return text.replace(/\n{3,}/g, "\n\n").trim().slice(0, 8000) || null;
}

const schema: Schema = {
    type: Type.OBJECT,
    properties: {
        experience_level: { type: Type.STRING, nullable: true },
        job_type: { type: Type.STRING, nullable: true },
        tags: { type: Type.ARRAY, items: { type: Type.STRING } },
    },
    required: ["experience_level", "job_type", "tags"],
};

async function extractLevelAndTags(description: string): Promise<Extra> {
    return generateJson<Extra>(
        [
            {
                text: `From this job description return:
- experience_level: one of Intern, Junior, Mid, Senior, Lead, or null if unclear
- job_type: one of Full-time, Part-time, Contract, Casual, Internship, or null if not stated
- tags: up to 8 key skills or technologies, 1-3 words each

JOB DESCRIPTION:
${description.slice(0, 6000)}`,
            },
        ],
        schema,
    ).then((r) => ({ ...r, tags: (r.tags ?? []).map((t) => t.trim()).filter(Boolean).slice(0, 8) }));
}