import type {
  Approval,
  ApprovalType,
  ChecklistTask,
  DocStatus,
  DocumentType,
  EmploymentType,
  NewHire,
  OnboardingDocument,
  PayType,
  SourceType,
} from "./types";
import type { ExtractionInput, ExtractionResult } from "./types";
import {
  extractNewHire,
  extractionProvider,
  runExtraction,
} from "./extraction";
import { validateNewHire, mergeValidations, estimateReadiness } from "./validation";
import { applyValidationStatus } from "./status";
import { buildAgentPlan } from "./agentPlan";
import { generateEmailDraft } from "./email";
import { AUDIT_ACTIONS, auditEvent } from "./audit";
import { DOC_LABELS, requiredDocsFor } from "./mockData";
import { nowIso, uid } from "@/lib/utils";
import { loadState, saveState, type PersistedState } from "./persistence";
import {
  BARISTA_ONBOARDED_OFFER,
  CLINIC_BGC_OFFER,
  COOK_CLEAN_OFFER,
  RETAIL_REVIEW_OFFER,
  SERVER_DEMO_OFFER,
} from "./sampleHires";

// ---- In-memory new-hire store -------------------------------------------
// Prototype-grade store backed by a JSON snapshot on disk. State lives on
// globalThis so it survives Next.js dev-server hot reloads, and is persisted
// to disk so it survives full restarts. Swapping this for SQLite/Postgres
// later only requires re-implementing loadState/saveState in persistence.ts.

type StoreState = PersistedState;

const g = globalThis as unknown as { __newHireDeskStore?: StoreState };

function state(): StoreState {
  if (!g.__newHireDeskStore) {
    const loaded = loadState();
    if (loaded) {
      g.__newHireDeskStore = loaded;
    } else {
      g.__newHireDeskStore = { newHires: [], seeded: false };
      seed(g.__newHireDeskStore);
      save();
    }
  }
  return g.__newHireDeskStore;
}

function save() {
  if (g.__newHireDeskStore) saveState(g.__newHireDeskStore);
}

function touch(hire: NewHire) {
  hire.updatedAt = nowIso();
  save();
}

// ---- Core lifecycle helpers --------------------------------------------

function log(hire: NewHire, actor: string, action: string, details: string) {
  hire.auditEvents.push(auditEvent(hire.id, actor, action, details));
}

function freshDocument(type: DocumentType): OnboardingDocument {
  return {
    id: `doc-${type}`,
    type,
    label: DOC_LABELS[type],
    required: true,
    status: "not_sent",
    confidence: 0,
  };
}

// Re-derive the required-document set for a hire's current role/location while
// preserving the status of any document already in progress.
function reconcileDocuments(hire: NewHire) {
  const required = requiredDocsFor(hire.role, hire.location);
  const byType = new Map(hire.documents.map((d) => [d.type, d]));
  hire.documents = required.map((type) => byType.get(type) ?? freshDocument(type));
}

function buildChecklist(
  managerName: string | undefined,
  coordinator: string
): ChecklistTask[] {
  const mgr = managerName || "Manager";
  const tasks: Array<Omit<ChecklistTask, "id" | "done">> = [
    { label: "Create POS / scheduling-app login", category: "setup", owner: coordinator },
    { label: "Assign uniform & locker", category: "setup", owner: mgr },
    { label: "Add to first-week shift schedule", category: "setup", owner: mgr },
    { label: "Complete safety & orientation module", category: "training", owner: mgr },
    { label: "Shadow a shift lead for one shift", category: "training", owner: mgr },
    { label: "Review opening/closing procedures", category: "training", owner: mgr },
    { label: "Verify I-9 documents in person", category: "compliance", owner: coordinator },
    { label: "Confirm direct deposit prenote", category: "compliance", owner: coordinator },
  ];
  return tasks.map((t, i) => ({ ...t, id: `task-${i + 1}`, done: false }));
}

// Re-run validation and refresh derived fields after any mutation.
function recompute(hire: NewHire) {
  reconcileDocuments(hire);
  const fresh = validateNewHire(hire);
  hire.validations = mergeValidations(hire.validations, fresh);
  hire.readiness = estimateReadiness(hire);
  hire.status = applyValidationStatus(hire.status, hire.validations);
  touch(hire);
}

