import { openai } from "@ai-sdk/openai";
import { streamObject } from "ai";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { getUserSettingsByUserId } from "@/actions/user-settings";
import { getCurrentUser } from "@/lib/auth/helpers";
import {
  buildArticleSummaries,
  buildNewsletterPrompt,
} from "@/lib/newsletter/prompt-builder";
import type { ArticleForPrompt } from "@/lib/newsletter/types";
import { prepareFeedsAndArticles } from "@/lib/rss/feed-refresh";

export const maxDuration = 300; // 5 minutes for Vercel Pro

/**
 * Article structure returned from getArticlesByFeedsAndDateRange
 */
interface ArticleFromDB {
  id: string;
  feedId: string;
  sourceFeedIds: string[];
  sourceCount: number;
  feed: {
    id: string;
    title: string | null;
    url: string;
  } | null;
  title: string;
  link: string;
  pubDate: Date;
  summary?: string | null;
  content?: string | null;
  [key: string]: unknown;
}

/**
 * Newsletter generation result schema
 */
const NewsletterSchema = z.object({
  suggestedTitles: z.array(z.string()).length(5),
  suggestedSubjectLines: z.array(z.string()).length(5),
  body: z.string(),
  topAnnouncements: z.array(z.string()).length(5),
  additionalInfo: z.string().optional(),
});

