import "server-only";
import { NonRetriableError } from "inngest";
import type { Page } from "playwright-core";
import { createAdminClient } from "@/lib/supabase/admin";
import { withBrowser } from "@/lib/apply/browser";
import { fillWithStagehand, type FallbackField } from "@/lib/apply/stagehand";
import type { FormField } from "@/lib/types";

type FillInput = {
    applyUrl: string;
    fields: FormField[];
    values: Record<string, string>;
    resumePath: string;
    resumeName: string;
    dryRun: boolean;
};

export async function fillAndSubmit({ applyUrl, fields, values, resumePath, resumeName, dryRun }: FillInput) {
    // Download the latest resume from Storage so we can attach it
    const admin = createAdminClient();
    const { data: file, error } = await admin.storage.from("resumes").download(resumePath);
    if (error || !file) throw new Error("Could not download the resume");
    const resumeBuffer = Buffer.from(await file.arrayBuffer());
    const mimeType = resumeName.toLowerCase().endsWith(".pdf")
        ? "application/pdf"
        : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    let clickedSubmit = false;

    try {
        const { result, sessionId } = await withBrowser(async (page, liveSessionId) => {
            await page.goto(applyUrl, { waitUntil: "domcontentloaded" });
            await page.waitForSelector(fields[0].selector, { state: "attached" }).catch(() => null);

            const failed: FallbackField[] = []; // has a value: Stagehand can try again
            const skipped: string[] = []; // nothing to retry (e.g. the resume upload failed)
            const fileFields = fields.filter((f) => f.type === "file");
            const resumeField = fileFields.find((f) => /resume|cv/i.test(f.label)) ?? fileFields[0];

            for (const field of fields) {
                try {
                    if (field.type === "file") {
                        if (field === resumeField) {
                            await page.setInputFiles(field.selector, { name: resumeName, mimeType, buffer: resumeBuffer });
                        }
                        continue;
                    }
                    const value = values[field.key];
                    if (value) await fillField(page, field, value);
                } catch {
                    const value = values[field.key];
                    if (value) failed.push({ label: field.label, type: field.type, value });
                    else skipped.push(field.label);
                }
            }

            // Plan B: let Stagehand (AI) try the fields that failed. Costs AI calls,
            // so it only runs when something actually went wrong.
            const stillFailed = await fillWithStagehand(liveSessionId, failed).catch((error) => {
                console.error("Stagehand fallback failed", error);
                return failed.map((f) => f.label);
            });
            skipped.push(...stillFailed);
            const skippedNote = skipped.length ? ` Skipped: ${skipped.join(", ")}.` : "";

            if (dryRun) {
                await page.waitForTimeout(3000); // so the replay video shows the filled form
                return { submitted: false, note: `Dry run: form filled but NOT submitted.${skippedNote}` };
            }

            const submit = page
                .locator('form button[type="submit"], form input[type="submit"], button:has-text("Submit application")')
                .first();
            clickedSubmit = true;
            await submit.click();
            await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => null);

            const text = (await page.locator("body").innerText()).toLowerCase();
            const success = /thank you|application (has been )?(submitted|received)|we('|’)ve received/.test(text);
            if (!success) throw new Error(`Clicked submit but could not confirm success. Check the replay.${skippedNote}`);
            return { submitted: true, note: skippedNote.trim() || null };
        });

        return { ...result, sessionId };
    } catch (err) {
        // After clicking Submit, never retry: that could send the application twice
        if (clickedSubmit) throw new NonRetriableError(err instanceof Error ? err.message : "Submit failed");
        throw err;
    }
}

async function fillField(page: Page, field: FormField, value: string) {
    const matchOption = () =>
        field.options.find((o) => o.label.toLowerCase() === value.toLowerCase() || o.value === value);

    switch (field.type) {
        case "select": {
            const option = matchOption();
            await page.selectOption(field.selector, option ? option.value : { label: value });
            return;
        }
        case "radio": {
            const option = matchOption();
            if (option?.selector) await page.check(option.selector, { force: true });
            return;
        }
        case "checkbox": {
            if (field.options.length > 1) {
                const option = matchOption();
                if (option?.selector) await page.check(option.selector, { force: true });
            } else if (/^(yes|true|1)$/i.test(value)) {
                await page.check(field.options[0]?.selector ?? field.selector, { force: true });
            }
            return;
        }
        default:
            await page.fill(field.selector, value);
    }
}