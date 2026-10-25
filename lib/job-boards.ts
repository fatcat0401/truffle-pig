// SEEK and Jora: search engines only index their LIST pages, so we cannot show single jobs
// from them. Instead we build a link to THEIR search page with the same role and city.
// No API call, no scraping: the user opens it and applies there.
export type BoardLink = { label: string; url: string };

export function buildBoardSearchLinks(role: string, place: string): BoardLink[] {
    const keywords = role.replace(/["']/g, "").trim();
    const where = place.trim();
    return [
        {
            label: "SEEK",
            url: `https://www.seek.com.au/jobs?${new URLSearchParams({ keywords, where })}`,
        },
        {
            label: "Jora",
            url: `https://au.jora.com/j?${new URLSearchParams({ q: keywords, l: where })}`,
        },
    ];
}