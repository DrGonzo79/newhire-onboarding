import type { NewHireStatus, ValidationResult } from "./types";

// ---- New-hire status state machine -------------------------------------

export const NEWHIRE_STATUS_FLOW: NewHireStatus[] = [
  "New",
  "Extracted",
  "Collecting Docs",
  "Needs Review",
  "Ready for Day One",
  "Onboarded",
];

// Everything except the terminal "Onboarded" state is still in the review
// phase: validation outcomes can move a hire freely between these.
const REVIEW_PHASE: NewHireStatus[] = [
  "New",
  "Extracted",
  "Collecting Docs",
  "Needs Review",
  "Ready for Day One",
  "Exception",
];

const ALLOWED_TRANSITIONS: Record<NewHireStatus, NewHireStatus[]> = {
  New: ["Extracted", "Exception"],
  Extracted: ["Collecting Docs", "Needs Review", "Ready for Day One", "Exception"],
  "Collecting Docs": ["Needs Review", "Ready for Day One", "Exception", "Collecting Docs"],
  "Needs Review": ["Collecting Docs", "Ready for Day One", "Exception", "Needs Review"],
  Exception: ["Collecting Docs", "Needs Review", "Ready for Day One", "Exception"],
  "Ready for Day One": ["Onboarded", "Needs Review", "Collecting Docs", "Exception"],
  Onboarded: [],
};

// Blocking codes that simply mean "paperwork is still outstanding" — the
// natural pre-day-one state — versus codes that signal a real problem.
const DOC_COLLECTION_CODES = new Set([
  "MISSING_I9",
  "MISSING_W4",
  "MISSING_DIRECT_DEPOSIT",
  "BACKGROUND_CHECK_PENDING",
  "MISSING_STATE_TAX",
]);

export function canTransition(from: NewHireStatus, to: NewHireStatus): boolean {
  if (from === to) return true;
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export function isReviewPhase(status: NewHireStatus): boolean {
  return REVIEW_PHASE.includes(status);
}

// Given open validations, compute the appropriate review-phase status. A hire
// whose only blockers are outstanding documents is "Collecting Docs"; one with
// a real problem (missing SSN, past start date, duplicate) is an "Exception".
export function statusFromValidations(
  validations: ValidationResult[]
): Extract<
  NewHireStatus,
  "Exception" | "Collecting Docs" | "Needs Review" | "Ready for Day One"
> {
  const open = validations.filter((val) => !val.resolved);
  const blocking = open.filter((val) => val.severity === "blocking");
  if (blocking.length) {
    const hasRealProblem = blocking.some(
      (b) => !DOC_COLLECTION_CODES.has(b.code)
    );
    return hasRealProblem ? "Exception" : "Collecting Docs";
  }
  if (open.some((val) => val.severity === "warning")) return "Needs Review";
  return "Ready for Day One";
}

// Recompute status after a validation run without ever regressing a hire that
// has already been onboarded.
export function applyValidationStatus(
  current: NewHireStatus,
  validations: ValidationResult[]
): NewHireStatus {
  if (!isReviewPhase(current)) return current;
  return statusFromValidations(validations);
}

export const STATUS_BADGE_TONE: Record<NewHireStatus, string> = {
  New: "bg-ink-100 text-ink-700 border-ink-200",
  Extracted: "bg-brand-50 text-brand-700 border-brand-200",
  "Collecting Docs": "bg-sky-50 text-sky-700 border-sky-200",
  "Needs Review": "bg-amber-50 text-amber-700 border-amber-200",
  "Ready for Day One": "bg-emerald-50 text-emerald-700 border-emerald-200",
  Onboarded: "bg-violet-50 text-violet-700 border-violet-200",
  Exception: "bg-rose-50 text-rose-700 border-rose-200",
};
