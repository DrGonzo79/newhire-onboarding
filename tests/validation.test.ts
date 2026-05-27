import { describe, it, expect } from "vitest";
import { validateNewHire, validationSummary } from "@/lib/validation";
import { statusFromValidations } from "@/lib/status";
import { codes, validatedHire } from "./helpers";

// Primary demo: I-9 and direct deposit outstanding, W-4 + handbook on file,
// future start date, name only in the subject line (low confidence).
const DEMO_GAPS = `Subject: Offer accepted — Maria Santos, Server
Role: Server
Location: Brightline Café — Downtown
Pay: $16.50/hour
Start Date: 2099-06-08
Manager: Tonya Brooks
Email: maria.santos@example.com
SSN (last 4): 4821

Documents on file: W-4, Handbook
Still needed: I-9, Direct Deposit`;

describe("readiness engine - primary demo hire", () => {
  const hire = validatedHire(DEMO_GAPS);

  it("flags the missing I-9 as blocking", () => {
    expect(codes(hire)).toContain("MISSING_I9");
  });

  it("flags the missing direct deposit as blocking", () => {
    expect(codes(hire)).toContain("MISSING_DIRECT_DEPOSIT");
  });

  it("does not flag the on-file W-4 or handbook", () => {
    expect(codes(hire)).not.toContain("MISSING_W4");
    expect(codes(hire)).not.toContain("HANDBOOK_NOT_ACKNOWLEDGED");
  });

  it("flags the low-confidence employee name", () => {
    expect(codes(hire)).toContain("LOW_CONFIDENCE_FIELD");
  });

  it("is a doc-collection state, not a hard exception", () => {
    expect(statusFromValidations(hire.validations)).toBe("Collecting Docs");
    expect(validationSummary(hire.validations).blocking).toBeGreaterThanOrEqual(2);
  });
});

describe("readiness engine - hard blockers", () => {
  it("flags a start date that has already passed", () => {
    const hire = validatedHire(`Employee: Past Start
Role: Barista
Location: Brightline Café — Airport
Pay: $17.00/hour
Start Date: 2020-01-01
Email: past.start@example.com
SSN (last 4): 1212
Documents on file: I-9, W-4, Direct Deposit, Handbook, Emergency Contact, State Withholding`);
    expect(codes(hire)).toContain("START_DATE_IN_PAST");
    expect(statusFromValidations(hire.validations)).toBe("Exception");
  });

  it("flags a missing SSN", () => {
    const hire = validatedHire(`Employee: No Social
Role: Server
Location: Brightline Café — Downtown
Pay: $16.50/hour
Start Date: 2099-07-01
Email: no.social@example.com`);
    expect(codes(hire)).toContain("MISSING_SSN");
  });

  it("detects a duplicate employee record", () => {
    const hire = validatedHire(`Employee: Jamie Rivera
Role: Line Cook
Location: Brightline Kitchen — Westside
Pay: $20.00/hour
Start Date: 2099-07-01
Email: j.rivera@example.com
SSN (last 4): 1111
Documents on file: I-9, W-4, Direct Deposit, Handbook, Emergency Contact, State Withholding`);
    expect(codes(hire)).toContain("DUPLICATE_EMPLOYEE");
  });
});

describe("readiness engine - warnings", () => {
  it("flags a background check pending for a clinic role", () => {
    const hire = validatedHire(`Employee: Clinic Hire
Role: Medical Assistant
Location: Brightline Care Clinic — Midtown
Pay: $24.00/hour
Start Date: 2099-08-01
Email: clinic.hire@example.com
SSN (last 4): 3434
Documents on file: I-9, W-4, Direct Deposit, Handbook, Emergency Contact`);
    expect(codes(hire)).toContain("BACKGROUND_CHECK_PENDING");
  });

  it("flags a pay rate below the local minimum wage", () => {
    const hire = validatedHire(`Employee: Underpaid Cook
Role: Line Cook
Location: Brightline Kitchen — Westside
Pay: $15.00/hour
Start Date: 2099-08-01
Email: underpaid@example.com
SSN (last 4): 5656
Documents on file: I-9, W-4, Direct Deposit, Handbook, Emergency Contact, State Withholding`);
    expect(codes(hire)).toContain("PAY_RATE_BELOW_MINIMUM");
  });

  it("flags an unknown role", () => {
    const hire = validatedHire(`Employee: Space Cadet
Role: Astronaut
Location: Brightline Café — Downtown
Pay: $30.00/hour
Start Date: 2099-08-01
Email: space@example.com
SSN (last 4): 7878`);
    expect(codes(hire)).toContain("UNKNOWN_ROLE");
  });
});

describe("readiness engine - clear hire", () => {
  it("has no blocking exceptions when all docs are verified", () => {
    const hire = validatedHire(`Employee: Clean Hire
Role: Line Cook
Location: Brightline Kitchen — Westside
Pay: $20.00/hour
Start Date: 2099-09-01
Email: clean.hire@example.com
SSN (last 4): 9999
Documents on file: I-9, W-4, Direct Deposit, Handbook, Emergency Contact, State Withholding`);
    // All docs parsed as "signed"; mark them verified to clear the I-9
    // Section 2 warning the way a coordinator would.
    for (const doc of hire.documents) doc.status = "verified";
    hire.validations = validateNewHire(hire);
    const summary = validationSummary(hire.validations);
    expect(summary.blocking).toBe(0);
    expect(summary.warning).toBe(0);
    expect(statusFromValidations(hire.validations)).toBe("Ready for Day One");
  });
});
