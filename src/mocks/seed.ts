import {
  User,
  Workspace,
  FormTemplate,
  Participant,
  Officer,
  AuditLog,
  ChecklistResponse,
} from "@/types/domain";

export const SEED_USERS: User[] = [
  {
    id: "user-admin",
    name: "Administrator",
    email: "admin@regicheck.id",
    role: "admin",
  },
];

export const SEED_TEMPLATES: FormTemplate[] = [];

export const SEED_WORKSPACES: Workspace[] = [];

export const SEED_OFFICERS: Officer[] = [];

export const SEED_PARTICIPANTS: Participant[] = [];

export const SEED_RESPONSES: ChecklistResponse[] = [];

export const SEED_AUDIT_LOGS: AuditLog[] = [];
