"use server";

import { wrapDatabaseOperation } from "@/lib/database/error-handler";
import { collections, toObjectId } from "@/lib/mongodb";

// ============================================
// USER ACTIONS
// ============================================

/**
 * Fetches a user by their Clerk user ID
 *
 * @param clerkUserId - The Clerk authentication ID
 * @returns User record or null if not found
 */
export async function getUserByClerkId(clerkUserId: string) {
  return wrapDatabaseOperation(async () => {
    const user = await collections.users().findOne({ clerkUserId });
    if (!user) return null;
    
    // Convert _id to id and ensure proper typing
    const { _id, ...rest } = user;
    return {
      id: _id.toString(),
      ...rest,
    };
  }, "fetch user by Clerk ID");
}

/**
 * Creates a user if they don't exist, or returns the existing user
 * Updates the timestamp when user already exists (tracks last activity)
 *
 * Uses findOneAndUpdate with upsert to handle race conditions atomically
 *
 * @param clerkUserId - The Clerk authentication ID
 * @returns User record (either created or existing)
 */
export async function upsertUserFromClerk(clerkUserId: string) {
  return wrapDatabaseOperation(async () => {
    const usersCollection = collections.users();
    const now = new Date();
    
    // Use findOneAndUpdate with upsert for atomic operation
    // This handles race conditions where multiple requests try to create the same user
    const result = await usersCollection.findOneAndUpdate(
      { clerkUserId },
      {
        $set: { updatedAt: now },
        $setOnInsert: {
          clerkUserId,
          createdAt: now,
        },
      },
      {
        upsert: true,
        returnDocument: "after",
      }
    );

    if (!result) {
      throw new Error("Failed to upsert user");
    }

    const { _id, ...rest } = result;
    return {
      id: _id.toString(),
      ...rest,
    };
  }, "upsert user");
}