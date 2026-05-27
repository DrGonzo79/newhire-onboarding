import type { DocStatus, NewHireStatus, Severity } from "@/lib/types";
import { STATUS_BADGE_TONE } from "@/lib/status";

// ---- Generic primitives -------------------------------------------------

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

const SEVERITY_TONE: Record<Severity, string> = {
  info: "bg-sky-50 text-sky-700 border-sky-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  blocking: "bg-rose-50 text-rose-700 border-rose-200",
};

const SEVERITY_LABEL: Record<Severity, string> = {
  info: "Info",
  warning: "Warning",
  blocking: "Blocking",
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return <span className={`badge ${SEVERITY_TONE[severity]}`}>{SEVERITY_LABEL[severity]}</span>;
}

export function ConfidenceBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  let tone = "bg-emerald-50 text-emerald-700 border-emerald-200";
  let label = "High";
  if (score < 0.8) {
    tone = "bg-amber-50 text-amber-700 border-amber-200";
    label = "Review";
  }
  if (score < 0.6) {
    tone = "bg-rose-50 text-rose-700 border-rose-200";
    label = "Low";
  }
  return (
    <span className={`badge ${tone}`} title={`${pct}% extraction confidence`}>
      {pct}% {label}
    </span>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
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
    <div className="card card-pad">
      <div className="text-xs font-semibold uppercase tracking-wide text-ink-500">
        {label}
      </div>
      <div className={`mt-2 text-2xl font-bold ${toneClass}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-ink-400">{hint}</div>}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="card card-pad text-center text-sm text-ink-500">{message}</div>
  );
}

// ---- New-hire badges ----------------------------------------------------

export function NewHireStatusBadge({ status }: { status: NewHireStatus }) {
  return <span className={`badge ${STATUS_BADGE_TONE[status]}`}>{status}</span>;
}

const DOC_STATUS_TONE: Record<DocStatus, string> = {
  not_sent: "border-ink-200 bg-ink-50 text-ink-600",
  sent: "border-sky-200 bg-sky-50 text-sky-700",
  signed: "border-brand-200 bg-brand-50 text-brand-700",
  needs_correction: "border-amber-200 bg-amber-50 text-amber-700",
  verified: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

const DOC_STATUS_LABEL: Record<DocStatus, string> = {
  not_sent: "Not sent",
  sent: "Sent",
  signed: "Signed",
  needs_correction: "Needs correction",
  verified: "Verified",
};

export function DocStatusBadge({ status }: { status: DocStatus }) {
  return (
    <span className={`badge ${DOC_STATUS_TONE[status]}`}>{DOC_STATUS_LABEL[status]}</span>
  );
}

export function ReadinessBadge({ score }: { score: number }) {
  let tone = "border-rose-200 bg-rose-50 text-rose-700";
  if (score >= 90) tone = "border-emerald-200 bg-emerald-50 text-emerald-700";
  else if (score >= 60) tone = "border-amber-200 bg-amber-50 text-amber-700";
  return (
    <span className={`badge ${tone}`} title="Day-one readiness">
      {score}% ready
    </span>
  );
}

export function SourceBadge({ source }: { source: string }) {
  const labels: Record<string, string> = {
    offer_email: "Accepted Offer",
    form: "Onboarding Form",
    manual: "Manual Import",
  };
  return (
    <span className="badge border-ink-200 bg-ink-50 text-ink-600">
      {labels[source] ?? source}
    </span>
  );
}
