"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, ExternalLink, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/applications/status-badge";
import { MissingInfoDialog } from "@/components/applications/missing-info-dialog";
import { replayUrl } from "@/lib/apply/shared";
import type { ApplicationStatus, JobApplication } from "@/lib/types";

const ACTIVE: ApplicationStatus[] = ["queued", "detecting_fields", "in_progress"];

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

    const count = (statuses: ApplicationStatus[]) => applications.filter((a) => statuses.includes(a.status)).length;
    const stats = [
        { label: "Total", value: applications.length },
        { label: "In progress", value: count(ACTIVE) },
        { label: "Needs your input", value: count(["missing_info"]) },
        { label: "Submitted", value: count(["submitted"]) },
    ];

    if (applications.length === 0) {
        return (
            <Card>
                <CardContent className="space-y-4 py-10 text-center">
                    <p className="text-muted-foreground">No applications yet.</p>
                    <Button asChild>
                        <Link href="/dashboard/jobs">Find jobs</Link>
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {stats.map((stat) => (
                    <Card key={stat.label}>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold">{stat.value}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="space-y-3">
                {applications.map((app) => (
                    <Card key={app.id}>
                        <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center">
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <p className="font-semibold">{app.job_title}</p>
                                    <StatusBadge status={app.status} />
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    {app.company ?? "Unknown company"} · {app.platform} · {new Date(app.created_at).toLocaleString("en-AU")}
                                </p>
                                {app.status === "missing_info" && (
                                    <p className="mt-1 flex items-center gap-1 text-sm text-amber-700 dark:text-amber-400">
                                        <AlertCircle className="size-3.5" /> {app.missing_fields.length} question(s) need your answer
                                    </p>
                                )}
                                {app.error && <p className="mt-1 text-sm text-muted-foreground">{app.error}</p>}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {app.status === "missing_info" && (
                                    <Button size="sm" onClick={() => setFilling(app)}>
                                        Fill missing data
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
                        </CardContent>
                    </Card>
                ))}
            </div>

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