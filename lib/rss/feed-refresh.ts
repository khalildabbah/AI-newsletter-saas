import { getArticlesByFeedsAndDateRange } from "@/actions/rss-article";
import { fetchAndStoreFeed } from "@/actions/rss-fetch";
import { collections, toObjectId, fromObjectId } from "@/lib/mongodb";
import type { PrepareFeedsParams } from "./types";

// ============================================
// FEED REFRESH UTILITIES
// ============================================

/**
 * Cache window for RSS feeds (3 hours in milliseconds)
 *
 * Why 3 hours? This balances:
 * - Fresh content for users
 * - Reduced load on RSS feed servers
 * - Better performance (fewer network requests)
 */
export const CACHE_WINDOW = 3 * 60 * 60 * 1000; // 3 hours

/**
 * Maximum number of articles to fetch for newsletter generation
 *
 * Limits the number of articles to keep AI prompts manageable
 * and generation times reasonable
 */
export const ARTICLE_LIMIT = 100;

/**
 * Determines which feeds need refreshing (older than 3 hours)
 *
 * This function uses a global cache strategy: if ANY user has recently
 * fetched a feed URL, we use that cached data for all users. This:
 * - Reduces load on external RSS servers
 * - Improves performance across the platform
 * - Keeps data reasonably fresh for everyone
 *
 * @param feedIds - Array of feed IDs to check
 * @returns Array of feed IDs that need refreshing
 */
export async function getFeedsToRefresh(feedIds: string[]): Promise<string[]> {
  const now = new Date();
  const cacheThreshold = new Date(now.getTime() - CACHE_WINDOW);
  const feedsCollection = collections.rssFeeds();

  // Get all requested feeds with their URLs
  const feedObjectIds = feedIds.map(toObjectId);
  const feeds = await feedsCollection
    .find(
      { _id: { $in: feedObjectIds } },
      { projection: { _id: 1, url: 1 } }
    )
    .toArray();

  // Get the most recent fetch time for each unique URL using aggregation
  const urlsToCheck = [...new Set(feeds.map((f) => f.url))];

  const recentFetches = await feedsCollection
    .aggregate([
      {
        $match: {
          url: { $in: urlsToCheck },
          lastFetched: { $gte: cacheThreshold },
        },
      },
      {
        $group: {
          _id: "$url",
          maxLastFetched: { $max: "$lastFetched" },
        },
      },
    ])
    .toArray();

  // Build a set of URLs that were recently fetched (don't need refresh)
  const recentlyFetchedUrls = new Set(
    recentFetches
      .filter((fetch) => fetch.maxLastFetched !== null)
      .map((fetch) => fetch._id)
  );

  // Feeds need refresh if their URL is NOT in the recently fetched set
  const feedsToRefresh = feeds
    .filter((feed) => !recentlyFetchedUrls.has(feed.url))
    .map((feed) => feed._id.toString());

  return feedsToRefresh;
}

/**
 * Prepares feeds and fetches articles for newsletter generation
 *
 * This is the main function called when generating a newsletter. It:
 * 1. Checks which feeds are stale (>3 hours old)
 * 2. Refreshes stale feeds by fetching new articles
 * 3. Retrieves articles from the database for the date range
 *
 * @param params - Feed IDs and date range for the newsletter
 * @returns Array of articles ready for newsletter generation
 * @throws Error if no articles found in the date range
 */
export async function prepareFeedsAndArticles(params: PrepareFeedsParams) {
  // Check which feeds need refreshing (skips fresh feeds)
  const feedsToRefresh = await getFeedsToRefresh(params.feedIds);

  if (feedsToRefresh.length > 0) {
    console.log(
      `Refreshing ${feedsToRefresh.length} stale feeds (out of ${params.feedIds.length} total)...`,
    );

    // Refresh all stale feeds in parallel for better performance
    // Using Promise.allSettled so one failure doesn't stop others
    const refreshResults = await Promise.allSettled(
      feedsToRefresh.map((feedId) => fetchAndStoreFeed(feedId)),
    );

    // Log results for monitoring
    const successful = refreshResults.filter(
      (r) => r.status === "fulfilled",
    ).length;
    const failed = refreshResults.filter((r) => r.status === "rejected").length;
    console.log(
      `Feed refresh complete: ${successful} successful, ${failed} failed`,
    );
  } else {
    console.log(
      `All ${params.feedIds.length} feeds are fresh (< 3 hours old), skipping refresh`,
    );
  }

  // Fetch articles from the database within the specified date range
  const articles = await getArticlesByFeedsAndDateRange(
    params.feedIds,
    params.startDate,
    params.endDate,
    ARTICLE_LIMIT,
  );

  // Ensure we have articles to work with
  if (articles.length === 0) {
    throw new Error("No articles found for the selected feeds and date range");
  }

  return articles;
}