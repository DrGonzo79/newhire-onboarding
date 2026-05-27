import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "New-Hire Paperwork Desk",
  description:
    "An accepted offer isn't a payroll-ready employee. AI new-hire onboarding & day-one readiness for SMBs.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="ml-60 flex-1">
            <div className="mx-auto max-w-[1280px] px-8 py-8">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
