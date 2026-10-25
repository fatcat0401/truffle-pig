"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bookmark, Briefcase, FileText, ListChecks, LogOut, User } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SnoutMark } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

const NAV = [
    { href: "/dashboard/jobs", label: "Jobs", icon: Briefcase },
    { href: "/dashboard/saved-jobs", label: "Saved", icon: Bookmark },
    { href: "/dashboard/applications", label: "Applications", icon: ListChecks },
    { href: "/dashboard/resume", label: "Resume", icon: FileText },
    { href: "/dashboard/profile", label: "Profile", icon: User },
];

type Props = {
    user: { name: string; email: string; avatarUrl: string | null };
};

// Desktop: a narrow soil-coloured rail on the left. Phone: a bar at the bottom.
export function AppSidebar({ user }: Props) {
    const pathname = usePathname();

    return (
        <>
            <nav
                aria-label="Main"
                className="sticky top-0 hidden h-svh w-16 shrink-0 flex-col items-center gap-2 bg-soil py-4 text-soil-foreground md:flex"
            >
                <Link href="/dashboard/jobs" aria-label="Truffle Pig home" className="mb-4">
                    {/* Light truffle on soil in both themes */}
                    <SnoutMark className="size-8 text-[#c49a7a]" />
                </Link>
                {NAV.map((item) => {
                    const active = pathname.startsWith(item.href);
                    return (
                        <Tooltip key={item.href}>
                            <TooltipTrigger asChild>
                                <Link
                                    href={item.href}
                                    aria-label={item.label}
                                    aria-current={active ? "page" : undefined}
                                    className={cn(
                                        "flex size-10 items-center justify-center rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-sidebar-ring",
                                        active ? "bg-sidebar-accent text-sidebar-primary" : "text-soil-foreground/70 hover:text-soil-foreground",
                                    )}
                                >
                                    <item.icon className="size-5" />
                                </Link>
                            </TooltipTrigger>
                            <TooltipContent side="right">{item.label}</TooltipContent>
                        </Tooltip>
                    );
                })}
                <div className="mt-auto">
                    <UserMenu user={user} side="right" />
                </div>
            </nav>

            <nav
                aria-label="Main"
                className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-sidebar-border bg-soil px-2 pb-[env(safe-area-inset-bottom)] text-soil-foreground md:hidden"
            >
                {NAV.map((item) => {
                    const active = pathname.startsWith(item.href);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            aria-current={active ? "page" : undefined}
                            className={cn(
                                "flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px]",
                                active ? "text-sidebar-primary" : "text-soil-foreground/70",
                            )}
                        >
                            <item.icon className="size-5" />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>
        </>
    );
}

export function UserMenu({ user, side }: Props & { side: "right" | "bottom" }) {
    const initials =
        user.name
            .split(" ")
            .map((part) => part[0])
            .join("")
            .slice(0, 2)
            .toUpperCase() || "U";

    async function signOut() {
        await fetch("/auth/signout", { method: "POST" });
        window.location.href = "/";
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                aria-label="Account menu"
                className="rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring"
            >
                <Avatar className="size-9">
                    {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt="" />}
                    <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground">{initials}</AvatarFallback>
                </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent side={side} align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                    <p className="truncate font-medium">{user.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <Link href="/dashboard/profile">
                        <User className="size-4" /> Profile
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={signOut}>
                    <LogOut className="size-4" /> Sign out
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
