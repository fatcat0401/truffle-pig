"use client";

import { useState } from "react";
import { Briefcase, DollarSign, ExternalLink, FileSearch, Loader2, MapPin, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { canAutoApply, type Job } from "@/lib/types";

export function JobDetailsButton({ job }: { job: Job }) {
    const [open, setOpen] = useState(false);
    // LinkedIn has no public API: show what search already gave us, plus the link
    const hasApi = canAutoApply(job.platform);
    const [details, setDetails] = useState<Job | null>(job.details_fetched_at || !hasApi ? job : null);
    const [loading, setLoading] = useState(false);

    async function load() {
        if (details || loading) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/jobs/${job.id}/details`, { method: "POST" });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) return toast.error(data.error ?? "Could not load details");
            setDetails(data.job);
        } catch {
            // Network error (offline, dev server restarting...): say so, and let the user try again
            toast.error("Could not load details. Please try again.");
        } finally {
            setLoading(false); // always, or the spinner would spin forever
        }
    }

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                setOpen(next);
                if (next) load();
            }}
        >
            <DialogTrigger asChild>
                <Button size="sm" variant="ghost">
                    <FileSearch className="size-4" /> Details
                </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{job.title}</DialogTitle>
                    <DialogDescription>{job.company ?? "Unknown company"}</DialogDescription>
                </DialogHeader>

                {loading && (
                    <div className="flex items-center gap-2 py-8 text-muted-foreground">
                        <Loader2 className="size-4 animate-spin" /> Reading the full job posting…
                    </div>
                )}

                {details && (
                    <div className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                            {details.location && (
                                <Badge variant="secondary">
                                    <MapPin className="size-3" /> {details.location}
                                </Badge>
                            )}
                            {details.salary && (
                                <Badge variant="secondary">
                                    <DollarSign className="size-3" /> {details.salary}
                                </Badge>
                            )}
                            {details.job_type && (
                                <Badge variant="secondary">
                                    <Briefcase className="size-3" /> {details.job_type}
                                </Badge>
                            )}
                            {details.experience_level && (
                                <Badge variant="secondary">
                                    <TrendingUp className="size-3" /> {details.experience_level}
                                </Badge>
                            )}
                        </div>
                        {details.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                                {details.tags.map((tag) => (
                                    <Badge key={tag} variant="outline" className="font-normal">
                                        {tag}
                                    </Badge>
                                ))}
                            </div>
                        )}
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">
                            {details.description ??
                                (hasApi
                                    ? "No description found."
                                    : "LinkedIn does not share job descriptions with search engines. Open the original posting to read it.")}
                        </p>
                        <Button variant="outline" size="sm" asChild>
                            <a href={job.url} target="_blank" rel="noreferrer">
                                Open original posting <ExternalLink className="size-3" />
                            </a>
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}