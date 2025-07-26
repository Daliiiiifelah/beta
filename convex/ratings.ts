import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";

type Grade = "S" | "A" | "B" | "C" | "D";

// QUERY: Who can this user rate in a match?
export const getPlayersToRate = query({
  args: { matchId: v.id("matches") },
  handler: async (ctx, args) => {
    const raterUserId = await getAuthUserId(ctx);
    if (!raterUserId) return [];

    const match = await ctx.db.get(args.matchId);
    if (!match) return [];

    const participants = await ctx.db
      .query("participants")
      .withIndex("by_matchId", (q) => q.eq("matchId", args.matchId))
      .collect();
    const playerIds = participants.map((p) => p.userId);
    const ratings = await ctx.db
      .query("playerRatings")
      .withIndex("by_match_and_rater", (q) =>
        q.eq("matchId", args.matchId).eq("raterUserId", raterUserId)
      )
      .collect();

    const results = await Promise.all(
      playerIds
        .filter((userId) => userId !== raterUserId)
        .map(async (userId) => {
          const alreadyRated = ratings.some((r) => r.ratedUserId === userId);

          const profile = await ctx.db
            .query("userProfiles")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .unique();

          return {
            userId,
            alreadyRated,
            name: profile?.displayName ?? "Egoist",
            position: profile?.favoritePosition ?? "Midfield",
          };
        })
    );

    return results;
  },
});

// MUTATION: Submit a rating for a player in a match
export const submitRating = mutation({
  args: {
    matchId: v.id("matches"),
    ratedUserId: v.id("users"),
    suggestion: v.optional(v.string()),
    speedGiven: v.optional(v.union(v.literal("S"), v.literal("A"), v.literal("B"), v.literal("C"), v.literal("D"))),
    defenseGiven: v.optional(v.union(v.literal("S"), v.literal("A"), v.literal("B"), v.literal("C"), v.literal("D"))),
    offenseGiven: v.optional(v.union(v.literal("S"), v.literal("A"), v.literal("B"), v.literal("C"), v.literal("D"))),
    shootingGiven: v.optional(v.union(v.literal("S"), v.literal("A"), v.literal("B"), v.literal("C"), v.literal("D"))),
    dribblingGiven: v.optional(v.union(v.literal("S"), v.literal("A"), v.literal("B"), v.literal("C"), v.literal("D"))),
    passingGiven: v.optional(v.union(v.literal("S"), v.literal("A"), v.literal("B"), v.literal("C"), v.literal("D"))),
  },
  handler: async (ctx, args) => {
    const raterUserId = await getAuthUserId(ctx);
    if (!raterUserId) throw new Error("You must be signed in.");
    if (raterUserId === args.ratedUserId) throw new Error("You cannot rate yourself.");

    const ratings = await ctx.db
      .query("playerRatings")
      .withIndex("by_match_and_rater", (q) =>
        q.eq("matchId", args.matchId).eq("raterUserId", raterUserId)
      )
      .collect();

    const alreadyRated = ratings.some((r) => r.ratedUserId === args.ratedUserId);
    if (alreadyRated) {
      throw new Error("You’ve already rated this player for this match.");
    }

    await ctx.db.insert("playerRatings", {
      ...args,
      raterUserId,
    });
  },
});