"use client";
import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  plugins: [adminClient()],
});

// No `signUp` export: account creation goes through /api/signup only.
export const { signIn, signOut, useSession } = authClient;
