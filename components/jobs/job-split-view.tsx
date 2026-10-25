"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { JobPane } from "@/components/jobs/job-pane";
import { JobRow } from "@/components/jobs/job-row";
import type { Job, JobWithMatch } from "@/lib/types";

type Props = {
    jobs: JobWithMatch[];
    savedUrls: string[];
    appliedUrls: string[];
    // Shown in the pane before any job is picked
    emptyPane: React.ReactNode;
    // Saved Jobs page: a job leaves the list once it is unsaved
    removeOnUnsave?: boolean;
};

// Job list on the left, the picked job on the right. Below 1024px the job opens in a sheet instead.
// Props seed the state once: give it a new key to load a new list (a new search).
export function JobSplitView({ jobs: initialJobs, savedUrls, appliedUrls, emptyPane, removeOnUnsave }: Props) {
    const [jobs, setJobs] = useState(initialJobs);
    const [saved, setSaved] = useState(() => new Set(savedUrls));
    const [applied, setApplied] = useState(() => new Set(appliedUrls));
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const wide = useWideScreen();

    const selected = jobs.find((job) => job.id === selectedId) ?? null;

    // Details only add fields (salary, level, tags...); match % stays as computed for this user
    const onDetailsLoaded = useCallback((details: Job) => {
        setJobs((current) => current.map((job) => (job.id === details.id ? { ...job, ...details } : job)));
    }, []);

    async function toggleSave(job: JobWithMatch) {
        const isSaved = saved.has(job.url);
        const res = await fetch("/api/saved-jobs", {
            method: isSaved ? "DELETE" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jobId: job.id }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            toast.error(data.error ?? "Could not update saved jobs");
            return;
        }
        setSaved((current) => toggle(current, job.url, !isSaved));
        if (data.alreadySaved) toast.info("Already saved");
        else toast.success(isSaved ? "Removed from saved jobs" : "Job saved");
        if (isSaved && removeOnUnsave) {
            setJobs((current) => current.filter((j) => j.url !== job.url));
            setSelectedId(null);
        }
    }

    const pane = selected && (
        <JobPane
            key={selected.id}
            job={selected}
            saved={saved.has(selected.url)}
            applied={applied.has(selected.url)}
            onToggleSave={() => toggleSave(selected)}
            onApplied={() => setApplied((current) => toggle(current, selected.url, true))}
            onDetailsLoaded={onDetailsLoaded}
        />
    );

    return (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(320px,400px)_minmax(0,1fr)]">
            <ul className="divide-y overflow-hidden rounded-lg border bg-card lg:sticky lg:top-6 lg:max-h-[calc(100svh-3rem)] lg:overflow-y-auto">
                {jobs.map((job) => (
                    <li key={job.id}>
                        <JobRow
                            job={job}
                            selected={job.id === selectedId}
                            saved={saved.has(job.url)}
                            applied={applied.has(job.url)}
                            onSelect={() => setSelectedId(job.id)}
                        />
                    </li>
                ))}
            </ul>

            {wide ? (
                <div className="min-w-0">{pane ?? emptyPane}</div>
            ) : (
                <>
                    <div className="min-w-0">{emptyPane}</div>
                    <Sheet open={selected !== null} onOpenChange={(open) => !open && setSelectedId(null)}>
                        <SheetContent side="right" className="w-full overflow-y-auto p-5 sm:max-w-xl">
                            <SheetTitle className="sr-only">{selected?.title ?? "Job"}</SheetTitle>
                            {pane}
                        </SheetContent>
                    </Sheet>
                </>
            )}
        </div>
    );
}

function toggle(set: Set<string>, url: string, on: boolean) {
    const next = new Set(set);
    if (on) next.add(url);
    else next.delete(url);
    return next;
}

// true at Tailwind's lg breakpoint and up (starts true so the server render matches desktop)
function useWideScreen() {
    const [wide, setWide] = useState(true);
    useEffect(() => {
        const query = window.matchMedia("(min-width: 1024px)");
        const update = () => setWide(query.matches);
        update();
        query.addEventListener("change", update);
        return () => query.removeEventListener("change", update);
    }, []);
    return wide;
}
