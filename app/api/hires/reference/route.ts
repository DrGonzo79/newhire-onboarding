import { NextResponse } from "next/server";
import {
  COORDINATORS,
  DOC_LABELS,
  EMPLOYMENT_TYPE_LABELS,
  LOCATIONS,
  MANAGERS,
  ROLES,
} from "@/lib/mockData";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    roles: ROLES,
    locations: LOCATIONS,
    coordinators: COORDINATORS,
    managers: MANAGERS,
    documentLabels: DOC_LABELS,
    employmentTypeLabels: EMPLOYMENT_TYPE_LABELS,
  });
}
