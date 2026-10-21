"use client";
/**
 * better-auth browser client (optional — the app's own forms use Server Actions).
 * Useful for client-side session checks or sign-out from Client Components.
 */
import { createAuthClient } from "better-auth/react";
import { usernameClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({ plugins: [usernameClient()] });
