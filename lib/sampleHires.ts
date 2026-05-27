import type { SourceType } from "./types";

export interface SampleHire {
  id: string;
  label: string;
  description: string;
  sourceType: SourceType;
  text: string;
}

// Primary demo fixture. Deliberately seeded with gaps:
//  - I-9 and Direct Deposit are still outstanding (blocking, doc-collection)
//  - emergency contact + Oregon state withholding not yet sent (warnings)
//  - the employee name is only in the subject line -> low extraction confidence
export const SERVER_DEMO_OFFER = `From: People Team <people@brightlinehospitality.com>
To: onboarding@brightlinehospitality.com
Subject: Offer accepted — Maria Santos, Server

Hi team,

Maria accepted the Server offer. Please kick off onboarding.

Role: Server
Location: Brightline Café — Downtown
Employment Type: Part-time
Pay: $16.50/hour
Start Date: 2026-06-08
Manager: Tonya Brooks
Email: maria.santos@example.com
Phone: 503-555-0148
SSN (last 4): 4821

Documents on file: W-4 signed, Handbook acknowledged
Still needed: I-9, Direct Deposit

Thanks,
People Team`;

export const COOK_CLEAN_OFFER = `From: People Team <people@brightlinehospitality.com>
Subject: Offer accepted — Darnell Price, Line Cook

Employee: Darnell Price
Role: Line Cook
Location: Brightline Kitchen — Westside
Employment Type: Full-time
Pay: $20.00/hour
Start Date: 2026-06-15
Manager: Lucia Romano
Email: darnell.price@example.com
Phone: 415-555-0193
SSN (last 4): 5567

Documents on file: I-9, W-4, Direct Deposit, Handbook, Emergency Contact, State Withholding`;

export const CLINIC_BGC_OFFER = `From: People Team <people@brightlinehospitality.com>
Subject: Offer accepted — Priya Raman, Medical Assistant

Employee: Priya Raman
Role: Medical Assistant
Location: Brightline Care Clinic — Midtown
Employment Type: Full-time
Pay: $24.00/hour
Start Date: 2026-05-20
Manager: Garrett Hill
Email: priya.raman@example.com
Phone: 206-555-0175
SSN (last 4): 6630

Documents on file: I-9, W-4, Direct Deposit, Handbook, Emergency Contact
Still needed: Background Check`;

export const RETAIL_REVIEW_OFFER = `From: People Team <people@brightlinehospitality.com>
Subject: Offer accepted — Coleman Hayes, Retail Associate

Employee: Coleman Hayes
Role: Retail Associate
Location: Brightline Market — Eastside
Employment Type: Seasonal
Pay: $15.50/hour
Start Date: 2026-06-10
Manager: Nina Okafor
Email: coleman.hayes@example.com
Phone: 512-555-0121
SSN (last 4): 7788

Documents on file: I-9, W-4, Direct Deposit
Still needed: Handbook, Emergency Contact`;

export const BARISTA_ONBOARDED_OFFER = `From: People Team <people@brightlinehospitality.com>
Subject: Offer accepted — Jordan Lee, Barista

Employee: Jordan Lee
Role: Barista
Location: Brightline Café — Airport
Employment Type: Part-time
Pay: $16.25/hour
Start Date: 2026-05-12
Manager: Andre Patel
Email: jordan.lee@example.com
Phone: 503-555-0166
SSN (last 4): 2204

Documents on file: I-9, W-4, Direct Deposit, Handbook, Emergency Contact, State Withholding`;

export const SAMPLE_HIRES: SampleHire[] = [
  {
    id: "sample-server",
    label: "Maria Santos — Server (Downtown Café)",
    description:
      "Primary demo. Missing I-9 and direct deposit, outstanding state/emergency forms, and a low-confidence name field.",
    sourceType: "offer_email",
    text: SERVER_DEMO_OFFER,
  },
  {
    id: "sample-cook",
    label: "Darnell Price — Line Cook (Westside Kitchen)",
    description:
      "Clean hire with every required document on file. Should reach Ready for Day One with no exceptions.",
    sourceType: "offer_email",
    text: COOK_CLEAN_OFFER,
  },
  {
    id: "sample-clinic",
    label: "Priya Raman — Medical Assistant (Care Clinic)",
    description:
      "Clinic role requires a background check that is still pending, and the start date has already passed — blocking exception.",
    sourceType: "offer_email",
    text: CLINIC_BGC_OFFER,
  },
];

export function getSampleHire(id: string): SampleHire | undefined {
  return SAMPLE_HIRES.find((s) => s.id === id);
}
