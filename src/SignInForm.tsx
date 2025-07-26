// src/SignInForm.tsx
"use client";

import React, { useState } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { toast } from "sonner";

export function SignInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // 1) hook into your generated auth action & query
  const signInAction = useAction(api.auth.signIn);
  const isAuth = useQuery(api.auth.isAuthenticated);

  // 2) if already signed in, don’t show form
  if (isAuth) {
    return <p className="text-center">✅ You’re already signed in.</p>;
  }

  // 3) handle form submit
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      // MUST pass provider + params, not email/password at top level
      await signInAction({
        provider: "password",
        params: { email, password },
      });
      toast.success("Signed in!");
    } catch (err: any) {
      toast.error(err.message || "Sign-in failed");
      setSubmitting(false);
    }
  }

  // 4) render form with controlled inputs
  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className="auth-input"
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        className="auth-input"
      />
      <button
        type="submit"
        disabled={submitting}
        className="auth-button"
      >
        Sign in
      </button>
      <button
        type="button"
        disabled={submitting}
        className="auth-button mt-2"
        onClick={async () => {
          setSubmitting(true);
          await signInAction({ provider: "anonymous", params: {} });
        }}
      >
        Sign in anonymously
      </button>
    </form>
  );
}