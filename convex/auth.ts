// convex/auth.ts
import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// 1) Initialize the plugin, destructure its exports at top‐level
export const { auth, signIn, signOut, isAuthenticated, store } = convexAuth({
  providers: [Password, Anonymous],
});

// 2) Add your own loggedInUser query in the same file
export const loggedInUser = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return (await ctx.db.get(userId)) || null;
  },
});