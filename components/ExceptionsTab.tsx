"use client";

import type { NewHire, ValidationResult } from "@/lib/types";
import type { NewHireActions } from "./types";
import { SeverityBadge } from "@/components/ui";
import { DocStatusBadge } from "./ui";

export default function ExceptionsTab({
  hire,
  actions,
}: {
  hire: NewHire;
  actions: NewHireActions;
}) {
  const open = hire.validations.filter((v) => !v.resolved);
  const resolved = hire.validations.filter((v) => v.resolved);

  const severityRank: Record<string, number> = { blocking: 0, warning: 1, info: 2 };
  const sortedOpen = [...open].sort(
    (a, b) => severityRank[a.severity] - severityRank[b.severity]
  );

  return (
    <div className="grid grid-cols-3 gap-6">
      <div className="col-span-2 space-y-4">
        <div>
          <div className="section-title mb-2">Open Exceptions ({open.length})</div>
          {sortedOpen.length === 0 ? (
            <div className="card card-pad text-sm text-emerald-700">
              All readiness exceptions are resolved. This hire is clear for day one.
            </div>
          ) : (
            <div className="space-y-3">
              {sortedOpen.map((v) => (
                <ExceptionCard key={v.id} v={v} actions={actions} />
              ))}
            </div>
          )}
        </div>

        {resolved.length > 0 && (
          <div>
            <div className="section-title mb-2">Resolved ({resolved.length})</div>
            <div className="space-y-2">
              {resolved.map((v) => (
                <div key={v.id} className="card flex items-center gap-3 px-4 py-2.5 text-sm">
                  <span className="badge border-emerald-200 bg-emerald-50 text-emerald-700">
                    Resolved
                  </span>
                  <span className="text-ink-600 line-through">{v.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Document quick status */}
      <div>
        <div className="section-title mb-2">Document Status</div>
        <div className="card divide-y divide-ink-100">
          {hire.documents.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between gap-2 p-3">
              <span className="text-xs font-medium text-ink-700">{doc.label}</span>
              <DocStatusBadge status={doc.status} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ExceptionCard({
  v,
  actions,
}: {
  v: ValidationResult;
  actions: NewHireActions;
}) {
  return (
    <div className="card card-pad">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <SeverityBadge severity={v.severity} />
          <span className="font-mono text-xs text-ink-400">{v.code}</span>
        </div>
        <span className="font-mono text-[11px] text-ink-400">{v.fieldPath}</span>
      </div>
      <p className="mt-2 text-sm font-medium text-ink-800">{v.message}</p>
      <div className="mt-2 rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-800">
        <span className="font-semibold">Suggested fix: </span>
        {v.suggestedFix}
      </div>
      <div className="mt-3 flex gap-2">
        <button
          onClick={() =>
            actions.act("resolveValidation", {
              validationId: v.id,
              note: "reviewed by coordinator",
            })
          }
          disabled={actions.busy}
          className="btn-primary px-3 py-1.5 text-xs"
        >
          Mark resolved
        </button>
      </div>
    </div>
  );
}
