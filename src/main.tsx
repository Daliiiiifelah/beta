/// <reference types="vite/client" />

import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import { auth, isAuthenticated, signIn, signOut } from "../convex/auth";
import { useMemo } from "react";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

function useAuth() {
  const anIsAuthenticated = isAuthenticated();
  return useMemo(
    () => ({
      isLoading: false,
      isAuthenticated: anIsAuthenticated,
      fetchAccessToken: async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
        if (!anIsAuthenticated) {
          return null;
        }
        // This is a hack, and probably not correct.
        return "dummy-token";
      },
    }),
    [anIsAuthenticated]
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ConvexProviderWithAuth client={convex} useAuth={useAuth}>
      <App />
    </ConvexProviderWithAuth>
  </React.StrictMode>
);