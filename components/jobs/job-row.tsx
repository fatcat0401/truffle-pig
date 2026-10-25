"use client";

import { useState } from "react";
import { BookmarkCheck, Check } from "lucide-react";
import { MatchScent } from "@/components/jobs/match-scent";
import { PLATFORMS, type JobWithMatch } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
    job: JobWithMatch;
    selected: boolean;
    saved: boolean;
    applied: boolean;
    onSelect: () => void;
};

// One line in the job list. The whole row is a button that opens the job in the pane.
export function JobRow({ job, selected, saved, applied, onSelect }: Props) {
    const platformLabel = PLATFORMS.find((p) => p.id === job.platform)?.label ?? job.platform;
    const where = [job.company ?? "Unknown company", job.location].filter(Boolean).join(", ");

    return (
        <button
            type="button"
            onClick={onSelect}
            aria-current={selected ? "true" : undefined}
            className={cn(
                "flex w-full gap-3 border-l-[3px] px-4 py-3.5 text-left transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
                selected ? "border-l-moss bg-accent" : "border-l-transparent hover:bg-muted/60",
            )}
        >
            <CompanyLogo src={job.company_logo} name={job.company} />
            <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                    <p className="line-clamp-2 font-medium leading-snug">{job.title}</p>
                    <MatchScent match={job.match} className="shrink-0 pt-0.5" />
                </div>
                <p className="mt-0.5 truncate text-sm text-muted-foreground">{where}</p>
                <p className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{platformLabel}</span>
                    {job.posted_at && <span>{formatPosted(job.posted_at)}</span>}
                    {saved && (
                        <span className="flex items-center gap-1 text-truffle">
                            <BookmarkCheck className="size-3.5" /> Saved
                        </span>
                    )}
                    {applied && (
                        <span className="flex items-center gap-1 text-moss">
                            <Check className="size-3.5" /> Applied
                        </span>
                    )}
                </p>
            </div>
        </button>
    );
}

// Favicon from Brave, or the first letter of the company when there is none
export function CompanyLogo({ src, name, className }: { src: string | null; name: string | null; className?: string }) {
    const [broken, setBroken] = useState(false);
    if (src && !broken) {
        return (
            // eslint-disable-next-line @next/next/no-img-element -- remote favicons from any domain
            <img
                src={src}
                alt=""
                className={cn("size-9 shrink-0 rounded-md border bg-white object-contain p-1", className)}
                onError={() => setBroken(true)}
            />
        );
    }
    return (
        <div
            className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary font-heading font-semibold text-truffle",
                className,
            )}
        >
            {(name ?? "?").charAt(0).toUpperCase()}
        </div>
    );
}

// Brave gives either an ISO date or text like "2 hours ago"
export function formatPosted(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    const hours = Math.round((Date.now() - date.getTime()) / 3_600_000);
    const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
    if (hours < 24) return rtf.format(-Math.max(hours, 0), "hour");
    return rtf.format(-Math.round(hours / 24), "day");
}
