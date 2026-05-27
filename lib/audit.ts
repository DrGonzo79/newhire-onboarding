import type { AuditEvent } from "./types";
import { nowIso, uid } from "@/lib/utils";

// ---- Audit Module -------------------------------------------------------
// Records every meaningful event on a new hire. Compliance-sensitive buyers
// need this: every AI action and human decision on someone's paperwork is
// reviewable.

export function auditEvent(
  newHireId: string,
  actor: string,
  action: string,
  details: string
): AuditEvent {
  return {
    id: uid("evt"),
    newHireId,
    actor,
    action,
    details,
    timestamp: nowIso(),
  };
}

export const AUDIT_ACTIONS = {
  IMPORTED: "Imported",
  EXTRACTED: "AI extracted profile",
  VALIDATED: "Readiness check run",
  FIELD_EDITED: "Human edited field",
  EXCEPTION_RESOLVED: "Exception resolved",
  DOC_STATUS: "Document status changed",
  CHECKLIST_UPDATED: "Checklist task updated",
  PAYROLL_SIMULATED: "Payroll setup simulated",
  CHECKLIST_GENERATED: "First-shift checklist generated",
  EMAIL_GENERATED: "Comms draft generated",
  EMAIL_SENT: "Comms sent (simulated)",
  APPROVAL: "Approval recorded",
  MARKED_READY: "Marked ready for day one",
} as const;
