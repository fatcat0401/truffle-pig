import { cn } from "@/lib/utils";

// How strongly the pig smells a match: 5 spores, one per 20% of skills matched.
export function MatchScent({ match, className }: { match: number; className?: string }) {
    const filled = Math.round(match / 20);
    const strong = match >= 50;

    return (
        <span className={cn("inline-flex items-center gap-2", className)} aria-label={`${match}% skill match`}>
            <span className="flex gap-[3px]" aria-hidden="true">
                {Array.from({ length: 5 }).map((_, i) => (
                    <span
                        key={i}
                        className={cn(
                            "size-[7px] rounded-full",
                            i < filled ? (strong ? "bg-moss" : "bg-truffle/70") : "bg-border",
                        )}
                    />
                ))}
            </span>
            <span className={cn("text-sm tabular-nums", strong ? "font-semibold text-moss" : "text-muted-foreground")}>
                {match}%
            </span>
        </span>
    );
}
