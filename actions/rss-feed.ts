"use server";

import { wrapDatabaseOperation } from "@/lib/database/error-handler";
import { collections, toObjectId } from "@/lib/mongodb";

// ============================================
// RSS FEED ACTIONS
// ============================================

export interface RssFeedWithCount {
  id: string;
  userId: string;
  url: string;
  title?: string | null;
  description?: string | null;
  link?: string | null;
  imageUrl?: string | null;
  language?: string | null;
  lastFetched?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    articles: number;
  };
}

/**
 * Fetches all RSS feeds for a specific user with article counts
 */
export async function getRssFeedsByUserId(
  userId: string
): Promise<RssFeedWithCount[]> {
  return wrapDatabaseOperation(async () => {
    const feeds = await collections
      .rssFeeds()
      .find({ userId: toObjectId(userId) })
      .sort({ createdAt: -1 })
      .toArray();

    // Get article counts for each feed
    const feedsWithCounts = await Promise.all(
      feeds.map(async (feed) => {
        const { _id, ...rest } = feed;
        const articleCount = await collections
          .rssArticles()
          .countDocuments({
            $or: [
              { feedId: _id },
              { sourceFeedIds: _id },
            ],
          });

        return {
          id: _id.toString(),
          ...rest,
          _count: {
            articles: articleCount,
          },
        };
      })
    );

    return feedsWithCounts as RssFeedWithCount[];
  }, "fetch RSS feeds");
}

/**
 * Updates the lastFetched timestamp for an RSS feed
 */
export async function updateFeedLastFetched(feedId: string) {
  return wrapDatabaseOperation(async () => {
    const result = await collections.rssFeeds().findOneAndUpdate(
      { _id: toObjectId(feedId) },
      { $set: { lastFetched: new Date() } },
      { returnDocument: "after" }
    );

    if (!result) {
      throw new Error(`Feed with ID ${feedId} not found`);
    }

    const { _id, ...rest } = result;
    return {
      id: _id.toString(),
      ...rest,
    };
  }, "update feed last fetched");
}

/**
 * Permanently deletes an RSS feed and cleans up articles not referenced by other feeds
 */
export async function deleteRssFeed(feedId: string) {
  return wrapDatabaseOperation(async () => {
    const feedObjectId = toObjectId(feedId);
    const articlesCollection = collections.rssArticles();
    const feedsCollection = collections.rssFeeds();

    // Remove feedId from sourceFeedIds arrays
    await articlesCollection.updateMany(
      { sourceFeedIds: feedObjectId },
      { $pull: { sourceFeedIds: feedObjectId } } as Record<string, unknown>
    );

    // Delete articles that have no more feed references (empty sourceFeedIds)
    await articlesCollection.deleteMany({
      $or: [
        { sourceFeedIds: { $size: 0 } },
        { sourceFeedIds: { $exists: false } },
      ],
    });

    // Finally, delete the feed itself
    await feedsCollection.deleteOne({ _id: feedObjectId });

    return { success: true };
  }, "delete RSS feed");
}