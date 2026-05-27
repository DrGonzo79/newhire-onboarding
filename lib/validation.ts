import type {
  DocStatus,
  DocumentType,
  NewHire,
  OnboardingDocument,
  Severity,
  ValidationResult,
} from "./types";
import {
  DOC_LABELS,
  EXISTING_EMPLOYEES,
  findLocation,
  findRole,
  minWageFor,
} from "./mockData";
import { CONFIDENCE_THRESHOLD } from "@/lib/confidence";

// ---- Validation Module --------------------------------------------------
// Pure readiness-rules engine. Input: a new hire (with its required-document
// list already assembled) + mock HR reference data. Output: a list of
// validation results. No I/O, no mutation — trivially testable in isolation.

function v(
  severity: Severity,
  code: string,
  fieldPath: string,
  message: string,
  suggestedFix: string
): ValidationResult {
  return {
    id: `${code}:${fieldPath}`,
    severity,
    code,
    message,
    suggestedFix,
    fieldPath,
    resolved: false,
  };
}

// A document counts as "complete" once the employee has signed it and the
// employer side is verified where that matters.
function isComplete(status: DocStatus): boolean {
  return status === "verified" || status === "signed";
}

// Per-document rule: returns a validation if the required doc is not yet in an
// acceptable state, otherwise null.
function documentRule(doc: OnboardingDocument): ValidationResult | null {
  if (!doc.required) return null;
  const path = `document.${doc.id}`;
  const label = doc.label;

  if (doc.status === "needs_correction") {
    return v(
      "warning",
      "DOC_NEEDS_CORRECTION",
      path,
      `${label} was returned for correction.`,
      "Contact the employee to fix and re-submit the document."
    );
  }

  switch (doc.type) {
    case "i9":
      if (!isComplete(doc.status)) {
        return v(
          "blocking",
          "MISSING_I9",
          path,
          "Form I-9 is not yet signed — federal law requires it by day one.",
          "Send the I-9 and verify the employee's work-authorization documents in person."
        );
      }
      if (doc.status === "signed") {
        return v(
          "warning",
          "I9_SECTION2_INCOMPLETE",
          path,
          "Form I-9 employee section is signed but employer Section 2 is not verified.",
          "Complete I-9 Section 2 within 3 business days of the start date."
        );
      }
      return null;
    case "w4":
      return isComplete(doc.status)
        ? null
        : v(
            "blocking",
            "MISSING_W4",
            path,
            "Form W-4 is not signed — payroll cannot withhold correctly without it.",
            "Send the W-4 for e-signature before the first payroll run."
          );
    case "direct_deposit":
      return isComplete(doc.status)
        ? null
        : v(
            "blocking",
            "MISSING_DIRECT_DEPOSIT",
            path,
            "Direct deposit is not set up — the first paycheck cannot be issued.",
            "Collect a voided check or bank details and complete the prenote."
          );
    case "background_check":
      return doc.status === "verified"
        ? null
        : v(
            "blocking",
            "BACKGROUND_CHECK_PENDING",
            path,
            "Background check is required for this role and is not yet cleared.",
            "Initiate the screening and hold the start date until it clears."
          );
    case "handbook":
      return isComplete(doc.status)
        ? null
        : v(
            "warning",
            "HANDBOOK_NOT_ACKNOWLEDGED",
            path,
            "Employee handbook acknowledgement is outstanding.",
            "Send the handbook and request an e-signed acknowledgement."
          );
    case "emergency_contact":
      return isComplete(doc.status)
        ? null
        : v(
            "warning",
            "MISSING_EMERGENCY_CONTACT",
            path,
            "No emergency contact is on file.",
            "Request an emergency contact before the first shift."
          );
    case "state_tax":
      return isComplete(doc.status)
        ? null
        : v(
            "warning",
            "MISSING_STATE_TAX",
            path,
            "State withholding form is outstanding for this work state.",
            "Send the state withholding form for completion."
          );
    default:
      return null;
  }
}

