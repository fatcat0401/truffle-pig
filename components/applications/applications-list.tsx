"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/applications/status-badge";
import { MissingInfoDialog } from "@/components/applications/missing-info-dialog";
import { replayUrl } from "@/lib/apply/shared";
import { PLATFORMS, type ApplicationStatus, type JobApplication } from "@/lib/types";
import { cn } from "@/lib/utils";

const ACTIVE: ApplicationStatus[] = ["queued", "detecting_fields", "in_progress"];

// The robot's path through one application (see lib/inngest/functions.ts)
const STAGES = ["Queued", "Reading form", "Your answers", "Filling", "Done"];
const STAGE_INDEX: Record<ApplicationStatus, number> = {
    queued: 0,
    detecting_fields: 1,
    missing_info: 2,
    in_progress: 3,
    submitted: 4,
    dry_run_complete: 4,
    failed: -1,
};

export function ApplicationsList({ initial }: { initial: JobApplication[] }) {
    const [applications, setApplications] = useState(initial);
    const [filling, setFilling] = useState<JobApplication | null>(null);

    const refresh = useCallback(async () => {
        const res = await fetch("/api/applications");
        if (res.ok) setApplications((await res.json()).applications);
    }, []);

    // While the robot is working, check for updates every 4 seconds
    const hasActive = applications.some((a) => ACTIVE.includes(a.status));
    useEffect(() => {
        if (!hasActive) return;
        const timer = setInterval(refresh, 4000);
        return () => clearInterval(timer);
    }, [hasActive, refresh]);

    if (applications.length === 0) {
        return (
            <div className="rounded-lg border border-dashed p-10 text-center">
                <p className="font-medium">No applications yet.</p>
                <p className="mt-1 text-sm text-muted-foreground">
                    Open a job from Greenhouse, Lever or Workable and press Apply to start one.
                </p>
                <Button className="mt-5" asChild>
                    <Link href="/dashboard/jobs">Find jobs</Link>
                </Button>
            </div>
        );
    }

    // Anything waiting on you goes first
    const sorted = [...applications].sort(
        (a, b) => Number(b.status === "missing_info") - Number(a.status === "missing_info"),
    );
    const waiting = applications.filter((a) => a.status === "missing_info").length;
    const working = applications.filter((a) => ACTIVE.includes(a.status)).length;

    return (
        <div className="space-y-5">
            <p className="text-sm text-muted-foreground">
                {applications.length} {applications.length === 1 ? "application" : "applications"}.{" "}
                {waiting > 0 && <span className="font-medium text-ochre">{waiting} waiting for your answers. </span>}
                {working > 0 && <span>{working} being worked on now.</span>}
            </p>

            <ul className="divide-y rounded-lg border bg-card">
                {sorted.map((app) => (
                    <li key={app.id} className={cn("space-y-4 p-4 sm:p-5", app.status === "missing_info" && "bg-ochre/5")}>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <p className="font-semibold">{app.job_title}</p>
                                    <StatusBadge status={app.status} />
                                </div>
                                <p className="mt-0.5 text-sm text-muted-foreground">
                                    {app.company ?? "Unknown company"}, via{" "}
                                    {PLATFORMS.find((p) => p.id === app.platform)?.label ?? app.platform}, started{" "}
                                    {new Date(app.created_at).toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" })}
                                </p>
                                {app.status === "missing_info" && (
                                    <p className="mt-1 text-sm text-ochre">
                                        The form asks {app.missing_fields.length}{" "}
                                        {app.missing_fields.length === 1 ? "question" : "questions"} your profile does not answer.
                                    </p>
                                )}
                                {/* The robot also writes notes here ("Dry run: ..."), so only failures are shown as errors */}
                                {app.error && (
                                    <p className={cn("mt-1 text-sm", app.status === "failed" ? "text-rust" : "text-muted-foreground")}>
                                        {app.error}
                                    </p>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {app.status === "missing_info" && (
                                    <Button size="sm" onClick={() => setFilling(app)}>
                                        Answer questions
                                    </Button>
                                )}
                                {app.browserbase_session_id && (
                                    <Button size="sm" variant="outline" asChild>
                                        <a href={replayUrl(app.browserbase_session_id)} target="_blank" rel="noreferrer">
                                            <PlayCircle className="size-4" /> Replay
                                        </a>
                                    </Button>
                                )}
                                <Button size="sm" variant="ghost" asChild>
                                    <a href={app.job_url} target="_blank" rel="noreferrer" aria-label="Open job posting">
                                        <ExternalLink className="size-4" />
                                    </a>
                                </Button>
                            </div>
                        </div>
                        <StageTrack status={app.status} />
                    </li>
                ))}
            </ul>

            <MissingInfoDialog
                application={filling}
                onClose={() => setFilling(null)}
                onSubmitted={() => {
                    setFilling(null);
                    refresh();
                }}
            />
        </div>
    );
}

function StageTrack({ status }: { status: ApplicationStatus }) {
    const current = STAGE_INDEX[status];
    const failed = status === "failed";
    const done = current === STAGES.length - 1;

    return (
        <ol className="grid grid-cols-5 gap-1.5" aria-label={failed ? "Stopped with an error" : `Stage: ${STAGES[current]}`}>
            {STAGES.map((stage, i) => {
                const reached = !failed && i <= current;
                const isCurrent = !failed && i === current && !done;
                return (
                    <li key={stage} className="space-y-1.5">
                        <span
                            className={cn(
                                "block h-1.5 rounded-full",
                                failed
                                    ? "bg-rust/30"
                                    : isCurrent && status === "missing_info"
                                      ? "bg-ochre"
                                      : isCurrent
                                        ? "animate-pulse bg-moss/60 motion-reduce:animate-none"
                                        : reached
                                          ? "bg-moss"
                                          : "bg-border",
                            )}
                        />
                        <span
                            className={cn(
                                "hidden text-xs sm:block",
                                isCurrent ? "font-medium text-foreground" : "text-muted-foreground",
                            )}
                        >
                            {stage}
                        </span>
                    </li>
                );
            })}
        </ol>
    );
}
