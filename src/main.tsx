/// <reference types="vite/client" />

import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { ConvexProviderWithAuth, ConvexReactClient } from "@convex-dev/auth/react";
import { auth } from "../convex/auth";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ConvexProviderWithAuth client={convex} auth={auth}>
      <App />
    </ConvexProviderWithAuth>
  </React.StrictMode>
);