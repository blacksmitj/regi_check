import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { officer } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import crypto from "crypto";
import { Officer } from "@/types/domain";

export async function GET() {
  try {
    const officers = await db
      .select()
      .from(officer)
      .orderBy(desc(officer.createdAt));

    const result: Officer[] = officers.map((o) => ({
      id: o.id,
      workspaceId: o.workspaceId || undefined,
      name: o.name,
      email: o.email,
      active: o.active,
      createdAt: o.createdAt.toISOString(),
    }));

    return NextResponse.json(result);
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
        }));
        await db.insert(officer).values(toInsert);
      }

      return NextResponse.json({ success: true });
    }

    const { name, email, workspaceId, active = true } = body;
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
        email,
        workspaceId: workspaceId || null,
        active,
      })
      .returning();

    return NextResponse.json(
      {
        id: created.id,
        workspaceId: created.workspaceId || undefined,
        name: created.name,
        email: created.email,
        active: created.active,
        createdAt: created.createdAt.toISOString(),
      },
      { status: 201 }
    );
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

