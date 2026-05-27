import Link from "next/link";
import { getNewHire } from "@/lib/store";
import { buildReadinessPacket } from "@/lib/packet";
import { DOC_LABELS } from "@/lib/mockData";
import { EMPLOYMENT_TYPE_LABELS } from "@/lib/mockData";
import { formatDate } from "@/lib/utils";
import type { ChecklistCategory, DocStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const DOC_STATUS_LABEL: Record<DocStatus, string> = {
  not_sent: "Not sent",
  sent: "Sent",
  signed: "Signed",
  needs_correction: "Needs correction",
  verified: "Verified",
};

const CATEGORY_LABELS: Record<ChecklistCategory, string> = {
  setup: "Setup",
  training: "Training",
  compliance: "Compliance",
};

export default async function PacketPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const hire = getNewHire(id);

  if (!hire) {
    return (
      <div className="card card-pad">
        <p className="text-sm text-ink-600">New hire not found.</p>
        <Link href="/" className="mt-3 inline-block text-brand-700">
          ← Back to new hires
        </Link>
      </div>
    );
  }

  const packet = buildReadinessPacket(hire);
  const ready = packet.verdict === "ready";

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link href={`/hires/${id}`} className="text-sm text-brand-700 hover:underline">
          ← Back to hire
        </Link>
        <span className="text-xs text-ink-400">Use your browser&apos;s print to save as PDF</span>
      </div>

      <div className="card card-pad">
        <div className="flex items-start justify-between border-b border-ink-200 pb-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-ink-400">
              Ready-for-Day-One Packet
            </div>
            <h1 className="mt-1 text-2xl font-bold text-ink-900">{packet.employeeName}</h1>
            <div className="mt-1 text-sm text-ink-500">
              {packet.role} · {packet.location}
            </div>
          </div>
          <div className="text-right">
            <div
              className={`text-lg font-bold ${ready ? "text-emerald-700" : "text-rose-700"}`}
            >
              {ready ? "READY" : "NOT READY"}
            </div>
            <div className="text-3xl font-bold text-ink-900">{packet.readiness}%</div>
          </div>
        </div>

        <section className="mt-5">
          <h2 className="section-title mb-2">Profile &amp; Payroll</h2>
          <dl className="grid grid-cols-2 gap-y-1 text-sm">
            <dt className="text-ink-500">Start date</dt>
            <dd className="text-right text-ink-800">
              {packet.startDate ? formatDate(packet.startDate) : "—"}
            </dd>
            <dt className="text-ink-500">Manager</dt>
            <dd className="text-right text-ink-800">{packet.manager ?? "—"}</dd>
            <dt className="text-ink-500">Employment type</dt>
            <dd className="text-right text-ink-800">
              {packet.employmentType
                ? EMPLOYMENT_TYPE_LABELS[
                    packet.employmentType as keyof typeof EMPLOYMENT_TYPE_LABELS
                  ]
                : "—"}
            </dd>
            <dt className="text-ink-500">Pay</dt>
            <dd className="text-right text-ink-800">{packet.pay}</dd>
            <dt className="text-ink-500">Payroll setup</dt>
            <dd className="text-right text-ink-800">
              {packet.payrollSetupComplete ? "Complete" : "Pending"}
            </dd>
          </dl>
        </section>

        <section className="mt-5">
          <h2 className="section-title mb-2">Documents</h2>
          <ul className="space-y-1 text-sm">
            {packet.documents.map((d) => (
              <li key={d.label} className="flex items-center justify-between">
                <span className="text-ink-700">{d.label}</span>
                <span className={d.complete ? "text-emerald-700" : "text-rose-600"}>
                  {DOC_STATUS_LABEL[d.status as DocStatus]}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {!ready && packet.blockers.length > 0 && (
          <section className="mt-5">
            <h2 className="section-title mb-2 text-rose-600">Outstanding Blockers</h2>
            <ul className="space-y-1 text-sm text-rose-700">
              {packet.blockers.map((b, i) => (
                <li key={i}>• {b}</li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-5">
          <h2 className="section-title mb-2">First-Shift Checklist</h2>
          <div className="grid grid-cols-3 gap-4">
            {(["setup", "training", "compliance"] as ChecklistCategory[]).map((cat) => (
              <div key={cat}>
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-400">
                  {CATEGORY_LABELS[cat]}
                </div>
                <ul className="space-y-1 text-sm">
                  {packet.checklist
                    .filter((t) => t.category === cat)
                    .map((t) => (
                      <li key={t.id} className="text-ink-700">
                        {t.done ? "☑" : "☐"} {t.label}
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
