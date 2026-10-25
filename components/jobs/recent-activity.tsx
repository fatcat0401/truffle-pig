import { Bookmark, FileText, Search, Send, UserPen } from "lucide-react";
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
        <section>
            <h2 className="text-lg font-semibold">Recent activity</h2>
            {items.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">Nothing yet. Search, save or apply to a job.</p>
            ) : (
                <ol className="mt-3 space-y-3 border-l pl-4">
                    {items.map((item) => {
                        const Icon = ICONS[item.type];
                        return (
                            <li key={item.id} className="relative flex items-start gap-3 text-sm">
                                <span className="absolute top-1.5 -left-[21px] size-2 rounded-full bg-border" aria-hidden="true" />
                                <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                                <span className="min-w-0 flex-1">{item.message}</span>
                                <time dateTime={item.created_at} className="shrink-0 text-xs text-muted-foreground">
                                    {timeAgo(item.created_at)}
                                </time>
                            </li>
                        );
                    })}
                </ol>
            )}
        </section>
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
