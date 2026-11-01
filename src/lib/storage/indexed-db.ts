import { openDB, DBSchema, IDBPDatabase } from "idb";
import { ParticipantDraft, EvidenceFile } from "@/types/domain";

interface EvidenceDB extends DBSchema {
  evidence_files: {
    key: string;
    value: {
      id: string;
      name: string;
      type: string;
      size: number;
      blob: Blob;
      createdAt: number;
    };
  };
  offline_drafts: {
    key: string; // composite key: `${workspaceId}_${participantId}`
    value: ParticipantDraft;
  };
}

let dbPromise: Promise<IDBPDatabase<EvidenceDB>> | null = null;

function getDB() {
  if (typeof window === "undefined") return null;
  if (!dbPromise) {
    dbPromise = openDB<EvidenceDB>("regi_check_offline", 2, {
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains("evidence_files")) {
          db.createObjectStore("evidence_files", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("offline_drafts")) {
          db.createObjectStore("offline_drafts", { keyPath: "participantId" });
        }
      },
    });
  }
  return dbPromise;
}

// ==========================================
// EVIDENCE STORAGE
// ==========================================

export async function saveEvidenceFile(
  id: string,
  file: File | Blob,
  name: string
): Promise<string> {
  const db = await getDB();
  if (!db) throw new Error("IndexedDB not available");

  await db.put("evidence_files", {
    id,
    name,
    type: file.type,
    size: file.size,
    blob: file,
    createdAt: Date.now(),
  });

  return id;
}

export async function getEvidenceFile(id: string) {
  const db = await getDB();
  if (!db) return null;
  return db.get("evidence_files", id);
}

export async function getEvidenceBlobUrl(id: string): Promise<string | null> {
  const record = await getEvidenceFile(id);
  if (!record) return null;
  return URL.createObjectURL(record.blob);
}

export async function deleteEvidenceFile(id: string): Promise<void> {
  const db = await getDB();
  if (!db) return;
  await db.delete("evidence_files", id);
}

// ==========================================
// OFFLINE DRAFT RESPONSES STORAGE
// ==========================================

export async function saveOfflineDraft(draft: ParticipantDraft): Promise<void> {
  const db = await getDB();
  if (!db) return;
  await db.put("offline_drafts", draft);
}

export async function getOfflineDraft(
  participantId: string
): Promise<ParticipantDraft | undefined> {
  const db = await getDB();
  if (!db) return undefined;
  return db.get("offline_drafts", participantId);
}

export async function getAllOfflineDrafts(): Promise<ParticipantDraft[]> {
  const db = await getDB();
  if (!db) return [];
  return db.getAll("offline_drafts");
}

export async function deleteOfflineDraft(
  participantId: string
): Promise<void> {
  const db = await getDB();
  if (!db) return;
  await db.delete("offline_drafts", participantId);
}

export async function clearWorkspaceOfflineDrafts(
  workspaceId: string,
  participantIds?: string[]
): Promise<void> {
  const db = await getDB();
  if (!db) return;

  if (participantIds && participantIds.length > 0) {
    for (const pId of participantIds) {
      await db.delete("offline_drafts", pId);
    }
  } else {
    const all = await db.getAll("offline_drafts");
    for (const draft of all) {
      if (draft.workspaceId === workspaceId) {
        await db.delete("offline_drafts", draft.participantId);
      }
    }
  }
}

/**
 * Flush all offline drafts to backend when connection is restored
 */
export async function syncOfflineDraftsToBackend(): Promise<{
  syncedCount: number;
  failedCount: number;
}> {
  if (typeof window === "undefined" || !navigator.onLine) {
    return { syncedCount: 0, failedCount: 0 };
  }

  const drafts = await getAllOfflineDrafts();
  let syncedCount = 0;
  let failedCount = 0;

  for (const draft of drafts) {
    try {
      // Push each checklist response
      const itemIds = Object.keys(draft.responses);
      for (const itemId of itemIds) {
        const itemResp = draft.responses[itemId];
        const res = await fetch(
          `/api/workspaces/${draft.workspaceId}/participants/${draft.participantId}/responses`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              checklistItemId: itemId,
              value: itemResp.value,
              status: itemResp.status,
              notes: itemResp.notes,
              evidence: itemResp.evidence,
            }),
          }
        );

        if (!res.ok) {
          throw new Error(`Failed to sync item ${itemId}`);
        }
      }

      await deleteOfflineDraft(draft.participantId);
      syncedCount++;
    } catch (err) {
      console.error("Failed to sync draft for participant:", draft.participantId, err);
      failedCount++;
    }
  }

  return { syncedCount, failedCount };
}

// Register automatic sync on window 'online' event
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    syncOfflineDraftsToBackend().catch(console.error);
  });
}
