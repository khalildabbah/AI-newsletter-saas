"use server";

import { wrapDatabaseOperation } from "@/lib/database/error-handler";
import { collections, toObjectId, fromObjectId } from "@/lib/mongodb";
import type { ObjectId } from "mongodb";

// ============================================
// NEWSLETTER ACTIONS
// ============================================

/**
 * Newsletter type matching the database schema
 */
export interface Newsletter {
  id: string;
  userId: string;
  suggestedTitles: string[];
  suggestedSubjectLines: string[];
  body: string;
  topAnnouncements: string[];
  additionalInfo?: string | null;
  startDate: Date;
  endDate: Date;
  userInput?: string | null;
  feedsUsed: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Creates and saves a generated newsletter to the database
 *
 * This function is called after AI generation completes (Pro users only).
 * It stores all newsletter components for future reference.
 *
 * @param data - Complete newsletter data and metadata
 * @returns Created newsletter record
 */
export async function createNewsletter(data: {
  userId: string;
  suggestedTitles: string[];
  suggestedSubjectLines: string[];
  body: string;
  topAnnouncements: string[];
  additionalInfo?: string;
  startDate: Date;
  endDate: Date;
  userInput?: string;
  feedsUsed: string[];
}): Promise<Newsletter> {
  return wrapDatabaseOperation(async () => {
    const now = new Date();
    const result = await collections.newsletters().insertOne({
      userId: toObjectId(data.userId),
      suggestedTitles: data.suggestedTitles,
      suggestedSubjectLines: data.suggestedSubjectLines,
      body: data.body,
      topAnnouncements: data.topAnnouncements,
      additionalInfo: data.additionalInfo ?? null,
      startDate: data.startDate,
      endDate: data.endDate,
      userInput: data.userInput ?? null,
      feedsUsed: data.feedsUsed.map((id) => toObjectId(id)),
      createdAt: now,
      updatedAt: now,
    });

    const newsletter = await collections.newsletters().findOne({
      _id: result.insertedId,
    });

    if (!newsletter) {
      throw new Error("Failed to create newsletter");
    }

    const { _id, userId, feedsUsed: dbFeedsUsed, ...rest } = newsletter;
    return {
      id: _id.toString(),
      userId: fromObjectId(userId),
      feedsUsed: dbFeedsUsed.map((id: ObjectId) => fromObjectId(id)),
      ...rest,
    } as Newsletter;
  }, "create newsletter");
}

/**
 * Gets all newsletters for a user, ordered by most recent first
 *
 * Supports pagination via limit and skip options.
 * Used for displaying newsletter history.
 *
 * @param userId - User's database ID
 * @param options - Optional pagination parameters
 * @returns Array of newsletters
 */
export async function getNewslettersByUserId(
  userId: string,
  options?: {
    limit?: number;
    skip?: number;
  },
): Promise<Newsletter[]> {
  return wrapDatabaseOperation(async () => {
    let query = collections.newsletters().find({
      userId: toObjectId(userId),
    });

    query = query.sort({ createdAt: -1 });

    if (options?.skip) {
      query = query.skip(options.skip);
    }
    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const newsletters = await query.toArray();

    return newsletters.map((newsletter) => {
      const { _id, userId: dbUserId, feedsUsed: dbFeedsUsed, ...rest } = newsletter;
      return {
        id: _id.toString(),
        userId: fromObjectId(dbUserId),
        feedsUsed: dbFeedsUsed.map((id: ObjectId) => fromObjectId(id)),
        ...rest,
      } as Newsletter;
    });
  }, "fetch newsletters by user");
}

/**
 * Gets a single newsletter by ID with authorization check
 *
 * Ensures the newsletter belongs to the requesting user
 * for security. Returns null if not found.
 *
 * @param id - Newsletter ID
 * @param userId - User's database ID for authorization
 * @returns Newsletter or null if not found/unauthorized
 */
export async function getNewsletterById(id: string, userId: string): Promise<Newsletter | null> {
  return wrapDatabaseOperation(async () => {
    const newsletter = await collections.newsletters().findOne({
      _id: toObjectId(id),
    });

    // Newsletter not found
    if (!newsletter) {
      return null;
    }

    // Authorization: ensure newsletter belongs to user
    const newsletterUserId = fromObjectId(newsletter.userId);
    if (newsletterUserId !== userId) {
      throw new Error("Unauthorized: Newsletter does not belong to user");
    }

    const { _id, userId: dbUserId, feedsUsed: dbFeedsUsed, ...rest } = newsletter;
    return {
      id: _id.toString(),
      userId: fromObjectId(dbUserId),
      feedsUsed: dbFeedsUsed.map((id: ObjectId) => fromObjectId(id)),
      ...rest,
    } as Newsletter;
  }, "fetch newsletter by ID");
}

/**
 * Gets the total count of newsletters for a user
 *
 * Useful for pagination and displaying totals.
 *
 * @param userId - User's database ID
 * @returns Number of newsletters
 */
export async function getNewslettersCountByUserId(userId: string): Promise<number> {
  return wrapDatabaseOperation(async () => {
    return await collections.newsletters().countDocuments({
      userId: toObjectId(userId),
    });
  }, "count newsletters by user");
}

/**
 * Deletes a newsletter by ID with authorization check
 *
 * Verifies the newsletter exists and belongs to the user
 * before deletion. Throws error if not authorized.
 *
 * @param id - Newsletter ID to delete
 * @param userId - User's database ID for authorization
 * @returns Deleted newsletter record
 */
export async function deleteNewsletter(id: string, userId: string): Promise<Newsletter> {
  return wrapDatabaseOperation(async () => {
    // Verify the newsletter exists and belongs to the user
    const newsletter = await collections.newsletters().findOne({
      _id: toObjectId(id),
    });

    if (!newsletter) {
      throw new Error("Newsletter not found");
    }

    const newsletterUserId = fromObjectId(newsletter.userId);
    if (newsletterUserId !== userId) {
      throw new Error("Unauthorized: Newsletter does not belong to user");
    }

    // Delete the newsletter
    await collections.newsletters().deleteOne({
      _id: toObjectId(id),
    });

    const { _id, userId: dbUserId, feedsUsed: dbFeedsUsed, ...rest } = newsletter;
    return {
      id: _id.toString(),
      userId: fromObjectId(dbUserId),
      feedsUsed: dbFeedsUsed.map((id: ObjectId) => fromObjectId(id)),
      ...rest,
    } as Newsletter;
  }, "delete newsletter");
}