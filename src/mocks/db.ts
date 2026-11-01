import {
  User,
  Workspace,
  ChecklistTemplate,
  Participant,
  Officer,
  AuditLog,
  ChecklistResponse,
  ChecklistItem,
} from "@/types/domain";
import {
  SEED_USERS,
  SEED_WORKSPACES,
  SEED_TEMPLATES,
  SEED_OFFICERS,
  SEED_PARTICIPANTS,
  SEED_RESPONSES,
  SEED_AUDIT_LOGS,
} from "./seed";

const DB_KEY = "regicheck_mock_db_v1";

interface MockDBData {
  users: User[];
  workspaces: Workspace[];
  templates: ChecklistTemplate[];
  workspaceChecklists: Record<string, ChecklistItem[]>; // workspaceId -> ChecklistItem[]
  officers: Officer[];
  participants: Participant[];
  responses: ChecklistResponse[];
  auditLogs: AuditLog[];
  currentUserEmail: string | null;
}

class MockDatabase {
  private data: MockDBData;

  constructor() {
    this.data = this.load();
  }

  private getDefaultData(): MockDBData {
    const workspaceChecklists: Record<string, ChecklistItem[]> = {
      "ws-kewirausahaan-2026": [...SEED_TEMPLATES[0].items],
      "ws-sertifikasi-ti": [...SEED_TEMPLATES[1].items],
      "ws-arsip-2025": [...SEED_TEMPLATES[0].items],
    };

    return {
      users: [...SEED_USERS],
      workspaces: [...SEED_WORKSPACES],
      templates: [...SEED_TEMPLATES],
      workspaceChecklists,
      officers: [...SEED_OFFICERS],
      participants: [...SEED_PARTICIPANTS],
      responses: [...SEED_RESPONSES],
      auditLogs: [...SEED_AUDIT_LOGS],
      currentUserEmail: "admin@regicheck.id", // default logged in as admin for initial exploration
    };
  }