// Assemble a NewHire from an already-computed extraction result. Pure and
// synchronous so it serves both the async createNewHire path and the seed path.
function assembleNewHire(
  sourceType: SourceType,
  text: string,
  coordinator: string,
  extracted: ExtractionResult,
  providerName: string
): NewHire {
  const hire: NewHire = {
    id: uid("nh"),
    sourceType,
    sourceText: text,
    employeeName: "",
    role: "",
    location: "",
    status: "New",
    documents: [],
    checklist: [],
    validations: [],
    auditEvents: [],
    agentSteps: [],
    fieldConfidence: {},
    readiness: 0,
    assignedCoordinator: coordinator,
    approvals: [],
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  log(hire, "System", AUDIT_ACTIONS.IMPORTED, `Accepted offer imported via ${sourceType}.`);

  hire.employeeName = extracted.employeeName;
  hire.role = extracted.role ?? "";
  hire.location = extracted.location ?? "";
  hire.employmentType = extracted.employmentType;
  hire.payType = extracted.payType;
  hire.payRate = extracted.payRate;
  hire.startDate = extracted.startDate;
  hire.manager = extracted.manager;
  hire.email = extracted.email;
  hire.phone = extracted.phone;
  hire.ssnLast4 = extracted.ssnLast4;
  hire.fieldConfidence = extracted.fieldConfidence;

  // Build the required-document set and overlay any extracted signals.
  const required = requiredDocsFor(hire.role, hire.location);
  hire.documents = required.map((type) => {
    const signal = extracted.documents.find((d) => d.type === type);
    const status: DocStatus = signal?.status ?? "not_sent";
    const completed = status === "signed" || status === "verified";
    return {
      id: `doc-${type}`,
      type,
      label: DOC_LABELS[type],
      required: true,
      status,
      confidence: signal?.confidence ?? 0,
      requestedAt: status !== "not_sent" ? hire.createdAt : undefined,
      completedAt: completed ? hire.createdAt : undefined,
    };
  });

  hire.checklist = buildChecklist(hire.manager, coordinator);
  hire.status = "Collecting Docs";

  log(
    hire,
    "AI Onboarding Agent",
    AUDIT_ACTIONS.EXTRACTED,
    `Extracted profile for ${hire.employeeName} (${hire.role || "role TBD"}) via ${providerName}; mapped ${hire.documents.length} required document(s).`
  );

  recompute(hire);
  const open = hire.validations.filter((v) => !v.resolved);
  log(
    hire,
    "Readiness Engine",
    AUDIT_ACTIONS.VALIDATED,
    `${open.length} open issue(s): ${open.filter((v) => v.severity === "blocking").length} blocking, ${open.filter((v) => v.severity === "warning").length} warning. Readiness ${hire.readiness}%.`
  );

  return hire;
}

// ---- Public store API ---------------------------------------------------

export function listNewHires(): NewHire[] {
  return [...state().newHires].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getNewHire(id: string): NewHire | undefined {
  return state().newHires.find((h) => h.id === id);
}

export async function createNewHire(
  sourceType: SourceType,
  text: string,
  coordinator = "Sam Ortega",
  file?: ExtractionInput["file"]
): Promise<NewHire> {
  const { result, provider } = await extractNewHire({ sourceType, text, file });
  const sourceText = text || (file ? `[${file.filename ?? "uploaded file"}]` : "");
  const hire = assembleNewHire(sourceType, sourceText, coordinator, result, provider);
  state().newHires.unshift(hire);
  save();
  return hire;
}

// Synchronous build used only for seed data — always uses the mock parser so
// boot never depends on the network or an API key.
function seedHire(
  sourceType: SourceType,
  text: string,
  coordinator: string
): NewHire {
  const extracted = runExtraction({ sourceType, text });
  return assembleNewHire(sourceType, text, coordinator, extracted, extractionProvider.name);
}

export interface FieldPatch {
  employeeName?: string;
  role?: string;
  location?: string;
  employmentType?: EmploymentType;
  payType?: PayType;
  payRate?: number;
  startDate?: string;
  manager?: string;
  email?: string;
  phone?: string;
  ssnLast4?: string;
  assignedCoordinator?: string;
}

const NUMERIC_FIELDS = new Set(["payRate"]);

export function updateNewHireFields(
  id: string,
  patch: FieldPatch,
  actor = "Sam Ortega"
): NewHire | undefined {
  const hire = getNewHire(id);
  if (!hire) return undefined;

  const changed: string[] = [];
  const record = hire as unknown as Record<string, unknown>;
  for (const [key, raw] of Object.entries(patch)) {
    if (raw === undefined) continue;
    const value =
      NUMERIC_FIELDS.has(key) && raw !== "" ? Number(raw) : raw;
    if (record[key] !== value) {
      record[key] = value;
      changed.push(key);
      // A human-corrected field is now fully trusted.
      if (key in hire.fieldConfidence) hire.fieldConfidence[key] = 1;
    }
  }

  if (changed.length) {
    log(hire, actor, AUDIT_ACTIONS.FIELD_EDITED, `Updated: ${changed.join(", ")}.`);
  }
  recompute(hire);
  return hire;
}

export function resolveValidation(
  id: string,
  validationId: string,
  actor = "Sam Ortega",
  note?: string
): NewHire | undefined {
  const hire = getNewHire(id);
  if (!hire) return undefined;
  const validation = hire.validations.find((v) => v.id === validationId);
  if (!validation || validation.resolved) return hire;
  validation.resolved = true;
  log(
    hire,
    actor,
    AUDIT_ACTIONS.EXCEPTION_RESOLVED,
    `Resolved "${validation.code}"${note ? ` - ${note}` : ""}.`
  );
  recompute(hire);
  return hire;
}

export function setDocStatus(
  id: string,
  docId: string,
  status: DocStatus,
  actor = "Sam Ortega"
): NewHire | undefined {
  const hire = getNewHire(id);
  if (!hire) return undefined;
  const doc = hire.documents.find((d) => d.id === docId);
  if (!doc) return hire;
  doc.status = status;
  if (status !== "not_sent" && !doc.requestedAt) doc.requestedAt = nowIso();
  if (status === "signed" || status === "verified") doc.completedAt = nowIso();
  if (doc.confidence === 0 && status !== "not_sent") doc.confidence = 1;
  log(
    hire,
    actor,
    AUDIT_ACTIONS.DOC_STATUS,
    `${doc.label} → ${status.replace(/_/g, " ")}.`
  );
  recompute(hire);
  return hire;
}

export function toggleChecklistTask(
  id: string,
  taskId: string,
  actor = "Sam Ortega"
): NewHire | undefined {
  const hire = getNewHire(id);
  if (!hire) return undefined;
  const task = hire.checklist.find((t) => t.id === taskId);
  if (!task) return hire;
  task.done = !task.done;
  log(
    hire,
    actor,
    AUDIT_ACTIONS.CHECKLIST_UPDATED,
    `${task.label} marked ${task.done ? "done" : "not done"}.`
  );
  touch(hire);
  return hire;
}

export function generateAgentPlan(
  id: string,
  actor = "AI Onboarding Agent"
): NewHire | undefined {
  const hire = getNewHire(id);
  if (!hire) return undefined;
  hire.agentSteps = buildAgentPlan(hire);
  log(
    hire,
    actor,
    AUDIT_ACTIONS.PAYROLL_SIMULATED,
    `QuickBooks Workforce setup plan generated (${hire.agentSteps.length} steps).`
  );
  touch(hire);
  return hire;
}

export function completeAgentPlan(
  id: string,
  actor = "Sam Ortega"
): NewHire | undefined {
  const hire = getNewHire(id);
  if (!hire) return undefined;
  if (!hire.agentSteps.length) hire.agentSteps = buildAgentPlan(hire);
  hire.agentSteps = hire.agentSteps.map((s) => ({ ...s, status: "Completed" }));
  recordApproval(hire, "payroll_setup", actor);
  log(
    hire,
    actor,
    AUDIT_ACTIONS.PAYROLL_SIMULATED,
    "Simulated QuickBooks Workforce employee setup completed and saved as draft."
  );
  touch(hire);
  return hire;
}

export function generateEmail(
  id: string,
  actor = "AI Onboarding Agent"
): NewHire | undefined {
  const hire = getNewHire(id);
  if (!hire) return undefined;
  hire.emailDraft = generateEmailDraft(hire);
  log(
    hire,
    actor,
    AUDIT_ACTIONS.EMAIL_GENERATED,
    `Generated "${hire.emailDraft.type}" draft.`
  );
  touch(hire);
  return hire;
}

export function sendEmail(
  id: string,
  actor = "Sam Ortega"
): NewHire | undefined {
  const hire = getNewHire(id);
  if (!hire) return undefined;
  if (!hire.emailDraft) hire.emailDraft = generateEmailDraft(hire);
  hire.emailDraft.sent = true;
  hire.emailDraft.sentAt = nowIso();
  recordApproval(hire, "send_welcome", actor);
  log(
    hire,
    actor,
    AUDIT_ACTIONS.EMAIL_SENT,
    `Message to ${hire.emailDraft.to} approved and sent (simulated).`
  );
  touch(hire);
  return hire;
}

export function approveReadiness(
  id: string,
  actor = "Sam Ortega"
): NewHire | undefined {
  const hire = getNewHire(id);
  if (!hire) return undefined;
  if (hire.status === "Ready for Day One") {
    recordApproval(hire, "mark_ready", actor);
    hire.status = "Onboarded";
    log(
      hire,
      actor,
      AUDIT_ACTIONS.MARKED_READY,
      "Hire approved as ready for day one and marked onboarded."
    );
    touch(hire);
  }
  return hire;
}

export function notifyManager(
  id: string,
  actor = "Sam Ortega"
): NewHire | undefined {
  const hire = getNewHire(id);
  if (!hire) return undefined;
  recordApproval(hire, "notify_manager", actor);
  touch(hire);
  return hire;
}

function recordApproval(hire: NewHire, type: ApprovalType, actor: string) {
  const approval: Approval = {
    id: uid("apr"),
    type,
    approvedBy: actor,
    approvedAt: nowIso(),
  };
  hire.approvals.push(approval);
  log(hire, actor, AUDIT_ACTIONS.APPROVAL, `Approval recorded: ${type.replace(/_/g, " ")}.`);
}

// ---- Seed data ----------------------------------------------------------

function backdate(hire: NewHire, hoursAgo: number) {
  const t = new Date(Date.now() - hoursAgo * 3600_000).toISOString();
  hire.createdAt = t;
  hire.updatedAt = t;
  for (const e of hire.auditEvents) e.timestamp = t;
}

function setAllDocs(hire: NewHire, status: DocStatus) {
  for (const doc of hire.documents) {
    doc.status = status;
    if (status === "signed" || status === "verified") doc.completedAt = hire.createdAt;
    if (status !== "not_sent") {
      doc.requestedAt = doc.requestedAt ?? hire.createdAt;
      if (doc.confidence === 0) doc.confidence = 1;
    }
  }
}

function seed(store: StoreState) {
  if (store.seeded) return;
  store.seeded = true;

  // 1. Jordan Lee — fully onboarded (backdated). Status is set before the
  // readiness recompute so the past start date isn't flagged for a hire who is
  // already on the team.
  const onboarded = seedHire("offer_email", BARISTA_ONBOARDED_OFFER, "Priya Nair");
  backdate(onboarded, 72);
  setAllDocs(onboarded, "verified");
  onboarded.checklist = onboarded.checklist.map((t) => ({ ...t, done: true }));
  onboarded.status = "Onboarded";
  recompute(onboarded);
  onboarded.agentSteps = buildAgentPlan(onboarded).map((s) => ({ ...s, status: "Completed" }));
  onboarded.approvals.push(
    { id: uid("apr"), type: "payroll_setup", approvedBy: "Priya Nair", approvedAt: onboarded.createdAt },
    { id: uid("apr"), type: "send_welcome", approvedBy: "Priya Nair", approvedAt: onboarded.createdAt },
    { id: uid("apr"), type: "mark_ready", approvedBy: "Priya Nair", approvedAt: onboarded.createdAt }
  );
  onboarded.emailDraft = { ...generateEmailDraft(onboarded), sent: true, sentAt: onboarded.createdAt };
  log(onboarded, "Priya Nair", AUDIT_ACTIONS.MARKED_READY, "Onboarding completed (simulated).");

  // 2. Darnell Price — clean, ready for day one.
  const ready = seedHire("offer_email", COOK_CLEAN_OFFER, "Sam Ortega");
  backdate(ready, 30);
  setAllDocs(ready, "verified");
  recompute(ready);

  // 3. Coleman Hayes — handbook + emergency contact outstanding, needs review.
  const review = seedHire("offer_email", RETAIL_REVIEW_OFFER, "Devon Clarke");
  backdate(review, 6);

  // 4. Maria Santos — primary demo, collecting docs (I-9 + direct deposit).
  const collecting = seedHire("offer_email", SERVER_DEMO_OFFER, "Sam Ortega");
  backdate(collecting, 3);

  // 5. Priya Raman — background check pending + start date passed, exception.
  const exception = seedHire("offer_email", CLINIC_BGC_OFFER, "Unassigned");
  backdate(exception, 1);

  store.newHires = [exception, collecting, review, ready, onboarded];
}
