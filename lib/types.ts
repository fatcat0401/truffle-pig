export type Platform = "greenhouse" | "lever" | "workable" | "linkedin";

export type PlatformKind = "ats" | "board";

export const PLATFORMS: { id: Platform; label: string; kind: PlatformKind }[] = [
    { id: "linkedin", label: "LinkedIn", kind: "board" },
    { id: "greenhouse", label: "Greenhouse", kind: "ats" },
    { id: "lever", label: "Lever", kind: "ats" },
    { id: "workable", label: "Workable", kind: "ats" },
];

export function canAutoApply(platform: Platform) {
    return PLATFORMS.find((p) => p.id === platform)?.kind === "ats";
}


export type Experience = {
    company: string;
    title: string;
    location: string | null;
    start_date: string | null;
    end_date: string | null;
    description: string | null;
};

export type Education = {
    school: string;
    degree: string | null;
    field: string | null;
    start_date: string | null;
    end_date: string | null;
};

export type Project = {
    name: string;
    description: string | null;
    url: string | null;
};

export type Certification = {
    name: string;
    issuer: string | null;
    date: string | null;
};

export type Profile = {
    id: string;
    email: string | null;
    full_name: string | null;
    phone: string | null;
    location: string | null;
    headline: string | null;
    summary: string | null;
    linkedin_url: string | null;
    github_url: string | null;
    portfolio_url: string | null;
    skills: string[];
    experience: Experience[];
    education: Education[];
    projects: Project[];
    certifications: Certification[];
    extra_answers: Record<string, string>;
    completeness: number;
    plan: "free" | "pro";
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
    subscription_status: string | null;
};

export type Resume = {
    id: string;
    user_id: string;
    file_path: string;
    file_name: string;
    mime_type: string;
    file_size: number | null;
    created_at: string;
};

export type Job = {
    id: string;
    query_key: string;
    platform: Platform;
    title: string;
    company: string | null;
    location: string | null;
    url: string;
    description: string | null;
    posted_at: string | null;
    company_logo: string | null;
    // Filled from the careers-site API after someone opens "Details" (Bước 9.5)
    salary: string | null;
    job_type: string | null;
    experience_level: string | null;
    tags: string[];
    details_fetched_at: string | null;
    last_fetched_at: string;
};

// Job + extra info computed for the current user
export type JobWithMatch = Job & { match: number; matchedSkills: string[] };

export type ApplicationStatus =
    | "queued"
    | "detecting_fields"
    | "missing_info"
    | "in_progress"
    | "submitted"
    | "dry_run_complete"
    | "failed";

export type FieldOption = { label: string; value: string; selector?: string };

// One input/select/textarea found on an application form
export type FormField = {
    key: string;
    selector: string;
    label: string;
    type: string; // text, email, tel, url, textarea, select, radio, checkbox, file ...
    required: boolean;
    options: FieldOption[];
};

export type MissingField = Pick<FormField, "key" | "label" | "type" | "required" | "options">;

export type JobApplication = {
    id: string;
    user_id: string;
    job_id: string | null;
    job_title: string;
    company: string | null;
    platform: Platform;
    job_url: string;
    status: ApplicationStatus;
    detected_fields: FormField[];
    missing_fields: MissingField[];
    answers: Record<string, string>;
    browserbase_session_id: string | null;
    error: string | null;
    submitted_at: string | null;
    created_at: string;
    updated_at: string;
};

export type ActivityType = "search" | "save" | "apply" | "profile" | "resume";

export type Activity = {
    id: string;
    type: ActivityType;
    message: string;
    created_at: string;
};

export type BillingRecord = {
    id: string;
    stripe_invoice_id: string;
    amount: number;
    currency: string;
    status: string;
    invoice_url: string | null;
    created_at: string;
};