import "server-only";
import Browserbase from "@browserbasehq/sdk";
import { chromium, type Page } from "playwright-core";

const bb = new Browserbase({ apiKey: process.env.BROWSERBASE_API_KEY! });

// Opens a cloud browser, runs your code with a page, and always closes it afterwards.
// run() also gets the session id, so Stagehand can join the same browser if needed.
export async function withBrowser<T>(run: (page: Page, sessionId: string) => Promise<T>) {
    const session = await bb.sessions.create({ projectId: process.env.BROWSERBASE_PROJECT_ID! });
    const browser = await chromium.connectOverCDP(session.connectUrl);

    try {
        const context = browser.contexts()[0];
        const page = context.pages()[0] ?? (await context.newPage());
        page.setDefaultTimeout(20_000);
        const result = await run(page, session.id);
        return { result, sessionId: session.id };
    } finally {
        await browser.close();
    }
}