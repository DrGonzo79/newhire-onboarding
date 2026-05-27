"use client";

import type { NewHire } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

const ACTOR_TONE: Record<string, string> = {
  System: "bg-ink-100 text-ink-600",
  "AI Onboarding Agent": "bg-brand-100 text-brand-700",
  "Readiness Engine": "bg-violet-100 text-violet-700",
};

export default function AuditTab({ hire }: { hire: NewHire }) {
  const events = [...hire.auditEvents].reverse();

  return (
    <div className="card card-pad">
      <div className="section-title mb-4">
        Audit Trail ({hire.auditEvents.length} events)
      </div>
      <ol className="relative space-y-4 border-l-2 border-ink-100 pl-6">
        {events.map((e) => (
          <li key={e.id} className="relative">
            <span className="absolute -left-[31px] top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-brand-400" />
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-ink-800">{e.action}</span>
              <span
                className={`badge border-transparent ${
                  ACTOR_TONE[e.actor] ?? "bg-emerald-100 text-emerald-700"
                }`}
              >
                {e.actor}
              </span>
              <span className="text-xs text-ink-400">{formatDateTime(e.timestamp)}</span>
            </div>
            <p className="mt-0.5 text-sm text-ink-600">{e.details}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
