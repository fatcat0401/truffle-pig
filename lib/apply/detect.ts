import "server-only";
import { NonRetriableError } from "inngest";
import { withBrowser } from "@/lib/apply/browser";
import { getApplyUrl } from "@/lib/apply/shared";
import type { FormField, Platform } from "@/lib/types";

export async function detectFormFields(jobUrl: string, platform: Platform) {
    const applyUrl = getApplyUrl(jobUrl, platform);

    const { result: fields, sessionId } = await withBrowser(async (page) => {
        await page.goto(applyUrl, { waitUntil: "domcontentloaded" });
        // Wait until a form with an email box shows up (forms are often loaded by JavaScript)
        await page
            .waitForSelector('form input[type="email"], form input[name*="email" i]', { timeout: 20_000 })
            .catch(() => null);
        return page.evaluate(extractFieldsInPage);
    });

    if (fields.length === 0) {
        throw new NonRetriableError("Could not find an application form on this page");
    }
    return { applyUrl, fields, sessionId };
}

// ⚠️ This function runs INSIDE the cloud browser. It cannot use anything from outside.
function extractFieldsInPage(): FormField[] {
    const forms = Array.from(document.querySelectorAll("form"));
    const form =
        forms.find((f) => f.querySelector('input[type="email"], input[name*="email" i]')) ?? forms[0];
    if (!form) return [];

    const textOf = (el: Element | null | undefined) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();

    // Find the human-readable question for an input
    const labelFor = (el: HTMLElement) => {
        const input = el as HTMLInputElement;
        const fromLabel = input.labels && input.labels.length > 0 ? textOf(input.labels[0]) : "";
        const labelledBy = el.getAttribute("aria-labelledby");
        const fromLabelledBy = labelledBy ? textOf(document.getElementById(labelledBy)) : "";
        const fieldset = el.closest("fieldset");
        const fromLegend = fieldset ? textOf(fieldset.querySelector("legend")) : "";
        return (
            fromLabel ||
            el.getAttribute("aria-label") ||
            fromLabelledBy ||
            fromLegend ||
            el.getAttribute("placeholder") ||
            el.getAttribute("name") ||
            ""
        ).trim();
    };

    // A CSS selector that finds this exact input again later
    const selectorFor = (el: HTMLElement) => {
        if (el.id) return `#${CSS.escape(el.id)}`;
        const name = el.getAttribute("name");
        if (name) return `${el.tagName.toLowerCase()}[name="${CSS.escape(name)}"]`;
        return null;
    };

    const fields: FormField[] = [];
    const seenGroups = new Set<string>();

    form.querySelectorAll<HTMLElement>("input, textarea, select").forEach((el) => {
        const tag = el.tagName.toLowerCase();
        const type = tag === "input" ? (el as HTMLInputElement).type || "text" : tag;
        if (["hidden", "submit", "button", "reset", "image", "search"].includes(type)) return;
        const required = (el as HTMLInputElement).required || el.getAttribute("aria-required") === "true";

        // Radio buttons / checkboxes with the same name are ONE question with several options
        if (type === "radio" || type === "checkbox") {
            const name = el.getAttribute("name");
            if (!name || seenGroups.has(name)) return;
            seenGroups.add(name);
            const group = Array.from(form.querySelectorAll<HTMLInputElement>(`input[name="${CSS.escape(name)}"]`));
            const fieldset = el.closest("fieldset");
            const question = (fieldset ? textOf(fieldset.querySelector("legend")) : "") || labelFor(el) || name;
            fields.push({
                key: `group:${name}`,
                selector: `input[name="${CSS.escape(name)}"]`,
                label: question,
                type,
                required: group.some((g) => g.required),
                options: group.map((g) => ({
                    label: (g.labels && g.labels.length > 0 ? textOf(g.labels[0]) : "") || g.value,
                    value: g.value,
                    selector: `input[name="${CSS.escape(name)}"][value="${CSS.escape(g.value)}"]`,
                })),
            });
            return;
        }

        const selector = selectorFor(el);
        if (!selector) return;
        const options =
            tag === "select"
                ? Array.from((el as HTMLSelectElement).options)
                    .filter((o) => o.value)
                    .map((o) => ({ label: o.text.trim(), value: o.value }))
                : [];

        fields.push({ key: selector, selector, label: labelFor(el), type, required, options });
    });

    return fields;
}