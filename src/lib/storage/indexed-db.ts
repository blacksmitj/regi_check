import { openDB, DBSchema, IDBPDatabase } from "idb";

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
}

let dbPromise: Promise<IDBPDatabase<EvidenceDB>> | null = null;

function getDB() {
  if (typeof window === "undefined") return null;
  if (!dbPromise) {
    dbPromise = openDB<EvidenceDB>("regi_check_evidence", 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("evidence_files")) {
          db.createObjectStore("evidence_files", { keyPath: "id" });
        }
      },
    });
  }
  return dbPromise;
}

export async function saveEvidenceFile(id: string, file: File | Blob, name: string): Promise<string> {
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

