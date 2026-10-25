import { describe, expect, it } from "vitest";
import { buildSearchPlace, buildSearchQuery } from "@/lib/jobs";
import { buildBoardSearchLinks } from "@/lib/job-boards";

describe("buildSearchPlace", () => {
    it("turns a suburb + state + postcode into the state capital", () => {
        // Real profile value that made Brave return random global jobs
        expect(buildSearchPlace("Giralang ACT 2617")).toBe("Canberra");
    });

    it("recognises state codes and full state names", () => {
        expect(buildSearchPlace("Sydney NSW")).toBe("Sydney");
        expect(buildSearchPlace("Fitzroy, Victoria")).toBe("Melbourne");
        expect(buildSearchPlace("Fremantle, Western Australia 6160")).toBe("Perth");
    });

    it("only matches state codes in capitals, so place names are not misread", () => {
        // "Wa" inside "Wauchope" must not mean Western Australia
        expect(buildSearchPlace("Wauchope")).toBe("Wauchope");
    });

    it("keeps a plain city and drops postcodes and trailing commas", () => {
        expect(buildSearchPlace("Newcastle")).toBe("Newcastle");
        expect(buildSearchPlace("Wagga Wagga, 2650")).toBe("Wagga Wagga");
    });

    it("falls back to Australia when there is no location", () => {
        expect(buildSearchPlace(null)).toBe("Australia");
        expect(buildSearchPlace("   ")).toBe("Australia");
    });
});

describe("buildSearchQuery", () => {
    it("prefers the headline, then the latest job title, then a default", () => {
        expect(buildSearchQuery({ headline: "Data Engineer", experience: [] })).toBe("Data Engineer");
        expect(
            buildSearchQuery({
                headline: null,
                experience: [{ title: "BI Analyst", company: "X", location: null, start_date: null, end_date: null, description: null }],
            }),
        ).toBe("BI Analyst");
        expect(buildSearchQuery(null)).toBe("software engineer");
    });
});

describe("buildBoardSearchLinks", () => {
    it("builds SEEK and Jora search links with the same role and place", () => {
        const [seek, jora] = buildBoardSearchLinks('"Data Engineer"', "Canberra");
        expect(seek).toEqual({ label: "SEEK", url: "https://www.seek.com.au/jobs?keywords=Data+Engineer&where=Canberra" });
        expect(jora).toEqual({ label: "Jora", url: "https://au.jora.com/j?q=Data+Engineer&l=Canberra" });
    });
});
