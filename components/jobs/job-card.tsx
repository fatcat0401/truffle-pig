"use client";

import { useState } from "react";
import { Bookmark, BookmarkCheck, Briefcase, Building2, Clock, DollarSign, Loader2, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ApplyDialog } from "@/components/jobs/apply-dialog";
import { PLATFORMS, type JobWithMatch } from "@/lib/types";
import { JobDetailsButton } from "@/components/jobs/job-details-button";

type Props = {
    job: JobWithMatch;
    saved: boolean;
    applied: boolean;
    onSavedChange: (saved: boolean) => void;
    onApplied: () => void;
};

export function JobCard({ job, saved, applied, onSavedChange, onApplied }: Props) {
    const [saving, setSaving] = useState(false);
    const platformLabel = PLATFORMS.find((p) => p.id === job.platform)?.label ?? job.platform;

    async function toggleSave() {
        setSaving(true);
        const res = await fetch("/api/saved-jobs", {
            method: saved ? "DELETE" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jobId: job.id }),
        });
        const data = await res.json().catch(() => ({}));
        setSaving(false);
        if (!res.ok) return toast.error(data.error ?? "Could not update saved jobs");
        onSavedChange(!saved);
        if (data.alreadySaved) toast.info("Already saved");
        else toast.success(saved ? "Removed from saved jobs" : "Job saved");
    }

    return (
        <Card>
            <CardContent className="space-y-3 pt-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 gap-3">
                        <CompanyLogo src={job.company_logo} name={job.company} />
                        <div className="min-w-0">
                            <a href={job.url} target="_blank" rel="noreferrer" className="font-semibold hover:underline">
                                {job.title}
                            </a>
                            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                    <Building2 className="size-3.5" /> {job.company ?? "Unknown company"}
                                </span>
                                {job.posted_at && (
                                    <span className="flex items-center gap-1">
                                        <Clock className="size-3.5" /> {formatPosted(job.posted_at)}
                                    </span>
                                )}
                                {/* These 3 only exist after someone opened "Details" (Bước 9.5) */}
                                {job.salary && (
                                    <span className="flex items-center gap-1">
                                        <DollarSign className="size-3.5" /> {job.salary}
                                    </span>
                                )}
                                {job.job_type && (
                                    <span className="flex items-center gap-1">
                                        <Briefcase className="size-3.5" /> {job.job_type}
                                    </span>
                                )}
                                {job.experience_level && (
                                    <span className="flex items-center gap-1">
                                        <TrendingUp className="size-3.5" /> {job.experience_level}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant="outline">{platformLabel}</Badge>
                        <Badge variant={job.match >= 50 ? "default" : "secondary"}>{job.match}% match</Badge>
                    </div>
                </div>

                {job.description && <p className="line-clamp-3 text-sm text-muted-foreground">{job.description}</p>}

                {job.matchedSkills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {job.matchedSkills.map((skill) => (
                            <Badge key={skill} variant="secondary" className="font-normal">
                                {skill}
                            </Badge>
                        ))}
                    </div>
                )}

                <div className="flex justify-end gap-2">
                    <JobDetailsButton job={job} />
                    <Button size="sm" variant="outline" onClick={toggleSave} disabled={saving}>
                        {saving ? (
                            <Loader2 className="size-4 animate-spin" />
                        ) : saved ? (
                            <BookmarkCheck className="size-4" />
                        ) : (
                            <Bookmark className="size-4" />
                        )}
                        {saved ? "Saved" : "Save"}
                    </Button>
                    <ApplyDialog job={job} applied={applied} onApplied={onApplied} />
                </div>
            </CardContent>
        </Card>
    );
}

// Favicon from Brave, or the first letter of the company when there is none
function CompanyLogo({ src, name }: { src: string | null; name: string | null }) {
    const [broken, setBroken] = useState(false);
    if (src && !broken) {
        return (
            // eslint-disable-next-line @next/next/no-img-element -- remote favicons from any domain
            <img src={src} alt="" className="size-10 shrink-0 rounded-md border bg-white object-contain p-1" onError={() => setBroken(true)} />
        );
    }
    return (
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md border bg-muted font-semibold text-muted-foreground">
            {(name ?? "?").charAt(0).toUpperCase()}
        </div>
    );
}

// Brave gives either an ISO date or text like "2 hours ago"
function formatPosted(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    const hours = Math.round((Date.now() - date.getTime()) / 3_600_000);
    const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
    if (hours < 24) return rtf.format(-Math.max(hours, 0), "hour");
    return rtf.format(-Math.round(hours / 24), "day");
}