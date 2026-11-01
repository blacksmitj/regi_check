import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth";

export const instant = false;

export default async function RootPage() {
  const user = await getCurrentUser();

  if (!user) {
    // Jika cookie session ada tapi sesi di server/database sudah invalid atau user null,
    // bersihkan cookie agar tidak terjadi loop redirect antara proxy dan login.
    const cookieStore = await cookies();
    cookieStore.delete("better-auth.session_token");
    cookieStore.delete("__Secure-better-auth.session_token");

    redirect("/login");
  }

  if (user.role === "officer") {
    redirect("/workspaces");
  }

  redirect("/dashboard");
}
