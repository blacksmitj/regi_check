import {
  User,
  Workspace,
  FormTemplate,
  ChecklistTemplate,
  Participant,
  Officer,
  AuditLog,
  ChecklistResponse,
  FormField,
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

const DB_KEY = "regicheck_mock_db_clean_v1";

interface MockDBData {
  users: User[];
  workspaces: Workspace[];
  templates: FormTemplate[];
  workspaceChecklists: Record<string, FormField[]>; // workspaceId -> FormField[]
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
    return {
      users: [...SEED_USERS],
      workspaces: [...SEED_WORKSPACES],
      templates: [...SEED_TEMPLATES],
      workspaceChecklists: {},
      officers: [...SEED_OFFICERS],
      participants: [...SEED_PARTICIPANTS],
      responses: [...SEED_RESPONSES],
      auditLogs: [...SEED_AUDIT_LOGS],
      currentUserEmail: "admin@regicheck.id",
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
    const ws = this.data.workspaces.find((w) => w.id === id);
    const participantIds = this.data.participants
      .filter((p) => p.workspaceId === id)
      .map((p) => p.id);

    // Remove responses of participants in this workspace
    this.data.responses = this.data.responses.filter(
      (r) => !participantIds.includes(r.participantId)
    );
    // Remove participants
    this.data.participants = this.data.participants.filter((p) => p.workspaceId !== id);
    // Remove workspace checklist items
    delete this.data.workspaceChecklists[id];
    // Remove workspace
    this.data.workspaces = this.data.workspaces.filter((w) => w.id !== id);

    this.addAuditLog({
      action: "DELETE_WORKSPACE",
      officerEmail: this.getCurrentUser()?.email || "admin@regicheck.id",
      officerName: this.getCurrentUser()?.name || "Admin",
      workspaceId: id,
      newValue: `Menghapus permanen workspace "${ws?.name || id}" dan seluruh data terkait`,
    });

    this.save();
  }

  public cleanWorkspaceResponses(id: string): void {
    const ws = this.data.workspaces.find((w) => w.id === id);
    const wsParticipants = this.data.participants.filter((p) => p.workspaceId === id);
    const participantIds = wsParticipants.map((p) => p.id);

    // Remove responses of participants in this workspace
    this.data.responses = this.data.responses.filter(
      (r) => !participantIds.includes(r.participantId)
    );

    // Reset status of each participant to incomplete
    const now = new Date().toISOString();
    wsParticipants.forEach((p) => {
      p.status = "incomplete";
      p.updatedAt = now;
    });

    this.addAuditLog({
      action: "CLEAN_WORKSPACE_DATA",
      officerEmail: this.getCurrentUser()?.email || "admin@regicheck.id",
      officerName: this.getCurrentUser()?.name || "Admin",
      workspaceId: id,
      newValue: `Membersihkan data checklist respon dan mereset status verifikasi untuk ${wsParticipants.length} peserta di "${ws?.name || id}"`,
    });

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

  public deleteTemplate(id: string): void {
    this.data.templates = this.data.templates.filter((t) => t.id !== id);
    this.save();
  }

  public getWorkspaceForm(workspaceId: string): FormField[] {
    return this.data.workspaceChecklists[workspaceId] || [];
  }

  public saveWorkspaceForm(workspaceId: string, items: FormField[]): FormField[] {
    this.data.workspaceChecklists[workspaceId] = items;
    this.save();
    return items;
  }

  public getWorkspaceChecklist(workspaceId: string): ChecklistItem[] {
    return this.getWorkspaceForm(workspaceId);
  }

  public saveWorkspaceChecklist(workspaceId: string, items: ChecklistItem[]): ChecklistItem[] {
    return this.saveWorkspaceForm(workspaceId, items);
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

  public importParticipantsWithDeduplication(
    workspaceId: string,
    items: Array<{
      action: "create" | "overwrite" | "skip";
      data: Record<string, unknown>;
      existingId?: string;
    }>
  ): { createdCount: number; updatedCount: number; skippedCount: number } {
    const now = new Date().toISOString();
    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    const toAdd: Participant[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.action === "skip") {
        skippedCount++;
        continue;
      }

      if (item.action === "overwrite" && item.existingId) {
        const existing = this.data.participants.find(
          (p) => p.id === item.existingId && p.workspaceId === workspaceId
        );
        if (existing) {
          existing.data = { ...existing.data, ...item.data };
          existing.updatedAt = now;
          updatedCount++;
          continue;
        }
      }

      // Default to create
      toAdd.push({
        id: `part-${Date.now().toString(36)}-${i}-${Math.random().toString(36).slice(2, 6)}`,
        workspaceId,
        data: item.data,
        status: "incomplete",
        createdAt: now,
        updatedAt: now,
      });
      createdCount++;
    }

    if (toAdd.length > 0) {
      this.data.participants.push(...toAdd);
    }

    this.save();
    return { createdCount, updatedCount, skippedCount };
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

