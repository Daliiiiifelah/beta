/// <reference types="vite/client" />

import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { auth } from "../convex/auth";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ConvexAuthProvider value={auth}>
      <ConvexProvider client={convex}>
        <App />
      </ConvexProvider>
    </ConvexAuthProvider>
  </React.StrictMode>
);