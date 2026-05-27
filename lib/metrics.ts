import type { NewHire } from "./types";

// ---- Metrics Module -----------------------------------------------------
// ROI calculator (pure) plus process analytics computed from live hires.

export interface RoiInputs {
  hiresPerMonth: number;
  minutesPerHireManual: number;
  hourlyLaborCost: number;
  complianceErrorRatePct: number;
  costPerComplianceError: number;
  aiMinutesPerHire?: number;
}

export interface RoiOutputs {
  minutesSavedPerHire: number;
  monthlyMinutesSaved: number;
  monthlyHoursSaved: number;
  monthlyLaborSavings: number;
  annualLaborSavings: number;
  errorsPerMonthBefore: number;
  errorsPerMonthAfter: number;
  errorsAvoidedPerMonth: number;
  monthlyRiskAvoided: number;
  annualRiskAvoided: number;
  capacityReclaimedPct: number;
  totalAnnualValue: number;
}

const MONTHS_PER_YEAR = 12;
const DEFAULT_AI_MINUTES = 8;
// AI-assisted onboarding is assumed to remove ~80% of compliance/paperwork
// errors (missing forms, late I-9 verification, payroll mistakes).
const ERROR_REDUCTION = 0.8;

export function calculateRoi(inputs: RoiInputs): RoiOutputs {
  const hiresPerMonth = Math.max(0, inputs.hiresPerMonth);
  const manualMinutes = Math.max(0, inputs.minutesPerHireManual);
  const aiMinutes = Math.max(0, inputs.aiMinutesPerHire ?? DEFAULT_AI_MINUTES);
  const hourlyCost = Math.max(0, inputs.hourlyLaborCost);
  const errorRate = Math.max(0, inputs.complianceErrorRatePct) / 100;
  const costPerError = Math.max(0, inputs.costPerComplianceError);

  const minutesSavedPerHire = Math.max(0, manualMinutes - aiMinutes);
  const monthlyMinutesSaved = minutesSavedPerHire * hiresPerMonth;
  const monthlyHoursSaved = monthlyMinutesSaved / 60;
  const monthlyLaborSavings = monthlyHoursSaved * hourlyCost;
  const annualLaborSavings = monthlyLaborSavings * MONTHS_PER_YEAR;

  const errorsPerMonthBefore = hiresPerMonth * errorRate;
  const errorsAvoidedPerMonth = errorsPerMonthBefore * ERROR_REDUCTION;
  const errorsPerMonthAfter = errorsPerMonthBefore - errorsAvoidedPerMonth;

  const monthlyRiskAvoided = errorsAvoidedPerMonth * costPerError;
  const annualRiskAvoided = monthlyRiskAvoided * MONTHS_PER_YEAR;

  const capacityReclaimedPct =
    manualMinutes > 0 ? (minutesSavedPerHire / manualMinutes) * 100 : 0;

  return {
    minutesSavedPerHire: round(minutesSavedPerHire),
    monthlyMinutesSaved: round(monthlyMinutesSaved),
    monthlyHoursSaved: round(monthlyHoursSaved, 2),
    monthlyLaborSavings: round(monthlyLaborSavings, 2),
    annualLaborSavings: round(annualLaborSavings, 2),
    errorsPerMonthBefore: round(errorsPerMonthBefore, 2),
    errorsPerMonthAfter: round(errorsPerMonthAfter, 2),
    errorsAvoidedPerMonth: round(errorsAvoidedPerMonth, 2),
    monthlyRiskAvoided: round(monthlyRiskAvoided, 2),
    annualRiskAvoided: round(annualRiskAvoided, 2),
    capacityReclaimedPct: round(capacityReclaimedPct, 1),
    totalAnnualValue: round(annualLaborSavings + annualRiskAvoided, 2),
  };
}

function round(n: number, dp = 0): number {
  const f = Math.pow(10, dp);
  return Math.round(n * f) / f;
}

export const DEFAULT_ROI_INPUTS: RoiInputs = {
  hiresPerMonth: 12,
  minutesPerHireManual: 95,
  hourlyLaborCost: 34,
  complianceErrorRatePct: 18,
  costPerComplianceError: 650,
  aiMinutesPerHire: 8,
};

// ---- Live process analytics --------------------------------------------

export interface NewHireMetrics {
  hiresProcessed: number;
  averageReadinessPct: number;
  readyForDayOne: number;
  exceptionRatePct: number;
  hiresWithOpenDocs: number;
  estimatedLaborCostSaved: number;
  complianceIssuesCaught: number;
  manualAvgMinutes: number;
  aiAssistedAvgMinutes: number;
}

export function computeMetrics(hires: NewHire[]): NewHireMetrics {
  const manualAvgMinutes = 95;
  const aiAssistedAvgMinutes = 8;
  const hourlyCost = 34;

  const processed = hires.filter((h) => h.status !== "New");
  const count = processed.length;

  const readinessScores = processed.map((h) => h.readiness);
  const averageReadiness = readinessScores.length
    ? readinessScores.reduce((a, b) => a + b, 0) / readinessScores.length
    : 0;

  const readyForDayOne = hires.filter(
    (h) => h.status === "Ready for Day One" || h.status === "Onboarded"
  ).length;

  const exceptions = hires.filter(
    (h) =>
      h.status === "Exception" ||
      h.validations.some((v) => !v.resolved && v.severity === "blocking")
  ).length;

  const openDocs = hires.filter((h) =>
    h.documents.some(
      (d) => d.required && d.status !== "verified" && d.status !== "signed"
    )
  ).length;

  const minutesSaved = count * (manualAvgMinutes - aiAssistedAvgMinutes);
  const laborSaved = (minutesSaved / 60) * hourlyCost;

  const complianceIssuesCaught = hires.reduce(
    (sum, h) =>
      sum +
      h.validations.filter((v) => v.severity !== "info").length,
    0
  );

  return {
    hiresProcessed: count,
    averageReadinessPct: Math.round(averageReadiness * 10) / 10,
    readyForDayOne,
    exceptionRatePct: hires.length
      ? Math.round((exceptions / hires.length) * 1000) / 10
      : 0,
    hiresWithOpenDocs: openDocs,
    estimatedLaborCostSaved: Math.round(laborSaved * 100) / 100,
    complianceIssuesCaught,
    manualAvgMinutes,
    aiAssistedAvgMinutes,
  };
}