  private load(): MockDBData {
    if (typeof window === "undefined") {
      return this.getDefaultData();
    }
    try {
      const stored = localStorage.getItem(DB_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // ignore
    }
    const defaultData = this.getDefaultData();
    this.save(defaultData);
    return defaultData;
  }

  private save(data = this.data): void {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(DB_KEY, JSON.stringify(data));
      } catch (err) {
        console.error("Failed to persist mock DB to localStorage", err);
      }
    }
  }

  public reset(): void {
    this.data = this.getDefaultData();
    this.save();
  }

  // --- Auth & Users ---
  public getCurrentUser(): User | null {
    if (!this.data.currentUserEmail) return null;
    const user = this.data.users.find((u) => u.email === this.data.currentUserEmail);
    if (!user) {
      // Check if user is registered in officers
      const officer = this.data.officers.find((o) => o.email === this.data.currentUserEmail && o.active);
      if (officer) {
        return {
          id: officer.id,
          name: officer.name,
          email: officer.email,
          role: "officer",
        };
      }
    }
    return user || null;
  }

  public setCurrentUserEmail(email: string | null): void {
    this.data.currentUserEmail = email;
    this.save();
  }

  public getUsers(): User[] {
    return [...this.data.users];
  }

  // --- Workspaces ---
  public getWorkspaces(): Workspace[] {
    return [...this.data.workspaces];
  }

  public getWorkspace(id: string): Workspace | undefined {
    return this.data.workspaces.find((w) => w.id === id);
  }

  public createWorkspace(
    input: Omit<Workspace, "id" | "createdAt" | "updatedAt" | "status"> & { templateId?: string }
  ): Workspace {
    const id = `ws-${Date.now().toString(36)}`;
    const now = new Date().toISOString();
    const newWs: Workspace = {
      ...input,
      id,
      status: "active",
      createdAt: now,
      updatedAt: now,
    };
    this.data.workspaces.unshift(newWs);

    // Snapshot checklist template
    let items: ChecklistItem[] = [];
    if (input.templateId) {
      const tpl = this.getTemplate(input.templateId);
      if (tpl) items = JSON.parse(JSON.stringify(tpl.items));
    } else if (this.data.templates.length > 0) {
      items = JSON.parse(JSON.stringify(this.data.templates[0].items));
    }
    this.data.workspaceChecklists[id] = items;

    this.save();
    return newWs;
  }

  public updateWorkspace(id: string, updates: Partial<Workspace>): Workspace {
    const ws = this.data.workspaces.find((w) => w.id === id);
    if (!ws) throw new Error("Workspace not found");
    Object.assign(ws, updates, { updatedAt: new Date().toISOString() });
    this.save();
    return ws;
  }

  public deleteWorkspace(id: string): void {
    this.data.workspaces = this.data.workspaces.filter((w) => w.id !== id);
    delete this.data.workspaceChecklists[id];
    this.data.participants = this.data.participants.filter((p) => p.workspaceId !== id);
    this.save();
  }

  // --- Checklist Templates & Items ---
  public getTemplates(): ChecklistTemplate[] {
    return [...this.data.templates];
  }

  public getTemplate(id: string): ChecklistTemplate | undefined {
    return this.data.templates.find((t) => t.id === id);
  }

  public saveTemplate(tpl: ChecklistTemplate): ChecklistTemplate {
    const idx = this.data.templates.findIndex((t) => t.id === tpl.id);
    if (idx >= 0) {
      this.data.templates[idx] = { ...tpl, updatedAt: new Date().toISOString() };
    } else {
      this.data.templates.push(tpl);
    }
    this.save();
    return tpl;
  }

  public getWorkspaceChecklist(workspaceId: string): ChecklistItem[] {
    return this.data.workspaceChecklists[workspaceId] || [];
  }

  public saveWorkspaceChecklist(workspaceId: string, items: ChecklistItem[]): ChecklistItem[] {
    this.data.workspaceChecklists[workspaceId] = items;
    this.save();
    return items;
  }

  // --- Participants ---
  public getParticipants(workspaceId: string): Participant[] {
    return this.data.participants.filter((p) => p.workspaceId === workspaceId);
  }

  public getParticipant(id: string): Participant | undefined {
    return this.data.participants.find((p) => p.id === id);
  }

  public updateParticipant(id: string, updates: Partial<Participant>): Participant {
    const p = this.data.participants.find((item) => item.id === id);
    if (!p) throw new Error("Participant not found");
    Object.assign(p, updates, { updatedAt: new Date().toISOString() });
    this.save();
    return p;
  }

  public addParticipants(participants: Participant[]): void {
    this.data.participants.push(...participants);
    this.save();
  }

  // --- Checklist Responses ---
  public getResponses(participantId: string): ChecklistResponse[] {
    return this.data.responses.filter((r) => r.participantId === participantId);
  }

  public saveResponse(response: Omit<ChecklistResponse, "id"> & { id?: string }): ChecklistResponse {
    const id = response.id || `resp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const fullResp: ChecklistResponse = {
      ...response,
      id,
      updatedAt: new Date().toISOString(),
    };

    const idx = this.data.responses.findIndex(
      (r) => r.participantId === response.participantId && r.checklistItemId === response.checklistItemId
    );

    if (idx >= 0) {
      this.data.responses[idx] = fullResp;
    } else {
      this.data.responses.push(fullResp);
    }
    this.save();
    return fullResp;
  }

  // --- Officers ---
  public getOfficers(): Officer[] {
    return [...this.data.officers];
  }

  public saveOfficers(officers: Officer[]): void {
    this.data.officers = officers;
    this.save();
  }

  // --- Audit Logs ---
  public getAuditLogs(workspaceId?: string): AuditLog[] {
    if (workspaceId) {
      return this.data.auditLogs.filter((l) => l.workspaceId === workspaceId);
    }
    return [...this.data.auditLogs];
  }

  public addAuditLog(log: Omit<AuditLog, "id" | "timestamp">): AuditLog {
    const newLog: AuditLog = {
      ...log,
      id: `log-${Date.now().toString(36)}`,
      timestamp: new Date().toISOString(),
    };
    this.data.auditLogs.unshift(newLog);
    this.save();
    return newLog;
  }
}

export const mockDB = new MockDatabase();

