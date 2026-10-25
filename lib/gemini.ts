import "server-only";
import { GoogleGenAI, type Part, type Schema } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const MODEL = process.env.GEMINI_MODEL ?? "gemini-3.8-flash";

// Ask Gemini and force the answer into the given JSON shape.
export async function generateJson<T>(parts: Part[], schema: Schema): Promise<T> {
    const response = await ai.models.generateContent({
        model: MODEL,
        contents: [{ role: "user", parts }],
        config: {
            responseMimeType: "application/json",
            responseSchema: schema,
            temperature: 0.2,
        },
    });

    const text = response.text;
    if (!text) throw new Error("Gemini returned an empty response");
    return JSON.parse(text) as T;
}