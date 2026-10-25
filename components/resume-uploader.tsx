"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ACCEPTED = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const MAX_BYTES = 4 * 1024 * 1024;

export function ResumeUploader() {
    const router = useRouter();
    const inputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [dragging, setDragging] = useState(false);
    const [fileName, setFileName] = useState<string | null>(null);

    async function upload(file: File) {
        if (!ACCEPTED.includes(file.type)) return toast.error("Please upload a PDF or DOCX file.");
        if (file.size > MAX_BYTES) return toast.error("File must be smaller than 4 MB.");

        setFileName(file.name);
        setUploading(true);
        const body = new FormData();
        body.append("file", file);

        try {
            const res = await fetch("/api/resume", { method: "POST", body });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? "Upload failed");
            toast.success("Resume parsed! Your profile is updated.");
            router.refresh(); // reload server data (closes the onboarding modal)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Upload failed");
        } finally {
            setUploading(false);
            if (inputRef.current) inputRef.current.value = "";
        }
    }

    return (
        <div
            onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const file = e.dataTransfer.files?.[0];
                if (file && !uploading) upload(file);
            }}
            className={cn(
                "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition-colors",
                dragging ? "border-primary bg-primary/5" : "border-muted-foreground/25",
            )}
        >
            {uploading ? (
                <>
                    <Loader2 className="size-10 animate-spin text-primary" />
                    <p className="font-medium">AI is reading {fileName}…</p>
                    <p className="text-sm text-muted-foreground">This usually takes 10–20 seconds.</p>
                </>
            ) : (
                <>
                    <UploadCloud className="size-10 text-muted-foreground" />
                    <p className="font-medium">Drag your resume here</p>
                    <p className="text-sm text-muted-foreground">PDF or DOCX, max 4 MB</p>
                    <Button type="button" onClick={() => inputRef.current?.click()}>
                        Choose file
                    </Button>
                </>
            )}
            <input
                ref={inputRef}
                type="file"
                accept=".pdf,.docx"
                className="hidden"
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) upload(file);
                }}
            />
        </div>
    );
}