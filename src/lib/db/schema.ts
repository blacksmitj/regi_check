import { pgTable, text, timestamp, boolean, integer, jsonb, index } from "drizzle-orm/pg-core";

// ==========================================
// BETTER AUTH TABLES
// ==========================================

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  role: text("role").notNull().default("officer"), // "admin" | "officer"
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// ==========================================
// FORM TEMPLATES & FORM FIELDS
// ==========================================

export const formTemplate = pgTable("form_template", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  sampleColumns: jsonb("sample_columns").$type<string[]>().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const formField = pgTable("form_field", {
  id: text("id").primaryKey(),
  templateId: text("template_id").references(() => formTemplate.id, { onDelete: "cascade" }),
  workspaceId: text("workspace_id").references(() => workspace.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  description: text("description"),
  type: text("type").notNull(), // "section" | "checkbox" | "text" | "textarea" | "number" | "date" | "select" | "radio" | "email" | "phone" | "image" | "file"
  sourceType: text("source_type").default("checklist_input"), // "custom_field" | "excel_column" | "checklist_input"
  excelColumn: text("excel_column"),
  required: boolean("required").notNull().default(false),
  editable: boolean("editable").notNull().default(false),
  evidenceEnabled: boolean("evidence_enabled").default(false),
  evidenceRequired: boolean("evidence_required").default(false),
  validation: jsonb("validation").$type<{
    regex?: string;
    minLength?: number;
    maxLength?: number;
  }>(),
  options: jsonb("options").$type<string[]>(),
  order: integer("order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}, (table) => [
  index("form_field_template_id_idx").on(table.templateId),
  index("form_field_workspace_id_idx").on(table.workspaceId),
]);

// ==========================================
// WORKSPACE
// ==========================================

export const workspace = pgTable("workspace", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  status: text("status").notNull().default("active"), // "active" | "archived"
  templateId: text("template_id").references(() => formTemplate.id, { onDelete: "set null" }),
  uniqueKeyColumn: text("unique_key_column"),
  nameColumn: text("name_column"),
  photoColumn: text("photo_column"),
  importHeaders: jsonb("import_headers").$type<string[]>().default([]),
  createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// ==========================================
// PARTICIPANTS
// ==========================================

export const participant = pgTable("participant", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspace.id, { onDelete: "cascade" }),
  data: jsonb("data").$type<Record<string, unknown>>().notNull().default({}),
  status: text("status").notNull().default("incomplete"), // "complete" | "incomplete" | "rejected"
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}, (table) => [
  index("participant_workspace_id_idx").on(table.workspaceId),
]);

// ==========================================
// CHECKLIST RESPONSES
// ==========================================

export const checklistResponse = pgTable("checklist_response", {
  id: text("id").primaryKey(),
  participantId: text("participant_id")
    .notNull()
    .references(() => participant.id, { onDelete: "cascade" }),
  checklistItemId: text("checklist_item_id").notNull(),
  value: jsonb("value"),
  status: text("status").notNull().default("incomplete"), // "complete" | "incomplete" | "rejected"
  notes: text("notes"),
  evidence: jsonb("evidence").$type<Array<{
    id: string;
    name: string;
    size: number;
    type: string;
    url?: string;
  }>>().default([]),
  updatedBy: text("updated_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}, (table) => [
  index("checklist_response_participant_id_idx").on(table.participantId),
  index("checklist_response_item_id_idx").on(table.checklistItemId),
]);

// ==========================================
// OFFICERS
// ==========================================

export const officer = pgTable("officer", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").references(() => workspace.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  active: boolean("active").notNull().default(true),
  /** Status pendaftaran: "active" | "pending" | "rejected" */
  status: text("status").notNull().default("active"), // "active" | "pending" | "rejected"
  /** workspaceId asal share link yang digunakan saat pertama request */
  requestedWorkspaceId: text("requested_workspace_id"),
  /** Waktu request akses masuk */
  requestedAt: timestamp("requested_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}, (table) => [
  index("officer_email_idx").on(table.email),
  index("officer_status_idx").on(table.status),
]);

// ==========================================
// AUDIT LOGS
// ==========================================

export const auditLog = pgTable("audit_log", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspace.id, { onDelete: "cascade" }),
  officerName: text("officer_name").notNull(),
  officerEmail: text("officer_email").notNull(),
  participantId: text("participant_id"),
  participantName: text("participant_name"),
  checklistItemId: text("checklist_item_id"),
  checklistItemLabel: text("checklist_item_label"),
  action: text("action").notNull(),
  previousValue: jsonb("previous_value"),
  newValue: jsonb("new_value"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
}, (table) => [
  index("audit_log_workspace_id_idx").on(table.workspaceId),
  index("audit_log_timestamp_idx").on(table.timestamp),
]);
