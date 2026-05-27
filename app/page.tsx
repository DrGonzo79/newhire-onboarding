import Link from "next/link";
import { listNewHires } from "@/lib/store";
import { computeMetrics } from "@/lib/metrics";
import { NEWHIRE_STATUS_FLOW, STATUS_BADGE_TONE } from "@/lib/status";
import type { NewHireStatus } from "@/lib/types";
import NewHiresTable from "@/components/NewHiresTable";
import { PageHeader, StatCard } from "@/components/ui";

export const dynamic = "force-dynamic";

const ALL_STATUSES: NewHireStatus[] = [...NEWHIRE_STATUS_FLOW, "Exception"];

export default function NewHireDashboardPage() {
  const hires = listNewHires();
  const metrics = computeMetrics(hires);

  const counts = ALL_STATUSES.map((status) => ({
    status,
    count: hires.filter((h) => h.status === status).length,
  }));

  const needsAttention = hires.filter(
    (h) => h.status === "Exception" || h.status === "Needs Review"
  );

  return (
    <div>
      <PageHeader
        title="New-Hire Desk"
        subtitle="An accepted offer isn't a payroll-ready employee. Live view of who's ready for day one."
        actions={
          <>
            <Link href="/intake" className="btn-secondary">
              Import Offer
            </Link>
            <Link href="/intake?demo=1" className="btn-primary">
              Run Demo Hire
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Hires in Pipeline" value={String(metrics.hiresProcessed)} hint="Currently onboarding" />
        <StatCard
          label="Avg Readiness"
          value={`${metrics.averageReadinessPct}%`}
          hint="Day-one readiness across hires"
          tone={metrics.averageReadinessPct >= 85 ? "good" : "warn"}
        />
        <StatCard
          label="Ready for Day One"
          value={String(metrics.readyForDayOne)}
          hint={`${metrics.hiresWithOpenDocs} still collecting docs`}
          tone="good"
        />
        <StatCard
          label="Exception Rate"
          value={`${metrics.exceptionRatePct}%`}
          tone={metrics.exceptionRatePct > 25 ? "bad" : "default"}
        />
      </div>

      <div className="mt-6 grid grid-cols-3 gap-6">
        <div className="col-span-2 card card-pad">
          <div className="section-title mb-4">Pipeline by Status</div>
          <div className="space-y-2">
            {counts.map(({ status, count }) => {
              const max = Math.max(1, ...counts.map((c) => c.count));
              return (
                <div key={status} className="flex items-center gap-3">
                  <div className="w-36 shrink-0">
                    <span className={`badge ${STATUS_BADGE_TONE[status]}`}>{status}</span>
                  </div>
                  <div className="h-5 flex-1 overflow-hidden rounded bg-ink-100">
                    <div
                      className="h-full rounded bg-brand-400"
                      style={{ width: `${(count / max) * 100}%` }}
                    />
                  </div>
                  <div className="w-8 text-right text-sm font-semibold text-ink-700">{count}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card card-pad">
          <div className="section-title mb-4">Needs Attention</div>
          {needsAttention.length === 0 ? (
            <p className="text-sm text-ink-500">No hires are blocked. Pipeline is clear.</p>
          ) : (
            <ul className="space-y-3">
              {needsAttention.map((h) => (
                <li key={h.id}>
                  <Link
                    href={`/hires/${h.id}`}
                    className="block rounded-lg border border-ink-200 p-3 hover:bg-ink-50"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-ink-800">{h.employeeName}</span>
                      <span className={`badge ${STATUS_BADGE_TONE[h.status]}`}>{h.status}</span>
                    </div>
                    <div className="mt-1 text-xs text-ink-500">
                      {h.role || "role TBD"} &middot;{" "}
                      {h.validations.filter((v) => !v.resolved).length} open issue(s)
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-6">
        <div className="section-title mb-3">Recent Hires</div>
        <NewHiresTable hires={hires.slice(0, 8)} />
      </div>
    </div>
  );
}
