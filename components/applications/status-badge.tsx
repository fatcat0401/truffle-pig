import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ApplicationStatus } from "@/lib/types";

const STATUS: Record<ApplicationStatus, { label: string; className: string }> = {
    queued: { label: "Queued", className: "bg-secondary text-secondary-foreground" },
    detecting_fields: { label: "Reading form", className: "bg-accent text-accent-foreground" },
    missing_info: { label: "Needs your answers", className: "bg-ochre/15 text-ochre" },
    in_progress: { label: "Filling form", className: "bg-accent text-accent-foreground" },
    submitted: { label: "Submitted", className: "bg-moss text-primary-foreground" },
    dry_run_complete: { label: "Dry run done", className: "bg-truffle/15 text-truffle" },
    failed: { label: "Failed", className: "bg-rust/15 text-rust" },
};

export function StatusBadge({ status }: { status: ApplicationStatus }) {
    const s = STATUS[status];
    return <Badge className={cn("border-transparent", s.className)}>{s.label}</Badge>;
}
