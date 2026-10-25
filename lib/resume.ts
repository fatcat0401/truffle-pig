import "server-only";
import mammoth from "mammoth";
import { Type, type Part, type Schema } from "@google/genai";
import { generateJson } from "@/lib/gemini";
import type { Certification, Education, Experience, Project } from "@/lib/types";

export type ParsedResume = {
    full_name: string | null;
    email: string | null;
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
};

const text = { type: Type.STRING, nullable: true };

const experienceSchema: Schema = {
    type: Type.OBJECT,
    properties: {
        company: { type: Type.STRING },
        title: { type: Type.STRING },
        location: text,
        start_date: text,
        end_date: text,
        description: text,
    },
    required: ["company", "title", "location", "start_date", "end_date", "description"],
};

const educationSchema: Schema = {
    type: Type.OBJECT,
    properties: {
        school: { type: Type.STRING },
        degree: text,
        field: text,
        start_date: text,
        end_date: text,
    },
    required: ["school", "degree", "field", "start_date", "end_date"],
};

const projectSchema: Schema = {
    type: Type.OBJECT,
    properties: { name: { type: Type.STRING }, description: text, url: text },
    required: ["name", "description", "url"],
};

const certificationSchema: Schema = {
    type: Type.OBJECT,
    properties: { name: { type: Type.STRING }, issuer: text, date: text },
    required: ["name", "issuer", "date"],
};

const resumeSchema: Schema = {
    type: Type.OBJECT,
    properties: {
        full_name: text,
        email: text,
        phone: text,
        location: text,
        headline: text,
        summary: text,
        linkedin_url: text,
        github_url: text,
        portfolio_url: text,
        skills: { type: Type.ARRAY, items: { type: Type.STRING } },
        experience: { type: Type.ARRAY, items: experienceSchema },
        education: { type: Type.ARRAY, items: educationSchema },
        projects: { type: Type.ARRAY, items: projectSchema },
        certifications: { type: Type.ARRAY, items: certificationSchema },
    },
    required: [
        "full_name", "email", "phone", "location", "headline", "summary",
        "linkedin_url", "github_url", "portfolio_url", "skills", "experience", "education",
        "projects", "certifications",
    ],
};

const INSTRUCTIONS = `You are a careful HR assistant. Extract the candidate's details from the resume.
Rules:
- Use null for anything that is not in the resume. Never invent data.
- headline = the candidate's current or most recent job title.
- summary = 2-4 sentences in first person, based only on the resume.
- skills = short names (1-3 words each), most important first, max 30.
- Dates as "YYYY-MM" (or "YYYY"); use "Present" for a current job.
- URLs must be full URLs starting with https://
- projects = personal or work projects listed on the resume (max 10), description max 2 sentences.
- certifications = licences and certificates (e.g. "AWS Certified Developer"), max 10.`;

export async function parseResume(buffer: Buffer, mimeType: string): Promise<ParsedResume> {
    let parts: Part[];

    if (mimeType === "application/pdf") {
        // Gemini can read PDFs directly
        parts = [{ text: INSTRUCTIONS }, { inlineData: { mimeType, data: buffer.toString("base64") } }];
    } else {
        // DOCX: pull out the plain text first
        const { value } = await mammoth.extractRawText({ buffer });
        parts = [{ text: `${INSTRUCTIONS}\n\nRESUME TEXT:\n${value}` }];
    }

    return generateJson<ParsedResume>(parts, resumeSchema);
}