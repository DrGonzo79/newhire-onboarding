import type { EmailDraft, EmailDraftType, NewHire } from "./types";
import { EMPLOYER_NAME } from "./mockData";
import { formatDate, nowIso } from "@/lib/utils";
import { validationSummary } from "./validation";

// ---- Communication Module ----------------------------------------------
// Generates welcome / document-request / exception-alert drafts. Never sends
// mail in the prototype — only produces a draft and a simulated "sent" state.
// A real provider would implement the same shape.

const DOC_BLOCKING_CODES = new Set([
  "MISSING_I9",
  "MISSING_W4",
  "MISSING_DIRECT_DEPOSIT",
  "MISSING_STATE_TAX",
  "HANDBOOK_NOT_ACKNOWLEDGED",
  "MISSING_EMERGENCY_CONTACT",
  "DOC_NEEDS_CORRECTION",
]);

export function determineEmailType(hire: NewHire): EmailDraftType {
  const open = hire.validations.filter((v) => !v.resolved);
  const blocking = open.filter((v) => v.severity === "blocking");

  // A real problem (not just outstanding paperwork) goes to the manager.
  const realProblem = blocking.some(
    (b) =>
      b.code === "DUPLICATE_EMPLOYEE" ||
      b.code === "MISSING_SSN" ||
      b.code === "START_DATE_IN_PAST"
  );
  if (realProblem) return "manager_exception_alert";

  if (open.some((v) => v.code === "BACKGROUND_CHECK_PENDING"))
    return "background_check_notice";

  const outstandingDocs = open.some((v) => DOC_BLOCKING_CODES.has(v.code));
  if (outstandingDocs) return "document_request";

  if (open.some((v) => v.code === "MISSING_START_DATE")) return "missing_info";

  if (open.length === 0) return "ready_for_day_one";

  return "welcome";
}

function firstName(hire: NewHire): string {
  return hire.employeeName?.split(" ")[0] || "there";
}

function outstandingDocLabels(hire: NewHire): string[] {
  return hire.documents
    .filter(
      (d) =>
        d.required && d.status !== "verified" && d.status !== "signed"
    )
    .map((d) => d.label);
}

export function generateEmailDraft(hire: NewHire): EmailDraft {
  const type = determineEmailType(hire);
  const name = firstName(hire);
  const to = hire.email || "new.hire@example.com";
  const startLine = hire.startDate
    ? `Start date: ${formatDate(hire.startDate)}`
    : "Start date: to be confirmed";
  const outstanding = outstandingDocLabels(hire);
  const summary = validationSummary(hire.validations);

  const sign = `\n\nWelcome aboard,\nThe People Team\n${EMPLOYER_NAME}`;
  const managerSign = `\n\nThanks,\nNew-Hire Paperwork Desk\n${EMPLOYER_NAME}`;

  let subject = "";
  let body = "";

  if (type === "manager_exception_alert") {
    const issues = hire.validations
      .filter((v) => !v.resolved && v.severity === "blocking")
      .map((v) => `  - ${v.message}`)
      .join("\n");
    subject = `Action needed: onboarding issue for ${hire.employeeName}`;
    body =
      `Hi ${hire.manager || "team"},\n\n` +
      `${hire.employeeName} (${hire.role}, ${hire.location}) has an onboarding ` +
      `issue that needs your attention before day one:\n\n` +
      `${issues}\n\n${startLine}\n\n` +
      `Please review so we can get this hire payroll-ready.` +
      managerSign;
  } else if (type === "background_check_notice") {
    subject = `Background check needed before your start at ${EMPLOYER_NAME}`;
    body =
      `Hi ${name},\n\n` +
      `We're excited for you to join as ${hire.role}! Your role requires a ` +
      `background check, which we've initiated. Please complete your portion ` +
      `using the secure link in your onboarding portal as soon as possible.\n\n` +
      `${startLine}\n\n` +
      `Your start date is confirmed once the screening clears.` +
      sign;
  } else if (type === "document_request") {
    subject = `A few onboarding documents to finish before day one`;
    body =
      `Hi ${name},\n\n` +
      `Welcome to ${EMPLOYER_NAME}! To get you payroll-ready for day one, please ` +
      `complete the following in your onboarding portal:\n\n` +
      (outstanding.length
        ? outstanding.map((d) => `  - ${d}`).join("\n")
        : "  - (all documents received)") +
      `\n\n${startLine}\n\n` +
      `It only takes a few minutes — reply here if you have any questions.` +
      sign;
  } else if (type === "missing_info") {
    subject = `Quick question to finish your onboarding`;
    body =
      `Hi ${name},\n\n` +
      `Thanks for completing your paperwork! We just need to confirm your ` +
      `start date so we can finalize your first-shift schedule.\n\n` +
      `Please reply with the date you'll be starting and we'll take care of ` +
      `the rest.` +
      sign;
  } else if (type === "ready_for_day_one") {
    subject = `You're all set for day one at ${EMPLOYER_NAME}!`;
    body =
      `Hi ${name},\n\n` +
      `Great news — your onboarding paperwork is complete and you're fully ` +
      `payroll-ready. Here's what to expect:\n\n` +
      `Role: ${hire.role}\nLocation: ${hire.location}\n${startLine}\n\n` +
      `Your manager${hire.manager ? ` (${hire.manager})` : ""} will meet you ` +
      `at the start of your first shift. We can't wait to have you on the team!` +
      sign;
  } else {
    subject = `Welcome to ${EMPLOYER_NAME}, ${name}!`;
    body =
      `Hi ${name},\n\n` +
      `We're thrilled you've accepted the ${hire.role} role at ${hire.location}. ` +
      `Your onboarding portal is ready — we'll guide you through the paperwork ` +
      `so you're set for day one.\n\n` +
      `${startLine}\n\n` +
      `Open issues to wrap up: ${summary.open}.` +
      sign;
  }

  return {
    type,
    subject,
    body,
    to,
    generatedAt: nowIso(),
    sent: false,
  };
}

export const EMAIL_TYPE_LABELS: Record<EmailDraftType, string> = {
  welcome: "Welcome message",
  document_request: "Document request",
  missing_info: "Missing info request",
  background_check_notice: "Background check notice",
  manager_exception_alert: "Manager exception alert",
  ready_for_day_one: "Ready-for-day-one confirmation",
};
