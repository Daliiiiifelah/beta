// convex/userProfiles.ts

import { query, mutation, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

/* -------------------- Queries -------------------- */

export const getUserProfile = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
  },
});

export const getUserPublicProfile = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
  },
});

/* -------------------- Mutations -------------------- */

export const createUserProfile = mutation({
  args: {
    displayName: v.string(),
    bio: v.string(),
    favoritePosition: v.union(
      v.literal("goalkeeper"),
      v.literal("defender"),
      v.literal("midfielder"),
      v.literal("forward")
    ),
    skillLevel: v.string(),
    country: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("User not authenticated.");

    const existing = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (existing) throw new Error("Profile already exists.");

    await ctx.db.insert("userProfiles", { userId, ...args });
  },
});

export const updateUserProfile = mutation({
  args: {
    displayName: v.optional(v.string()),
    bio: v.optional(v.string()),
    favoritePosition: v.optional(
      v.union(
        v.literal("goalkeeper"),
        v.literal("defender"),
        v.literal("midfielder"),
        v.literal("forward")
      )
    ),
    skillLevel: v.optional(v.string()),
    country: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("User not authenticated.");

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (!profile) throw new Error("Profile not found.");

    await ctx.db.patch(profile._id, args);
  },
});

export const generateProfilePictureUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated.");
    return await ctx.storage.generateUploadUrl();
  },
});

export const saveProfilePicture = mutation({
  args: { storageId: v.string() },
  handler: async (ctx, { storageId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated.");

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (!profile) throw new Error("Profile not found.");

    await ctx.db.patch(profile._id, { profileImageUrl: storageId });
  },
});

/* -------------------- Internal Mutation -------------------- */

export const updateAggregatedProfileStats = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    // 1) Load the user's profile
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (!profile) return;

    // 2) Fetch all ratings
    const ratings = await ctx.db
      .query("playerRatings")
      .withIndex("by_ratedUser", (q) => q.eq("ratedUserId", userId))
      .collect();

    // 3) Fields on playerRatings & letter-to-score map
    const fields = [
      "speedGiven",
      "defenseGiven",
      "offenseGiven",
      "passingGiven",
      "shootingGiven",
      "dribblingGiven",
    ] as const;
    type Field = typeof fields[number];
    const gradeToScore: Record<"S" | "A" | "B" | "C" | "D", number> = {
      S: 100,
      A: 80,
      B: 60,
      C: 40,
      D: 20,
    };

    // 4) Accumulate sums & counts per field
    const sums: Record<Field, number> = Object.fromEntries(
      fields.map((f) => [f, 0])
    ) as Record<Field, number>;
    const counts: Record<Field, number> = Object.fromEntries(
      fields.map((f) => [f, 0])
    ) as Record<Field, number>;

    for (const r of ratings) {
      for (const f of fields) {
        const grade = r[f];
        if (grade) {
          sums[f] += gradeToScore[grade];
          counts[f]++;
        }
      }
    }

    // 5) Build patch: compute averages, overallScore, ratingsCount
    let totalAvg = 0;
    const patch: Record<string, number> = {};

    for (const f of fields) {
      const avg = counts[f] > 0 ? sums[f] / counts[f] : 0;
      // strip "Given" suffix to match schema fields
      const key = f.replace("Given", "") as
        | "speed"
        | "defense"
        | "offense"
        | "passing"
        | "shooting"
        | "dribbling";
      patch[key] = avg;
      totalAvg += avg;
    }

    patch.overallScore = fields.length > 0 ? totalAvg / fields.length : 0;
    patch.ratingsCount = ratings.length;

    // 6) Write back to the userProfiles row
    await ctx.db.patch(profile._id, patch);
  },
});