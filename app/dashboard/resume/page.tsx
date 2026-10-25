import { ExternalLink, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResumeUploader } from "@/components/resume-uploader";
import { requireUser } from "@/lib/auth";
import type { Resume } from "@/lib/types";

export default async function ResumePage() {
    const { supabase, user } = await requireUser();

    const { data } = await supabase
        .from("resumes")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
    const resumes = (data ?? []) as Resume[];

    // Private files need a temporary link (valid 1 hour) to open
    const { data: signed } = resumes.length
        ? await supabase.storage.from("resumes").createSignedUrls(resumes.map((r) => r.file_path), 3600)
        : { data: [] };
    const linkByPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));

    return (
        <div className="mx-auto max-w-3xl space-y-6">
            <div>
                <h1 className="text-3xl font-semibold text-truffle">Resume</h1>
                <p className="text-muted-foreground">The most recent resume is attached to every AI application.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Upload a new resume</CardTitle>
                    <CardDescription>AI will read it again and update your profile.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ResumeUploader />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Your resumes</CardTitle>
                </CardHeader>
                <CardContent className="divide-y">
                    {resumes.length === 0 && <p className="text-sm text-muted-foreground">No resumes yet.</p>}
                    {resumes.map((resume, index) => (
                        <div key={resume.id} className="flex items-center gap-3 py-3">
                            <FileText className="size-5 shrink-0 text-muted-foreground" />
                            <div className="min-w-0 flex-1">
                                <p className="truncate font-medium">{resume.file_name}</p>
                                <p className="text-xs text-muted-foreground">
                                    {/* Newest first, so the oldest file is v1 */}
                                    v{resumes.length - index} · {resume.mime_type === "application/pdf" ? "PDF" : "DOCX"}
                                    {resume.file_size ? ` · ${formatSize(resume.file_size)}` : ""} · Uploaded{" "}
                                    {new Date(resume.created_at).toLocaleString("en-AU")}
                                </p>
                            </div>
                            {index === 0 ? <Badge>Active</Badge> : <Badge variant="outline">Old</Badge>}
                            {linkByPath.get(resume.file_path) && (
                                <Button variant="ghost" size="icon" asChild>
                                    <a href={linkByPath.get(resume.file_path)!} target="_blank" rel="noreferrer" aria-label="Open resume">
                                        <ExternalLink className="size-4" />
                                    </a>
                                </Button>
                            )}
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    );
}

// 524288 -> "512 KB"
function formatSize(bytes: number) {
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}