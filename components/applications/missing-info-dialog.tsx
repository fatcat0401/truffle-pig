"use client";

import { useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cleanLabel } from "@/lib/apply/shared";
import type { JobApplication, MissingField } from "@/lib/types";

type Props = {
    application: JobApplication | null;
    onClose: () => void;
    onSubmitted: () => void;
};

// Choices to show in a dropdown (single checkbox = Yes / No)
function choicesFor(field: MissingField) {
    if (field.type === "checkbox" && field.options.length <= 1) return ["Yes", "No"];
    return field.options.map((o) => o.label).filter(Boolean);
}

export function MissingInfoDialog({ application, onClose, onSubmitted }: Props) {
    const [values, setValues] = useState<Record<string, string>>({});
    const [autofilling, setAutofilling] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setValues(application?.answers ?? {});
    }, [application]);

    const fields = application?.missing_fields ?? [];

    async function autofill(field: MissingField) {
        if (!application) return;
        setAutofilling(field.key);
        const res = await fetch("/api/autofill", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                applicationId: application.id,
                label: cleanLabel(field.label),
                type: field.type,
                options: choicesFor(field),
            }),
        });
        const data = await res.json().catch(() => ({}));
        setAutofilling(null);
        if (!res.ok) return toast.error(data.error ?? "Autofill failed");
        setValues((current) => ({ ...current, [field.key]: data.answer }));
    }

    async function autofillAll() {
        for (const field of fields) {
            if (!values[field.key]) await autofill(field);
        }
    }

    async function submit() {
        if (!application) return;
        setSaving(true);
        const res = await fetch(`/api/applications/${application.id}/answers`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ answers: values }),
        });
        const data = await res.json().catch(() => ({}));
        setSaving(false);
        if (!res.ok) return toast.error(data.error ?? "Could not save answers");
        toast.success("Saved! The agent is continuing your application.");
        onSubmitted();
    }

    return (
        <Dialog open={!!application} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="font-heading text-xl">Questions the agent could not answer</DialogTitle>
                    <DialogDescription>
                        {application?.job_title} at {application?.company}. AI Autofill only drafts: check every answer before you save. Answers are reused on later applications.
                    </DialogDescription>
                </DialogHeader>

                <Button variant="outline" onClick={autofillAll} disabled={!!autofilling}>
                    <Sparkles className="size-4" /> AI Autofill all
                </Button>

                <div className="space-y-5">
                    {fields.map((field) => {
                        const choices = choicesFor(field);
                        const value = values[field.key] ?? "";
                        const setValue = (v: string) => setValues((current) => ({ ...current, [field.key]: v }));
                        const long = field.type === "textarea" || field.label.length > 80;

                        return (
                            <div key={field.key} className="space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                    <Label className="leading-snug">
                                        {cleanLabel(field.label)}
                                        {field.required && <span className="text-destructive"> *</span>}
                                    </Label>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 shrink-0 text-primary"
                                        onClick={() => autofill(field)}
                                        disabled={!!autofilling}
                                    >
                                        {autofilling === field.key ? (
                                            <Loader2 className="size-3.5 animate-spin" />
                                        ) : (
                                            <Sparkles className="size-3.5" />
                                        )}
                                        AI Autofill
                                    </Button>
                                </div>
                                {choices.length > 0 ? (
                                    <Select value={value} onValueChange={setValue}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Choose an option" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {choices.map((choice) => (
                                                <SelectItem key={choice} value={choice}>
                                                    {choice}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                ) : long ? (
                                    <Textarea rows={4} value={value} onChange={(e) => setValue(e.target.value)} />
                                ) : (
                                    <Input value={value} onChange={(e) => setValue(e.target.value)} />
                                )}
                            </div>
                        );
                    })}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={submit} disabled={saving}>
                        {saving && <Loader2 className="size-4 animate-spin" />}
                        Save and continue
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}