import type { Job } from "@/lib/types";

// Simple match score: how many of your skills appear in the job title/description
export function matchJob(job: Pick<Job, "title" | "description">, skills: string[]) {
    const text = `${job.title} ${job.description ?? ""}`.toLowerCase();
    const matchedSkills = skills.filter((skill) => text.includes(skill.toLowerCase()));
    const denominator = Math.max(1, Math.min(skills.length, 6));
    const match = Math.min(100, Math.round((matchedSkills.length / denominator) * 100));
    return { match, matchedSkills: matchedSkills.slice(0, 6) };
}