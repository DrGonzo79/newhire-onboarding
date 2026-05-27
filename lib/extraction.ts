import type {
  DocStatus,
  DocumentType,
  EmploymentType,
  ExtractedDocumentSignal,
  ExtractionInput,
  ExtractionProvider,
  ExtractionResult,
  PayType,
} from "./types";
import { findLocation, findRole } from "./mockData";
import { CONFIDENCE_THRESHOLD, isLowConfidence } from "@/lib/confidence";

// ---- Extraction Module --------------------------------------------------
// Converts a raw accepted-offer email / onboarding form into a structured
// employee profile. For the prototype this is a deterministic regex/heuristic
// parser. The `ExtractionProvider` interface lets a real LLM/OCR provider
// replace `MockExtractionProvider` without touching any consumer code.

export { CONFIDENCE_THRESHOLD, isLowConfidence };

function firstMatch(text: string, patterns: RegExp[]): string | undefined {
  for (const p of patterns) {
    const m = text.match(p);
    if (m && m[1]) return m[1].trim();
  }
  return undefined;
}

function parseEmploymentType(raw?: string): EmploymentType | undefined {
  if (!raw) return undefined;
  const v = raw.toLowerCase();
  if (v.includes("full")) return "full_time";
  if (v.includes("part")) return "part_time";
  if (v.includes("season")) return "seasonal";
  if (v.includes("contract") || v.includes("1099")) return "contractor";
  return undefined;
}

// Parse "Pay: $16.50/hour" or "$52,000/year" or "18/hr" into a type + rate.
function parsePay(text: string): {
  payType?: PayType;
  payRate?: number;
  confidence: number;
} {
  const line = firstMatch(text, [
    /(?:pay|wage|rate|compensation|salary)\s*[:]?\s*(.+)/i,
  ]);
  if (!line) return { confidence: 0 };
  const amountMatch = line.match(/\$?\s*([\d,]+(?:\.\d+)?)/);
  if (!amountMatch) return { confidence: 0 };
  const rate = Number(amountMatch[1].replace(/,/g, ""));
  const lower = line.toLowerCase();
  let payType: PayType | undefined;
  if (/hour|\/hr|hourly/.test(lower)) payType = "hourly";
  else if (/year|annual|salary|\/yr/.test(lower)) payType = "salary";
  else payType = rate > 1000 ? "salary" : "hourly"; // heuristic fallback
  return { payType, payRate: rate, confidence: 0.92 };
}

// Map a free-text document name to a canonical DocumentType.
const DOC_KEYWORDS: Array<{ type: DocumentType; re: RegExp }> = [
  { type: "i9", re: /\bi-?9\b|employment eligibility/i },
  { type: "w4", re: /\bw-?4\b|federal withholding/i },
  { type: "direct_deposit", re: /direct deposit|ach|bank(ing)? info/i },
  { type: "handbook", re: /handbook|policy acknowledg/i },
  { type: "background_check", re: /background check|bgc|screening/i },
  { type: "emergency_contact", re: /emergency contact/i },
  { type: "state_tax", re: /state (?:tax|withholding)/i },
];

function matchDocTypes(segment: string): DocumentType[] {
  const found = new Set<DocumentType>();
  for (const { type, re } of DOC_KEYWORDS) {
    if (re.test(segment)) found.add(type);
  }
  return [...found];
}

// Detect which documents the offer says are already done vs still outstanding.
function parseDocumentSignals(text: string): ExtractedDocumentSignal[] {
  const signals: ExtractedDocumentSignal[] = [];

  const onFile = firstMatch(text, [
    /(?:documents? on file|completed|received|signed)\s*[:]?\s*(.+)/i,
  ]);
  if (onFile) {
    for (const type of matchDocTypes(onFile)) {
      signals.push({ type, status: "signed", confidence: 0.9 });
    }
  }

  const stillNeeded = firstMatch(text, [
    /(?:still needed|outstanding|pending|missing)\s*[:]?\s*(.+)/i,
  ]);
  if (stillNeeded) {
    for (const type of matchDocTypes(stillNeeded)) {
      // Don't override an "on file" signal for the same doc.
      if (!signals.some((s) => s.type === type)) {
        signals.push({ type, status: "not_sent", confidence: 0.9 });
      }
    }
  }

  return signals;
}

export class MockExtractionProvider implements ExtractionProvider {
  name = "mock-offer-parser-v1";

