import { listNewHires } from "@/lib/store";
import { computeMetrics } from "@/lib/metrics";
import { formatCurrency } from "@/lib/utils";
import { PageHeader, StatCard } from "@/components/ui";
import RoiCalculator from "@/components/RoiCalculator";

export const dynamic = "force-dynamic";

export default function NewHireMetricsPage() {
  const hires = listNewHires();
  const m = computeMetrics(hires);

  return (
    <div>
      <PageHeader
        title="New-Hire Metrics / ROI"
        subtitle="Onboarding analytics from the live pipeline, plus a configurable ROI model."
      />

      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Hires Processed" value={String(m.hiresProcessed)} />
        <StatCard
          label="Avg Readiness"
          value={`${m.averageReadinessPct}%`}
          tone={m.averageReadinessPct >= 85 ? "good" : "warn"}
        />
        <StatCard label="Ready for Day One" value={String(m.readyForDayOne)} tone="good" />
        <StatCard
          label="Exception Rate"
          value={`${m.exceptionRatePct}%`}
          tone={m.exceptionRatePct > 25 ? "bad" : "default"}
        />
        <StatCard
          label="Manual Minutes Saved"
          value={`${m.manualAvgMinutes - m.aiAssistedAvgMinutes} min`}
          hint={`${m.manualAvgMinutes} min manual vs ${m.aiAssistedAvgMinutes} min AI-assisted per hire`}
        />
        <StatCard
          label="Hires Collecting Docs"
          value={`${m.hiresWithOpenDocs}`}
          tone={m.hiresWithOpenDocs > 0 ? "warn" : "good"}
        />
        <StatCard label="Compliance Issues Caught" value={String(m.complianceIssuesCaught)} tone="good" />
        <StatCard label="Est. Labor Cost Saved" value={formatCurrency(m.estimatedLaborCostSaved)} tone="good" />
      </div>

      <div className="mt-6 card card-pad">
        <div className="section-title mb-3">Onboarding Time: Before vs After</div>
        <div className="space-y-3">
          <TimeBar label="Manual" minutes={m.manualAvgMinutes} max={m.manualAvgMinutes} tone="bg-rose-400" />
          <TimeBar label="AI-assisted" minutes={m.aiAssistedAvgMinutes} max={m.manualAvgMinutes} tone="bg-emerald-400" />
        </div>
        <p className="mt-3 text-xs text-ink-500">
          AI-assisted onboarding is roughly{" "}
          <strong>
            {Math.round((1 - m.aiAssistedAvgMinutes / m.manualAvgMinutes) * 100)}% faster
          </strong>{" "}
          per hire in this model — the coordinator reviews and approves instead of
          chasing forms.
        </p>
      </div>

      <div className="mt-6">
        <RoiCalculator />
      </div>
    </div>
  );
}

function TimeBar({
  label,
  minutes,
  max,
  tone,
}: {
  label: string;
  minutes: number;
  max: number;
  tone: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 text-sm text-ink-600">{label}</span>
      <div className="h-6 flex-1 overflow-hidden rounded bg-ink-100">
        <div
          className={`flex h-full items-center justify-end rounded px-2 text-xs font-semibold text-white ${tone}`}
          style={{ width: `${Math.max(8, (minutes / max) * 100)}%` }}
        >
          {minutes} min
        </div>
      </div>
    </div>
  );
}
