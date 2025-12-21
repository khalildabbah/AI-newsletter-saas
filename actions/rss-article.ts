"use server";

import {
  wrapDatabaseOperation,
} from "@/lib/database/error-handler";
import { collections, toObjectId, fromObjectId } from "@/lib/mongodb";
import type { ArticleCreateData, BulkOperationResult } from "@/lib/rss/types";

// ============================================
// RSS ARTICLE ACTIONS
// ============================================

/**
 * Creates a single RSS article with automatic deduplication using guid
 * If article already exists, adds the current feedId to sourceFeedIds for multi-source tracking
 * Uses MongoDB's $addToSet to prevent duplicate feedIds in the sourceFeedIds array
 */
export async function createRssArticle(data: ArticleCreateData) {
  return wrapDatabaseOperation(async () => {
    const articlesCollection = collections.rssArticles();
    const feedObjectId = toObjectId(data.feedId);
    
    // First, try to find existing article
    const existing = await articlesCollection.findOne(
      { guid: data.guid },
      { projection: { _id: 1, sourceFeedIds: 1 } }
    );

    if (existing) {
      const existingFeedIds = (existing.sourceFeedIds || []).map(fromObjectId);
      
      // Article exists - only update if feedId not already in sourceFeedIds
      if (!existingFeedIds.includes(data.feedId)) {
        const result = await articlesCollection.findOneAndUpdate(
          { guid: data.guid },
          { $addToSet: { sourceFeedIds: feedObjectId } },
          { returnDocument: "after" }
        );
        
        if (!result) throw new Error("Failed to update article");
        const { _id, ...rest } = result;
        return {
          id: _id.toString(),
          ...rest,
          sourceFeedIds: (rest.sourceFeedIds || []).map(fromObjectId),
        };
      }
      
      // Return existing article if feedId already present
      const fullArticle = await articlesCollection.findOne({ guid: data.guid });
      if (!fullArticle) throw new Error("Article not found");
      
      const { _id, ...rest } = fullArticle;
      return {
        id: _id.toString(),
        ...rest,
        sourceFeedIds: (rest.sourceFeedIds || []).map(fromObjectId),
      };
    }

    // Article doesn't exist - create new
    const now = new Date();
    const result = await articlesCollection.insertOne({
      feedId: feedObjectId,
      guid: data.guid,
      sourceFeedIds: [feedObjectId],
      title: data.title,
      link: data.link,
      content: data.content,
      summary: data.summary,
      pubDate: data.pubDate,
      author: data.author,
      categories: data.categories || [],
      imageUrl: data.imageUrl,
      createdAt: now,
      updatedAt: now,
    });

    const newArticle = await articlesCollection.findOne({ _id: result.insertedId });
    if (!newArticle) throw new Error("Failed to create article");
    
    const { _id, ...rest } = newArticle;
    return {
      id: _id.toString(),
      ...rest,
      sourceFeedIds: (rest.sourceFeedIds || []).map(fromObjectId),
    };
  }, "create RSS article");
}

/**
 * Bulk creates multiple RSS articles, automatically skipping duplicates based on guid
 */
export async function bulkCreateRssArticles(
  articles: ArticleCreateData[],
): Promise<BulkOperationResult> {
  const results: BulkOperationResult = {
    created: 0,
    skipped: 0,
    errors: 0,
  };

  for (const article of articles) {
    try {
      await createRssArticle(article);
      results.created++;
    } catch (error) {
      // Check if it's a duplicate key error (MongoDB error code 11000)
      if (error instanceof Error && (error as any).code === 11000) {
        results.skipped++;
      } else {
        results.errors++;
        console.error(`Failed to create article ${article.guid}:`, error);
      }
    }
  }

  return results;
}

/**
 * Fetches articles by selected feeds and date range with importance scoring
 * Importance is calculated by the number of sources (sourceFeedIds length)
 */
export async function getArticlesByFeedsAndDateRange(
  feedIds: string[],
  startDate: Date,
  endDate: Date,
  limit = 100,
) {
  return wrapDatabaseOperation(async () => {
    const feedObjectIds = feedIds.map(toObjectId);
    const articlesCollection = collections.rssArticles();
    const feedsCollection = collections.rssFeeds();

    // Find articles matching the criteria
    const articles = await articlesCollection
      .find({
        $or: [
          { feedId: { $in: feedObjectIds } },
          { sourceFeedIds: { $in: feedObjectIds } },
        ],
        pubDate: {
          $gte: startDate,
          $lte: endDate,
        },
      })
      .sort({ pubDate: -1 })
      .limit(limit)
      .toArray();

    // Get feed information for each article
    const articlesWithFeeds = await Promise.all(
      articles.map(async (article) => {
        const { _id, feedId, sourceFeedIds, ...rest } = article;
        
        // Get feed info
        const feed = await feedsCollection.findOne(
          { _id: feedId },
          { projection: { _id: 1, title: 1, url: 1 } }
        );

        return {
          id: _id.toString(),
          feedId: fromObjectId(feedId),
          sourceFeedIds: (sourceFeedIds || []).map(fromObjectId),
          sourceCount: (sourceFeedIds || []).length,
          feed: feed
            ? {
                id: feed._id.toString(),
                title: feed.title,
                url: feed.url,
              }
            : null,
          ...rest,
        };
      })
    );

    return articlesWithFeeds;
  }, "fetch articles by feeds and date range");
}