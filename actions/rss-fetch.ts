"use server";

import { wrapDatabaseOperation } from "@/lib/database/error-handler";
import { collections, toObjectId, fromObjectId } from "@/lib/mongodb";
import {
  type ArticleData,
  fetchAndParseFeed,
  validateFeedUrl,
} from "@/lib/rss/parser";
import { bulkCreateRssArticles } from "./rss-article";
import { updateFeedLastFetched } from "./rss-feed";

// ============================================
// RSS FETCH ACTIONS
// ============================================

/**
 * Validates an RSS URL and creates a new feed with initial article fetch
 */
export async function validateAndAddFeed(userId: string, url: string) {
  return wrapDatabaseOperation(async () => {
    // Validate the RSS feed URL
    const isValid = await validateFeedUrl(url);
    if (!isValid) {
      throw new Error("Invalid RSS feed URL or unable to fetch feed");
    }

    // Create the feed in database
    const now = new Date();
    const result = await collections.rssFeeds().insertOne({
      userId: toObjectId(userId),
      url,
      createdAt: now,
      updatedAt: now,
    });

    const feedId = result.insertedId.toString();

    // Fetch and store initial articles
    try {
      const fetchResult = await fetchAndStoreFeed(feedId);

      // Update feed with metadata from RSS
      await collections.rssFeeds().updateOne(
        { _id: result.insertedId },
        {
          $set: {
            title: fetchResult.metadata.title,
            description: fetchResult.metadata.description,
            link: fetchResult.metadata.link,
            imageUrl: fetchResult.metadata.imageUrl,
            language: fetchResult.metadata.language,
            updatedAt: new Date(),
          },
        }
      );

      // Get the updated feed
      const updatedFeed = await collections.rssFeeds().findOne({
        _id: result.insertedId,
      });

      if (!updatedFeed) throw new Error("Failed to retrieve feed");

      const { _id, ...rest } = updatedFeed;
      return {
        feed: {
          id: _id.toString(),
          ...rest,
          userId: fromObjectId(rest.userId),
        },
        articlesCreated: fetchResult.created,
        articlesSkipped: fetchResult.skipped,
      };
    } catch (fetchError) {
      // If initial fetch fails, still return the feed
      console.error("Failed to fetch initial articles:", fetchError);
      const feed = await collections.rssFeeds().findOne({
        _id: result.insertedId,
      });
      
      if (!feed) throw new Error("Failed to retrieve feed");
      
      const { _id, ...rest } = feed;
      return {
        feed: {
          id: _id.toString(),
          ...rest,
          userId: fromObjectId(rest.userId),
        },
        articlesCreated: 0,
        articlesSkipped: 0,
        error: "Feed created but initial fetch failed",
      };
    }
  }, "add RSS feed");
}

/**
 * Fetches an RSS feed and stores new articles
 */
export async function fetchAndStoreFeed(feedId: string) {
  return wrapDatabaseOperation(async () => {
    // Get the feed details
    const feed = await collections.rssFeeds().findOne({
      _id: toObjectId(feedId),
    });

    if (!feed) {
      throw new Error(`Feed with ID ${feedId} not found`);
    }

    // Fetch and parse the RSS feed
    const { metadata, articles } = await fetchAndParseFeed(feed.url, feedId);

    // Convert ArticleData to format expected by bulkCreateRssArticles
    const articlesToCreate = articles.map((article: ArticleData) => ({
      feedId: feedId,
      guid: article.guid,
      title: article.title,
      link: article.link,
      content: article.content,
      summary: article.summary,
      pubDate: article.pubDate,
      author: article.author,
      categories: article.categories,
      imageUrl: article.imageUrl,
    }));

    // Store articles with automatic deduplication
    const result = await bulkCreateRssArticles(articlesToCreate);

    // Update the feed's lastFetched timestamp
    await updateFeedLastFetched(feedId);

    return {
      metadata,
      created: result.created,
      skipped: result.skipped,
      errors: result.errors,
    };
  }, "fetch feed");
}