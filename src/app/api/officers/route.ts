import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { officer } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import crypto from "crypto";
import { Officer } from "@/types/domain";

function mapOfficer(o: typeof officer.$inferSelect): Officer {
  return {
    id: o.id,
    workspaceId: o.workspaceId || undefined,
    name: o.name,
    email: o.email,
    active: o.active,
    status: ((o as { status?: string }).status as Officer["status"]) || (o.active ? "active" : "rejected"),
    requestedWorkspaceId: (o as { requestedWorkspaceId?: string | null }).requestedWorkspaceId || undefined,
    requestedAt: (o as { requestedAt?: Date | null }).requestedAt
      ? ((o as { requestedAt?: Date | null }).requestedAt as Date).toISOString()
      : undefined,
    createdAt: o.createdAt.toISOString(),
  };
}

export async function GET() {
  try {
    const rawOfficers = await db
      .select()
      .from(officer)
      .orderBy(desc(officer.createdAt));

    // Deduplikasi defensif berdasarkan email (prioritaskan yang status active atau yang paling baru)
    const seenEmails = new Set<string>();
    const deduplicatedOfficers: (typeof officer.$inferSelect)[] = [];
    const duplicateIdsToDelete: string[] = [];

    for (const off of rawOfficers) {
      const emailKey = off.email.toLowerCase().trim();
      if (!seenEmails.has(emailKey)) {
        seenEmails.add(emailKey);
        deduplicatedOfficers.push(off);
      } else {
        duplicateIdsToDelete.push(off.id);
      }
    }

    // Bersihkan duplikat sisa dari database secara asinkron
    if (duplicateIdsToDelete.length > 0) {
      (async () => {
        try {
          for (const dupId of duplicateIdsToDelete) {
            await db.delete(officer).where(eq(officer.id, dupId));
          }
        } catch (cleanupErr) {
          console.error("Gagal membersihkan duplikat officer:", cleanupErr);
        }
      })();
    }

    return NextResponse.json(deduplicatedOfficers.map(mapOfficer));
  } catch (error) {
    console.error("GET /api/officers error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil daftar petugas" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Support both single create and bulk replace
    if (Array.isArray(body)) {
      // Bulk update/replace list
      const officersList: Officer[] = body;
      await db.delete(officer);

      if (officersList.length > 0) {
        const toInsert = officersList.map((o) => ({
          id: o.id || `off_${crypto.randomUUID()}`,
          workspaceId: o.workspaceId || null,
          name: o.name,
          email: o.email,
          active: o.active ?? true,
          status: o.status || (o.active ? "active" : "rejected"),
          requestedWorkspaceId: o.requestedWorkspaceId || null,
          requestedAt: o.requestedAt ? new Date(o.requestedAt) : null,
        }));
        await db.insert(officer).values(toInsert);
      }

      return NextResponse.json({ success: true });
    }

    const { name, email, workspaceId, active = true, status = "active" } = body;
    if (!name || !email) {
      return NextResponse.json(
        { error: "Nama dan email wajib diisi" },
        { status: 400 }
      );
    }

    const newId = `off_${crypto.randomUUID()}`;
    const [created] = await db
      .insert(officer)
      .values({
        id: newId,
        name,
        email: email.trim().toLowerCase(),
        workspaceId: workspaceId || null,
        active,
        status,
      })
      .onConflictDoUpdate({
        target: officer.email,
        set: {
          name,
          workspaceId: workspaceId || null,
          active,
          status,
        },
      })
      .returning();

    return NextResponse.json(mapOfficer(created), { status: 201 });
  } catch (error) {
    console.error("POST /api/officers error:", error);
    return NextResponse.json(
      { error: "Gagal menyimpan data petugas" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  return POST(req);
}

