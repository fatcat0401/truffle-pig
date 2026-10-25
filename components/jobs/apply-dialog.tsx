"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, Check, ExternalLink, Loader2, MousePointerClick } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { PLATFORMS, canAutoApply as isAutoApplyPlatform, type Job } from "@/lib/types";

export function ApplyDialog({ job, applied, onApplied }: { job: Job; applied: boolean; onApplied: () => void }) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    // Job boards (SEEK, LinkedIn, Jora) need your login, so the robot cannot apply there
    const canAutoApply = isAutoApplyPlatform(job.platform);
    const platformLabel = PLATFORMS.find((p) => p.id === job.platform)?.label ?? job.platform;

    function applyManually() {
        window.open(job.url, "_blank", "noopener,noreferrer");
        setOpen(false);
    }

    async function applyWithAgent() {
        setSubmitting(true);
        const res = await fetch("/api/applications", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jobId: job.id }),
        });
        const data = await res.json().catch(() => ({}));
        setSubmitting(false);

        if (!res.ok) return toast.error(data.error ?? "Could not start the application");
        toast.success("Queued! Track progress on the Applications page.");
        setOpen(false);
        onApplied();
        router.refresh(); // updates Recent activity
    }

    if (applied) {
        return (
            <Button size="sm" variant="secondary" disabled>
                <Check className="size-4" /> Applied
            </Button>
        );
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm">Apply now</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Apply to {job.title}</DialogTitle>
                    <DialogDescription>{job.company ?? "Unknown company"}</DialogDescription>
                </DialogHeader>
                <div className="grid gap-3">
                    <button
                        type="button"
                        onClick={applyManually}
                        className="flex items-start gap-3 rounded-lg border p-4 text-left transition-colors hover:border-primary"
                    >
                        <MousePointerClick className="mt-0.5 size-5 text-muted-foreground" />
                        <div>
                            <p className="flex items-center gap-1 font-medium">
                                Apply manually <ExternalLink className="size-3" />
                            </p>
                            <p className="text-sm text-muted-foreground">Open the job page in a new tab.</p>
                        </div>
                    </button>
                    <button
                        type="button"
                        onClick={applyWithAgent}
                        disabled={!canAutoApply || submitting}
                        className="flex items-start gap-3 rounded-lg border border-primary/50 bg-primary/5 p-4 text-left transition-colors hover:border-primary disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {submitting ? (
                            <Loader2 className="mt-0.5 size-5 animate-spin text-primary" />
                        ) : (
                            <Bot className="mt-0.5 size-5 text-primary" />
                        )}
                        <div>
                            <p className="font-medium">Apply automatically with AI agent</p>
                            <p className="text-sm text-muted-foreground">
                                {canAutoApply
                                    ? "Our agent fills the form in a cloud browser. Uses 1 credit."
                                    : `Not available for ${platformLabel}: it needs your login. Use "Apply manually".`}
                            </p>
                        </div>
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}