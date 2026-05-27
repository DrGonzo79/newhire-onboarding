import type { DocumentType, EmploymentType } from "@/lib/types";
import type { LocationDef, RoleDef } from "@/lib/mockData";

export interface ReferenceData {
  roles: RoleDef[];
  locations: LocationDef[];
  coordinators: string[];
  managers: string[];
  documentLabels: Record<DocumentType, string>;
  employmentTypeLabels: Record<EmploymentType, string>;
}

export type FieldPatch = Record<string, string>;

export type NewHireActions = {
  patch: (fields?: FieldPatch) => Promise<void>;
  act: (action: string, payload?: Record<string, unknown>) => Promise<void>;
  busy: boolean;
};
