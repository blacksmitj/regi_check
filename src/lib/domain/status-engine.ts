import { ChecklistItem, ChecklistResponse, ParticipantStatus } from "@/types/domain";

/**
 * Rules according to PRD 5.7:
 * Priority: Ditolak -> Belum lengkap -> Lengkap.
 * - Ditolak: minimal terdapat satu item yang ditolak (status === 'rejected')
 * - Belum lengkap: masih terdapat item wajib yang belum terpenuhi (value is empty / invalid)
 * - Lengkap: seluruh item wajib terpenuhi
 * Optional items that are not filled DO NOT prevent status from becoming complete.
 */
export function calculateParticipantStatus(
  checklistItems: ChecklistItem[],
  responses: ChecklistResponse[]
): ParticipantStatus {
  const activeItems = checklistItems.filter((i) => i.active);
  const responseMap = new Map<string, ChecklistResponse>();
  responses.forEach((r) => responseMap.set(r.checklistItemId, r));

  // 1. Check for any rejected item
  for (const item of activeItems) {
    const res = responseMap.get(item.id);
    if (res && res.status === "rejected") {
      return "rejected";
    }
  }

  // 2. Check for required items completion
  for (const item of activeItems) {
    if (!item.required) continue;

    const res = responseMap.get(item.id);
    if (!res || res.status !== "complete") {
      return "incomplete";
    }

    // Check evidence required
    if (item.evidenceEnabled && item.evidenceRequired) {
      if (!res.evidence || res.evidence.length === 0) {
        return "incomplete";
      }
    }
  }

  return "complete";
}

