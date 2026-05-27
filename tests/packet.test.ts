import { describe, it, expect } from "vitest";
import { validateNewHire, estimateReadiness } from "@/lib/validation";
import { buildReadinessPacket } from "@/lib/packet";
import { makeHire } from "./helpers";

const READY_OFFER = `Employee: Ready Hire
Role: Line Cook
Location: Brightline Kitchen — Westside
Pay: $20.00/hour
Start Date: 2099-09-01
Email: ready.hire@example.com
SSN (last 4): 4444
Documents on file: I-9, W-4, Direct Deposit, Handbook, Emergency Contact, State Withholding`;

const BLOCKED_OFFER = `Subject: Offer accepted — Blocked Hire, Server
Role: Server
Location: Brightline Café — Downtown
Pay: $16.50/hour
Start Date: 2099-09-01
Email: blocked.hire@example.com
SSN (last 4): 5555
Still needed: I-9, Direct Deposit`;

describe("buildReadinessPacket", () => {
  it("reports a ready verdict when all docs are verified", () => {
    const hire = makeHire(READY_OFFER);
    for (const doc of hire.documents) doc.status = "verified";
    hire.validations = validateNewHire(hire);
    hire.readiness = estimateReadiness(hire);

    const packet = buildReadinessPacket(hire);
    expect(packet.verdict).toBe("ready");
    expect(packet.readiness).toBe(100);
    expect(packet.outstanding).toHaveLength(0);
  });

  it("reports a blocked verdict and lists blockers + outstanding docs", () => {
    const hire = makeHire(BLOCKED_OFFER);
    hire.validations = validateNewHire(hire);

    const packet = buildReadinessPacket(hire);
    expect(packet.verdict).toBe("blocked");
    expect(packet.blockers.length).toBeGreaterThan(0);
    expect(packet.outstanding).toContain("Form I-9 (Employment Eligibility)");
    expect(packet.outstanding).toContain("Direct Deposit Authorization");
  });
});
