// Core domain types for the AI New-Hire Paperwork Desk.
// Interfaces define the boundary between modules so the mock extraction parser
// can later be swapped for a real LLM/OCR provider without touching consumers.

export type Severity = "info" | "warning" | "blocking";

export type SourceType = "offer_email" | "form" | "manual";

export type NewHireStatus =
  | "New"
  | "Extracted"
  | "Collecting Docs"
  | "Needs Review"
  | "Ready for Day One"
  | "Onboarded"
  | "Exception";

export type EmploymentType =
  | "full_time"
  | "part_time"
  | "seasonal"
  | "contractor";

export type PayType = "hourly" | "salary";

export type DocumentType =
  | "i9"
  | "w4"
  | "direct_deposit"
  | "handbook"
  | "background_check"
  | "emergency_contact"
  | "state_tax";

// Lifecycle of a single onboarding document. `signed` = the employee completed
// their portion; `verified` = the employer/coordinator confirmed it (e.g. I-9
// Section 2, background-check cleared).
export type DocStatus =
  | "not_sent"
  | "sent"
  | "signed"
  | "needs_correction"
  | "verified";

export interface OnboardingDocument {
  id: string;
  type: DocumentType;
  label: string;
  required: boolean;
  status: DocStatus;
  requestedAt?: string;
  completedAt?: string;
  note?: string;
  confidence: number; // 0 until the doc has been started/extracted
}

export type ChecklistCategory = "setup" | "training" | "compliance";

export interface ChecklistTask {
  id: string;
  label: string;
  category: ChecklistCategory;
  owner: string;
  done: boolean;
}

export interface ValidationResult {
  id: string;
  severity: Severity;
  code: string;
  message: string;
  suggestedFix: string;
  fieldPath: string;
  resolved: boolean;
}

export type AgentStepStatus =
  | "Pending"
  | "Running"
  | "Needs Human Approval"
  | "Completed"
  | "Failed";

export interface AgentStep {
  id: string;
  newHireId: string;
  label: string;
  description: string;
  status: AgentStepStatus;
  requiresApproval: boolean;
  simulatedScreenshotState: string;
}

export interface AuditEvent {
  id: string;
  newHireId: string;
  actor: string;
  action: string;
  details: string;
  timestamp: string;
}

export type EmailDraftType =
  | "welcome"
  | "document_request"
  | "missing_info"
  | "background_check_notice"
  | "manager_exception_alert"
  | "ready_for_day_one";

export interface EmailDraft {
  type: EmailDraftType;
  subject: string;
  body: string;
  to: string;
  generatedAt: string;
  sent: boolean;
  sentAt?: string;
}

export type ApprovalType =
  | "payroll_setup"
  | "send_welcome"
  | "mark_ready"
  | "notify_manager";

export interface Approval {
  id: string;
  type: ApprovalType;
  approvedBy: string;
  approvedAt: string;
}

export interface FieldConfidence {
  [field: string]: number;
}

export interface NewHire {
  id: string;
  sourceType: SourceType;
  sourceText: string;
  employeeName: string;
  role: string;
  location: string;
  employmentType?: EmploymentType;
  payType?: PayType;
  payRate?: number;
  startDate?: string;
  manager?: string;
  email?: string;
  phone?: string;
  ssnLast4?: string;
  status: NewHireStatus;
  documents: OnboardingDocument[];
  checklist: ChecklistTask[];
  validations: ValidationResult[];
  auditEvents: AuditEvent[];
  agentSteps: AgentStep[];
  emailDraft?: EmailDraft;
  fieldConfidence: FieldConfidence;
  readiness: number; // 0-100 day-one readiness score
  assignedCoordinator: string;
  approvals: Approval[];
  createdAt: string;
  updatedAt: string;
}

// ---- Module provider interfaces (extension points) ----

export interface ExtractionInput {
  sourceType: SourceType;
  text: string;
  // Optional binary document (PDF/image) for real OCR/vision extraction.
  file?: {
    mediaType: string;
    dataBase64: string;
    filename?: string;
  };
}

// A signal that a particular document has already been provided/started, parsed
// out of the accepted-offer source.
export interface ExtractedDocumentSignal {
  type: DocumentType;
  status: DocStatus;
  confidence: number;
}

export interface ExtractionResult {
  employeeName: string;
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
  documents: ExtractedDocumentSignal[];
  fieldConfidence: FieldConfidence;
}

// An ExtractionProvider can be the mock parser today or an LLM/OCR call later.
export interface ExtractionProvider {
  name: string;
  extract(input: ExtractionInput): ExtractionResult;
}
