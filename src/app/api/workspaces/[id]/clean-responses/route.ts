import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checklistResponse, participant, formField, workspace, auditLog } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { getCurrentUser } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const currentUser = await getCurrentUser();

    // 1. Fetch workspace to check importHeaders & identity columns
    const [ws] = await db
      .select()
      .from(workspace)
      .where(eq(workspace.id, id));

    // 2. Fetch all form fields configured for this workspace
    const fields = await db
      .select()
      .from(formField)
      .where(eq(formField.workspaceId, id));

    // Determine which field keys belong to checklist/custom form or are editable
    const formKeysToRemove = new Set<string>();
    for (const f of fields) {
      if (f.type === "section") continue;
      // If it's an editable field, checklist input, or custom field
      if (f.editable || f.sourceType === "checklist_input" || f.sourceType === "custom_field") {
        if (f.id) formKeysToRemove.add(f.id);
        if (f.label) formKeysToRemove.add(f.label);
        if (f.excelColumn) formKeysToRemove.add(f.excelColumn);
      }
    }

    // 3. Get all participants in this workspace
    const participants = await db
      .select()
      .from(participant)
      .where(eq(participant.workspaceId, id));

    const participantIds = participants.map((p) => p.id);

    if (participantIds.length > 0) {
      // 4. Delete all checklist_response records
      for (const pId of participantIds) {
        await db
          .delete(checklistResponse)
          .where(eq(checklistResponse.participantId, pId));
      }

      // 5. Clean each participant's data back to original import/master state
      const importHeaders = Array.isArray(ws?.importHeaders) ? ws.importHeaders : null;

      for (const p of participants) {
        const rawData = (p.data || {}) as Record<string, unknown>;
        const cleanedData: Record<string, unknown> = {};

        for (const [key, value] of Object.entries(rawData)) {
          // Remove internal system meta keys
          if (
            key.startsWith("_evidence_") ||
            key === "_officerHistory" ||
            key === "_lastUpdatedBy" ||
            key === "_lastUpdatedEmail" ||
            key === "_lastUpdatedAt"
          ) {
            continue;
          }

          // If workspace has importHeaders recorded, only keep imported columns
          if (importHeaders && importHeaders.length > 0) {
            if (importHeaders.includes(key)) {
              cleanedData[key] = value;
            }
          } else {
            // Otherwise, keep identity columns and remove formKeys
            const isIdentity =
              key === ws?.uniqueKeyColumn ||
              key === ws?.nameColumn ||
              key === ws?.photoColumn ||
              /nik|ktp|id|nomor|nim|nama|foto|avatar/i.test(key);

            if (isIdentity || !formKeysToRemove.has(key)) {
              cleanedData[key] = value;
            }
          }
        }

        await db
          .update(participant)
          .set({
            data: cleanedData,
            status: "incomplete",
            updatedAt: new Date(),
          })
          .where(eq(participant.id, p.id));
      }

      // 6. Record audit log
      const officerName = currentUser?.name || "Admin";
      const officerEmail = currentUser?.email || "admin@regicheck.id";

      await db.insert(auditLog).values({
        id: `log_${crypto.randomUUID()}`,
        workspaceId: id,
        officerName,
        officerEmail,
        participantId: null,
        participantName: null,
        checklistItemId: null,
        checklistItemLabel: "Bersihkan Data Form",
        action: "CLEAN_WORKSPACE_DATA",
        previousValue: null,
        newValue: `Membersihkan data formulir & mereset status untuk ${participants.length} peserta di "${ws?.name || id}"`,
      });
    }

    return NextResponse.json({
      success: true,
      clearedCount: participantIds.length,
    });
  } catch (error) {
    console.error("POST /api/workspaces/[id]/clean-responses error:", error);
    return NextResponse.json(
      { error: "Gagal membersihkan response workspace" },
      { status: 500 }
    );
  }
}
