"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, Search } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { JobSplitView } from "@/components/jobs/job-split-view";
import { RecentActivity } from "@/components/jobs/recent-activity";
import type { BoardLink } from "@/lib/job-boards";
import { PLATFORMS, type Activity, type JobWithMatch, type Platform } from "@/lib/types";
import { cn } from "@/lib/utils";

type JobsResponse = {
    query: string;
    jobs: JobWithMatch[];
    boardLinks: BoardLink[]; // "Search on SEEK / Jora" with the same role + city
    savedUrls: string[];
    appliedUrls: string[];
    calledBrave: boolean; // true = fresh search, a new activity row was written
};

type Props = {
    profile: { headline: string | null; skills: string[]; completeness: number };
    activity: Activity[];
};

export function JobBoard({ profile, activity }: Props) {
    const [input, setInput] = useState("");
    const [query, setQuery] = useState(""); // empty = search based on the profile
    const [platforms, setPlatforms] = useState<Platform[]>(PLATFORMS.map((p) => p.id));
    const [data, setData] = useState<JobsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchId, setSearchId] = useState(0); // new key for the split view on every result
    const router = useRouter();

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        const params = new URLSearchParams({ platforms: platforms.join(",") });
        if (query) params.set("q", query);

        fetch(`/api/jobs?${params}`)
            .then(async (res) => {
                const body = await res.json();
                if (!res.ok) throw new Error(body.error ?? "Could not load jobs");
                return body as JobsResponse;
            })
            .then((body) => {
                if (cancelled) return;
                setData(body);
                setSearchId((id) => id + 1);
                // New search = new "Fetched N jobs" row: reload the server part so Recent activity shows it
                if (body.calledBrave) router.refresh();
            })
            .catch((error) => !cancelled && toast.error(error.message))
            .finally(() => !cancelled && setLoading(false));

        return () => {
            cancelled = true;
        };
    }, [platforms, query, router]);

    function togglePlatform(id: Platform) {
        setPlatforms((current) => {
            if (current.includes(id)) return current.length === 1 ? current : current.filter((p) => p !== id);
            return [...current, id];
        });
    }

    const jobs = data?.jobs ?? [];

    const sidePanel = (
        <div className="space-y-6">
            <p className="font-heading text-xl text-truffle">Pick a job on the left to read it here.</p>
            <section className="rounded-lg border bg-card p-5">
                <div className="flex items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold">Your profile</h2>
                    <Button variant="outline" size="sm" asChild>
                        <Link href="/dashboard/profile">Edit profile</Link>
                    </Button>
                </div>
                {profile.headline && <p className="mt-2 text-sm">{profile.headline}</p>}
                <div className="mt-4">
                    <div className="mb-1.5 flex justify-between text-sm">
                        <span className="text-muted-foreground">Profile complete</span>
                        <span className="font-medium tabular-nums">{profile.completeness}%</span>
                    </div>
                    <Progress value={profile.completeness} />
                </div>
                {profile.skills.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                        {profile.skills.slice(0, 14).map((skill) => (
                            <Badge key={skill} variant="secondary" className="font-normal">
                                {skill}
                            </Badge>
                        ))}
                    </div>
                )}
            </section>
            <RecentActivity items={activity} />
        </div>
    );

    return (
        <div className="space-y-5">
            <form
                className="flex gap-2"
                onSubmit={(e) => {
                    e.preventDefault();
                    setQuery(input.trim());
                }}
            >
                <div className="relative flex-1">
                    <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        aria-label="Role to search for"
                        placeholder={data?.query ? `Role, e.g. ${data.query.replace(/"/g, "")}` : "Role, or leave empty to use your profile"}
                        className="h-11 bg-card pl-9"
                    />
                </div>
                <Button type="submit" className="h-11 px-5">
                    Search
                </Button>
            </form>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Job sources">
                    {PLATFORMS.map((p) => {
                        const active = platforms.includes(p.id);
                        return (
                            <button
                                key={p.id}
                                type="button"
                                aria-pressed={active}
                                onClick={() => togglePlatform(p.id)}
                                className={cn(
                                    "rounded-md border px-2.5 py-1 transition-colors focus-visible:outline-2 focus-visible:outline-ring",
                                    active
                                        ? "border-moss bg-accent text-accent-foreground"
                                        : "text-muted-foreground hover:border-moss/60",
                                )}
                            >
                                {p.label}
                            </button>
                        );
                    })}
                </div>
                {data && data.boardLinks.length > 0 && (
                    <div className="flex flex-wrap items-center gap-3 text-muted-foreground">
                        <span>Also search on</span>
                        {data.boardLinks.map((link) => (
                            <a
                                key={link.label}
                                href={link.url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1 font-medium text-foreground underline decoration-border underline-offset-4 hover:decoration-moss"
                            >
                                {link.label} <ExternalLink className="size-3" />
                            </a>
                        ))}
                    </div>
                )}
            </div>

            {loading ? (
                <div className="grid gap-6 lg:grid-cols-[minmax(320px,400px)_minmax(0,1fr)]">
                    <div className="space-y-px overflow-hidden rounded-lg border">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <Skeleton key={i} className="h-20 w-full rounded-none" />
                        ))}
                    </div>
                    <p className="text-muted-foreground">Sniffing out fresh postings…</p>
                </div>
            ) : jobs.length === 0 ? (
                <div className="rounded-lg border border-dashed p-10 text-center">
                    <p className="font-medium">No jobs found for {data?.query ?? "this search"}.</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Try a broader role, turn on more sources, or use the SEEK and Jora links above.
                    </p>
                </div>
            ) : (
                <>
                    <p className="text-sm text-muted-foreground">
                        {jobs.length} jobs for <span className="font-medium text-foreground">{data?.query}</span>, best match first
                    </p>
                    <JobSplitView
                        key={searchId}
                        jobs={jobs}
                        savedUrls={data?.savedUrls ?? []}
                        appliedUrls={data?.appliedUrls ?? []}
                        emptyPane={sidePanel}
                    />
                </>
            )}
        </div>
    );
}
