import { describe, expect, it } from "vitest";
import { cleanSnippet, cleanTitle, companyFromUrl, parseLinkedInTitle } from "@/lib/brave";

describe("parseLinkedInTitle", () => {
    // Formats seen in real Brave results
    it('reads "Company hiring Title in Place"', () => {
        expect(parseLinkedInTitle("Hays hiring Data Engineer in Sydney, New South Wales, Australia | LinkedIn")).toEqual({
            company: "Hays",
            title: "Data Engineer",
            location: "Sydney, New South Wales, Australia",
        });
    });

    it('reads "Title at Company — Place" and drops a cut-off "..."', () => {
        expect(parseLinkedInTitle("Data Engineer at Macquarie Group — Sydney, New South ...")).toEqual({
            title: "Data Engineer",
            company: "Macquarie Group",
            location: "Sydney, New South",
        });
    });

    it('reads "Title - Detail at Company"', () => {
        expect(parseLinkedInTitle("Senior Data Engineer - Financial Services at EY")).toEqual({
            title: "Senior Data Engineer - Financial Services",
            company: "EY",
            location: null,
        });
    });

    it('reads "Title - Company"', () => {
        expect(parseLinkedInTitle("Senior Data Engineer - Xeneta")).toEqual({
            title: "Senior Data Engineer",
            company: "Xeneta",
            location: null,
        });
    });

    it("does not mistake a job detail for the company", () => {
        expect(parseLinkedInTitle("Data Engineer - Contract")).toEqual({
            title: "Data Engineer - Contract",
            company: null,
            location: null,
        });
    });
});

describe("cleanTitle", () => {
    it("removes the Greenhouse prefix and the company suffix", () => {
        expect(cleanTitle("Job Application for Frontend Engineer at Figma")).toBe("Frontend Engineer");
    });

    it("keeps the longest part of a dashed title", () => {
        expect(cleanTitle("Figma - Frontend Engineer")).toBe("Frontend Engineer");
    });
});

describe("cleanSnippet", () => {
    it("drops LinkedIn's referral advert, which says nothing about the job", () => {
        expect(cleanSnippet("64% of job seekers get hired through a referral. See who you know.")).toBeNull();
    });

    it("strips HTML and decodes entities", () => {
        expect(cleanSnippet("<strong>Python</strong> &amp; SQL, it&#39;s fun")).toBe("Python & SQL, it's fun");
    });

    it("returns null for an empty snippet", () => {
        expect(cleanSnippet(undefined)).toBeNull();
    });
});

describe("companyFromUrl", () => {
    it("turns the careers-page slug into a company name", () => {
        expect(companyFromUrl("https://jobs.lever.co/acme-corp/0b1c2d3e-0000-4000-8000-123456789abc")).toBe("Acme Corp");
        expect(companyFromUrl("https://job-boards.greenhouse.io/data_dog/jobs/123")).toBe("Data Dog");
    });
});
