import { NextResponse } from "next/server";
import { getNewHire, updateNewHireFields } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const hire = getNewHire(id);
  if (!hire) {
    return NextResponse.json({ error: "New hire not found" }, { status: 404 });
  }
  return NextResponse.json({ newHire: hire });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const hire = updateNewHireFields(
    id,
    body.fields ?? {},
    body.actor ?? "Sam Ortega"
  );
  if (!hire) {
    return NextResponse.json({ error: "New hire not found" }, { status: 404 });
  }
  return NextResponse.json({ newHire: hire });
}
