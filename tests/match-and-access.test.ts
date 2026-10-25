import { afterEach, describe, expect, it, vi } from "vitest";
import { matchJob } from "@/lib/match";
import { isEmailAllowed } from "@/lib/allowed-emails";

describe("matchJob", () => {
    const job = { title: "Data Engineer", description: "Build pipelines with Python, SQL and Airflow on AWS." };

    it("scores the share of profile skills found in the posting", () => {
        expect(matchJob(job, ["Python", "SQL", "Kafka"])).toEqual({ match: 67, matchedSkills: ["Python", "SQL"] });
    });

    it("caps the denominator at 6 so a long skill list is not punished", () => {
        const skills = ["Python", "SQL", "Airflow", "AWS", "Kafka", "Spark", "dbt", "Terraform"];
        expect(matchJob(job, skills).match).toBe(67); // 4 of 6, not 4 of 8
    });

    it("is case-insensitive and handles a missing description", () => {
        expect(matchJob({ title: "Senior PYTHON developer", description: null }, ["python"]).match).toBe(100);
    });

    it("gives 0 when the profile has no skills", () => {
        expect(matchJob(job, [])).toEqual({ match: 0, matchedSkills: [] });
    });
});

describe("isEmailAllowed", () => {
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it("allows listed emails, ignoring case and spaces", () => {
        vi.stubEnv("ALLOWED_EMAILS", " me@example.com , Tester@Example.com ");
        expect(isEmailAllowed("me@example.com")).toBe(true);
        expect(isEmailAllowed("tester@example.com")).toBe(true);
        expect(isEmailAllowed("stranger@example.com")).toBe(false);
    });

    it("fails closed: an empty list or a missing email lets nobody in", () => {
        vi.stubEnv("ALLOWED_EMAILS", "");
        expect(isEmailAllowed("me@example.com")).toBe(false);
        vi.stubEnv("ALLOWED_EMAILS", "me@example.com");
        expect(isEmailAllowed(undefined)).toBe(false);
    });
});
