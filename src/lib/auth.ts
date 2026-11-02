import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { headers } from "next/headers";
import { db } from "./db";
import * as schema from "./db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

function getAdminEmails(): string[] {
  const envEmails = process.env.ADMIN_EMAILS || "";
  return envEmails
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isEmailAdmin(email: string): boolean {
  if (!email) return false;
  const adminEmails = getAdminEmails();
  return adminEmails.includes(email.trim().toLowerCase());
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "officer",
        input: false,
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const role = isEmailAdmin(user.email) ? "admin" : "officer";
          return {
            data: {
              ...user,
              role,
            },
          };
        },
      },
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    },
  },
});

export async function getServerSession() {
  const headerList = await headers();
  const session = await auth.api.getSession({
    headers: headerList,
  });
  return session;
}

export async function getCurrentUser() {
  const session = await getServerSession();
  if (!session?.user) return null;

  // Sync role if admin whitelist changed or check database for latest role
  const role = isEmailAdmin(session.user.email)
    ? "admin"
    : ((session.user as { role?: string }).role || "officer");

  // Keep db in sync if role changed in env
  if ((session.user as { role?: string }).role !== role) {
    try {
      await db
        .update(schema.user)
        .set({ role })
        .where(eq(schema.user.id, session.user.id));
    } catch (e) {
      console.error("Failed to sync role:", e);
    }
  }

  return {
    ...session.user,
    role: role as "admin" | "officer",
  };
}

/**
 * Memeriksa apakah user terdaftar (Admin atau Petugas aktif di tabel officer)
 */
export async function isUserRegistered(email: string): Promise<boolean> {
  if (!email) return false;
  if (isEmailAdmin(email)) return true;

  const foundOfficer = await db.query.officer.findFirst({
    where: (officers, { eq, and }) =>
      and(eq(officers.email, email.trim().toLowerCase()), eq(officers.active, true)),
  });

  return !!foundOfficer;
}

/**
 * Auto-daftarkan user sebagai petugas pending jika belum ada sama sekali.
 * Dipanggil saat user login via share link tapi tidak terdaftar.
 * Mengembalikan true jika baru didaftarkan, false jika sudah ada (apapun statusnya).
 */
export async function registerPendingOfficerIfNew(
  email: string,
  name: string,
  requestedWorkspaceId?: string
): Promise<{ isNew: boolean; status: string }> {
  if (!email) return { isNew: false, status: "unknown" };
  if (isEmailAdmin(email)) return { isNew: false, status: "active" };

  const normalizedEmail = email.trim().toLowerCase();
  const existing = await db.query.officer.findFirst({
    where: (officers, { eq }) => eq(officers.email, normalizedEmail),
  });

  if (existing) {
    // Jika masih pending dan sebelumnya belum tercatat workspace asal, perbarui requestedWorkspaceId
    if (
      existing.status === "pending" &&
      !existing.requestedWorkspaceId &&
      requestedWorkspaceId
    ) {
      await db
        .update(schema.officer)
        .set({ requestedWorkspaceId })
        .where(eq(schema.officer.id, existing.id));
    }
    const st = existing.status || (existing.active ? "active" : "rejected");
    return { isNew: false, status: st };
  }

  // Buat record petugas baru dengan status pending
  const newId = `off_${crypto.randomUUID()}`;
  try {
    await db
      .insert(schema.officer)
      .values({
        id: newId,
        name: name || email.split("@")[0],
        email: normalizedEmail,
        active: false,
        status: "pending",
        requestedWorkspaceId: requestedWorkspaceId || null,
        requestedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: schema.officer.email,
        set: {
          // Jika sudah ada (race condition), jangan timpa status jika sudah active/rejected
          // Hanya update requestedWorkspaceId jika sebelumnya belum ada
          requestedWorkspaceId: requestedWorkspaceId || null,
        },
      });

    return { isNew: true, status: "pending" };
  } catch (error) {
    // Jika terjadi concurrent conflict, fallback ambil status existing
    console.warn("registerPendingOfficerIfNew conflict or error handled:", error);
    const fallback = await db.query.officer.findFirst({
      where: (officers, { eq }) => eq(officers.email, normalizedEmail),
    });
    return {
      isNew: false,
      status: fallback?.status || (fallback?.active ? "active" : "pending"),
    };
  }
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}

export async function requireAdmin() {
  const user = await requireAuth();
  if (user.role !== "admin") {
    throw new Error("FORBIDDEN: Admin access required");
  }
  return user;
}
