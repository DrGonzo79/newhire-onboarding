import Anthropic from "@anthropic-ai/sdk";
import type {
  DocStatus,
  DocumentType,
  EmploymentType,
  ExtractedDocumentSignal,
  ExtractionInput,
  ExtractionProvider,
  ExtractionResult,
  FieldConfidence,
  PayType,
} from "./types";
import { LOCATIONS, ROLES } from "./mockData";

// ---- LLM Extraction Provider -------------------------------------------
// Real Claude-based extraction. Implements the same `ExtractionProvider`
// contract as the mock parser so it can be swapped in transparently. The
// caller (extractNewHire in extraction.ts) falls back to the mock parser if no
// API key is configured or the call fails.

const DEFAULT_MODEL = "claude-opus-4-7";

// Static reference block — kept first and stable so it can be prompt-cached.
const CATALOG = `Known roles (map the offer to the closest role title):
${ROLES.map((r) => `- ${r.title} (${r.payType}${r.requiresBackgroundCheck ? ", background check required" : ""})`).join("\n")}

Known locations (map to the closest location name):
${LOCATIONS.map((l) => `- ${l.name} (${l.state})`).join("\n")}`;

const SYSTEM_PROMPT = `You are an onboarding-intake extraction engine for a multi-unit SMB employer. You read accepted-offer emails or onboarding forms and extract a structured new-hire profile for downstream paperwork validation.

${CATALOG}

Rules:
- Map the role to a known role title above when you can; otherwise return the best literal title.
- Map the location to a known location name above when you can; otherwise return it literally.
- payType is "hourly" or "salary". payRate is the numeric amount (hourly wage or annual salary), no currency symbols.
- startDate must be ISO YYYY-MM-DD; omit it entirely if no start date is stated.
- ssnLast4 is the last 4 digits of the SSN only, if present.
- For documents, report each onboarding document the text mentions and its status: "signed" if the candidate has completed/returned it, "not_sent" if it is listed as still needed/outstanding, "needs_correction" if it was rejected. documentType is one of: i9, w4, direct_deposit, handbook, background_check, emergency_contact, state_tax.
- Provide a confidence score from 0.0 to 1.0 for each extracted field, lower (below 0.8) for ambiguous, messy, or inferred values.
- Only call the submit_new_hire tool. Do not write prose.`;

const EXTRACTION_TOOL: Anthropic.Tool = {
  name: "submit_new_hire",
  description: "Submit the structured data extracted from the accepted offer / onboarding form.",
  input_schema: {
    type: "object",
    properties: {
      employeeName: { type: "string" },
      role: { type: "string" },
      location: { type: "string" },
      employmentType: {
        type: "string",
        enum: ["full_time", "part_time", "seasonal", "contractor"],
      },
      payType: { type: "string", enum: ["hourly", "salary"] },
      payRate: { type: "number" },
      startDate: { type: "string", description: "ISO YYYY-MM-DD; omit if absent" },
      manager: { type: "string" },
      email: { type: "string" },
      phone: { type: "string" },
      ssnLast4: { type: "string", description: "last 4 digits only" },
      documents: {
        type: "array",
        items: {
          type: "object",
          properties: {
            documentType: {
              type: "string",
              enum: [
                "i9",
                "w4",
                "direct_deposit",
                "handbook",
                "background_check",
                "emergency_contact",
                "state_tax",
              ],
            },
            status: {
              type: "string",
              enum: ["not_sent", "sent", "signed", "needs_correction", "verified"],
            },
            confidence: { type: "number" },
          },
          required: ["documentType", "status"],
        },
      },
      fieldConfidence: {
        type: "object",
        description: "0.0-1.0 confidence per field that was extracted",
        properties: {
          employeeName: { type: "number" },
          role: { type: "number" },
          location: { type: "number" },
          employmentType: { type: "number" },
          payRate: { type: "number" },
          startDate: { type: "number" },
          manager: { type: "number" },
          email: { type: "number" },
          phone: { type: "number" },
          ssnLast4: { type: "number" },
        },
      },
    },
    required: ["employeeName", "fieldConfidence"],
  },
};

