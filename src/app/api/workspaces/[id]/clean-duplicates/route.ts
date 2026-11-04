import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { participant, workspace, auditLog } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import crypto from "crypto";
import { getCurrentUser } from "@/lib/auth";
import {
  getParticipantUniqueKey,
  getParticipantCompositeKey,
  getParticipantIdentityDisplay,
} from "@/lib/domain/participant-identity";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Menghapus peserta dengan ID unik ganda; yang dipertahankan adalah updatedAt terbaru.
// Body opsional: { dryRun: true } hanya menghitung tanpa menghapus.
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const currentUser = await getCurrentUser();
    const body = await req.json().catch(() => ({}));
    const dryRun = body?.dryRun === true;

    const [ws] = await db.select().from(workspace).where(eq(workspace.id, id));
    if (!ws) {
      return NextResponse.json({ error: "Workspace tidak ditemukan" }, { status: 404 });
    }
    const keyColumn = ws.uniqueKeyColumn;
    const nameColumn = ws.nameColumn;
    if (!keyColumn) {
      return NextResponse.json(
        { error: "Kolom ID unik belum dikonfigurasi untuk workspace ini" },
        { status: 400 }
      );
    }

    const keyOptions = { uniqueKeyColumn: keyColumn, nameColumn };
    const rows = await db.select().from(participant).where(eq(participant.workspaceId, id));

    const groups = new Map<string, typeof rows>();
    for (const p of rows) {
      const data = (p.data || {}) as Record<string, unknown>;
      // Kelompokkan berdasarkan Kunci Unik primer (NIK / Nomor Peserta)
      const primaryKey = getParticipantUniqueKey(data, keyColumn);
      if (!primaryKey) continue; // tanpa ID unik: diabaikan

      const list = groups.get(primaryKey);
      if (list) list.push(p);
      else groups.set(primaryKey, [p]);
    }

    const toDelete: string[] = [];
    const duplicateGroups: Array<{
      keyValue: string;
      nameValue?: string;
      total: number;
      retainedParticipant: { id: string; name?: string; updatedAt?: Date | null; status?: string };
      deletedParticipants: Array<{ id: string; name?: string; updatedAt?: Date | null; status?: string }>;
    }> = [];

    // Bobot status untuk penentuan prioritas retensi: complete > incomplete > rejected
    const getStatusWeight = (status: string | null | undefined) => {
      if (status === "complete") return 2;
      if (status === "incomplete") return 1;
      return 0;
    };

    for (const [, list] of groups.entries()) {
      if (list.length < 2) continue;
      const time = (p: (typeof rows)[number]) => (p.updatedAt ? new Date(p.updatedAt).getTime() : 0);
      
      // Urutkan:
      // 1. Prioritaskan status 'complete' / verifikasi terisi
      // 2. Jika sama, prioritaskan updatedAt terbaru
      // 3. Jika sama, id terkecil
      list.sort((a, b) => {
        const weightDiff = getStatusWeight(b.status) - getStatusWeight(a.status);
        if (weightDiff !== 0) return weightDiff;
        const timeDiff = time(b) - time(a);
        if (timeDiff !== 0) return timeDiff;
        return a.id < b.id ? 1 : -1;
      });

      const retained = list[0];
      const deletedList = list.slice(1);

      for (const dup of deletedList) toDelete.push(dup.id);

      const getName = (p: (typeof rows)[number]) => {
        const d = (p.data || {}) as Record<string, unknown>;
        return nameColumn ? String(d[nameColumn] ?? "") : "";
      };

      const retainedData = (retained.data || {}) as Record<string, unknown>;
      const identity = getParticipantIdentityDisplay(retainedData, keyOptions);

      duplicateGroups.push({
        keyValue: identity.keyValue,
        nameValue: nameColumn ? identity.nameValue : undefined,
        total: list.length,
        retainedParticipant: {
          id: retained.id,
          name: getName(retained),
          updatedAt: retained.updatedAt,
          status: retained.status,
        },
        deletedParticipants: deletedList.map((d) => ({
          id: d.id,
          name: getName(d),
          updatedAt: d.updatedAt,
          status: d.status,
        })),
      });
    }

    // Jika user memilih menghapus daftar ID tertentu saja (misal uji coba 1 peserta)
    const targetDeleteIds: string[] = Array.isArray(body?.targetIds) && body.targetIds.length > 0
      ? toDelete.filter((idItem) => body.targetIds.includes(idItem))
      : toDelete;

    if (dryRun || targetDeleteIds.length === 0) {
      return NextResponse.json({
        success: true,
        keyColumn,
        nameColumn: nameColumn || null,
        deletedCount: 0,
        duplicateCount: toDelete.length,
        duplicateGroups,
      });
    }

    // Hapus per batch (checklist_response ikut terhapus via cascade)
    for (let i = 0; i < targetDeleteIds.length; i += 500) {
      await db.delete(participant).where(inArray(participant.id, targetDeleteIds.slice(i, i + 500)));
    }

    await db.insert(auditLog).values({
      id: `log_${crypto.randomUUID()}`,
      workspaceId: id,
      officerName: currentUser?.name || "Admin",
      officerEmail: currentUser?.email || "admin@regicheck.id",
      participantId: null,
      participantName: null,
      checklistItemId: null,
      checklistItemLabel: "Bersihkan Peserta Duplikat",
      action: "CLEAN_DUPLICATE_PARTICIPANTS",
      previousValue: null,
      newValue: `Menghapus ${targetDeleteIds.length} peserta duplikat (ID: ${keyColumn}${nameColumn ? ` & Nama: ${nameColumn}` : ""}) di "${ws.name || id}", data terbaru dipertahankan`,
    });

    return NextResponse.json({
      success: true,
      keyColumn,
      nameColumn: nameColumn || null,
      deletedCount: targetDeleteIds.length,
      duplicateCount: toDelete.length - targetDeleteIds.length,
      duplicateGroups,
    });
  } catch (error) {
    console.error("POST /api/workspaces/[id]/clean-duplicates error:", error);
    return NextResponse.json({ error: "Gagal membersihkan peserta duplikat" }, { status: 500 });
  }
}
