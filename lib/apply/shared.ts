import type { Platform } from "@/lib/types";

// Where the application form lives for each platform
export function getApplyUrl(jobUrl: string, platform: Platform) {
    const url = jobUrl.replace(/\/+$/, "");
    if (platform === "lever") return url.endsWith("/apply") ? url : `${url}/apply`;
    if (platform === "workable") return url.endsWith("/apply") ? `${url}/` : `${url}/apply/`;
    return url; // Greenhouse shows the form on the job page itself
}

// "First Name *" -> "First Name"
export function cleanLabel(label: string) {
    return label.replace(/\*/g, "").replace(/\s+/g, " ").trim();
}

// For comparing labels: "First Name *" and "first name" are the same question
export function normalizeLabel(label: string) {
    return cleanLabel(label).toLowerCase();
}

export function replayUrl(sessionId: string) {
    return `https://www.browserbase.com/sessions/${sessionId}`;
}