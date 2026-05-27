"use client";

import { useState } from "react";
import { calculateRoi, DEFAULT_ROI_INPUTS, type RoiInputs } from "@/lib/metrics";
import { formatCurrency } from "@/lib/utils";

const FIELDS: Array<{ key: keyof RoiInputs; label: string }> = [
  { key: "hiresPerMonth", label: "New hires per month" },
  { key: "minutesPerHireManual", label: "Minutes per hire (manual paperwork)" },
  { key: "hourlyLaborCost", label: "Fully-loaded hourly labor cost ($)" },
  { key: "complianceErrorRatePct", label: "Compliance/paperwork error rate (%)" },
  { key: "costPerComplianceError", label: "Cost per compliance error ($)" },
];

export default function RoiCalculator() {
  const [inputs, setInputs] = useState<RoiInputs>(DEFAULT_ROI_INPUTS);
  const roi = calculateRoi(inputs);

  return (
    <div className="grid grid-cols-2 gap-6">
      <div className="card card-pad">
        <div className="section-title mb-3">ROI Calculator — Inputs</div>
        <div className="space-y-3">
          {FIELDS.map((f) => (
            <div key={f.key}>
              <label className="label">{f.label}</label>
              <input
                type="number"
                value={inputs[f.key] ?? 0}
                onChange={(e) =>
                  setInputs({ ...inputs, [f.key]: Number(e.target.value) })
                }
                className="input"
              />
            </div>
          ))}
          <p className="text-xs text-ink-400">
            AI-assisted onboarding is modeled at 8 minutes of human review per
            hire with an 80% reduction in compliance/paperwork errors.
          </p>
        </div>
      </div>

      <div className="card card-pad">
        <div className="section-title mb-3">Projected Impact</div>
        <div className="space-y-3">
          <RoiRow label="Minutes saved per hire" value={`${roi.minutesSavedPerHire} min`} />
          <RoiRow label="Capacity reclaimed" value={`${roi.capacityReclaimedPct}%`} />
          <RoiRow label="Hours saved per month" value={`${roi.monthlyHoursSaved} hrs`} />
          <RoiRow label="Errors avoided per month" value={String(roi.errorsAvoidedPerMonth)} />
          <div className="my-2 border-t border-ink-100" />
          <RoiRow label="Monthly labor savings" value={formatCurrency(roi.monthlyLaborSavings)} />
          <RoiRow label="Annual labor savings" value={formatCurrency(roi.annualLaborSavings)} />
          <RoiRow label="Annual compliance risk avoided" value={formatCurrency(roi.annualRiskAvoided)} />
          <div className="mt-3 rounded-lg bg-emerald-50 px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
              Total estimated annual value
            </div>
            <div className="text-2xl font-bold text-emerald-700">
              {formatCurrency(roi.totalAnnualValue)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RoiRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-ink-500">{label}</span>
      <span className="font-semibold text-ink-900">{value}</span>
    </div>
  );
}
