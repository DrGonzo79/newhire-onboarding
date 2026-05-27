import { runExtraction } from "@/lib/extraction";
import { validateNewHire, estimateReadiness } from "@/lib/validation";
import { DOC_LABELS, requiredDocsFor } from "@/lib/mockData";
import type {
  NewHire,
  OnboardingDocument,
  SourceType,
} from "@/lib/types";

// Builds a NewHire from raw offer text using the real extraction pipeline,
// without touching the in-memory store. Mirrors the store's assemble logic so
// tests stay isolated.
export function makeHire(
  text: string,
  sourceType: SourceType = "offer_email"
): NewHire {
  const ex = runExtraction({ sourceType, text });
  const required = requiredDocsFor(ex.role, ex.location);
  const documents: OnboardingDocument[] = required.map((type) => {
    const signal = ex.documents.find((d) => d.type === type);
    return {
      id: `doc-${type}`,
      type,
      label: DOC_LABELS[type],
      required: true,
      status: signal?.status ?? "not_sent",
      confidence: signal?.confidence ?? 0,
    };
  });

  const hire: NewHire = {
    id: "test-hire",
    sourceType,
    sourceText: text,
    employeeName: ex.employeeName,
    role: ex.role ?? "",
    location: ex.location ?? "",
    employmentType: ex.employmentType,
    payType: ex.payType,
    payRate: ex.payRate,
    startDate: ex.startDate,
    manager: ex.manager,
    email: ex.email,
    phone: ex.phone,
    ssnLast4: ex.ssnLast4,
    status: "Collecting Docs",
    documents,
    checklist: [],
    validations: [],
    auditEvents: [],
    agentSteps: [],
    fieldConfidence: ex.fieldConfidence,
    readiness: 0,
    assignedCoordinator: "Test Coordinator",
    approvals: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  hire.readiness = estimateReadiness(hire);
  return hire;
}

export function validatedHire(text: string): NewHire {
  const hire = makeHire(text);
  hire.validations = validateNewHire(hire);
  return hire;
}

export function codes(hire: NewHire): string[] {
  return hire.validations.map((v) => v.code);
}
