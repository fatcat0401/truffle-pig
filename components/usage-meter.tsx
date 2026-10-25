import Link from "next/link";
import { Zap } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import type { PlanId } from "@/lib/plans";

export function UsageMeter({ used, limit, plan }: { used: number; limit: number; plan: PlanId }) {
    const percent = Math.min(100, Math.round((used / limit) * 100));

    return (
        // Hidden when the sidebar is collapsed to icons
        <div className="rounded-lg border bg-background p-3 group-data-[collapsible=icon]:hidden">
            <div className="flex items-center justify-between text-xs">
                <span className="font-medium">AI applies today</span>
                <span className="text-muted-foreground">
                    {used}/{limit}
                </span>
            </div>
            <Progress value={percent} className="mt-2 h-2" />
            {plan === "free" && (
                <Button asChild size="sm" className="mt-3 w-full">
                    <Link href="/dashboard/billing">
                        <Zap className="size-3.5" /> Upgrade to Pro
                    </Link>
                </Button>
            )}
        </div>
    );
}