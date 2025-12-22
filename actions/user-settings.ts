"use server";

import { auth } from "@clerk/nextjs/server";
import { collections, toObjectId, fromObjectId } from "@/lib/mongodb";
import { getUserByClerkId } from "@/actions/user";

// ============================================
// USER SETTINGS ACTIONS
// ============================================

/**
 * User settings input type for upsert operations
 */
export interface UserSettingsInput {
  // Basic Settings
  newsletterName?: string | null;
  description?: string | null;
  targetAudience?: string | null;
  defaultTone?: string | null;

  // Branding
  brandVoice?: string | null;
  companyName?: string | null;
  industry?: string | null;

  // Additional Information
  disclaimerText?: string | null;
  defaultTags?: string[];
  customFooter?: string | null;
  senderName?: string | null;
  senderEmail?: string | null;
}

/**
 * UserSettings type matching the database schema
 */
export interface UserSettings {
  id: string;
  userId: string;
  // Basic Settings
  newsletterName?: string | null;
  description?: string | null;
  targetAudience?: string | null;
  defaultTone?: string | null;
  // Branding
  brandVoice?: string | null;
  companyName?: string | null;
  industry?: string | null;
  // Additional Information
  disclaimerText?: string | null;
  defaultTags?: string[];
  customFooter?: string | null;
  senderName?: string | null;
  senderEmail?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Fetches user settings for the authenticated user
 */
export async function getCurrentUserSettings(): Promise<UserSettings | null> {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("User not authenticated");
    }

    // Get the database user first
    const user = await getUserByClerkId(userId);
    if (!user) {
      return null;
    }

    const settingsDoc = await collections.userSettings().findOne({
      userId: toObjectId(user.id),
    });

    if (!settingsDoc) {
      return null;
    }

    const { _id, userId: dbUserId, ...rest } = settingsDoc;
    return {
      id: _id.toString(),
      userId: fromObjectId(dbUserId),
      ...rest,
    } as UserSettings;
  } catch (error) {
    console.error("Failed to fetch user settings:", error);
    throw new Error("Failed to fetch user settings");
  }
}

/**
 * Fetches user settings by database user ID
 */
export async function getUserSettingsByUserId(userId: string): Promise<UserSettings | null> {
  try {
    const settingsDoc = await collections.userSettings().findOne({
      userId: toObjectId(userId),
    });

    if (!settingsDoc) {
      return null;
    }

    const { _id, userId: dbUserId, ...rest } = settingsDoc;
    return {
      id: _id.toString(),
      userId: fromObjectId(dbUserId),
      ...rest,
    } as UserSettings;
  } catch (error) {
    console.error("Failed to fetch user settings by user ID:", error);
    throw new Error("Failed to fetch user settings");
  }
}

/**
 * Creates or updates user settings for the authenticated user
 */
export async function upsertUserSettings(
  data: UserSettingsInput
): Promise<UserSettings> {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("User not authenticated");
    }

    // Get the database user
    const user = await getUserByClerkId(userId);
    if (!user) {
      throw new Error("User not found in database");
    }

    const userIdObj = toObjectId(user.id);
    const now = new Date();

    // Check if settings exist (avoid upsert due to MongoDB free tier transaction limitation)
    const existingSettings = await collections.userSettings().findOne({
      userId: userIdObj,
    });

    let settingsDoc: import("mongodb").WithId<import("mongodb").Document> | null;
    if (existingSettings) {
      // Update existing settings
      const updateResult = await collections.userSettings().findOneAndUpdate(
        { userId: userIdObj },
        {
          $set: {
            newsletterName: data.newsletterName,
            description: data.description,
            targetAudience: data.targetAudience,
            defaultTone: data.defaultTone,
            brandVoice: data.brandVoice,
            companyName: data.companyName,
            industry: data.industry,
            disclaimerText: data.disclaimerText,
            defaultTags: data.defaultTags || [],
            customFooter: data.customFooter,
            senderName: data.senderName,
            senderEmail: data.senderEmail,
            updatedAt: now,
          },
        },
        { returnDocument: "after" }
      );

      if (!updateResult) {
        throw new Error("Failed to update user settings");
      }
      settingsDoc = updateResult;
    } else {
      // Create new settings
      const insertResult = await collections.userSettings().insertOne({
        userId: userIdObj,
        newsletterName: data.newsletterName,
        description: data.description,
        targetAudience: data.targetAudience,
        defaultTone: data.defaultTone,
        brandVoice: data.brandVoice,
        companyName: data.companyName,
        industry: data.industry,
        disclaimerText: data.disclaimerText,
        defaultTags: data.defaultTags || [],
        customFooter: data.customFooter,
        senderName: data.senderName,
        senderEmail: data.senderEmail,
        createdAt: now,
        updatedAt: now,
      });

      const newSettings = await collections.userSettings().findOne({
        _id: insertResult.insertedId,
      });

      if (!newSettings) {
        throw new Error("Failed to create user settings");
      }
      settingsDoc = newSettings;
    }

    const { _id, userId: dbUserId, ...rest } = settingsDoc;
    return {
      id: _id.toString(),
      userId: fromObjectId(dbUserId),
      ...rest,
    } as UserSettings;
  } catch (error) {
    console.error("Failed to upsert user settings:", error);
    throw new Error("Failed to save user settings");
  }
}

/**
 * Deletes user settings for the authenticated user
 */
export async function deleteUserSettings(): Promise<void> {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("User not authenticated");
    }

    // Get the database user
    const user = await getUserByClerkId(userId);
    if (!user) {
      throw new Error("User not found in database");
    }

    // Delete the settings if they exist
    await collections.userSettings().deleteMany({
      userId: toObjectId(user.id),
    });
  } catch (error) {
    console.error("Failed to delete user settings:", error);
    throw new Error("Failed to delete user settings");
  }
}