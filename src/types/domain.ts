export type Role = "admin" | "officer";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarUrl?: string;
}

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  status: "active" | "archived";
  templateId?: string;
  createdAt: string;
  updatedAt: string;
}

export type FormFieldType =
  | "section"
  | "checkbox"
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "select"
  | "radio"
  | "email"
  | "phone"
  | "image"
  | "file";

export type ChecklistFieldType = FormFieldType;

export type FieldSourceType = "custom_field" | "excel_column" | "checklist_input";

export interface FormField {
  id: string;
  label: string;
  description?: string;
  type: FormFieldType;
  sourceType?: FieldSourceType; // whether mapped to participant excel data or custom form field
  excelColumn?: string; // column header name in participant.data, e.g. "Foto", "NIK"
  required: boolean;
  editable: boolean; // if true, officer can edit this value directly in form entry panel
  evidenceEnabled?: boolean;
  evidenceRequired?: boolean;
  validation?: {
    regex?: string;
    minLength?: number;
    maxLength?: number;
  };
  options?: string[];
  order: number;
  active: boolean;
}

export type ChecklistItem = FormField;

export interface FormTemplate {
  id: string;
  name: string;
  description?: string;
  sampleColumns?: string[]; // list of excel column headers for mapping suggestions
  items: FormField[];
  createdAt: string;
  updatedAt: string;
}

export type ChecklistTemplate = FormTemplate;

export type ParticipantStatus = "complete" | "incomplete" | "rejected";
export type ChecklistItemStatus = "complete" | "incomplete" | "rejected";

export interface EvidenceFile {
  id: string;
  name: string;
  size: number;
  type: string;
  localId?: string; // id in IndexedDB
  url?: string; // preview URL / object storage URL
}

export interface FormResponse {
  id: string;
  participantId: string;
  fieldId: string;
  value: unknown;
  updatedBy?: string;
  updatedAt?: string;
}

export interface ChecklistResponse {
  id: string;
  participantId: string;
  checklistItemId: string;
  value: unknown;
  status: ChecklistItemStatus;
  notes?: string;
  evidence?: EvidenceFile[];
  updatedBy?: string;
  updatedAt?: string;
}

export interface Participant {
  id: string;
  workspaceId: string;
  data: Record<string, unknown>; // dynamic columns (NIK, Nama, Email, HP, dll.)
  status: ParticipantStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Officer {
  id: string;
  workspaceId?: string; // optional if global or per workspace
  name: string;
  email: string;
  active: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  workspaceId: string;
  timestamp: string;
  officerName: string;
  officerEmail: string;
  participantId?: string;
  participantName?: string;
  checklistItemId?: string;
  checklistItemLabel?: string;
  action: string;
  previousValue?: unknown;
  newValue?: unknown;
}

export type SyncStatus = "saving" | "saved" | "pending" | "syncing" | "synced" | "error";

export interface ParticipantDraft {
  workspaceId: string;
  participantId: string;
  updatedAt: string;
  syncStatus: SyncStatus;
  userEmail: string;
  version: number;
  responses: Record<string, {
    value: unknown;
    status: ChecklistItemStatus;
    notes?: string;
    evidence?: EvidenceFile[];
  }>;
}

