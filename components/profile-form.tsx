"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, Loader2, Plus, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getCompleteness } from "@/lib/profile";
import type { Certification, Education, Experience, Profile, Project } from "@/lib/types";

type FormState = Pick<
    Profile,
    | "email" | "full_name" | "phone" | "location" | "headline" | "summary"
    | "linkedin_url" | "github_url" | "portfolio_url"
    | "skills" | "experience" | "education" | "projects" | "certifications" | "extra_answers"
>;

const EMPTY_EXPERIENCE: Experience = {
    company: "", title: "", location: null, start_date: null, end_date: null, description: null,
};
const EMPTY_EDUCATION: Education = { school: "", degree: null, field: null, start_date: null, end_date: null };
const EMPTY_PROJECT: Project = { name: "", description: null, url: null };
const EMPTY_CERTIFICATION: Certification = { name: "", issuer: null, date: null };

export function ProfileForm({ profile }: { profile: Profile }) {
    const router = useRouter();
    const [form, setForm] = useState<FormState>({
        email: profile.email,
        full_name: profile.full_name,
        phone: profile.phone,
        location: profile.location,
        headline: profile.headline,
        summary: profile.summary,
        linkedin_url: profile.linkedin_url,
        github_url: profile.github_url,
        portfolio_url: profile.portfolio_url,
        skills: profile.skills ?? [],
        experience: profile.experience ?? [],
        education: profile.education ?? [],
        projects: profile.projects ?? [],
        certifications: profile.certifications ?? [],
        extra_answers: profile.extra_answers ?? {},
    });
    const [skillInput, setSkillInput] = useState("");
    const [saving, setSaving] = useState(false);

    // Re-calculated every time the form changes
    const { percent, missing } = useMemo(() => getCompleteness(form), [form]);

    function set<K extends keyof FormState>(key: K, value: FormState[K]) {
        setForm((prev) => ({ ...prev, [key]: value }));
    }

    function addSkill() {
        const skill = skillInput.trim();
        if (!skill) return;
        if (!form.skills.some((s) => s.toLowerCase() === skill.toLowerCase())) set("skills", [...form.skills, skill]);
        setSkillInput("");
    }

    function updateExperience(index: number, patch: Partial<Experience>) {
        set("experience", form.experience.map((item, i) => (i === index ? { ...item, ...patch } : item)));
    }

    function updateEducation(index: number, patch: Partial<Education>) {
        set("education", form.education.map((item, i) => (i === index ? { ...item, ...patch } : item)));
    }

    function updateProject(index: number, patch: Partial<Project>) {
        set("projects", form.projects.map((item, i) => (i === index ? { ...item, ...patch } : item)));
    }

    function updateCertification(index: number, patch: Partial<Certification>) {
        set("certifications", form.certifications.map((item, i) => (i === index ? { ...item, ...patch } : item)));
    }

    async function save() {
        setSaving(true);
        // email comes from Google sign-in and cannot be edited here
        const { email: _email, ...payload } = form;
        const res = await fetch("/api/profile", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                ...payload,
                experience: form.experience.filter((e) => e.company.trim() || e.title.trim()),
                education: form.education.filter((e) => e.school.trim()),
                projects: form.projects.filter((p) => p.name.trim()),
                certifications: form.certifications.filter((c) => c.name.trim()),
            }),
        });
        const data = await res.json();
        setSaving(false);
        if (!res.ok) return toast.error(data.error ?? "Could not save");
        toast.success("Profile saved");
        router.refresh();
    }

    return (
        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
            <Card className="h-fit">
                <CardHeader>
                    <CardTitle>Profile completeness</CardTitle>
                    <CardDescription>A complete profile means fewer questions during applications.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-4xl font-bold">{percent}%</p>
                    <Progress value={percent} />
                    {missing.length === 0 ? (
                        <p className="flex items-center gap-2 text-sm text-green-600">
                            <CheckCircle2 className="size-4" /> Profile complete
                        </p>
                    ) : (
                        <ul className="space-y-1 text-sm text-muted-foreground">
                            {missing.map((item) => (
                                <li key={item} className="flex items-center gap-2">
                                    <Circle className="size-3" /> {item}
                                </li>
                            ))}
                        </ul>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardContent className="pt-6">
                    <Tabs defaultValue="basic">
                        <TabsList className="flex h-auto flex-wrap justify-start">
                            <TabsTrigger value="basic">Basic info</TabsTrigger>
                            <TabsTrigger value="summary">Summary</TabsTrigger>
                            <TabsTrigger value="skills">Skills</TabsTrigger>
                            <TabsTrigger value="experience">Experience</TabsTrigger>
                            <TabsTrigger value="education">Education</TabsTrigger>
                            <TabsTrigger value="projects">Projects &amp; certs</TabsTrigger>
                            <TabsTrigger value="answers">Saved answers</TabsTrigger>
                        </TabsList>

                        <TabsContent value="basic" className="mt-6 grid gap-4 sm:grid-cols-2">
                            <TextField label="Full name" value={form.full_name} onChange={(v) => set("full_name", v)} />
                            <TextField label="Email" value={form.email} onChange={() => { }} disabled />
                            <TextField label="Phone" value={form.phone} onChange={(v) => set("phone", v)} />
                            <TextField label="Location" value={form.location} onChange={(v) => set("location", v)} placeholder="Sydney, NSW" />
                            <TextField label="Headline" value={form.headline} onChange={(v) => set("headline", v)} placeholder="Frontend Developer" />
                            <TextField label="LinkedIn URL" value={form.linkedin_url} onChange={(v) => set("linkedin_url", v)} />
                            <TextField label="GitHub URL" value={form.github_url} onChange={(v) => set("github_url", v)} />
                            <TextField label="Portfolio URL" value={form.portfolio_url} onChange={(v) => set("portfolio_url", v)} />
                        </TabsContent>

                        <TabsContent value="summary" className="mt-6 space-y-2">
                            <Label htmlFor="summary">Professional summary</Label>
                            <Textarea
                                id="summary"
                                rows={8}
                                value={form.summary ?? ""}
                                onChange={(e) => set("summary", e.target.value || null)}
                            />
                        </TabsContent>

                        <TabsContent value="skills" className="mt-6 space-y-4">
                            <div className="flex gap-2">
                                <Input
                                    value={skillInput}
                                    placeholder="Add a skill, e.g. React"
                                    onChange={(e) => setSkillInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            addSkill();
                                        }
                                    }}
                                />
                                <Button type="button" variant="secondary" onClick={addSkill}>
                                    <Plus className="size-4" /> Add
                                </Button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {form.skills.map((skill) => (
                                    <Badge key={skill} variant="secondary" className="gap-1 py-1 pl-3 pr-1">
                                        {skill}
                                        <button
                                            type="button"
                                            aria-label={`Remove ${skill}`}
                                            className="rounded-full p-0.5 hover:bg-muted"
                                            onClick={() => set("skills", form.skills.filter((s) => s !== skill))}
                                        >
                                            <X className="size-3" />
                                        </button>
                                    </Badge>
                                ))}
                            </div>
                        </TabsContent>

                        <TabsContent value="experience" className="mt-6 space-y-4">
                            {form.experience.map((exp, i) => (
                                <div key={i} className="space-y-3 rounded-lg border p-4">
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <TextField label="Job title" value={exp.title} onChange={(v) => updateExperience(i, { title: v ?? "" })} />
                                        <TextField label="Company" value={exp.company} onChange={(v) => updateExperience(i, { company: v ?? "" })} />
                                        <TextField label="Start (YYYY-MM)" value={exp.start_date} onChange={(v) => updateExperience(i, { start_date: v })} />
                                        <TextField label="End (YYYY-MM or Present)" value={exp.end_date} onChange={(v) => updateExperience(i, { end_date: v })} />
                                    </div>
                                    <Textarea
                                        rows={3}
                                        placeholder="What did you do there?"
                                        value={exp.description ?? ""}
                                        onChange={(e) => updateExperience(i, { description: e.target.value || null })}
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="text-destructive"
                                        onClick={() => set("experience", form.experience.filter((_, idx) => idx !== i))}
                                    >
                                        <Trash2 className="size-4" /> Remove
                                    </Button>
                                </div>
                            ))}
                            <Button type="button" variant="outline" onClick={() => set("experience", [...form.experience, EMPTY_EXPERIENCE])}>
                                <Plus className="size-4" /> Add experience
                            </Button>
                        </TabsContent>

                        <TabsContent value="education" className="mt-6 space-y-4">
                            {form.education.map((edu, i) => (
                                <div key={i} className="space-y-3 rounded-lg border p-4">
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <TextField label="School" value={edu.school} onChange={(v) => updateEducation(i, { school: v ?? "" })} />
                                        <TextField label="Degree" value={edu.degree} onChange={(v) => updateEducation(i, { degree: v })} />
                                        <TextField label="Field of study" value={edu.field} onChange={(v) => updateEducation(i, { field: v })} />
                                        <TextField label="End year" value={edu.end_date} onChange={(v) => updateEducation(i, { end_date: v })} />
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="text-destructive"
                                        onClick={() => set("education", form.education.filter((_, idx) => idx !== i))}
                                    >
                                        <Trash2 className="size-4" /> Remove
                                    </Button>
                                </div>
                            ))}
                            <Button type="button" variant="outline" onClick={() => set("education", [...form.education, EMPTY_EDUCATION])}>
                                <Plus className="size-4" /> Add education
                            </Button>
                        </TabsContent>

                        <TabsContent value="projects" className="mt-6 space-y-6">
                            <div className="space-y-4">
                                <h3 className="font-medium">Projects</h3>
                                {form.projects.map((project, i) => (
                                    <div key={i} className="space-y-3 rounded-lg border p-4">
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <TextField label={`Project ${i + 1} name`} value={project.name} onChange={(v) => updateProject(i, { name: v ?? "" })} />
                                            <TextField label={`Project ${i + 1} link`} value={project.url} onChange={(v) => updateProject(i, { url: v })} />
                                        </div>
                                        <Textarea
                                            rows={2}
                                            placeholder="What is it and what did you build?"
                                            value={project.description ?? ""}
                                            onChange={(e) => updateProject(i, { description: e.target.value || null })}
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="text-destructive"
                                            onClick={() => set("projects", form.projects.filter((_, idx) => idx !== i))}
                                        >
                                            <Trash2 className="size-4" /> Remove
                                        </Button>
                                    </div>
                                ))}
                                <Button type="button" variant="outline" onClick={() => set("projects", [...form.projects, EMPTY_PROJECT])}>
                                    <Plus className="size-4" /> Add project
                                </Button>
                            </div>

                            <div className="space-y-4">
                                <h3 className="font-medium">Certifications</h3>
                                {form.certifications.map((cert, i) => (
                                    <div key={i} className="grid gap-3 rounded-lg border p-4 sm:grid-cols-[1fr_1fr_140px_auto] sm:items-end">
                                        <TextField label={`Certificate ${i + 1}`} value={cert.name} onChange={(v) => updateCertification(i, { name: v ?? "" })} />
                                        <TextField label={`Issuer ${i + 1}`} value={cert.issuer} onChange={(v) => updateCertification(i, { issuer: v })} />
                                        <TextField label={`Date ${i + 1} (YYYY-MM)`} value={cert.date} onChange={(v) => updateCertification(i, { date: v })} />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            aria-label="Remove certificate"
                                            onClick={() => set("certifications", form.certifications.filter((_, idx) => idx !== i))}
                                        >
                                            <Trash2 className="size-4" />
                                        </Button>
                                    </div>
                                ))}
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => set("certifications", [...form.certifications, EMPTY_CERTIFICATION])}
                                >
                                    <Plus className="size-4" /> Add certification
                                </Button>
                            </div>
                        </TabsContent>

                        <TabsContent value="answers" className="mt-6 space-y-3">
                            <p className="text-sm text-muted-foreground">
                                Answers you gave to application questions. The AI agent reuses them next time.
                            </p>
                            {Object.keys(form.extra_answers).length === 0 && <p className="text-sm">No saved answers yet.</p>}
                            {Object.entries(form.extra_answers).map(([question, answer]) => (
                                <div key={question} className="flex items-start gap-3 rounded-lg border p-3">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium">{question}</p>
                                        <p className="whitespace-pre-wrap text-sm text-muted-foreground">{answer}</p>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        aria-label="Delete answer"
                                        onClick={() => {
                                            const next = { ...form.extra_answers };
                                            delete next[question];
                                            set("extra_answers", next);
                                        }}
                                    >
                                        <Trash2 className="size-4" />
                                    </Button>
                                </div>
                            ))}
                        </TabsContent>
                    </Tabs>

                    <div className="mt-6 flex justify-end">
                        <Button onClick={save} disabled={saving}>
                            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                            Save info
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function TextField({
    label,
    value,
    onChange,
    placeholder,
    disabled,
}: {
    label: string;
    value: string | null;
    onChange: (value: string | null) => void;
    placeholder?: string;
    disabled?: boolean;
}) {
    const id = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    return (
        <div className="space-y-2">
            <Label htmlFor={id}>{label}</Label>
            <Input
                id={id}
                value={value ?? ""}
                placeholder={placeholder}
                disabled={disabled}
                onChange={(e) => onChange(e.target.value || null)}
            />
        </div>
    );
}