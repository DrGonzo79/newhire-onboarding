"use client";

import { useEffect, useState } from "react";
import type { AgentStep, AgentStepStatus, NewHire } from "@/lib/types";
import type { NewHireActions } from "./types";

const STEP_TONE: Record<AgentStepStatus, string> = {
  Pending: "border-ink-200 bg-ink-50 text-ink-500",
  Running: "border-brand-200 bg-brand-50 text-brand-700",
  "Needs Human Approval": "border-amber-200 bg-amber-50 text-amber-700",
  Completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Failed: "border-rose-200 bg-rose-50 text-rose-700",
};

export default function AgentPlanTab({
  hire,
  actions,
  onOpenApproval,
}: {
  hire: NewHire;
  actions: NewHireActions;
  onOpenApproval: () => void;
}) {
  const [steps, setSteps] = useState<AgentStep[]>(hire.agentSteps);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    setSteps(hire.agentSteps);
  }, [hire.agentSteps]);

  const hasPlan = steps.length > 0;
  const allComplete = hasPlan && steps.every((s) => s.status === "Completed");
  const awaitingApproval = steps.some((s) => s.status === "Needs Human Approval");

  async function generate() {
    await actions.act("generateAgentPlan");
  }

  async function runSimulation() {
    setRunning(true);
    const next = hire.agentSteps.map((s) => ({ ...s }));
    for (let i = 0; i < next.length; i++) {
      if (next[i].requiresApproval) {
        next[i].status = "Needs Human Approval";
        setSteps([...next]);
        break;
      }
      next[i].status = "Running";
      setSteps([...next]);
      await new Promise((r) => setTimeout(r, 560));
      next[i].status = "Completed";
      setSteps([...next]);
      await new Promise((r) => setTimeout(r, 160));
    }
    setRunning(false);
  }

  const activeStep =
    [...steps]
      .reverse()
      .find(
        (s) =>
          s.status === "Running" ||
          s.status === "Completed" ||
          s.status === "Needs Human Approval"
      ) ?? null;

  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Plan */}
      <div className="space-y-4">
        <div className="card card-pad">
          <div className="flex items-center justify-between">
            <span className="section-title">Payroll &amp; Day-One Setup Plan</span>
            <span className="text-xs text-ink-400">Target: QuickBooks Workforce</span>
          </div>
          <p className="mt-1 text-xs text-ink-500">
            Simulated step-by-step actions an automation agent would perform to
            stand up the employee in payroll. The prototype never controls a real
            system.
          </p>

          {!hasPlan ? (
            <button onClick={generate} disabled={actions.busy} className="btn-primary mt-4">
              Generate Setup Plan
            </button>
          ) : (
            <ol className="mt-4 space-y-2">
              {steps.map((s, i) => (
                <li key={s.id} className="flex items-start gap-3 rounded-lg border border-ink-100 p-2.5">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink-100 text-xs font-bold text-ink-600">
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-ink-800">{s.label}</span>
                      <span className={`badge ${STEP_TONE[s.status]}`}>{s.status}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-ink-500">{s.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}

          {hasPlan && !allComplete && (
            <div className="mt-4 flex gap-2">
              <button
                onClick={runSimulation}
                disabled={running || actions.busy || awaitingApproval}
                className="btn-secondary"
              >
                {running ? "Agent running…" : "Run Agent Simulation"}
              </button>
              {awaitingApproval && (
                <button onClick={onOpenApproval} className="btn-primary">
                  Open Approval Gate
                </button>
              )}
            </div>
          )}

          {allComplete && (
            <div className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Workforce setup simulated and employee saved as draft. Hire status:{" "}
              <strong>{hire.status}</strong>.
            </div>
          )}
        </div>
      </div>

      {/* Mock Workforce screen */}
      <div>
        <div className="section-title mb-2">QuickBooks Workforce (simulated)</div>
        <div className="erp-screen rounded-lg p-4">
          <div className="mb-2 flex items-center justify-between border-b border-emerald-900/40 pb-2 text-xs">
            <span>QUICKBOOKS WORKFORCE — EMPLOYEE SETUP</span>
            <span>{hire.employeeName}</span>
          </div>
          <pre className="min-h-[260px] whitespace-pre-wrap text-xs leading-relaxed">
            {activeStep
              ? activeStep.simulatedScreenshotState
              : "READY.\n\nNo agent activity yet.\nGenerate and run the setup plan to\nsee the simulated Workforce screen update."}
          </pre>
        </div>
        <p className="mt-2 text-xs text-ink-400">
          In production this panel would be a live QuickBooks Workforce API / MCP
          session driven by the agent.
        </p>
      </div>
    </div>
  );
}
