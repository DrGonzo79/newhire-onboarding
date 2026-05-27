import type { DocumentType, EmploymentType, PayType } from "./types";

// ---- Reference data -----------------------------------------------------
// Mock HR reference data for the demo employer, "Brightline Hospitality
// Group" — a multi-unit SMB operator (cafés, a kitchen, a retail market, and a
// care clinic). In production this would sync from QuickBooks Workforce / the
// HRIS. The validation engine reads exclusively from here.

export const EMPLOYER_NAME = "Brightline Hospitality Group";
export const HANDBOOK_VERSION = "Employee Handbook v2026.1";

export interface RoleDef {
  id: string;
  title: string;
  payType: PayType;
  defaultPayRate: number;
  requiresBackgroundCheck: boolean;
  defaultEmploymentType: EmploymentType;
}

export interface LocationDef {
  id: string;
  name: string;
  state: string;
  minWage: number;
}

export const ROLES: RoleDef[] = [
  { id: "ROLE-SERVER", title: "Server", payType: "hourly", defaultPayRate: 16.5, requiresBackgroundCheck: false, defaultEmploymentType: "part_time" },
  { id: "ROLE-LINE-COOK", title: "Line Cook", payType: "hourly", defaultPayRate: 19.0, requiresBackgroundCheck: false, defaultEmploymentType: "full_time" },
  { id: "ROLE-BARISTA", title: "Barista", payType: "hourly", defaultPayRate: 16.0, requiresBackgroundCheck: false, defaultEmploymentType: "part_time" },
  { id: "ROLE-SHIFT-LEAD", title: "Shift Lead", payType: "hourly", defaultPayRate: 22.0, requiresBackgroundCheck: true, defaultEmploymentType: "full_time" },
  { id: "ROLE-RETAIL", title: "Retail Associate", payType: "hourly", defaultPayRate: 15.5, requiresBackgroundCheck: false, defaultEmploymentType: "seasonal" },
  { id: "ROLE-MED-ASSIST", title: "Medical Assistant", payType: "hourly", defaultPayRate: 24.0, requiresBackgroundCheck: true, defaultEmploymentType: "full_time" },
  { id: "ROLE-HOUSEKEEPER", title: "Housekeeper", payType: "hourly", defaultPayRate: 17.0, requiresBackgroundCheck: false, defaultEmploymentType: "part_time" },
  { id: "ROLE-GM", title: "General Manager", payType: "salary", defaultPayRate: 62000, requiresBackgroundCheck: true, defaultEmploymentType: "full_time" },
];

export const LOCATIONS: LocationDef[] = [
  { id: "LOC-DOWNTOWN", name: "Brightline Café — Downtown", state: "OR", minWage: 15.45 },
  { id: "LOC-AIRPORT", name: "Brightline Café — Airport", state: "OR", minWage: 15.45 },
  { id: "LOC-WESTSIDE", name: "Brightline Kitchen — Westside", state: "CA", minWage: 16.5 },
  { id: "LOC-MIDTOWN", name: "Brightline Care Clinic — Midtown", state: "WA", minWage: 16.66 },
  { id: "LOC-EASTSIDE", name: "Brightline Market — Eastside", state: "TX", minWage: 7.25 },
];

export const MANAGERS: string[] = [
  "Tonya Brooks",
  "Andre Patel",
  "Lucia Romano",
  "Garrett Hill",
  "Nina Okafor",
];

// Onboarding coordinators / reviewers who own a new hire's paperwork.
export const COORDINATORS: string[] = [
  "Sam Ortega",
  "Priya Nair",
  "Devon Clarke",
  "Unassigned",
];

// Employees already in the HRIS — used for duplicate-hire detection.
export const EXISTING_EMPLOYEES: Array<{ email: string; ssnLast4: string }> = [
  { email: "j.rivera@example.com", ssnLast4: "3310" },
  { email: "k.thompson@example.com", ssnLast4: "7782" },
  { email: "m.delacruz@example.com", ssnLast4: "9041" },
];

// States that levy a personal income tax (and therefore require a state
// withholding form in addition to the federal W-4). Simplified for the demo.
export const STATES_WITH_INCOME_TAX = new Set(["OR", "CA", "NY", "MN", "GA"]);

// Documents every hire needs regardless of role/location.
export const BASE_REQUIRED_DOCS: DocumentType[] = [
  "i9",
  "w4",
  "direct_deposit",
  "handbook",
  "emergency_contact",
];

export const DOC_LABELS: Record<DocumentType, string> = {
  i9: "Form I-9 (Employment Eligibility)",
  w4: "Form W-4 (Federal Withholding)",
  direct_deposit: "Direct Deposit Authorization",
  handbook: "Employee Handbook Acknowledgement",
  background_check: "Background Check Authorization",
  emergency_contact: "Emergency Contact Form",
  state_tax: "State Withholding Form",
};

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  seasonal: "Seasonal",
  contractor: "Contractor",
};

// ---- Lookup helpers -----------------------------------------------------

export function findRole(title?: string): RoleDef | undefined {
  if (!title) return undefined;
  const norm = title.trim().toLowerCase();
  return (
    ROLES.find((r) => r.title.toLowerCase() === norm) ||
    ROLES.find(
      (r) =>
        norm.includes(r.title.toLowerCase()) ||
        r.title.toLowerCase().includes(norm)
    )
  );
}

export function findLocation(name?: string): LocationDef | undefined {
  if (!name) return undefined;
  const norm = name.trim().toLowerCase();
  return (
    LOCATIONS.find((l) => l.name.toLowerCase() === norm) ||
    LOCATIONS.find(
      (l) =>
        norm.includes(l.name.toLowerCase()) ||
        l.name.toLowerCase().includes(norm)
    )
  );
}

export function minWageFor(locationName?: string): number | undefined {
  return findLocation(locationName)?.minWage;
}

export function requiresBackgroundCheck(roleTitle?: string): boolean {
  return findRole(roleTitle)?.requiresBackgroundCheck ?? false;
}

// The full required-document set for a hire, derived from the base set plus
// role-driven (background check) and location-driven (state tax) requirements.
export function requiredDocsFor(
  roleTitle?: string,
  locationName?: string
): DocumentType[] {
  const docs = [...BASE_REQUIRED_DOCS];
  if (requiresBackgroundCheck(roleTitle)) docs.push("background_check");
  const loc = findLocation(locationName);
  if (loc && STATES_WITH_INCOME_TAX.has(loc.state)) docs.push("state_tax");
  return docs;
}
