"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { NewHire } from "@/lib/types";
import { validationSummary } from "@/lib/validation";
import type { FieldPatch, NewHireActions, ReferenceData } from "@/components/types";
import { NewHireStatusBadge, ReadinessBadge, SourceBadge } from "@/components/ui";
import PaperworkTab from "@/components/PaperworkTab";
import ExceptionsTab from "@/components/ExceptionsTab";
import AgentPlanTab from "@/components/AgentPlanTab";
import CommsTab from "@/components/CommsTab";
import PacketTab from "@/components/PacketTab";
import AuditTab from "@/components/AuditTab";
import ApprovalModal from "@/components/ApprovalModal";

const TABS = [
  { id: "paperwork", label: "Paperwork Status" },
  { id: "exceptions", label: "Validation Exceptions" },
  { id: "agent", label: "Payroll & Day-One Plan" },
  { id: "comms", label: "Comms Drafts" },
  { id: "packet", label: "Day-One Packet" },
  { id: "audit", label: "Audit Trail" },
];

export default function NewHireDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [hire, setHire] = useState<NewHire | null>(null);
  const [reference, setReference] = useState<ReferenceData | null>(null);
  const [tab, setTab] = useState("paperwork");
  const [busy, setBusy] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [showApproval, setShowApproval] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/hires/${id}`).then((r) => r.json()),
      fetch(`/api/hires/reference`).then((r) => r.json()),
    ]).then(([h, r]) => {
      if (h.newHire) setHire(h.newHire);
      else setNotFound(true);
      setReference(r);
    });
  }, [id]);

  const patch = useCallback(
    async (fields: FieldPatch = {}) => {
      setBusy(true);
      const res = await fetch(`/api/hires/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields }),
      });
      const d = await res.json();
      if (d.newHire) setHire(d.newHire);
      setBusy(false);
    },
    [id]
  );

  const act = useCallback(
    async (action: string, payload: Record<string, unknown> = {}) => {
      setBusy(true);
      const res = await fetch(`/api/hires/${id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });
      const d = await res.json();
      if (d.newHire) setHire(d.newHire);
      setBusy(false);
    },
    [id]
  );

  if (notFound) {
    return (
      <div className="card card-pad">
        <p className="text-sm text-ink-600">New hire not found.</p>
        <Link href="/" className="mt-3 inline-block text-brand-700">
          ← Back to new hires
        </Link>
      </div>
    );
  }

  if (!hire || !reference) {
    return <div className="card card-pad text-sm text-ink-500">Loading hire…</div>;
  }

  const actions: NewHireActions = { patch, act, busy };
  const summary = validationSummary(hire.validations);

  return (
    <div>
      <Link href="/" className="text-sm text-brand-700 hover:underline">
        ← New hires
      </Link>

      {/* Header */}
      <div className="mt-3 card card-pad">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-ink-900">{hire.employeeName}</h1>
              <NewHireStatusBadge status={hire.status} />
              <ReadinessBadge score={hire.readiness} />
            </div>
            <div className="mt-1 flex items-center gap-3 text-sm text-ink-500">
              <span>{hire.role || "role TBD"}</span>
              <span>&middot;</span>
              <span>{hire.location || "location TBD"}</span>
              <span>&middot;</span>
              <SourceBadge source={hire.sourceType} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-ink-500">
              Coordinator
              <select
                value={hire.assignedCoordinator}
                onChange={(e) => patch({ assignedCoordinator: e.target.value })}
                className="input mt-1 w-40"
              >
                {reference.coordinators.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <button onClick={() => setShowApproval(true)} className="btn-primary self-end">
              Approval Gate
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-3">
          <HeaderStat label="Documents" value={String(hire.documents.length)} />
          <HeaderStat
            label="Open Exceptions"
            value={String(summary.open)}
            tone={summary.blocking ? "bad" : summary.warning ? "warn" : "good"}
          />
          <HeaderStat label="Blocking" value={String(summary.blocking)} tone={summary.blocking ? "bad" : "good"} />
          <HeaderStat label="Resolved" value={String(summary.resolved)} tone="good" />
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-5 flex gap-1 border-b border-ink-200">
        {TABS.map((t) => {
          const count = t.id === "exceptions" && summary.open > 0 ? summary.open : null;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative -mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
                tab === t.id
                  ? "border-brand-600 text-brand-700"
                  : "border-transparent text-ink-500 hover:text-ink-800"
              }`}
            >
              {t.label}
              {count !== null && (
                <span className="ml-2 rounded-full bg-rose-100 px-1.5 text-xs text-rose-700">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-5">
        {tab === "paperwork" && (
          <PaperworkTab hire={hire} reference={reference} actions={actions} />
        )}
        {tab === "exceptions" && <ExceptionsTab hire={hire} actions={actions} />}
        {tab === "agent" && (
          <AgentPlanTab hire={hire} actions={actions} onOpenApproval={() => setShowApproval(true)} />
        )}
        {tab === "comms" && <CommsTab hire={hire} actions={actions} />}
        {tab === "packet" && <PacketTab hire={hire} actions={actions} />}
        {tab === "audit" && <AuditTab hire={hire} />}
      </div>

      {showApproval && (
        <ApprovalModal hire={hire} actions={actions} onClose={() => setShowApproval(false)} />
      )}
    </div>
  );
}

function HeaderStat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "good" | "warn" | "bad";
}) {
  const toneClass =
    tone === "good"
      ? "text-emerald-600"
      : tone === "warn"
        ? "text-amber-600"
        : tone === "bad"
          ? "text-rose-600"
          : "text-ink-900";
  return (
    <div className="rounded-lg border border-ink-200 bg-ink-50 px-3 py-2">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
        {label}
      </div>
      <div className={`text-xl font-bold ${toneClass}`}>{value}</div>
    </div>
  );
}
