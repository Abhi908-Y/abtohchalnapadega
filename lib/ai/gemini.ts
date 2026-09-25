import "server-only";
import { GoogleGenAI } from "@google/genai";
import { env } from "@/lib/env";
import { buildPrompt, RESPONSE_JSON_SCHEMA, SYSTEM_INSTRUCTION } from "./prompt";
import type { Suggester } from "./types";

let client: GoogleGenAI | null = null;

export const geminiSuggester: Suggester = async (input, feedback) => {
  client ??= new GoogleGenAI({ apiKey: env.geminiApiKey });
  const response = await client.models.generateContent({
    model: env.geminiModel,
    contents: buildPrompt(input, feedback),
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseJsonSchema: RESPONSE_JSON_SCHEMA,
      temperature: 0.3,
    },
  });
  const text = response.text;
  if (!text) throw new Error("Gemini returned an empty response");
  try {
    return JSON.parse(text);
  } catch {
    // Let validation report it and trigger the retry.
    return { __unparseable: text.slice(0, 200) };
  }
};
