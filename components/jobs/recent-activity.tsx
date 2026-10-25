import { Bookmark, FileText, Search, Send, UserPen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Activity, ActivityType } from "@/lib/types";

const ICONS: Record<ActivityType, typeof Search> = {
    search: Search,
    save: Bookmark,
    apply: Send,
    profile: UserPen,
    resume: FileText,
};

export function RecentActivity({ items }: { items: Activity[] }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Recent activity</CardTitle>
            </CardHeader>
            <CardContent>
                {items.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nothing yet. Search, save or apply to a job.</p>
                ) : (
                    <ul className="space-y-3">
                        {items.map((item) => {
                            const Icon = ICONS[item.type];
                            return (
                                <li key={item.id} className="flex items-start gap-3 text-sm">
                                    <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                                    <span className="min-w-0 flex-1">{item.message}</span>
                                    <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(item.created_at)}</span>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
}

// "2026-10-20T10:00:00Z" -> "2h ago"
function timeAgo(iso: string) {
    const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.round(hours / 24)}d ago`;
}