// src/SignOutButton.tsx
"use client";

import React from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

export function SignOutButton() {
  const signOutAction = useAction(api.auth.signOut);
  const isAuth = useQuery(api.auth.isAuthenticated);

  if (!isAuth) return null;

  return (
    <button
      className="px-4 py-2 rounded bg-white text-secondary border border-gray-200 font-semibold hover:bg-gray-50 transition-all"
      onClick={() => void signOutAction()}
    >
      Sign out
    </button>
  );
}