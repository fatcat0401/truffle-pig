"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { JobCard } from "@/components/jobs/job-card";
import type { JobWithMatch } from "@/lib/types";

export function SavedJobsList({ jobs, appliedUrls }: { jobs: JobWithMatch[]; appliedUrls: string[] }) {
    const [list, setList] = useState(jobs);
    const [applied, setApplied] = useState(new Set(appliedUrls));

    if (list.length === 0) {
        return (
            <Card>
                <CardContent className="space-y-4 py-10 text-center">
                    <p className="text-muted-foreground">You have not saved any jobs yet.</p>
                    <Button asChild>
                        <Link href="/dashboard/jobs">Browse jobs</Link>
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {list.map((job) => (
                <JobCard
                    key={job.id}
                    job={job}
                    saved
                    applied={applied.has(job.url)}
                    onSavedChange={(on) => !on && setList((current) => current.filter((j) => j.url !== job.url))}
                    onApplied={() => setApplied((current) => new Set(current).add(job.url))}
                />
            ))}
        </div>
    );
}