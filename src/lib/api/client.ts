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
  SheetSyncLog,
} from "@/types/domain";
import { calculateParticipantStatus } from "../domain/status-engine";
import {
  saveOfflineDraft,
  syncOfflineDraftsToBackend,
} from "@/lib/storage/indexed-db";

// Helper for fetch requests
async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    const err = new Error(
      errorBody.error || `HTTP error ${res.status}: ${res.statusText}`
    ) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }

  return res.json();
}

export const api = {
  // --- Auth ---
  async getCurrentUser(): Promise<User | null> {
    try {
      const data = await fetchJson<{ user: User | null }>("/api/auth/me");
      return data.user;
    } catch {
      return null;
    }
  },

  async loginAs(email: string): Promise<User> {
    // For local convenience / officer login
    const officers = await this.getOfficers();
    const officer = officers.find((o) => o.email === email && o.active);

    if (officer) {
      return {
        id: officer.id,
        name: officer.name,
        email: officer.email,
        role: "officer",
      };
    }

    const currentUser = await this.getCurrentUser();
    if (currentUser && currentUser.email === email) {
      return currentUser;
    }

    throw new Error("ACCESS_DENIED: Email tidak terdaftar dalam sistem.");
  },

  async logout(): Promise<void> {
    try {
      await fetch("/api/auth/sign-out", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });
    } catch (e) {
      console.warn("Logout request failed:", e);
    }
  },

  // --- Workspaces ---
  async getWorkspaces(): Promise<Workspace[]> {
    return fetchJson<Workspace[]>("/api/workspaces");
  },

  async getWorkspace(id: string): Promise<Workspace> {
    return fetchJson<Workspace>(`/api/workspaces/${id}`);
  },

  async createWorkspace(
    input: Omit<Workspace, "id" | "createdAt" | "updatedAt" | "status"> & {
      templateId?: string;
    }
  ): Promise<Workspace> {
    return fetchJson<Workspace>("/api/workspaces", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  async updateWorkspace(
    id: string,
    updates: Partial<Workspace>
  ): Promise<Workspace> {
    return fetchJson<Workspace>(`/api/workspaces/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  },

  async deleteWorkspace(id: string): Promise<void> {
    await fetchJson<{ success: boolean }>(`/api/workspaces/${id}`, {
      method: "DELETE",
    });
  },

  async cleanWorkspaceResponses(id: string): Promise<void> {
    await fetchJson<{ success: boolean }>(
      `/api/workspaces/${id}/clean-responses`,
      {
        method: "POST",
      }
    );
  },

  async cleanDuplicateParticipants(
    id: string,
    dryRun = false,
    targetIds?: string[]
  ): Promise<{
    success: boolean;
    keyColumn?: string;
    nameColumn?: string | null;
    deletedCount: number;
    duplicateCount: number;
    duplicateGroups?: Array<{
      keyValue: string;
      nameValue?: string;
      total: number;
      retainedParticipant: { id: string; name?: string; updatedAt?: string | null };
      deletedParticipants: Array<{ id: string; name?: string; updatedAt?: string | null }>;
    }>;
  }> {
    return fetchJson(`/api/workspaces/${id}/clean-duplicates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dryRun, targetIds }),
    });
  },

  // --- Form fields per Workspace ---
  async getWorkspaceForm(workspaceId: string): Promise<FormField[]> {
    return fetchJson<FormField[]>(`/api/workspaces/${workspaceId}/form-fields`);
  },

  async saveWorkspaceForm(
    workspaceId: string,
    items: FormField[]
  ): Promise<FormField[]> {
    return fetchJson<FormField[]>(
      `/api/workspaces/${workspaceId}/form-fields`,
      {
        method: "PUT",
        body: JSON.stringify(items),
      }
    );
  },

  // Legacy alias
  async getWorkspaceChecklist(workspaceId: string): Promise<ChecklistItem[]> {
    return this.getWorkspaceForm(workspaceId);
  },

  async saveWorkspaceChecklist(
    workspaceId: string,
    items: ChecklistItem[]
  ): Promise<ChecklistItem[]> {
    return this.saveWorkspaceForm(workspaceId, items);
  },

  // --- Templates ---
  async getTemplates(): Promise<ChecklistTemplate[]> {
    return fetchJson<ChecklistTemplate[]>("/api/templates");
  },

  async getTemplate(id: string): Promise<ChecklistTemplate> {
    return fetchJson<ChecklistTemplate>(`/api/templates/${id}`);
  },

  async saveTemplate(template: ChecklistTemplate): Promise<ChecklistTemplate> {
    if (template.id && !template.id.startsWith("temp_")) {
      try {
        return await fetchJson<ChecklistTemplate>(
          `/api/templates/${template.id}`,
          {
            method: "PUT",
            body: JSON.stringify(template),
          }
        );
      } catch (err) {
        // Hanya buat template baru jika memang belum ada di database (404)
        const status = (err as { status?: number })?.status;
        if (status !== 404) {
          throw err;
        }
      }
    }

    return fetchJson<ChecklistTemplate>("/api/templates", {
      method: "POST",
      body: JSON.stringify(template),
    });
  },

  async deleteTemplate(id: string): Promise<void> {
    await fetchJson<{ success: boolean }>(`/api/templates/${id}`, {
      method: "DELETE",
    });
  },

  // --- Participants ---
  async getParticipants(workspaceId: string): Promise<Participant[]> {
    return fetchJson<Participant[]>(`/api/workspaces/${workspaceId}/participants`);
  },

  async getParticipant(id: string, workspaceId?: string): Promise<Participant> {
    if (workspaceId) {
      return fetchJson<Participant>(
        `/api/workspaces/${workspaceId}/participants/${id}`
      );
    }
    // Fallback: search participant directly
    const workspaces = await this.getWorkspaces();
    for (const ws of workspaces) {
      try {
        const p = await fetchJson<Participant>(
          `/api/workspaces/${ws.id}/participants/${id}`
        );
        if (p) return p;
      } catch {
        // continue
      }
    }
    throw new Error("Peserta tidak ditemukan");
  },

  async updateParticipant(
    id: string,
    updates: Partial<Participant> & {
      officerName?: string;
      officerEmail?: string;
    },
    workspaceId?: string
  ): Promise<Participant> {
    let wsId = workspaceId;
    if (!wsId) {
      const p = await this.getParticipant(id);
      wsId = p.workspaceId;
    }

    return fetchJson<Participant>(
      `/api/workspaces/${wsId}/participants/${id}`,
      {
        method: "PUT",
        body: JSON.stringify(updates),
      }
    );
  },

  async updateParticipantFormData(
    participantId: string,
    fieldKey: string,
    value: unknown,
    workspaceId?: string
  ): Promise<Participant> {
    let wsId = workspaceId;
    let existingData: Record<string, unknown> = {};

    if (!wsId) {
      const p = await this.getParticipant(participantId);
      wsId = p.workspaceId;
      existingData = p.data;
    } else {
      const p = await this.getParticipant(participantId, wsId);
      existingData = p.data;
    }

    const updatedData = { ...existingData, [fieldKey]: value };
    const formFields = await this.getWorkspaceForm(wsId);
    const newStatus = calculateParticipantStatus(formFields, updatedData);

    return this.updateParticipant(
      participantId,
      {
        data: updatedData,
        status: newStatus,
      },
      wsId
    );
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
    return fetchJson<{
      total: number;
      importedCount: number;
      createdCount: number;
      updatedCount: number;
      skippedCount: number;
    }>(`/api/workspaces/${workspaceId}/participants`, {
      method: "POST",
      body: JSON.stringify({ participants }),
    });
  },

  async importParticipantsStream(
    workspaceId: string,
    participants: Array<{
      data: Record<string, unknown>;
      action?: "create" | "overwrite" | "skip";
      existingId?: string;
    }>,
    onProgress?: (progress: {
      currentBatch: number;
      totalBatches: number;
      processed: number;
      total: number;
      percentage: number;
      createdCount: number;
      updatedCount: number;
      skippedCount: number;
    }) => void
  ): Promise<{
    total: number;
    importedCount: number;
    createdCount: number;
    updatedCount: number;
    skippedCount: number;
  }> {
    const res = await fetch(`/api/workspaces/${workspaceId}/participants`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/x-ndjson",
      },
      body: JSON.stringify({ participants, stream: true }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}: Gagal memproses import`);
    }

    if (!res.body) {
      throw new Error("ReadableStream tidak didukung oleh browser");
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let finalResult: {
      total: number;
      importedCount: number;
      createdCount: number;
      updatedCount: number;
      skippedCount: number;
    } | null = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.trim()) continue;
        const event = JSON.parse(line);

        if (event.type === "error") {
          throw new Error(event.error || "Gagal memproses batch import");
        } else if (event.type === "progress") {
          onProgress?.(event);
        } else if (event.type === "done") {
          finalResult = event.result;
        }
      }
    }

    if (buffer.trim()) {
      const event = JSON.parse(buffer);
      if (event.type === "error") {
        throw new Error(event.error || "Gagal memproses batch import");
      } else if (event.type === "done") {
        finalResult = event.result;
      }
    }

    if (!finalResult) {
      throw new Error("Import selesai tanpa data ringkasan akhir");
    }

    return finalResult;
  },

  // --- Checklist Responses ---
  async getResponses(
    participantId: string,
    workspaceId?: string
  ): Promise<ChecklistResponse[]> {
    let wsId = workspaceId;
    if (!wsId) {
      const p = await this.getParticipant(participantId);
      wsId = p.workspaceId;
    }

    return fetchJson<ChecklistResponse[]>(
      `/api/workspaces/${wsId}/participants/${participantId}/responses`
    );
  },

  async saveResponse(
    response: Omit<ChecklistResponse, "id"> & { id?: string },
    workspaceId?: string
  ): Promise<{
    response: ChecklistResponse;
    newParticipantStatus: string;
  }> {
    let wsId = workspaceId;
    if (!wsId) {
      const p = await this.getParticipant(response.participantId);
      wsId = p.workspaceId;
    }

    // Check offline mode
    if (typeof window !== "undefined" && !navigator.onLine) {
      // Save to IndexedDB draft
      await saveOfflineDraft({
        workspaceId: wsId,
        participantId: response.participantId,
        updatedAt: new Date().toISOString(),
        syncStatus: "pending",
        userEmail: response.updatedBy || "",
        version: 1,
        responses: {
          [response.checklistItemId]: {
            value: response.value,
            status: response.status,
            notes: response.notes,
            evidence: response.evidence,
          },
        },
      });

      return {
        response: {
          id: response.id || `offline_${Date.now()}`,
          participantId: response.participantId,
          checklistItemId: response.checklistItemId,
          value: response.value,
          status: response.status,
          notes: response.notes,
          evidence: response.evidence,
          updatedBy: response.updatedBy,
          updatedAt: new Date().toISOString(),
        },
        newParticipantStatus: "incomplete",
      };
    }

    // Online: send to PostgreSQL backend API
    const result = await fetchJson<{
      response: ChecklistResponse;
      newParticipantStatus: string;
    }>(
      `/api/workspaces/${wsId}/participants/${response.participantId}/responses`,
      {
        method: "POST",
        body: JSON.stringify(response),
      }
    );

    // Sync any pending offline drafts in the background
    syncOfflineDraftsToBackend().catch(console.error);

    return result;
  },

  // --- Officers ---
  async getOfficers(): Promise<Officer[]> {
    return fetchJson<Officer[]>("/api/officers");
  },

  async saveOfficers(officers: Officer[]): Promise<void> {
    await fetchJson<{ success: boolean }>("/api/officers", {
      method: "POST",
      body: JSON.stringify(officers),
    });
  },

  async updateOfficer(
    id: string,
    updates: Partial<Officer>
  ): Promise<Officer> {
    return fetchJson<Officer>(`/api/officers/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  },

  async deleteOfficer(id: string): Promise<void> {
    await fetchJson<{ success: boolean }>(`/api/officers/${id}`, {
      method: "DELETE",
    });
  },

  // --- Audit Logs ---
  async getAuditLogs(workspaceId?: string): Promise<AuditLog[]> {
    const url = workspaceId
      ? `/api/audit-logs?workspaceId=${encodeURIComponent(workspaceId)}`
      : "/api/audit-logs";
    return fetchJson<AuditLog[]>(url);
  },

  // --- Upload Evidence File ---
  async uploadEvidence(file: File): Promise<{
    id: string;
    name: string;
    size: number;
    type: string;
    url: string;
  }> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/storage/upload", {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      throw new Error("Gagal mengunggah file bukti");
    }
    return res.json();
  },

  // --- Google Sheets Sync ---
  async getSheetSync(workspaceId: string): Promise<{
    config: {
      id: string;
      googleSheetUrl?: string;
      autoSyncEnabled: boolean;
      syncIntervalMinutes: number;
      lastSyncedAt?: string;
      lastSyncStatus?: "success" | "failed" | "running";
      lastSyncMessage?: string;
      uniqueKeyColumn?: string;
    };
    logs: SheetSyncLog[];
  }> {
    return fetchJson(`/api/workspaces/${workspaceId}/sync-sheet`);
  },

  async updateSheetSyncConfig(
    workspaceId: string,
    payload: {
      googleSheetUrl?: string;
      autoSyncEnabled?: boolean;
      syncIntervalMinutes?: number;
    }
  ): Promise<{ success: boolean; message: string }> {
    return fetchJson(`/api/workspaces/${workspaceId}/sync-sheet`, {
      method: "POST",
      body: JSON.stringify({ action: "update_config", ...payload }),
    });
  },

  async triggerSheetSync(workspaceId: string): Promise<{
    success: boolean;
    totalRowsFound: number;
    newAddedCount: number;
    skippedCount: number;
    message: string;
    durationMs: number;
    error?: string;
  }> {
    return fetchJson(`/api/workspaces/${workspaceId}/sync-sheet`, {
      method: "POST",
      body: JSON.stringify({ action: "trigger" }),
    });
  },

  async parseGoogleSheetPreview(url: string): Promise<{
    spreadsheetId: string;
    sheetGid: string;
    exportUrl: string;
    headers: string[];
    totalRows: number;
    previewRows: Record<string, unknown>[];
  }> {
    return fetchJson(`/api/workspaces/parse-sheet`, {
      method: "POST",
      body: JSON.stringify({ url }),
    });
  },

  // --- Reset for Demo ---
  resetMockDB() {
    // No-op for real database
  },
};
