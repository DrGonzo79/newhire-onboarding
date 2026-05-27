"use client";

import type { NewHire } from "@/lib/types";
import type { NewHireActions } from "./types";
import { EMAIL_TYPE_LABELS } from "@/lib/email";
import { formatDateTime } from "@/lib/utils";

export default function CommsTab({
  hire,
  actions,
}: {
  hire: NewHire;
  actions: NewHireActions;
}) {
  const draft = hire.emailDraft;

  return (
    <div className="grid grid-cols-3 gap-6">
      <div className="col-span-2">
        {!draft ? (
          <div className="card card-pad">
            <div className="section-title mb-2">New-Hire Communication</div>
            <p className="text-sm text-ink-500">
              Generate a polished message draft. The type adapts to the hire:
              welcome, document request, missing info, background-check notice,
              manager exception alert, or ready-for-day-one confirmation.
            </p>
            <button
              onClick={() => actions.act("generateEmail")}
              disabled={actions.busy}
              className="btn-primary mt-4"
            >
              Generate Draft
            </button>
          </div>
        ) : (
          <div className="card">
            <div className="flex items-center justify-between border-b border-ink-200 px-4 py-3">
              <span className="badge border-brand-200 bg-brand-50 text-brand-700">
                {EMAIL_TYPE_LABELS[draft.type]}
              </span>
              {draft.sent ? (
                <span className="badge border-emerald-200 bg-emerald-50 text-emerald-700">
                  Sent {formatDateTime(draft.sentAt)}
                </span>
              ) : (
                <span className="badge border-ink-200 bg-ink-50 text-ink-600">Draft</span>
              )}
            </div>
            <div className="space-y-2 px-4 py-3 text-sm">
              <div className="flex gap-2">
                <span className="w-16 font-semibold text-ink-500">To</span>
                <span className="text-ink-800">{draft.to}</span>
              </div>
              <div className="flex gap-2">
                <span className="w-16 font-semibold text-ink-500">Subject</span>
                <span className="font-semibold text-ink-800">{draft.subject}</span>
              </div>
            </div>
            <pre className="whitespace-pre-wrap border-t border-ink-100 bg-ink-50 p-4 text-sm leading-relaxed text-ink-700">
              {draft.body}
            </pre>
            <div className="flex gap-2 border-t border-ink-200 px-4 py-3">
              <button
                onClick={() => actions.act("generateEmail")}
                disabled={actions.busy}
                className="btn-secondary"
              >
                Regenerate
              </button>
              {!draft.sent && (
                <button
                  onClick={() => actions.act("sendEmail")}
                  disabled={actions.busy}
                  className="btn-success"
                >
                  Approve &amp; Send (simulated)
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="card card-pad text-xs text-ink-500">
        <div className="section-title mb-2">Approval gate</div>
        Messages are never sent automatically. The draft is held until a human
        approves it. &ldquo;Approve &amp; Send&rdquo; records the approval in the
        audit trail and marks the message sent (simulated — nothing leaves the
        system).
        <div className="mt-3 section-title mb-2">Draft types</div>
        <ul className="space-y-1">
          {Object.values(EMAIL_TYPE_LABELS).map((l) => (
            <li key={l}>&middot; {l}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
