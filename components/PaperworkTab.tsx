"use client";

import { useEffect, useState } from "react";
import type { NewHire, OnboardingDocument } from "@/lib/types";
import type { NewHireActions, ReferenceData } from "./types";
import { ConfidenceBadge } from "@/components/ui";
import { DocStatusBadge } from "./ui";

type Opt = { value: string; label: string };

export default function PaperworkTab({
  hire,
  reference,
  actions,
}: {
  hire: NewHire;
  reference: ReferenceData;
  actions: NewHireActions;
}) {
  const [profile, setProfile] = useState<Record<string, string>>({});

  useEffect(() => {
    setProfile({
      employeeName: hire.employeeName ?? "",
      role: hire.role ?? "",
      location: hire.location ?? "",
      employmentType: hire.employmentType ?? "",
      payType: hire.payType ?? "",
      payRate: hire.payRate != null ? String(hire.payRate) : "",
      startDate: hire.startDate ?? "",
      manager: hire.manager ?? "",
      email: hire.email ?? "",
      phone: hire.phone ?? "",
      ssnLast4: hire.ssnLast4 ?? "",
    });
  }, [hire]);

  function current(key: string): string {
    const v = (hire as unknown as Record<string, unknown>)[key];
    return v != null ? String(v) : "";
  }

  function save(key: string) {
    if (profile[key] !== current(key)) actions.patch({ [key]: profile[key] });
  }

  function saveValue(key: string, value: string) {
    setProfile((p) => ({ ...p, [key]: value }));
    if (value !== current(key)) actions.patch({ [key]: value });
  }

  const roleOpts: Opt[] = reference.roles.map((r) => ({ value: r.title, label: r.title }));
  const locationOpts: Opt[] = reference.locations.map((l) => ({ value: l.name, label: l.name }));
  const managerOpts: Opt[] = reference.managers.map((m) => ({ value: m, label: m }));
  const employmentOpts: Opt[] = Object.entries(reference.employmentTypeLabels).map(
    ([value, label]) => ({ value, label })
  );

  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Raw source */}
      <div className="card">
        <div className="border-b border-ink-200 px-4 py-2.5">
          <span className="section-title">Accepted Offer / Source</span>
        </div>
        <pre className="max-h-[560px] overflow-auto whitespace-pre-wrap p-4 text-xs leading-relaxed text-ink-700">
          {hire.sourceText}
        </pre>
      </div>

      {/* Extracted profile */}
      <div className="space-y-4">
        <div className="card card-pad">
          <div className="section-title mb-3">Extracted Employee Profile</div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Employee Name" fieldKey="employeeName" hire={hire} profile={profile} setProfile={setProfile} onSave={save} className="col-span-2" />
            <SelectField label="Role" fieldKey="role" hire={hire} value={profile.role} options={roleOpts} onSave={saveValue} />
            <SelectField label="Location" fieldKey="location" hire={hire} value={profile.location} options={locationOpts} onSave={saveValue} />
            <SelectField label="Employment Type" fieldKey="employmentType" hire={hire} value={profile.employmentType} options={employmentOpts} onSave={saveValue} />
            <SelectField label="Pay Type" fieldKey="payType" hire={hire} value={profile.payType} options={[{ value: "hourly", label: "Hourly" }, { value: "salary", label: "Salary" }]} onSave={saveValue} />
            <Field label="Pay Rate" fieldKey="payRate" type="number" hire={hire} profile={profile} setProfile={setProfile} onSave={save} />
            <Field label="Start Date" fieldKey="startDate" type="date" hire={hire} profile={profile} setProfile={setProfile} onSave={save} />
            <SelectField label="Manager" fieldKey="manager" hire={hire} value={profile.manager} options={managerOpts} onSave={saveValue} />
            <Field label="SSN (last 4)" fieldKey="ssnLast4" hire={hire} profile={profile} setProfile={setProfile} onSave={save} />
            <Field label="Email" fieldKey="email" hire={hire} profile={profile} setProfile={setProfile} onSave={save} />
            <Field label="Phone" fieldKey="phone" hire={hire} profile={profile} setProfile={setProfile} onSave={save} />
          </div>
        </div>
        <div className="rounded-lg border border-brand-200 bg-brand-50 p-3 text-xs text-brand-800">
          Fields flagged <strong>amber</strong> are low-confidence or missing and
          need human review. Editing a field marks it as human-verified.
        </div>
      </div>

      {/* Documents — full width */}
      <div className="col-span-2 card">
        <div className="border-b border-ink-200 px-4 py-2.5">
          <span className="section-title">Required Paperwork</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-200 bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-500">
              <th className="px-4 py-2 font-semibold">Document</th>
              <th className="px-4 py-2 font-semibold">Status</th>
              <th className="px-4 py-2 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {hire.documents.map((doc) => (
              <DocumentRow key={doc.id} doc={doc} actions={actions} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function fieldFlags(hire: NewHire, key: string, value: string) {
  const conf = hire.fieldConfidence[key] ?? 0;
  const low = conf > 0 && conf < 0.8;
  const missing = conf === 0 && !value;
  return { conf, low, missing };
}