/**
 * POST /api/newsletter/generate-stream
 *
 * Streams newsletter generation in real-time using Vercel AI SDK.
 * The AI SDK handles all streaming complexity automatically.
 *
 * @returns AI SDK text stream response
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  console.log("[generate-stream] Starting newsletter generation request");

  try {
    const body = await req.json();
    const { feedIds, startDate, endDate, userInput } = body;

    console.log("[generate-stream] Request parameters:", {
      feedIds: feedIds.length,
      startDate,
      endDate,
      hasUserInput: !!userInput,
    });

    // Validate required parameters
    if (!feedIds || !Array.isArray(feedIds) || feedIds.length === 0) {
      return Response.json(
        { error: "feedIds is required and must be a non-empty array" },
        { status: 400 },
      );
    }

    if (!startDate || !endDate) {
      return Response.json(
        { error: "startDate and endDate are required" },
        { status: 400 },
      );
    }

    // Get authenticated user and settings
    console.log("[generate-stream] Step 1/5: Getting authenticated user...");
    const user = await getCurrentUser();
    console.log("[generate-stream] Step 1/5: ✓ User authenticated:", user.id);

    console.log("[generate-stream] Step 2/5: Fetching user settings...");
    const settings = await getUserSettingsByUserId(user.id);
    console.log("[generate-stream] Step 2/5: ✓ Settings fetched");

    // Fetch and prepare articles
    console.log("[generate-stream] Step 3/5: Preparing feeds and articles...");
    const articles = (await prepareFeedsAndArticles({
      feedIds,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    })) as ArticleFromDB[];
    console.log(`[generate-stream] Step 3/5: ✓ Found ${articles.length} articles`);

    // Map articles to ArticleForPrompt format
    console.log("[generate-stream] Step 4/5: Processing articles and building prompt...");
    const articlesForPrompt: ArticleForPrompt[] = articles.map((article) => ({
      title: article.title,
      link: article.link,
      pubDate: article.pubDate,
      summary: article.summary ?? null,
      content: article.content ?? null,
      feed: {
        title: article.feed?.title ?? null,
      },
    }));

    // Build the AI prompt
    const articleSummaries = buildArticleSummaries(articlesForPrompt);
    const prompt = buildNewsletterPrompt({
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      articleSummaries,
      articleCount: articlesForPrompt.length,
      userInput,
      settings,
    });
    console.log(`[generate-stream] Step 4/5: ✓ Prompt built (${prompt.length} characters)`);

    // Stream newsletter generation with AI SDK
    console.log("[generate-stream] Step 5/5: Starting AI generation (calling OpenAI)...");
    console.log("[generate-stream] ⏳ This is where it contacts OpenAI API - may take 30-120 seconds");
    
    // Verify API key is set (don't log the actual key)
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("[generate-stream] ✗ OPENAI_API_KEY environment variable is not set!");
      return Response.json(
        { error: "OpenAI API key is not configured. Please set OPENAI_API_KEY in your environment variables." },
        { status: 500 },
      );
    }
    console.log(`[generate-stream] ✓ API key found (${apiKey.substring(0, 7)}...${apiKey.substring(apiKey.length - 4)})`);
    
    const aiStartTime = Date.now();
    
    try {
      // Use environment variable for model, default to gpt-4o-mini for best cost/quality balance
      // gpt-4o-mini: ~16x cheaper than gpt-4o, excellent quality for newsletter generation
      // Cost: $0.15/$0.60 per 1M tokens (input/output) vs gpt-4o's $2.50/$10
      const modelName = process.env.OPENAI_MODEL || "gpt-4o-mini";
      console.log(`[generate-stream] Using model: ${modelName} (cost-optimized for newsletter generation)`);
      console.log(`[generate-stream] Prompt length: ${prompt.length} characters`);
      
      const result = streamObject({
        model: openai(modelName),
        schema: NewsletterSchema,
        prompt,
        onFinish: async (result) => {
          const aiDuration = Date.now() - aiStartTime;
          console.log(`[generate-stream] ✓ AI generation completed in ${aiDuration}ms`);
          console.log(`[generate-stream] Result type:`, typeof result);
          console.log(`[generate-stream] Result:`, JSON.stringify(result, null, 2));
          
          // The result from streamObject's onFinish is the final object, not wrapped
          if (result) {
            const obj = result as Record<string, unknown>;
            const keys = Object.keys(obj);
            console.log(`[generate-stream] Final object keys:`, keys);
            console.log(`[generate-stream] Expected keys:`, ['suggestedTitles', 'suggestedSubjectLines', 'body', 'topAnnouncements', 'additionalInfo']);
            
            // Check each required field
            const requiredFields = ['suggestedTitles', 'suggestedSubjectLines', 'body', 'topAnnouncements'];
            const missingFields = requiredFields.filter(field => !(field in obj) || !obj[field]);
            
            if (missingFields.length > 0) {
              console.error(`[generate-stream] ✗ Missing required fields:`, missingFields);
              console.error(`[generate-stream] Object state:`, {
                hasSuggestedTitles: 'suggestedTitles' in obj,
                hasSuggestedSubjectLines: 'suggestedSubjectLines' in obj,
                hasBody: 'body' in obj,
                hasTopAnnouncements: 'topAnnouncements' in obj,
                bodyType: obj.body ? typeof obj.body : 'missing',
                bodyLength: obj.body ? String(obj.body).length : 0,
              });
            } else {
              console.log(`[generate-stream] ✓ All required fields present`);
              console.log(`[generate-stream] Body length:`, obj.body ? String(obj.body).length : 0);
            }
          } else {
            console.error(`[generate-stream] ✗ Result is null/undefined`);
          }
        },
        onError: async (error) => {
          const aiDuration = Date.now() - aiStartTime;
          console.error(`[generate-stream] ✗ AI generation error after ${aiDuration}ms`);
          console.error(`[generate-stream] Error type:`, typeof error);
          console.error(`[generate-stream] Error details:`, error);
          
          // Log detailed error information
          if (error instanceof Error) {
            console.error(`[generate-stream] Error message:`, error.message);
            console.error(`[generate-stream] Error stack:`, error.stack);
            if (error.message.includes("insufficient_quota") || error.message.includes("quota")) {
              console.error("[generate-stream] OpenAI quota exceeded - error will be in stream");
            } else if (error.message.includes("invalid_api_key") || error.message.includes("authentication")) {
              console.error("[generate-stream] OpenAI API key authentication failed");
            } else if (error.message.includes("model")) {
              console.error("[generate-stream] Model-related error - check if model name is correct");
            }
          } else {
            console.error(`[generate-stream] Non-Error object:`, JSON.stringify(error, null, 2));
          }
        },
      });

      const totalBackendTime = Date.now() - startTime;
      console.log(`[generate-stream] ✓ Backend processing complete in ${totalBackendTime}ms, returning stream to client`);
      console.log("[generate-stream] → Client will now receive streaming data from OpenAI");
      console.log(`[generate-stream] Stream type:`, typeof result);
      console.log(`[generate-stream] Stream methods:`, result ? Object.getOwnPropertyNames(Object.getPrototypeOf(result)) : "null");

      // Return AI SDK's native stream response
      // Note: Errors in the stream will be included in the stream data itself
      // The frontend useObject hook should detect these errors
      const streamResponse = result.toTextStreamResponse();
      console.log(`[generate-stream] Stream response created, status:`, streamResponse.status);
      
      // Log stream response headers for debugging
      console.log(`[generate-stream] Stream response headers:`, Object.fromEntries(streamResponse.headers.entries()));
      
      return streamResponse;
    } catch (aiError) {
      // Catch errors that happen before streaming starts
      const aiDuration = Date.now() - aiStartTime;
      console.error(`[generate-stream] ✗ AI setup error after ${aiDuration}ms:`, aiError);
      
      let errorMessage = "Failed to start AI generation";
      let statusCode = 500;
      
      if (aiError instanceof Error) {
        if (aiError.message.includes("insufficient_quota") || aiError.message.includes("quota")) {
          errorMessage = "OpenAI API quota exceeded. Please check your OpenAI account billing and usage limits at https://platform.openai.com/usage";
          statusCode = 402; // Payment Required
        } else if (aiError.message.includes("invalid_api_key") || aiError.message.includes("authentication")) {
          errorMessage = "OpenAI API key is invalid or missing. Please check your OPENAI_API_KEY environment variable.";
          statusCode = 401;
        } else {
          errorMessage = `AI generation error: ${aiError.message}`;
        }
      }
      
      return Response.json(
        { error: errorMessage },
        { status: statusCode },
      );
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[generate-stream] ✗ Error after ${duration}ms:`, error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return Response.json(
      { error: `Failed to generate newsletter: ${errorMessage}` },
      { status: 500 },
    );
  }
}