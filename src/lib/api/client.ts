import { mockDB } from "@/mocks/db";
import {
  User,
  Workspace,
  FormField,
  FormTemplate,
  ChecklistItem,
  ChecklistTemplate,
  Participant,
  ChecklistResponse,
  Officer,
  AuditLog,
} from "@/types/domain";
import { calculateParticipantStatus } from "../domain/status-engine";

// Helper to simulate network latency
const delay = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms));

export const api = {
  // --- Auth ---
  async getCurrentUser(): Promise<User | null> {
    await delay();
    return mockDB.getCurrentUser();
  },

  async loginAs(email: string): Promise<User> {
    await delay();
    const allUsers = mockDB.getUsers();
    let user = allUsers.find((u) => u.email === email);

    if (!user) {
      // Check officer list
      const officer = mockDB.getOfficers().find((o) => o.email === email && o.active);
      if (officer) {
        user = {
          id: officer.id,
          name: officer.name,
          email: officer.email,
          role: "officer",
        };
      }
    }

    if (!user) {
      // Throw access denied error for unauthorized emails
      throw new Error("ACCESS_DENIED: Email tidak terdaftar dalam sistem.");
    }

    mockDB.setCurrentUserEmail(user.email);
    return user;
  },

  async logout(): Promise<void> {
    await delay();
    mockDB.setCurrentUserEmail(null);
  },

  // --- Workspaces ---
  async getWorkspaces(): Promise<Workspace[]> {
    await delay();
    return mockDB.getWorkspaces();
  },

  async getWorkspace(id: string): Promise<Workspace> {
    await delay();
    const ws = mockDB.getWorkspace(id);
    if (!ws) throw new Error("Workspace tidak ditemukan");
    return ws;
  },

  async createWorkspace(
    input: Omit<Workspace, "id" | "createdAt" | "updatedAt" | "status"> & { templateId?: string }
  ): Promise<Workspace> {
    await delay();
    return mockDB.createWorkspace(input);
  },

  async updateWorkspace(id: string, updates: Partial<Workspace>): Promise<Workspace> {
    await delay();
    return mockDB.updateWorkspace(id, updates);
  },

  async deleteWorkspace(id: string): Promise<void> {
    await delay();
    mockDB.deleteWorkspace(id);
  },

  async cleanWorkspaceResponses(id: string): Promise<void> {
    await delay();
    mockDB.cleanWorkspaceResponses(id);
  },

  // --- Form fields per Workspace ---
  async getWorkspaceForm(workspaceId: string): Promise<FormField[]> {
    await delay();
    return mockDB.getWorkspaceForm(workspaceId);
  },

  async saveWorkspaceForm(workspaceId: string, items: FormField[]): Promise<FormField[]> {
    await delay();
    return mockDB.saveWorkspaceForm(workspaceId, items);
  },

  // Legacy alias
  async getWorkspaceChecklist(workspaceId: string): Promise<ChecklistItem[]> {
    return this.getWorkspaceForm(workspaceId);
  },

  async saveWorkspaceChecklist(workspaceId: string, items: ChecklistItem[]): Promise<ChecklistItem[]> {
    return this.saveWorkspaceForm(workspaceId, items);
  },

  // --- Templates ---
  async getTemplates(): Promise<ChecklistTemplate[]> {
    await delay();
    return mockDB.getTemplates();
  },

  async getTemplate(id: string): Promise<ChecklistTemplate> {
    await delay();
    const tpl = mockDB.getTemplate(id);
    if (!tpl) throw new Error("Template tidak ditemukan");
    return tpl;
  },

  async saveTemplate(template: ChecklistTemplate): Promise<ChecklistTemplate> {
    await delay();
    return mockDB.saveTemplate(template);
  },

  async deleteTemplate(id: string): Promise<void> {
    await delay();
    mockDB.deleteTemplate(id);
  },

  // --- Participants ---
  async getParticipants(workspaceId: string): Promise<Participant[]> {
    await delay();
    return mockDB.getParticipants(workspaceId);
  },

  async getParticipant(id: string): Promise<Participant> {
    await delay();
    const p = mockDB.getParticipant(id);
    if (!p) throw new Error("Peserta tidak ditemukan");
    return p;
  },

  async updateParticipant(id: string, updates: Partial<Participant>): Promise<Participant> {
    await delay();
    const p = mockDB.getParticipant(id);
    if (!p) throw new Error("Peserta tidak ditemukan");

    // If data updated, recompute completion status automatically
    if (updates.data && !updates.status) {
      const formFields = mockDB.getWorkspaceForm(p.workspaceId);
      updates.status = calculateParticipantStatus(formFields, updates.data);
    }

    return mockDB.updateParticipant(id, updates);
  },

  async updateParticipantFormData(
    participantId: string,
    fieldKey: string,
    value: unknown
  ): Promise<Participant> {
    await delay();
    const p = mockDB.getParticipant(participantId);
    if (!p) throw new Error("Peserta tidak ditemukan");
    const updatedData = { ...p.data, [fieldKey]: value };
    const formFields = mockDB.getWorkspaceForm(p.workspaceId);
    const newStatus = calculateParticipantStatus(formFields, updatedData);
    return mockDB.updateParticipant(participantId, {
      data: updatedData,
      status: newStatus,
    });
  },

  async importParticipants(
    workspaceId: string,
    participants: Array<{
      data: Record<string, unknown>;
      action?: "create" | "overwrite" | "skip";
      existingId?: string;
    }>
  ): Promise<{
    total: number;
    importedCount: number;
    createdCount: number;
    updatedCount: number;
    skippedCount: number;
  }> {
    await delay(350);

    const formatted = participants.map((p) => ({
      action: p.action || "create",
      data: p.data,
      existingId: p.existingId,
    }));

    const result = mockDB.importParticipantsWithDeduplication(workspaceId, formatted);
    return {
      total: participants.length,
      importedCount: result.createdCount + result.updatedCount,
      createdCount: result.createdCount,
      updatedCount: result.updatedCount,
      skippedCount: result.skippedCount,
    };
  },

  // --- Checklist Responses ---
  async getResponses(participantId: string): Promise<ChecklistResponse[]> {
    await delay();
    return mockDB.getResponses(participantId);
  },

  async saveResponse(response: Omit<ChecklistResponse, "id"> & { id?: string }): Promise<{
    response: ChecklistResponse;
    newParticipantStatus: string;
  }> {
    await delay();
    const saved = mockDB.saveResponse(response);

    // Recompute participant status
    const participant = mockDB.getParticipant(response.participantId);
    if (participant) {
      const checklist = mockDB.getWorkspaceChecklist(participant.workspaceId);
      const allResponses = mockDB.getResponses(participant.id);
      const newStatus = calculateParticipantStatus(checklist, allResponses);
      if (participant.status !== newStatus) {
        mockDB.updateParticipant(participant.id, { status: newStatus });
      }

      // Add audit log
      const currentUser = mockDB.getCurrentUser();
      const item = checklist.find((i) => i.id === response.checklistItemId);
      mockDB.addAuditLog({
        workspaceId: participant.workspaceId,
        officerName: currentUser?.name || "Petugas",
        officerEmail: currentUser?.email || "petugas@regicheck.id",
        participantId: participant.id,
        participantName: String(participant.data["Nama Lengkap"] || "Peserta"),
        checklistItemId: response.checklistItemId,
        checklistItemLabel: item?.label || response.checklistItemId,
        action: response.status === "rejected" ? "Menolak Item" : "Memperbarui Checklist",
        newValue: response.notes ? `${response.status}: ${response.notes}` : response.status,
      });

      return { response: saved, newParticipantStatus: newStatus };
    }

    return { response: saved, newParticipantStatus: "incomplete" };
  },

  // --- Officers ---
  async getOfficers(): Promise<Officer[]> {
    await delay();
    return mockDB.getOfficers();
  },

  async saveOfficers(officers: Officer[]): Promise<void> {
    await delay();
    mockDB.saveOfficers(officers);
  },

  // --- Audit Logs ---
  async getAuditLogs(workspaceId?: string): Promise<AuditLog[]> {
    await delay();
    return mockDB.getAuditLogs(workspaceId);
  },

  // --- Reset for Demo ---
  resetMockDB() {
    mockDB.reset();
  },
};

