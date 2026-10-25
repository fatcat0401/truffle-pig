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

    // Collapse spaces and drop a trailing required marker ("LinkedIn URL✱" -> "LinkedIn URL")
    const textOf = (el: Element | null | undefined) =>
        (el?.textContent ?? "").replace(/\s+/g, " ").trim().replace(/\s*[✱*]$/, "");

    // Lever writes every question as <li class="application-question"><div class="application-label">Question</div>...
    // Its <label> often wraps the whole control, so the label text would include every option.
    const leverQuestion = (el: HTMLElement) => {
        const heading = el.closest(".application-question")?.querySelector(".application-label");
        return heading && !heading.contains(el) ? textOf(heading) : "";
    };

    // The question above a group of inputs: Lever's heading or a <legend>
    const questionAbove = (el: HTMLElement) => {
        const legend = el.closest("fieldset")?.querySelector("legend");
        return leverQuestion(el) || (legend && !legend.contains(el) ? textOf(legend) : "");
    };

    // Find the human-readable question for an input
    const labelFor = (el: HTMLElement) => {
        const input = el as HTMLInputElement;
        const fromLabel = input.labels && input.labels.length > 0 ? textOf(input.labels[0]) : "";
        const labelledBy = el.getAttribute("aria-labelledby");
        const fromLabelledBy = labelledBy ? textOf(document.getElementById(labelledBy)) : "";
        return (
            leverQuestion(el) ||
            fromLabel ||
            el.getAttribute("aria-label") ||
            fromLabelledBy ||
            questionAbove(el) ||
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
            // Each radio's own <label> is an option ("Yes"), not the question. A lone checkbox's label is the question.
            const question = questionAbove(el) || (group.length === 1 ? labelFor(el) : "") || name;
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