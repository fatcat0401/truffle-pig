import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ApplicationStatus } from "@/lib/types";

const STATUS: Record<ApplicationStatus, { label: string; className: string }> = {
    queued: { label: "Queued", className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200" },
    detecting_fields: { label: "Detecting fields", className: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" },
    missing_info: { label: "Missing info", className: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" },
    in_progress: { label: "In progress", className: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300" },
    submitted: { label: "Submitted", className: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300" },
    dry_run_complete: { label: "Dry run done", className: "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300" },
    failed: { label: "Failed", className: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300" },
};

export function StatusBadge({ status }: { status: ApplicationStatus }) {
    const s = STATUS[status];
    return <Badge className={cn("border-transparent", s.className)}>{s.label}</Badge>;
}