function Field({
  label,
  fieldKey,
  type = "text",
  hire,
  profile,
  setProfile,
  onSave,
  className = "",
}: {
  label: string;
  fieldKey: string;
  type?: string;
  hire: NewHire;
  profile: Record<string, string>;
  setProfile: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onSave: (key: string) => void;
  className?: string;
}) {
  const value = profile[fieldKey] ?? "";
  const { conf, low, missing } = fieldFlags(hire, fieldKey, value);
  return (
    <div className={className}>
      <div className="flex items-center justify-between">
        <label className="label mb-0">{label}</label>
        {missing ? (
          <span className="badge border-rose-200 bg-rose-50 text-rose-700">Missing</span>
        ) : conf > 0 ? (
          <ConfidenceBadge score={conf} />
        ) : null}
      </div>
      <input
        type={type}
        value={value}
        onChange={(e) => setProfile((p) => ({ ...p, [fieldKey]: e.target.value }))}
        onBlur={() => onSave(fieldKey)}
        className={`input mt-1 ${low || missing ? "border-amber-300 ring-1 ring-amber-200" : ""}`}
        placeholder={missing ? "Needs review" : ""}
      />
    </div>
  );
}

function SelectField({
  label,
  fieldKey,
  hire,
  value,
  options,
  onSave,
}: {
  label: string;
  fieldKey: string;
  hire: NewHire;
  value: string;
  options: Opt[];
  onSave: (key: string, value: string) => void;
}) {
  const { conf, low, missing } = fieldFlags(hire, fieldKey, value);
  const opts = value && !options.some((o) => o.value === value)
    ? [{ value, label: `${value} (unmatched)` }, ...options]
    : options;
  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="label mb-0">{label}</label>
        {missing ? (
          <span className="badge border-rose-200 bg-rose-50 text-rose-700">Missing</span>
        ) : conf > 0 ? (
          <ConfidenceBadge score={conf} />
        ) : null}
      </div>
      <select
        value={value}
        onChange={(e) => onSave(fieldKey, e.target.value)}
        className={`input mt-1 ${low || missing ? "border-amber-300 ring-1 ring-amber-200" : ""}`}
      >
        <option value="">—</option>
        {opts.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function DocumentRow({
  doc,
  actions,
}: {
  doc: OnboardingDocument;
  actions: NewHireActions;
}) {
  function set(status: string) {
    actions.act("setDocStatus", { docId: doc.id, status });
  }
  return (
    <tr className="border-b border-ink-100 last:border-0">
      <td className="px-4 py-2.5">
        <span className="font-medium text-ink-800">{doc.label}</span>
        {doc.required && (
          <span className="ml-2 text-[11px] font-semibold uppercase text-ink-400">
            required
          </span>
        )}
      </td>
      <td className="px-4 py-2.5">
        <DocStatusBadge status={doc.status} />
      </td>
      <td className="px-4 py-2.5">
        <div className="flex flex-wrap gap-1">
          {doc.status === "not_sent" && (
            <button onClick={() => set("sent")} disabled={actions.busy} className="btn-ghost px-2 py-1 text-xs">
              Send request
            </button>
          )}
          {doc.status !== "signed" && doc.status !== "verified" && (
            <button onClick={() => set("signed")} disabled={actions.busy} className="btn-ghost px-2 py-1 text-xs">
              Mark signed
            </button>
          )}
          {doc.status !== "verified" && (
            <button onClick={() => set("verified")} disabled={actions.busy} className="btn-ghost px-2 py-1 text-xs text-emerald-700">
              Verify
            </button>
          )}
          {doc.status !== "needs_correction" && doc.status !== "not_sent" && (
            <button onClick={() => set("needs_correction")} disabled={actions.busy} className="btn-ghost px-2 py-1 text-xs text-amber-700">
              Needs fix
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
