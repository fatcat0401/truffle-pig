import { afterEach, describe, expect, it, vi } from "vitest";

// job-details.ts imports the Gemini client; these tests never call it
vi.mock("@/lib/gemini", () => ({ generateJson: vi.fn() }));

const { htmlToText, withTimeout } = await import("@/lib/job-details");

describe("htmlToText", () => {
    it("decodes HTML that the API sends escaped (Greenhouse)", () => {
        expect(htmlToText("&lt;p&gt;Hello &amp;amp; welcome&lt;/p&gt;")).toBe("Hello & welcome");
    });

    it("keeps line breaks for paragraphs and list items", () => {
        expect(htmlToText("<h2>Role</h2><ul><li>Python</li><li>SQL</li></ul>")).toBe("Role\nPython\nSQL");
    });

    it("returns null for empty input", () => {
        expect(htmlToText(null)).toBeNull();
        expect(htmlToText("<p></p>")).toBeNull();
    });
});

describe("withTimeout", () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it("returns the result when the promise is fast enough", async () => {
        await expect(withTimeout(Promise.resolve("ok"), 1000)).resolves.toBe("ok");
    });

    it("stops waiting after the limit (Gemini once took 152 s)", async () => {
        vi.useFakeTimers();
        const slow = new Promise((resolve) => setTimeout(resolve, 152_000));
        const result = withTimeout(slow, 15_000);
        vi.advanceTimersByTime(15_000);
        await expect(result).rejects.toThrow("Timed out after 15000 ms");
    });
});
