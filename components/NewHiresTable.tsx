import Link from "next/link";
import type { NewHire } from "@/lib/types";
import { relativeTime } from "@/lib/utils";
import { validationSummary } from "@/lib/validation";
import { NewHireStatusBadge, ReadinessBadge, SourceBadge } from "./ui";

export default function NewHiresTable({ hires }: { hires: NewHire[] }) {
  if (!hires.length) {
    return (
      <div className="card card-pad text-center text-sm text-ink-500">
        No hires yet. Import an accepted offer to get started.
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-ink-200 bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-500">
            <th className="px-4 py-3 font-semibold">Employee</th>
            <th className="px-4 py-3 font-semibold">Role / Location</th>
            <th className="px-4 py-3 font-semibold">Source</th>
            <th className="px-4 py-3 font-semibold">Created</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 text-center font-semibold">Readiness</th>
            <th className="px-4 py-3 text-center font-semibold">Exceptions</th>
            <th className="px-4 py-3 font-semibold">Coordinator</th>
          </tr>
        </thead>
        <tbody>
          {hires.map((h) => {
            const summary = validationSummary(h.validations);
            const openIssues = summary.blocking + summary.warning;
            return (
              <tr
                key={h.id}
                className="border-b border-ink-100 last:border-0 hover:bg-brand-50/40"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/hires/${h.id}`}
                    className="font-semibold text-brand-700 hover:underline"
                  >
                    {h.employeeName || "Unknown employee"}
                  </Link>
                </td>
                <td className="px-4 py-3 text-xs text-ink-600">
                  <div className="font-medium text-ink-700">{h.role || "—"}</div>
                  <div className="text-ink-400">{h.location || "—"}</div>
                </td>
                <td className="px-4 py-3">
                  <SourceBadge source={h.sourceType} />
                </td>
                <td className="px-4 py-3 text-ink-500">
                  {relativeTime(h.createdAt)}
                </td>
                <td className="px-4 py-3">
                  <NewHireStatusBadge status={h.status} />
                </td>
                <td className="px-4 py-3 text-center">
                  <ReadinessBadge score={h.readiness} />
                </td>
                <td className="px-4 py-3 text-center">
                  {openIssues > 0 ? (
                    <span
                      className={`badge ${
                        summary.blocking > 0
                          ? "border-rose-200 bg-rose-50 text-rose-700"
                          : "border-amber-200 bg-amber-50 text-amber-700"
                      }`}
                    >
                      {openIssues} open
                    </span>
                  ) : (
                    <span className="badge border-emerald-200 bg-emerald-50 text-emerald-700">
                      clear
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-ink-600">{h.assignedCoordinator}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
