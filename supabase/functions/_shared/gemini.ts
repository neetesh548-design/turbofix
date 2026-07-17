// Gemini AI client for Supabase Edge Functions
// Uses the Gemini REST API directly (no SDK)

import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

interface SummarizeResult {
  summary: string;
  urgency: string;
  ownerSummary: string;
  supervisorSummary: string;
  technicianSummary: string;
}

const getConfig = () => {
  const apiKey = Deno.env.get("GEMINI_API_KEY") ?? "";
  const model = Deno.env.get("GEMINI_MODEL") ?? "gemini-2.5-flash";
  return { apiKey, model };
};

/**
 * Returns true if GEMINI_API_KEY is set.
 */
export function isEnabled(): boolean {
  return !!Deno.env.get("GEMINI_API_KEY");
}

/**
 * Internal helper that calls the Gemini generateContent REST API.
 * Builds the request body with `contents` and optional `systemInstruction`.
 * Returns the text from the first candidate.
 */
async function _callGemini(
  contents: unknown[],
  systemInstruction?: string,
): Promise<string> {
  const { apiKey, model } = getConfig();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  // deno-lint-ignore no-explicit-any
  const requestBody: Record<string, any> = { contents };

  if (systemInstruction) {
    requestBody.systemInstruction = {
      parts: [{ text: systemInstruction }],
    };
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    console.error(
      `Gemini API error: ${res.status}`,
      errorBody,
    );
    throw new Error(
      `Gemini API request failed: ${res.status} ${errorBody}`,
    );
  }

  const data = await res.json();

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== "string") {
    console.error("Gemini API returned unexpected response structure", JSON.stringify(data));
    throw new Error("No text content in Gemini API response");
  }

  return text;
}

/**
 * Converts a Uint8Array to a base64 string using Deno std.
 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  return base64Encode(bytes);
}

/**
 * Transcribes audio using Gemini's multimodal capability.
 * Sends audio as inline base64-encoded data.
 */
export async function transcribeAudio(
  audioBytes: Uint8Array,
  mimeType: string = "audio/ogg",
): Promise<string> {
  const base64Data = uint8ArrayToBase64(audioBytes);

  const contents = [
    {
      parts: [
        {
          inline_data: {
            mime_type: mimeType,
            data: base64Data,
          },
        },
        {
          text: "Transcribe this audio.",
        },
      ],
    },
  ];

  const systemInstruction =
    "Transcribe this audio exactly as spoken. Return only the transcription text, nothing else.";

  return await _callGemini(contents, systemInstruction);
}

/**
 * Analyzes an image using Gemini's vision capability.
 * Sends the image as inline base64-encoded data.
 */
export async function analyzeImage(
  imageBytes: Uint8Array,
  mimeType: string = "image/jpeg",
): Promise<string> {
  const base64Data = uint8ArrayToBase64(imageBytes);

  const contents = [
    {
      parts: [
        {
          inline_data: {
            mime_type: mimeType,
            data: base64Data,
          },
        },
        {
          text: "Analyze this image.",
        },
      ],
    },
  ];

  const systemInstruction =
    "You are an industrial maintenance expert. Analyze this image of a machine or equipment. Describe the visible condition, any damage, wear, or maintenance issues you observe. Be specific and technical.";

  return await _callGemini(contents, systemInstruction);
}

/**
 * Summarizes a reported maintenance issue using Gemini.
 * Returns structured triage information with role-specific summaries.
 */
export async function summarizeIssue(
  issueText: string,
  machineContext?: string,
): Promise<SummarizeResult> {
  const machineBlock = machineContext
    ? `Machine context:\n${machineContext}\n\n`
    : "";

  const prompt = `You are TurboFix, an AI maintenance triage system for Indian MSME factories.

${machineBlock}Reported issue: "${issueText}"

Respond in this exact JSON format:
{
  "summary": "One-line summary of the issue (max 100 chars)",
  "urgency": "critical|high|medium|low",
  "owner_summary": "Cost and business impact focused (1-2 sentences for factory owner)",
  "supervisor_summary": "Production impact and team coordination (1-2 sentences for supervisor)",
  "technician_summary": "Technical details and suggested first action (2-3 sentences for technician)"
}
Respond with ONLY the JSON, no markdown fences.`;

  const contents = [
    {
      parts: [{ text: prompt }],
    },
  ];

  const rawText = await _callGemini(contents);

  try {
    const parsed = JSON.parse(rawText.trim());
    return {
      summary: parsed.summary ?? rawText.substring(0, 100),
      urgency: parsed.urgency ?? "medium",
      ownerSummary: parsed.owner_summary ?? "",
      supervisorSummary: parsed.supervisor_summary ?? "",
      technicianSummary: parsed.technician_summary ?? "",
    };
  } catch (err) {
    console.error("Failed to parse Gemini summarizeIssue response as JSON", err, rawText);
    return {
      summary: rawText.substring(0, 100),
      urgency: "medium",
      ownerSummary: "",
      supervisorSummary: "",
      technicianSummary: "",
    };
  }
}

/**
 * Detects the language of the given text using Gemini.
 * Returns an ISO 639-1 language code (e.g., 'en', 'hi', 'mr', 'ta').
 */
export async function detectLanguage(text: string): Promise<string> {
  const prompt = `Detect the language of this text and respond with ONLY the ISO 639-1 language code (e.g., 'en', 'hi', 'mr', 'ta'). Text: "${text}"`;

  const contents = [
    {
      parts: [{ text: prompt }],
    },
  ];

  const rawText = await _callGemini(contents);
  const code = rawText.trim().replace(/['"]/g, "");

  return code || "en";
}