export function validateNewHire(hire: NewHire): ValidationResult[] {
  const results: ValidationResult[] = [];

  // ---- Profile-level rules ----
  if (!findRole(hire.role)) {
    results.push(
      v(
        "warning",
        "UNKNOWN_ROLE",
        "profile.role",
        `"${hire.role || "(none)"}" does not match a known role.`,
        "Map this hire to a defined role so pay and required docs are correct."
      )
    );
  }

  if (!findLocation(hire.location)) {
    results.push(
      v(
        "warning",
        "UNKNOWN_LOCATION",
        "profile.location",
        `"${hire.location || "(none)"}" does not match a known location.`,
        "Assign the hire to a known work location."
      )
    );
  }

  if (!hire.startDate) {
    results.push(
      v(
        "warning",
        "MISSING_START_DATE",
        "profile.startDate",
        "No start date is set for this hire.",
        "Confirm the first day with the manager and set the start date."
      )
    );
  } else if (
    hire.status !== "Onboarded" &&
    new Date(hire.startDate).getTime() < Date.now() &&
    !Number.isNaN(new Date(hire.startDate).getTime())
  ) {
    results.push(
      v(
        "blocking",
        "START_DATE_IN_PAST",
        "profile.startDate",
        `The start date (${hire.startDate}) has already passed but the hire is not onboarded.`,
        "The employee may be working without complete paperwork — finish onboarding immediately or reset the start date."
      )
    );
  }

  if (!hire.ssnLast4) {
    results.push(
      v(
        "blocking",
        "MISSING_SSN",
        "profile.ssnLast4",
        "No SSN is on file — required for I-9, W-4, and payroll setup.",
        "Collect the SSN securely from the employee."
      )
    );
  }

  // Duplicate-hire detection against the HRIS.
  const dupe = EXISTING_EMPLOYEES.find(
    (e) =>
      (hire.email && e.email.toLowerCase() === hire.email.toLowerCase()) ||
      (hire.ssnLast4 && e.ssnLast4 === hire.ssnLast4)
  );
  if (dupe) {
    results.push(
      v(
        "blocking",
        "DUPLICATE_EMPLOYEE",
        "profile.email",
        `An existing employee record matches this hire (${dupe.email}).`,
        "Confirm this is not a rehire/duplicate before creating a new payroll record."
      )
    );
  }

  // Pay-rate floor (hourly only).
  const minWage = minWageFor(hire.location);
  if (
    hire.payType === "hourly" &&
    typeof hire.payRate === "number" &&
    minWage !== undefined &&
    hire.payRate < minWage
  ) {
    results.push(
      v(
        "warning",
        "PAY_RATE_BELOW_MINIMUM",
        "profile.payRate",
        `Pay rate ${hire.payRate.toFixed(2)} is below the local minimum wage of ${minWage.toFixed(2)}.`,
        "Raise the pay rate to at least the local minimum wage."
      )
    );
  }

  // Low-confidence extracted fields flagged for human review.
  for (const [field, score] of Object.entries(hire.fieldConfidence)) {
    if (score > 0 && score < CONFIDENCE_THRESHOLD) {
      results.push(
        v(
          "info",
          "LOW_CONFIDENCE_FIELD",
          `profile.${field}`,
          `Extraction confidence for "${field}" is ${(score * 100).toFixed(0)}% — below the review threshold.`,
          "Verify this value against the original offer or onboarding form."
        )
      );
    }
  }

  // ---- Document rules ----
  for (const doc of hire.documents) {
    const result = documentRule(doc);
    if (result) results.push(result);
  }

  return results;
}

// Re-running validation should not lose human resolution decisions. Merge by
// stable id: anything an operator previously resolved stays resolved.
export function mergeValidations(
  previous: ValidationResult[],
  next: ValidationResult[]
): ValidationResult[] {
  const resolvedIds = new Set(
    previous.filter((p) => p.resolved).map((p) => p.id)
  );
  return next.map((n) => (resolvedIds.has(n.id) ? { ...n, resolved: true } : n));
}

export function docStatusFromValidations(
  docId: string,
  validations: ValidationResult[]
): "ok" | "warning" | "blocking" {
  const relevant = validations.filter(
    (val) => val.fieldPath.startsWith(`document.${docId}`) && !val.resolved
  );
  if (relevant.some((r) => r.severity === "blocking")) return "blocking";
  if (relevant.some((r) => r.severity === "warning")) return "warning";
  return "ok";
}

export function validationSummary(validations: ValidationResult[]) {
  const open = validations.filter((val) => !val.resolved);
  return {
    total: validations.length,
    open: open.length,
    blocking: open.filter((val) => val.severity === "blocking").length,
    warning: open.filter((val) => val.severity === "warning").length,
    info: open.filter((val) => val.severity === "info").length,
    resolved: validations.filter((val) => val.resolved).length,
  };
}

const DOC_WEIGHT: Record<DocStatus, number> = {
  verified: 1,
  signed: 0.8,
  sent: 0.3,
  needs_correction: 0.1,
  not_sent: 0,
};

// Day-one readiness score (0-100): weighted blend of required-document
// completion and core profile completeness.
export function estimateReadiness(hire: NewHire): number {
  const requiredDocs = hire.documents.filter((d) => d.required);
  const docScore = requiredDocs.length
    ? requiredDocs.reduce((sum, d) => sum + DOC_WEIGHT[d.status], 0) /
      requiredDocs.length
    : 1;

  const profileFields = [hire.ssnLast4, hire.startDate, hire.payRate];
  const profilePresent = profileFields.filter(
    (f) => f !== undefined && f !== null && f !== ""
  ).length;
  const profileScore = profilePresent / profileFields.length;

  return Math.round(100 * (0.7 * docScore + 0.3 * profileScore));
}
