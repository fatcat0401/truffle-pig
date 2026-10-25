import { cn } from "@/lib/utils";

// A pig's snout sniffing the ground. Uses currentColor so it follows the text colour.
export function SnoutMark({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 32 32" aria-hidden="true" className={cn("size-6", className)}>
            <path
                fill="currentColor"
                fillRule="evenodd"
                d="M16 6c7.2 0 13 4.5 13 10.2S23.2 26.5 16 26.5 3 21.9 3 16.2 8.8 6 16 6Zm-5 7.2c-1.3 0-2.3 1.4-2.3 3.1s1 3.1 2.3 3.1 2.3-1.4 2.3-3.1-1-3.1-2.3-3.1Zm10 0c-1.3 0-2.3 1.4-2.3 3.1s1 3.1 2.3 3.1 2.3-1.4 2.3-3.1-1-3.1-2.3-3.1Z"
            />
        </svg>
    );
}

export function Wordmark({ className }: { className?: string }) {
    return (
        <span className={cn("flex items-center gap-2 font-heading text-lg font-semibold tracking-tight", className)}>
            <SnoutMark className="size-7 text-truffle" />
            Truffle Pig
        </span>
    );
}
