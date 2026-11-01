"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { User } from "@/types/domain";

export function AuthSync({ user }: { user: User }) {
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    if (user) {
      setUser(user);
    }
  }, [user, setUser]);

  return null;
}

