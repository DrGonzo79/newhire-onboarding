import { NextResponse } from "next/server";
import {
  approveReadiness,
  completeAgentPlan,
  generateAgentPlan,
  generateEmail,
  notifyManager,
  resolveValidation,
  sendEmail,
  setDocStatus,
  toggleChecklistTask,
} from "@/lib/store";
import type { NewHire } from "@/lib/types";

export const dynamic = "force-dynamic";

// Single dispatch endpoint for all new-hire lifecycle actions.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const action: string = body.action;
  const actor: string = body.actor ?? "Sam Ortega";

  let hire: NewHire | undefined;

  switch (action) {
    case "resolveValidation":
      hire = resolveValidation(id, body.validationId, actor, body.note);
      break;
    case "setDocStatus":
      hire = setDocStatus(id, body.docId, body.status, actor);
      break;
    case "toggleChecklistTask":
      hire = toggleChecklistTask(id, body.taskId, actor);
      break;
    case "generateAgentPlan":
      hire = generateAgentPlan(id, actor);
      break;
    case "completeAgentPlan":
      hire = completeAgentPlan(id, actor);
      break;
    case "generateEmail":
      hire = generateEmail(id, actor);
      break;
    case "sendEmail":
      hire = sendEmail(id, actor);
      break;
    case "approveReadiness":
      hire = approveReadiness(id, actor);
      break;
    case "notifyManager":
      hire = notifyManager(id, actor);
      break;
    default:
      return NextResponse.json(
        { error: `Unknown action: ${action}` },
        { status: 400 }
      );
  }

  if (!hire) {
    return NextResponse.json({ error: "New hire not found" }, { status: 404 });
  }
  return NextResponse.json({ newHire: hire });
}
