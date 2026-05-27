import { describe, it, expect } from "vitest";
import { calculateRoi, DEFAULT_ROI_INPUTS } from "@/lib/metrics";

describe("new-hire ROI calculator", () => {
  it("computes minutes saved per hire", () => {
    const roi = calculateRoi(DEFAULT_ROI_INPUTS);
    // 95 manual - 8 AI-assisted = 87
    expect(roi.minutesSavedPerHire).toBe(87);
  });

  it("scales monthly savings with hires per month", () => {
    const low = calculateRoi({ ...DEFAULT_ROI_INPUTS, hiresPerMonth: 5 });
    const high = calculateRoi({ ...DEFAULT_ROI_INPUTS, hiresPerMonth: 50 });
    expect(high.monthlyLaborSavings).toBeGreaterThan(low.monthlyLaborSavings);
  });

  it("reduces compliance errors by the modeled factor", () => {
    const roi = calculateRoi({
      hiresPerMonth: 10,
      minutesPerHireManual: 90,
      hourlyLaborCost: 30,
      complianceErrorRatePct: 20,
      costPerComplianceError: 500,
    });
    // 10 hires * 20% = 2 errors/mo before; 80% avoided = 1.6 avoided.
    expect(roi.errorsPerMonthBefore).toBeCloseTo(2, 5);
    expect(roi.errorsAvoidedPerMonth).toBeCloseTo(1.6, 5);
  });

  it("never returns negative savings when AI is slower than manual", () => {
    const roi = calculateRoi({
      ...DEFAULT_ROI_INPUTS,
      minutesPerHireManual: 5,
      aiMinutesPerHire: 8,
    });
    expect(roi.minutesSavedPerHire).toBe(0);
  });

  it("totals labor savings and risk avoided", () => {
    const roi = calculateRoi(DEFAULT_ROI_INPUTS);
    expect(roi.totalAnnualValue).toBeCloseTo(
      roi.annualLaborSavings + roi.annualRiskAvoided,
      2
    );
  });
});
