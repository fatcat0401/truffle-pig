"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, ExternalLink, Search } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { JobCard } from "@/components/jobs/job-card";
import { RecentActivity } from "@/components/jobs/recent-activity";
import type { BoardLink } from "@/lib/job-boards";
import { PLATFORMS, type Activity, type JobWithMatch, type Platform } from "@/lib/types";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 10;

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
    const [saved, setSaved] = useState<Set<string>>(new Set());
    const [applied, setApplied] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
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
                setSaved(new Set(body.savedUrls));
                setApplied(new Set(body.appliedUrls));
                setPage(1);
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

    function updateSet(setter: typeof setSaved, url: string, on: boolean) {
        setter((current) => {
            const next = new Set(current);
            if (on) next.add(url);
            else next.delete(url);
            return next;
        });
    }

    const jobs = data?.jobs ?? [];
    const totalPages = Math.max(1, Math.ceil(jobs.length / PAGE_SIZE));
    const pageJobs = jobs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    return (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="space-y-4">
                <form
                    className="flex gap-2"
                    onSubmit={(e) => {
                        e.preventDefault();
                        setQuery(input.trim());
                    }}
                >
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={`Search roles (default: ${data?.query ?? "from your profile"})`}
                    />
                    <Button type="submit">
                        <Search className="size-4" /> Search
                    </Button>
                </form>

                <div className="flex flex-wrap gap-2">
                    {PLATFORMS.map((p) => {
                        const active = platforms.includes(p.id);
                        return (
                            <button
                                key={p.id}
                                type="button"
                                onClick={() => togglePlatform(p.id)}
                                className={cn(
                                    "rounded-full border px-3 py-1 text-sm transition-colors",
                                    active ? "border-primary bg-primary text-primary-foreground" : "hover:border-primary",
                                )}
                            >
                                {p.label}
                            </button>
                        );
                    })}
                </div>

                {data && data.boardLinks.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <span>Also search on:</span>
                        {data.boardLinks.map((link) => (
                            <Button key={link.label} variant="outline" size="sm" asChild>
                                <a href={link.url} target="_blank" rel="noreferrer">
                                    {link.label} <ExternalLink className="size-3" />
                                </a>
                            </Button>
                        ))}
                    </div>
                )}

                {loading ? (
                    Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40 w-full rounded-xl" />)
                ) : jobs.length === 0 ? (
                    <Card>
                        <CardContent className="py-10 text-center text-muted-foreground">
                            No jobs found. Try another search or select more platforms.
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        <p className="text-sm text-muted-foreground">
                            {jobs.length} jobs for <span className="font-medium text-foreground">{data?.query}</span>
                        </p>
                        {pageJobs.map((job) => (
                            <JobCard
                                key={job.id}
                                job={job}
                                saved={saved.has(job.url)}
                                applied={applied.has(job.url)}
                                onSavedChange={(on) => updateSet(setSaved, job.url, on)}
                                onApplied={() => updateSet(setApplied, job.url, true)}
                            />
                        ))}
                        <div className="flex items-center justify-center gap-3">
                            <Button variant="outline" size="icon" disabled={page === 1} onClick={() => setPage(page - 1)} aria-label="Previous page">
                                <ChevronLeft className="size-4" />
                            </Button>
                            <span className="text-sm">
                                Page {page} of {totalPages}
                            </span>
                            <Button variant="outline" size="icon" disabled={page === totalPages} onClick={() => setPage(page + 1)} aria-label="Next page">
                                <ChevronRight className="size-4" />
                            </Button>
                        </div>
                    </>
                )}
            </div>

            <div className="space-y-6 lg:sticky lg:top-6 lg:h-fit">
                <Card>
                    <CardHeader>
                        <CardTitle>Your profile</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <div className="mb-2 flex justify-between text-sm">
                                <span>Completeness</span>
                                <span className="font-medium">{profile.completeness}%</span>
                            </div>
                            <Progress value={profile.completeness} />
                        </div>
                        {profile.headline && <p className="text-sm font-medium">{profile.headline}</p>}
                        <div className="flex flex-wrap gap-1.5">
                            {profile.skills.slice(0, 12).map((skill) => (
                                <Badge key={skill} variant="secondary" className="font-normal">
                                    {skill}
                                </Badge>
                            ))}
                        </div>
                        <Button variant="outline" className="w-full" asChild>
                            <Link href="/dashboard/profile">Edit profile</Link>
                        </Button>
                    </CardContent>
                </Card>
                <RecentActivity items={activity} />
            </div>
        </div>
    );
}