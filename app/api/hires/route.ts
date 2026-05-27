import { NextResponse } from "next/server";
import { createNewHire, listNewHires } from "@/lib/store";
import { getSampleHire } from "@/lib/sampleHires";
import type { SourceType } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ newHires: listNewHires() });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  let text: string = body.text ?? "";
  let sourceType: SourceType = body.sourceType ?? "manual";
  const coordinator: string = body.coordinator ?? "Sam Ortega";
  const file: { mediaType: string; dataBase64: string; filename?: string } | undefined =
    body.file && body.file.dataBase64 ? body.file : undefined;

  if (body.sampleId) {
    const sample = getSampleHire(body.sampleId);
    if (!sample) {
      return NextResponse.json({ error: "Unknown sample hire" }, { status: 400 });
    }
    text = sample.text;
    sourceType = sample.sourceType;
  }

  if (!text.trim() && !file) {
    return NextResponse.json(
      { error: "No offer text or file provided" },
      { status: 400 }
    );
  }

  const hire = await createNewHire(sourceType, text, coordinator, file);
  return NextResponse.json({ newHire: hire }, { status: 201 });
}
