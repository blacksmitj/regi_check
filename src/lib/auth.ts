import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { headers } from "next/headers";
import { db } from "./db";
import * as schema from "./db/schema";
import { eq } from "drizzle-orm";

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
