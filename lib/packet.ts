import type { ChecklistTask, NewHire, OnboardingDocument } from "./types";
import { validationSummary, estimateReadiness } from "./validation";

// ---- Day-One Packet Module ---------------------------------------------
// Pure builder for the "Ready for Day One" packet — the artifact a manager or
// payroll advisor hands off. Rendered by the packet tab and the printable
// packet route.

export interface ReadinessPacket {
  employeeName: string;
  role: string;
  location: string;
  startDate?: string;
  manager?: string;
  employmentType?: string;
  pay: string;
  readiness: number;
  verdict: "ready" | "blocked";
  blockers: string[];
  documents: Array<{ label: string; status: string; complete: boolean }>;
  checklist: ChecklistTask[];
  outstanding: string[];
  payrollSetupComplete: boolean;
}

function docComplete(doc: OnboardingDocument): boolean {
  return doc.status === "verified" || doc.status === "signed";
}

export function buildReadinessPacket(hire: NewHire): ReadinessPacket {
  const summary = validationSummary(hire.validations);
  const blockers = hire.validations
    .filter((v) => !v.resolved && v.severity === "blocking")
    .map((v) => v.message);

  const outstanding = hire.documents
    .filter((d) => d.required && !docComplete(d))
    .map((d) => d.label);

  const pay =
    hire.payType === "salary"
      ? `$${(hire.payRate ?? 0).toLocaleString()}/yr`
      : hire.payRate
        ? `$${hire.payRate.toFixed(2)}/hr`
        : "—";

  return {
    employeeName: hire.employeeName,
    role: hire.role,
    location: hire.location,
    startDate: hire.startDate,
    manager: hire.manager,
    employmentType: hire.employmentType,
    pay,
    readiness: estimateReadiness(hire),
    verdict: summary.blocking === 0 ? "ready" : "blocked",
    blockers,
    documents: hire.documents.map((d) => ({
      label: d.label,
      status: d.status,
      complete: docComplete(d),
    })),
    checklist: hire.checklist,
    outstanding,
    payrollSetupComplete: hire.approvals.some((a) => a.type === "payroll_setup"),
  };
}
