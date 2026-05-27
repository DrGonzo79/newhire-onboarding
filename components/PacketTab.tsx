"use client";

import Link from "next/link";
import type { ChecklistCategory, NewHire } from "@/lib/types";
import type { NewHireActions } from "./types";
import { buildReadinessPacket } from "@/lib/packet";
import { DocStatusBadge } from "./ui";
import { formatDate } from "@/lib/utils";

const CATEGORY_LABELS: Record<ChecklistCategory, string> = {
  setup: "Setup",
  training: "Training",
  compliance: "Compliance",
};

export default function PacketTab({
  hire,
  actions,
}: {
  hire: NewHire;
  actions: NewHireActions;
}) {
  const packet = buildReadinessPacket(hire);
  const ready = packet.verdict === "ready";

  return (
    <div className="space-y-5">
      {/* Verdict banner */}
      <div
        className={`card card-pad ${
          ready ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"
        }`}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className={`text-lg font-bold ${ready ? "text-emerald-700" : "text-rose-700"}`}>
              {ready ? "Ready for Day One" : "Not ready — blockers remain"}
            </div>
            <div className="mt-0.5 text-sm text-ink-600">
              {packet.employeeName} · {packet.role} · {packet.location}
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-ink-900">{packet.readiness}%</div>
            <div className="text-xs text-ink-500">readiness</div>
          </div>
        </div>
        {!ready && packet.blockers.length > 0 && (
          <ul className="mt-3 space-y-1 text-sm text-rose-700">
            {packet.blockers.map((b, i) => (
              <li key={i}>• {b}</li>
            ))}
          </ul>
        )}
        <div className="mt-4">
          <Link href={`/hires/${hire.id}/packet`} className="btn-secondary" target="_blank">
            Open printable packet
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Profile + payroll summary */}
        <div className="card card-pad">
          <div className="section-title mb-3">Profile &amp; Payroll</div>
          <dl className="space-y-2 text-sm">
            <Row label="Start date" value={packet.startDate ? formatDate(packet.startDate) : "—"} />
            <Row label="Manager" value={packet.manager ?? "—"} />
            <Row label="Pay" value={packet.pay} />
            <Row label="Payroll setup" value={packet.payrollSetupComplete ? "Complete" : "Pending"} />
          </dl>
        </div>

        {/* Documents */}
        <div className="card card-pad col-span-2">
          <div className="section-title mb-3">Documents</div>
          <div className="space-y-2">
            {packet.documents.map((d) => (
              <div key={d.label} className="flex items-center justify-between gap-2 text-sm">
                <span className="text-ink-700">{d.label}</span>
                <DocStatusBadge status={d.status as never} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* First-shift checklist */}
      <div className="card card-pad">
        <div className="section-title mb-3">First-Shift Checklist</div>
        <div className="grid grid-cols-3 gap-6">
          {(["setup", "training", "compliance"] as ChecklistCategory[]).map((cat) => (
            <div key={cat}>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">
                {CATEGORY_LABELS[cat]}
              </div>
              <ul className="space-y-2">
                {hire.checklist
                  .filter((t) => t.category === cat)
                  .map((t) => (
                    <li key={t.id}>
                      <label className="flex cursor-pointer items-start gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={t.done}
                          disabled={actions.busy}
                          onChange={() => actions.act("toggleChecklistTask", { taskId: t.id })}
                          className="mt-0.5"
                        />
                        <span className={t.done ? "text-ink-400 line-through" : "text-ink-700"}>
                          {t.label}
                          <span className="ml-1 text-[11px] text-ink-400">({t.owner})</span>
                        </span>
                      </label>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-ink-500">{label}</dt>
      <dd className="font-semibold text-ink-800">{value}</dd>
    </div>
  );
}