  extract(input: ExtractionInput): ExtractionResult {
    const text = input.text || "";

    const fromLine = text.match(/^From:\s*([A-Za-z .'-]+?)\s*<([^>]+)>/im);

    // Employee name: explicit label, else the offer subject "— Name, Role".
    let employeeName = firstMatch(text, [
      /(?:employee|new hire|candidate|name)\s*[:]?\s*([A-Za-z][A-Za-z .'-]{2,40})/i,
    ]);
    let nameConfidence = employeeName ? 0.95 : 0;
    if (!employeeName) {
      const subj = text.match(/subject:.*?[—-]\s*([A-Za-z][A-Za-z .'-]{2,40})/i);
      if (subj) {
        employeeName = subj[1].split(",")[0].trim();
        nameConfidence = 0.6;
      }
    }
    if (!employeeName) {
      employeeName = "Unknown Employee";
      nameConfidence = 0.2;
    }

    const roleRaw = firstMatch(text, [
      /(?:role|position|title|job)\s*[:]?\s*([A-Za-z][A-Za-z /&-]{2,40})/i,
    ]);
    const role = findRole(roleRaw)?.title ?? roleRaw;

    const locationRaw = firstMatch(text, [
      /(?:location|store|site|unit|branch)\s*[:]?\s*(.+)/i,
    ]);
    const location = findLocation(locationRaw)?.name ?? locationRaw;

    const employmentType = parseEmploymentType(
      firstMatch(text, [/(?:employment type|status|type)\s*[:]?\s*(.+)/i])
    );

    const pay = parsePay(text);

    const startDate = firstMatch(text, [
      /(?:start date|first day|begins?|onboard(?:ing)? date)\s*[:]?\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/i,
    ]);

    const manager = firstMatch(text, [
      /(?:manager|supervisor|reports? to)\s*[:]?\s*([A-Za-z][A-Za-z .'-]{2,40})/i,
    ]);

    const emailFromLabel = firstMatch(text, [
      /(?:email|e-mail)\s*[:]?\s*([\w.+-]+@[\w.-]+\.\w+)/i,
    ]);
    const email = emailFromLabel ?? fromLine?.[2]?.trim();

    const phone = firstMatch(text, [
      /(?:phone|mobile|cell|tel)\s*[:]?\s*([\d().+\- ]{7,20})/i,
    ]);

    const ssnLast4 = firstMatch(text, [
      /ssn[^0-9]*?(?:last\s*4[^0-9]*)?(\d{4})\b/i,
    ]);

    const documents = parseDocumentSignals(text);

    const fieldConfidence: Record<string, number> = {
      employeeName: nameConfidence,
      role: role ? (findRole(roleRaw) ? 0.95 : 0.6) : 0,
      location: location ? (findLocation(locationRaw) ? 0.95 : 0.55) : 0,
      employmentType: employmentType ? 0.9 : 0,
      payRate: pay.confidence,
      startDate: startDate ? 0.96 : 0,
      manager: manager ? 0.9 : 0,
      email: email ? 0.95 : 0,
      phone: phone ? 0.9 : 0,
      ssnLast4: ssnLast4 ? 0.95 : 0,
    };

    return {
      employeeName,
      role,
      location,
      employmentType,
      payType: pay.payType,
      payRate: pay.payRate,
      startDate,
      manager,
      email,
      phone: phone?.trim(),
      ssnLast4,
      documents,
      fieldConfidence,
    };
  }
}

export const extractionProvider: ExtractionProvider = new MockExtractionProvider();

// Synchronous mock extraction. Used by tests, by the seed data, and as the
// fallback when the LLM provider is unavailable or errors.
export function runExtraction(input: ExtractionInput): ExtractionResult {
  return extractionProvider.extract(input);
}

export interface ExtractionOutcome {
  result: ExtractionResult;
  provider: string;
}

// Production extraction path: use the Claude LLM provider when an API key is
// configured, otherwise fall back to the deterministic mock parser. Any LLM
// error also falls back, so the prototype always produces a result.
export async function extractNewHire(
  input: ExtractionInput
): Promise<ExtractionOutcome> {
  const { getLlmProvider } = await import("./extractionLlm");
  const provider = getLlmProvider();
  if (provider) {
    try {
      const result = await provider.extractAsync(input);
      if (result.employeeName && result.employeeName !== "Unknown Employee") {
        return { result, provider: provider.name };
      }
      console.warn(
        "[newhire/extraction] LLM returned no employee; using mock parser."
      );
    } catch (err) {
      console.warn(
        `[newhire/extraction] LLM extraction failed, falling back to mock parser: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  }
  return {
    result: runExtraction(input),
    provider: extractionProvider.name,
  };
}

export function averageConfidence(result: ExtractionResult): number {
  const scores = Object.values(result.fieldConfidence).filter((v) => v > 0);
  if (!scores.length) return 0;
  return Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(3));
}