interface ToolInput {
  employeeName: string;
  role?: string;
  location?: string;
  employmentType?: EmploymentType;
  payType?: PayType;
  payRate?: number;
  startDate?: string;
  manager?: string;
  email?: string;
  phone?: string;
  ssnLast4?: string;
  documents?: Array<{
    documentType: DocumentType;
    status: DocStatus;
    confidence?: number;
  }>;
  fieldConfidence?: Record<string, number>;
}

const OPTIONAL_FIELDS = [
  "role",
  "location",
  "employmentType",
  "payRate",
  "startDate",
  "manager",
  "email",
  "phone",
  "ssnLast4",
] as const;

function clampConfidence(n: number | undefined): number {
  if (typeof n !== "number" || Number.isNaN(n)) return 0.5;
  return Math.max(0, Math.min(1, Number(n.toFixed(2))));
}

function toResult(input: ToolInput): ExtractionResult {
  const fieldConfidence: FieldConfidence = {
    employeeName: input.fieldConfidence?.employeeName ?? 0.9,
  };
  // Absent optional fields get confidence 0, matching the mock parser so the
  // UI flags them as "Missing".
  for (const field of OPTIONAL_FIELDS) {
    const present =
      input[field] != null && String(input[field]).trim() !== "";
    fieldConfidence[field] = present
      ? input.fieldConfidence?.[field] ?? 0.85
      : 0;
  }

  const documents: ExtractedDocumentSignal[] = (input.documents ?? []).map(
    (d) => ({
      type: d.documentType,
      status: d.status,
      confidence: clampConfidence(d.confidence),
    })
  );

  return {
    employeeName: input.employeeName,
    role: input.role || undefined,
    location: input.location || undefined,
    employmentType: input.employmentType || undefined,
    payType: input.payType || undefined,
    payRate:
      typeof input.payRate === "number" && !Number.isNaN(input.payRate)
        ? input.payRate
        : undefined,
    startDate: input.startDate || undefined,
    manager: input.manager || undefined,
    email: input.email || undefined,
    phone: input.phone || undefined,
    ssnLast4: input.ssnLast4 ? String(input.ssnLast4).slice(-4) : undefined,
    documents,
    fieldConfidence,
  };
}

export class LlmExtractionProvider implements ExtractionProvider {
  name: string;
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model = DEFAULT_MODEL) {
    this.client = new Anthropic({ apiKey });
    this.model = model;
    this.name = `claude-extraction (${model})`;
  }

  // The base ExtractionProvider.extract is sync; the LLM path is async and
  // consumed via extractAsync below.
  extract(): never {
    throw new Error("Use extractAsync() for the async LLM provider.");
  }

  async extractAsync(input: ExtractionInput): Promise<ExtractionResult> {
    const content = this.buildUserContent(input);
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 1536,
      tools: [EXTRACTION_TOOL],
      tool_choice: { type: "tool", name: EXTRACTION_TOOL.name },
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content }],
    });

    const toolUse = response.content.find((b) => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      throw new Error("Model did not return structured extraction");
    }
    return toResult(toolUse.input as ToolInput);
  }

  // Build the user message: an attached PDF/image document when a file is
  // provided (real OCR/vision), otherwise the pasted/raw offer text.
  private buildUserContent(
    input: ExtractionInput
  ): Anthropic.ContentBlockParam[] {
    const instruction = `Extract the new-hire profile from the attached ${input.sourceType} content.`;
    if (input.file) {
      const { mediaType, dataBase64 } = input.file;
      if (mediaType === "application/pdf") {
        return [
          {
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: dataBase64 },
          },
          { type: "text", text: instruction },
        ];
      }
      if (mediaType.startsWith("image/")) {
        return [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType as "image/png" | "image/jpeg" | "image/gif" | "image/webp",
              data: dataBase64,
            },
          },
          { type: "text", text: instruction },
        ];
      }
    }
    return [{ type: "text", text: `${instruction}\n\n${input.text}` }];
  }
}

let cached: LlmExtractionProvider | null | undefined;

export function getLlmProvider(): LlmExtractionProvider | null {
  if (cached !== undefined) return cached;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    cached = null;
    return null;
  }
  const model = process.env.NEWHIRE_EXTRACTION_MODEL || DEFAULT_MODEL;
  cached = new LlmExtractionProvider(apiKey, model);
  return cached;
}
