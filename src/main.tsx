console.log("🌱 main.tsx running, VITE_CONVEX_URL=", import.meta.env.VITE_CONVEX_URL);
import * as AuthMod from "@convex-dev/auth/react";
console.log("AuthModule exports:", Object.keys(AuthMod));
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
    <div id="smoke-test">🛠️ React is alive</div>
    <ConvexAuthProvider value={auth}>
      <ConvexProvider client={convex}>
        <App />
      </ConvexProvider>
    </ConvexAuthProvider>
  </React.StrictMode>
);