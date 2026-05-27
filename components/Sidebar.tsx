"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Dashboard", icon: "▦" },
  { href: "/intake", label: "Import Offer", icon: "⬆" },
  { href: "/metrics", label: "Metrics / ROI", icon: "📈" },
  { href: "/settings", label: "Settings / Rules", icon: "⚙" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-20 flex w-60 flex-col bg-ink-900 text-ink-100">
      <div className="border-b border-ink-700 px-5 py-5">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500 text-lg font-bold text-white">
            N
          </div>
          <div>
            <div className="text-sm font-bold leading-tight text-white">
              New-Hire Desk
            </div>
            <div className="text-[11px] leading-tight text-ink-400">
              Day-one readiness for SMBs
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-brand-600 text-white"
                  : "text-ink-300 hover:bg-ink-800 hover:text-white"
              }`}
            >
              <span className="w-4 text-center text-xs">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-ink-700 px-5 py-4">
        <div className="rounded-lg bg-ink-800 p-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">
            Demo Workspace
          </div>
          <div className="mt-1 text-xs text-ink-300">Brightline Hospitality Group</div>
          <div className="mt-2 text-[11px] text-ink-500">
            Mock data · no live HRIS
          </div>
        </div>
      </div>
    </aside>
  );
}
