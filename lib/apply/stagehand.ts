import "server-only";
import { browserbase, Stagehand } from "@browserbasehq/stagehand";

export type FallbackField = { label: string; type: string; value: string };

// Plan B for fields our normal selectors could not fill (custom dropdowns,
// inputs without id/name...). Stagehand joins the SAME Browserbase session,
// looks at the page with AI and does the action described in plain English.
// Returns the labels it still could not fill.
export async function fillWithStagehand(sessionId: string, fields: FallbackField[]) {
    if (fields.length === 0) return [];

    const browser = await browserbase.connect({ apiKey: process.env.BROWSERBASE_API_KEY!, sessionId });
    const stagehand = await Stagehand.create({
        browser,
        model: {
            modelName: `google/${process.env.GEMINI_MODEL ?? "gemini-2.5-flash"}`,
            apiKey: process.env.GEMINI_API_KEY!,
        },
    });

    const stillSkipped: string[] = [];
    try {
        for (const field of fields) {
            try {
                // %answer% is a variable: the real value is typed in by Stagehand
                // but is NOT sent to the AI model (keeps the user's data private).
                const instruction =
                    field.type === "select" || field.type === "radio" || field.type === "checkbox"
                        ? `In the "${field.label}" question, choose the option %answer%`
                        : `Type %answer% into the "${field.label}" field`;
                const { data } = await stagehand.act(instruction, {
                    variables: { answer: field.value },
                    timeout: 20_000,
                });
                if (!data.success) stillSkipped.push(field.label);
            } catch {
                stillSkipped.push(field.label);
            }
        }
    } finally {
        // Only disconnect Stagehand. The browser itself is closed by withBrowser().
        await stagehand.close().catch(() => null);
    }
    return stillSkipped;
}