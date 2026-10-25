"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { JobSplitView } from "@/components/jobs/job-split-view";
import type { JobWithMatch } from "@/lib/types";

export function SavedJobsList({ jobs, appliedUrls }: { jobs: JobWithMatch[]; appliedUrls: string[] }) {
    if (jobs.length === 0) {
        return (
            <div className="rounded-lg border border-dashed p-10 text-center">
                <p className="font-medium">No saved jobs yet.</p>
                <p className="mt-1 text-sm text-muted-foreground">Open a job and press Save to keep it here.</p>
                <Button className="mt-5" asChild>
                    <Link href="/dashboard/jobs">Find jobs</Link>
                </Button>
            </div>
        );
    }

    return (
        <JobSplitView
            jobs={jobs}
            savedUrls={jobs.map((job) => job.url)}
            appliedUrls={appliedUrls}
            removeOnUnsave
            emptyPane={<p className="font-heading text-xl text-truffle">Pick a saved job to read it here.</p>}
        />
    );
}
