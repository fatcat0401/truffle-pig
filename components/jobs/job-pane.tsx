"use client";

import { useEffect, useState } from "react";
import { Bookmark, BookmarkCheck, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ApplyDialog } from "@/components/jobs/apply-dialog";
import { CompanyLogo, formatPosted } from "@/components/jobs/job-row";
import { MatchScent } from "@/components/jobs/match-scent";
import { PLATFORMS, canAutoApply, type Job, type JobWithMatch } from "@/lib/types";

type Props = {
    job: JobWithMatch;
    saved: boolean;
    applied: boolean;
    onToggleSave: () => Promise<void>;
    onApplied: () => void;
    onDetailsLoaded: (job: Job) => void;
};

// The full job, read from the public ATS API the first time it is opened (cached on the server after that).
// Render with key={job.id} so state resets when another job is picked.
export function JobPane({ job, saved, applied, onToggleSave, onApplied, onDetailsLoaded }: Props) {
    // LinkedIn has no public API: show what search already gave us, plus the link
    const hasApi = canAutoApply(job.platform);
    const needsDetails = hasApi && !job.details_fetched_at;
    const [loading, setLoading] = useState(needsDetails);
    const [saving, setSaving] = useState(false);
    const platformLabel = PLATFORMS.find((p) => p.id === job.platform)?.label ?? job.platform;

    useEffect(() => {
        if (!needsDetails) return;
        let cancelled = false;
        fetch(`/api/jobs/${job.id}/details`, { method: "POST" })
            .then(async (res) => {
                const data = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(data.error ?? "Could not load details");
                if (!cancelled) onDetailsLoaded(data.job);
            })
            // Network error or closed job (410): say so, the stored snippet stays visible
            .catch((error) => !cancelled && toast.error(error.message))
            .finally(() => !cancelled && setLoading(false)); // always, or the spinner would spin forever
        return () => {
            cancelled = true;
        };
    }, [job.id, needsDetails, onDetailsLoaded]);

    async function toggleSave() {
        setSaving(true);
        try {
            await onToggleSave();
        } finally {
            setSaving(false);
        }
    }

    const facts = [
        { label: "Location", value: job.location },
        { label: "Salary", value: job.salary },
        { label: "Type", value: job.job_type },
        { label: "Level", value: job.experience_level },
        { label: "Posted", value: job.posted_at ? formatPosted(job.posted_at) : null },
        { label: "Source", value: platformLabel },
    ].filter((fact) => fact.value);

    return (
        <article className="space-y-6">
            <header className="space-y-4">
                <div className="flex items-start gap-4">
                    <CompanyLogo src={job.company_logo} name={job.company} className="size-12 text-lg" />
                    <div className="min-w-0">
                        <h2 className="text-2xl leading-tight font-semibold text-balance">{job.title}</h2>
                        <p className="mt-1 text-muted-foreground">{job.company ?? "Unknown company"}</p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <ApplyDialog job={job} applied={applied} onApplied={onApplied} />
                    <Button variant="outline" onClick={toggleSave} disabled={saving}>
                        {saving ? (
                            <Loader2 className="size-4 animate-spin" />
                        ) : saved ? (
                            <BookmarkCheck className="size-4" />
                        ) : (
                            <Bookmark className="size-4" />
                        )}
                        {saved ? "Saved" : "Save"}
                    </Button>
                    <Button variant="ghost" asChild>
                        <a href={job.url} target="_blank" rel="noreferrer">
                            Open posting <ExternalLink className="size-3.5" />
                        </a>
                    </Button>
                </div>
            </header>

            <section className="rounded-lg border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-semibold">Skill match</h3>
                    <MatchScent match={job.match} />
                </div>
                {job.matchedSkills.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                        {job.matchedSkills.map((skill) => (
                            <Badge key={skill} variant="secondary" className="font-normal">
                                {skill}
                            </Badge>
                        ))}
                    </div>
                ) : (
                    <p className="mt-2 text-sm text-muted-foreground">None of your profile skills appear in this posting.</p>
                )}
            </section>

            {facts.length > 0 && (
                <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
                    {facts.map((fact) => (
                        <div key={fact.label}>
                            <dt className="text-xs text-muted-foreground">{fact.label}</dt>
                            <dd className="text-sm font-medium">{fact.value}</dd>
                        </div>
                    ))}
                </dl>
            )}

            {job.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {job.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="font-normal">
                            {tag}
                        </Badge>
                    ))}
                </div>
            )}

            <section className="border-t pt-6">
                {loading ? (
                    <p className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="size-4 animate-spin" /> Reading the full job posting…
                    </p>
                ) : (
                    <p className="max-w-prose text-[15px] leading-relaxed whitespace-pre-wrap">
                        {job.description ??
                            (hasApi
                                ? "No description found."
                                : "LinkedIn does not share job descriptions with search engines. Open the posting to read it.")}
                    </p>
                )}
            </section>
        </article>
    );
}
