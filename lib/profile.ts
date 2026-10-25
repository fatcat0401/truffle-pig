import type { Profile } from "@/lib/types";
import type { ParsedResume } from "@/lib/resume";

type ProfileLike = Pick<
    Profile,
    | "full_name" | "email" | "phone" | "location" | "headline" | "summary"
    | "linkedin_url" | "github_url" | "skills" | "experience" | "education"
    | "projects" | "certifications"
>;

const CHECKS: { label: string; done: (p: ProfileLike) => boolean }[] = [
    { label: "Full name", done: (p) => !!p.full_name?.trim() },
    { label: "Email", done: (p) => !!p.email?.trim() },
    { label: "Phone", done: (p) => !!p.phone?.trim() },
    { label: "Location", done: (p) => !!p.location?.trim() },
    { label: "Headline", done: (p) => !!p.headline?.trim() },
    { label: "Summary", done: (p) => !!p.summary?.trim() },
    { label: "LinkedIn URL", done: (p) => !!p.linkedin_url?.trim() },
    { label: "GitHub URL", done: (p) => !!p.github_url?.trim() },
    { label: "At least 3 skills", done: (p) => p.skills.length >= 3 },
    { label: "Work experience", done: (p) => p.experience.length > 0 },
    { label: "Education", done: (p) => p.education.length > 0 },
    { label: "Projects or certifications", done: (p) => p.projects.length + p.certifications.length > 0 },
];

export function getCompleteness(profile: ProfileLike) {
    const missing = CHECKS.filter((check) => !check.done(profile)).map((check) => check.label);
    const percent = Math.round(((CHECKS.length - missing.length) / CHECKS.length) * 100);
    return { percent, missing };
}

const TEXT_KEYS = [
    "full_name", "phone", "location", "headline", "summary", "linkedin_url", "github_url", "portfolio_url",
] as const;

// New resume values win; anything the resume does not have keeps the old value.
export function mergeParsedResume(profile: Profile, parsed: ParsedResume) {
    const update: Partial<Profile> = {};

    for (const key of TEXT_KEYS) {
        const value = parsed[key]?.trim();
        update[key] = value ? value : profile[key];
    }

    const skills = (parsed.skills ?? []).map((s) => s.trim()).filter(Boolean);
    update.skills = skills.length ? Array.from(new Set(skills)) : profile.skills;
    update.experience = parsed.experience?.length ? parsed.experience : profile.experience;
    update.education = parsed.education?.length ? parsed.education : profile.education;
    update.projects = parsed.projects?.length ? parsed.projects : profile.projects;
    update.certifications = parsed.certifications?.length ? parsed.certifications : profile.certifications;

    const merged = { ...profile, ...update };
    return {
        ...update,
        completeness: getCompleteness(merged).percent,
        updated_at: new Date().toISOString(),
    };
}