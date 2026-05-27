import {
  DOC_LABELS,
  EXISTING_EMPLOYEES,
  HANDBOOK_VERSION,
  LOCATIONS,
  ROLES,
  STATES_WITH_INCOME_TAX,
  requiredDocsFor,
} from "@/lib/mockData";
import { formatCurrency } from "@/lib/utils";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default function NewHireSettingsPage() {
  return (
    <div>
      <PageHeader
        title="New-Hire Settings / Rules"
        subtitle="Reference data the readiness engine reads. In production this syncs from the HRIS / QuickBooks Workforce."
      />

      {/* Roles */}
      <div className="card mb-6">
        <div className="border-b border-ink-200 px-4 py-2.5">
          <span className="section-title">Roles &amp; Required Documents</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-200 bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-500">
              <th className="px-4 py-2 font-semibold">Role</th>
              <th className="px-4 py-2 font-semibold">Pay Type</th>
              <th className="px-4 py-2 text-right font-semibold">Default Rate</th>
              <th className="px-4 py-2 font-semibold">Background Check</th>
            </tr>
          </thead>
          <tbody>
            {ROLES.map((r) => (
              <tr key={r.id} className="border-b border-ink-100 last:border-0">
                <td className="px-4 py-2 font-semibold text-ink-800">{r.title}</td>
                <td className="px-4 py-2 text-ink-600">{r.payType}</td>
                <td className="px-4 py-2 text-right text-ink-700">
                  {r.payType === "salary"
                    ? formatCurrency(r.defaultPayRate)
                    : `${formatCurrency(r.defaultPayRate)}/hr`}
                </td>
                <td className="px-4 py-2">
                  {r.requiresBackgroundCheck ? (
                    <span className="badge border-amber-200 bg-amber-50 text-amber-700">Required</span>
                  ) : (
                    <span className="badge border-ink-200 bg-ink-50 text-ink-500">Not required</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Locations */}
      <div className="card mb-6">
        <div className="border-b border-ink-200 px-4 py-2.5">
          <span className="section-title">Locations &amp; Wage Floors</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-200 bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-500">
              <th className="px-4 py-2 font-semibold">Location</th>
              <th className="px-4 py-2 font-semibold">State</th>
              <th className="px-4 py-2 text-right font-semibold">Min Wage</th>
              <th className="px-4 py-2 font-semibold">State Tax Form</th>
            </tr>
          </thead>
          <tbody>
            {LOCATIONS.map((l) => (
              <tr key={l.id} className="border-b border-ink-100 last:border-0">
                <td className="px-4 py-2 font-semibold text-ink-800">{l.name}</td>
                <td className="px-4 py-2 text-ink-600">{l.state}</td>
                <td className="px-4 py-2 text-right text-ink-700">{formatCurrency(l.minWage)}/hr</td>
                <td className="px-4 py-2 text-ink-600">
                  {STATES_WITH_INCOME_TAX.has(l.state) ? "Required" : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="card card-pad">
          <div className="section-title mb-3">Active Readiness Rules</div>
          <ul className="space-y-1.5 text-sm text-ink-600">
            {[
              "Missing SSN (blocking)",
              "Start date already passed (blocking)",
              "Duplicate employee record (blocking)",
              "Form I-9 not signed (blocking)",
              "Form W-4 not signed (blocking)",
              "Direct deposit not set up (blocking)",
              "Background check pending where required (blocking)",
              "I-9 Section 2 not verified (warning)",
              "Handbook not acknowledged (warning)",
              "Emergency contact missing (warning)",
              "State withholding form outstanding (warning)",
              "Pay rate below local minimum (warning)",
              "Unknown role / location (warning)",
              "Low extraction confidence (info)",
            ].map((r) => (
              <li key={r} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
                {r}
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-6">
          <div className="card card-pad">
            <div className="section-title mb-3">Base Required Documents</div>
            <p className="mb-2 text-xs text-ink-500">{HANDBOOK_VERSION}</p>
            <div className="flex flex-wrap gap-2">
              {requiredDocsFor("Server", "Brightline Café — Downtown").map((d) => (
                <span key={d} className="badge border-ink-200 bg-ink-50 text-ink-600">
                  {DOC_LABELS[d]}
                </span>
              ))}
            </div>
          </div>

          <div className="card card-pad">
            <div className="section-title mb-3">Existing Employees (duplicate check)</div>
            <div className="flex flex-wrap gap-2">
              {EXISTING_EMPLOYEES.map((e) => (
                <span key={e.email} className="badge border-ink-200 bg-ink-50 font-mono text-ink-600">
                  {e.email} · ••{e.ssnLast4}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
