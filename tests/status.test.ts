import { describe, it, expect } from "vitest";
import {
  applyValidationStatus,
  canTransition,
  statusFromValidations,
} from "@/lib/status";
import type { Severity, ValidationResult } from "@/lib/types";

function v(code: string, severity: Severity): ValidationResult {
  return {
    id: `${code}`,
    severity,
    code,
    message: code,
    suggestedFix: "",
    fieldPath: "test",
    resolved: false,
  };
}

describe("statusFromValidations", () => {
  it("returns Ready for Day One when there are no open issues", () => {
    expect(statusFromValidations([])).toBe("Ready for Day One");
  });

  it("returns Needs Review for warnings only", () => {
    expect(statusFromValidations([v("HANDBOOK_NOT_ACKNOWLEDGED", "warning")])).toBe(
      "Needs Review"
    );
  });

  it("returns Collecting Docs when blockers are only outstanding documents", () => {
    expect(
      statusFromValidations([
        v("MISSING_I9", "blocking"),
        v("MISSING_DIRECT_DEPOSIT", "blocking"),
      ])
    ).toBe("Collecting Docs");
  });

  it("returns Exception when a real problem blocks the hire", () => {
    expect(
      statusFromValidations([
        v("MISSING_I9", "blocking"),
        v("DUPLICATE_EMPLOYEE", "blocking"),
      ])
    ).toBe("Exception");
  });

  it("ignores resolved validations", () => {
    const resolved = { ...v("MISSING_SSN", "blocking"), resolved: true };
    expect(statusFromValidations([resolved])).toBe("Ready for Day One");
  });
});

describe("applyValidationStatus", () => {
  it("never regresses an onboarded hire", () => {
    expect(applyValidationStatus("Onboarded", [v("MISSING_I9", "blocking")])).toBe(
      "Onboarded"
    );
  });

  it("recomputes a review-phase hire", () => {
    expect(applyValidationStatus("Collecting Docs", [])).toBe("Ready for Day One");
  });
});

describe("canTransition", () => {
  it("allows Ready for Day One to Onboarded", () => {
    expect(canTransition("Ready for Day One", "Onboarded")).toBe(true);
  });

  it("does not allow transitions out of Onboarded", () => {
    expect(canTransition("Onboarded", "Needs Review")).toBe(false);
  });
});
