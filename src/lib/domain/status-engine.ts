import { FormField, ChecklistResponse, ParticipantStatus } from "@/types/domain";

/**
 * Calculates participant completion status.
 *
 * Mode 1 (Unified Participant Data - Pure Form):
 * - Complete: all active required fields have non-empty, valid values in participant.data
 * - Incomplete: one or more active required fields are missing or empty
 *
 * Mode 2 (Legacy Checklist Responses - fallback):
 * - Rejected: at least one item has status === 'rejected'
 * - Incomplete: missing required responses or incomplete status
 * - Complete: all required items completed
 */
export function calculateParticipantStatus(
  formFields: FormField[],
  dataOrResponses: Record<string, unknown> | ChecklistResponse[]
): ParticipantStatus {
  const activeFields = formFields.filter((f) => f.active && f.type !== "section");

  // If array of legacy ChecklistResponse
  if (Array.isArray(dataOrResponses)) {
    const responses = dataOrResponses;
    const responseMap = new Map<string, ChecklistResponse>();
    responses.forEach((r) => responseMap.set(r.checklistItemId, r));

    for (const item of activeFields) {
      const res = responseMap.get(item.id);
      if (res && res.status === "rejected") {
        return "rejected";
      }
    }

    for (const item of activeFields) {
      if (!item.required) continue;
      const res = responseMap.get(item.id);
      if (!res || res.status !== "complete") {
        return "incomplete";
      }
      if (item.evidenceEnabled && item.evidenceRequired) {
        if (!res.evidence || res.evidence.length === 0) {
          return "incomplete";
        }
      }
    }

    return "complete";
  }

  // Unified mode: participant.data Record<string, unknown>
  const data = dataOrResponses || {};

  for (const field of activeFields) {
    if (!field.required) continue;

    // Check by excelColumn, id, or label
    const val =
      field.excelColumn && data[field.excelColumn] !== undefined
        ? data[field.excelColumn]
        : data[field.id] !== undefined
          ? data[field.id]
          : data[field.label];

    if (val === undefined || val === null || val === "") {
      return "incomplete";
    }

    if (Array.isArray(val) && val.length === 0) {
      return "incomplete";
    }

    if (field.type === "checkbox") {
      // Checkbox is considered filled if true / "true" / "Ya" / 1
      if (val !== true && val !== "true" && val !== "Ya" && val !== 1) {
        return "incomplete";
      }
    }
  }

  return "complete";
}
