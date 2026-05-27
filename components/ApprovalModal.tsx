"use client";

import type { ApprovalType, NewHire } from "@/lib/types";
import type { NewHireActions } from "./types";
import { validationSummary } from "@/lib/validation";
import { SeverityBadge } from "@/components/ui";

export default function ApprovalModal({
  hire,
  actions,
  onClose,
}: {
  hire: NewHire;
  actions: NewHireActions;
  onClose: () => void;
}) {
  const summary = validationSummary(hire.validations);
  const blocked = summary.blocking > 0;
  const openWarnings = hire.validations.filter(
    (v) => !v.resolved && v.severity !== "info"
  );

  const has = (t: ApprovalType) => hire.approvals.some((a) => a.type === t);
  const readyToOnboard = hire.status === "Ready for Day One" || hire.status === "Onboarded";

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink-900/50 p-6">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-ink-200 px-5 py-3.5">
          <h2 className="text-lg font-bold text-ink-900">Approval Gate</h2>
          <button onClick={onClose} className="btn-ghost px-2 py-1 text-sm">
            ✕
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <p className="text-xs text-ink-500">
            The prototype never auto-completes onboarding. Each payroll or
            employee-facing action below requires an explicit human approval.
          </p>

          <div className="rounded-lg border border-ink-200 bg-ink-50 p-3 text-sm">
            <div className="grid grid-cols-2 gap-y-1">
              <span className="text-ink-500">Employee</span>
              <span className="text-right font-semibold text-ink-800">{hire.employeeName}</span>
              <span className="text-ink-500">Role</span>
              <span className="text-right text-ink-800">{hire.role || "—"}</span>
              <span className="text-ink-500">Readiness</span>
              <span className="text-right font-semibold text-ink-800">{hire.readiness}%</span>
              <span className="text-ink-500">Documents</span>
              <span className="text-right text-ink-800">{hire.documents.length}</span>
              <span className="text-ink-500">Exceptions resolved</span>
              <span className="text-right text-emerald-700">{summary.resolved}</span>
            </div>
          </div>

          <div>
            <div className="section-title mb-1">Remaining issues</div>
            {openWarnings.length === 0 ? (
              <p className="text-sm text-emerald-700">
                No open warnings or blocking exceptions.
              </p>
            ) : (
              <ul className="space-y-1">
                {openWarnings.map((v) => (
                  <li key={v.id} className="flex items-center gap-2 text-xs text-ink-600">
                    <SeverityBadge severity={v.severity} />
                    {v.message}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {blocked && (
            <div className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
              Blocking exceptions remain. Resolve them before completing payroll
              setup or marking the hire ready for day one.
            </div>
          )}

          <div className="space-y-2">
            <ApprovalAction
              label="Run Payroll Setup (simulated)"
              hint="Run the QuickBooks Workforce setup plan and save the employee draft."
              done={has("payroll_setup")}
              disabled={blocked || actions.busy}
              onClick={() => actions.act("completeAgentPlan")}
            />
            <ApprovalAction
              label="Send New-Hire Message"
              hint="Generate (if needed) and send the current message draft."
              done={has("send_welcome")}
              disabled={actions.busy}
              onClick={() => actions.act("sendEmail")}
            />
            <ApprovalAction
              label="Mark Ready for Day One"
              hint="Finalize the day-one packet and mark the hire onboarded."
              done={has("mark_ready")}
              disabled={!readyToOnboard || blocked || actions.busy}
              onClick={() => actions.act("approveReadiness")}
            />
            <ApprovalAction
              label="Notify Manager / Payroll"
              hint="Flag this hire to the manager for awareness."
              done={has("notify_manager")}
              disabled={actions.busy}
              onClick={() => actions.act("notifyManager")}
            />
          </div>
        </div>

        <div className="flex justify-end border-t border-ink-200 px-5 py-3">
          <button onClick={onClose} className="btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function ApprovalAction({
  label,
  hint,
  done,
  disabled,
  onClick,
}: {
  label: string;
  hint: string;
  done: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-ink-200 p-3">
      <div>
        <div className="text-sm font-semibold text-ink-800">{label}</div>
        <div className="text-xs text-ink-500">{hint}</div>
      </div>
      {done ? (
        <span className="badge border-emerald-200 bg-emerald-50 text-emerald-700">Approved</span>
      ) : (
        <button onClick={onClick} disabled={disabled} className="btn-primary px-3 py-1.5 text-xs">
          Approve
        </button>
      )}
    </div>
  );
}
