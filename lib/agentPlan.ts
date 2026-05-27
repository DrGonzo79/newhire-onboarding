import type { AgentStep, NewHire } from "./types";
import { EMPLOYMENT_TYPE_LABELS } from "./mockData";

// ---- Agent Plan Module --------------------------------------------------
// Produces the simulated step-by-step plan an automation agent would run to
// stand up a new hire in QuickBooks Workforce (payroll/HCM). Today this is a
// deterministic plan; later it could drive a real Workforce API / MCP / browser
// session. The `simulatedScreenshotState` string feeds the mock Workforce panel.

export function buildAgentPlan(hire: NewHire): AgentStep[] {
  const requiredDocs = hire.documents.filter((d) => d.required);
  const completeDocs = requiredDocs.filter(
    (d) => d.status === "verified" || d.status === "signed"
  );
  const needsBgc = hire.documents.some((d) => d.type === "background_check");
  const payLabel =
    hire.payType === "salary"
      ? `$${(hire.payRate ?? 0).toLocaleString()}/yr`
      : `$${(hire.payRate ?? 0).toFixed(2)}/hr`;

  const steps: Omit<AgentStep, "id" | "newHireId">[] = [
    {
      label: "Open QuickBooks Workforce",
      description: "Open the Workforce employee directory for the company file.",
      status: "Pending",
      requiresApproval: false,
      simulatedScreenshotState: `QUICKBOOKS WORKFORCE\nEmployee Directory\nCompany: Brightline Hospitality Group`,
    },
    {
      label: "Create employee profile",
      description: `Add "${hire.employeeName}" as a new employee (${hire.role}, ${hire.location}).`,
      status: "Pending",
      requiresApproval: false,
      simulatedScreenshotState: `ADD EMPLOYEE\nName: ${hire.employeeName}\nRole: ${hire.role}\nLocation: ${hire.location}\nType: ${
        hire.employmentType ? EMPLOYMENT_TYPE_LABELS[hire.employmentType] : "—"
      }`,
    },
    {
      label: "Enter compensation",
      description: `Set pay to ${payLabel} and assign the default schedule.`,
      status: "Pending",
      requiresApproval: false,
      simulatedScreenshotState: `COMPENSATION\nPay type: ${hire.payType ?? "—"}\nRate: ${payLabel}\nStart date: ${hire.startDate ?? "—"}`,
    },
    {
      label: "File I-9 & W-4",
      description: "Attach the signed I-9 and W-4 to the compliance vault.",
      status: "Pending",
      requiresApproval: false,
      simulatedScreenshotState: `COMPLIANCE VAULT\nI-9: ${docState(hire, "i9")}\nW-4: ${docState(hire, "w4")}`,
    },
    {
      label: "Configure direct deposit",
      description: "Enter the bank details and queue the prenote.",
      status: "Pending",
      requiresApproval: false,
      simulatedScreenshotState: `DIRECT DEPOSIT\nStatus: ${docState(hire, "direct_deposit")}\nPrenote: QUEUED`,
    },
    {
      label: needsBgc ? "Confirm background check" : "Background check (n/a)",
      description: needsBgc
        ? "Confirm the background screening result is cleared before activation."
        : "This role does not require a background check — skip.",
      status: "Pending",
      requiresApproval: false,
      simulatedScreenshotState: needsBgc
        ? `SCREENING\nBackground check: ${docState(hire, "background_check")}`
        : "SCREENING\nNot required for this role.",
    },
    {
      label: "Push handbook for e-signature",
      description: "Send the employee handbook for an e-signed acknowledgement.",
      status: "Pending",
      requiresApproval: false,
      simulatedScreenshotState: `HANDBOOK\nAcknowledgement: ${docState(hire, "handbook")}`,
    },
    {
      label: "Generate first-shift checklist",
      description: "Create the day-one setup, training, and compliance tasks.",
      status: "Pending",
      requiresApproval: false,
      simulatedScreenshotState: `ONBOARDING TASKS\n${hire.checklist.length} task(s) staged for the first shift.`,
    },
    {
      label: "Activate employee",
      description:
        "Activate the employee record so payroll can run. Final activation is held for human approval.",
      status: "Pending",
      requiresApproval: true,
      simulatedScreenshotState: `EMPLOYEE RECORD\nDocs complete: ${completeDocs.length}/${requiredDocs.length}\nStatus: DRAFT\n>>> AWAITING HUMAN APPROVAL TO ACTIVATE <<<`,
    },
  ];

  return steps.map((s, i) => ({
    ...s,
    id: `step-${i + 1}`,
    newHireId: hire.id,
  }));
}

function docState(hire: NewHire, type: string): string {
  const doc = hire.documents.find((d) => d.type === type);
  if (!doc) return "N/A";
  return doc.status.replace(/_/g, " ").toUpperCase();
}

export function agentPlanProgress(steps: AgentStep[]): number {
  if (!steps.length) return 0;
  const done = steps.filter((s) => s.status === "Completed").length;
  return Math.round((done / steps.length) * 100);
}
