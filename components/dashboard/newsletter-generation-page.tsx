"use client";

import { experimental_useObject as useObject } from "@ai-sdk/react";
import { ArrowLeft, Sparkles } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { z } from "zod";
import {
  type GeneratedNewsletter,
  NewsletterSchema,
  saveGeneratedNewsletter,
} from "@/actions/generate-newsletter";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { NewsletterDisplay } from "./newsletter-display"  ;
import { NewsletterLoadingCard } from "./newsletter-loading-card";



type NewsletterObject = z.infer<typeof NewsletterSchema>;

/**
 * Newsletter Generation Page
 *
 * This component handles the full newsletter generation flow:
 * 1. Reads generation parameters from URL
 * 2. Prepares metadata and shows toast notifications
 * 3. Auto-starts generation using AI SDK's useObject hook
 * 4. Displays the streaming newsletter
 * 5. Allows saving for Pro users
 */
export function NewsletterGenerationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasStartedRef = React.useRef(false);
  const [articlesCount, setArticlesCount] = React.useState(0);
  const [hasTimedOut, setHasTimedOut] = React.useState(false);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Parse generation parameters from URL query string
  const feedIds = searchParams.get("feedIds");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const userInput = searchParams.get("userInput");

  let params: {
    feedIds: string[];
    startDate: string;
    endDate: string;
    userInput?: string;
  } | null = null;

  if (feedIds && startDate && endDate) {
    try {
      params = {
        feedIds: JSON.parse(feedIds),
        startDate,
        endDate,
        userInput: userInput || undefined,
      };
    } catch {
      params = null;
    }
  }

  // Use AI SDK's useObject hook for streaming
  const { object, submit, isLoading, error } = useObject({
    api: "/api/newsletter/generate-stream",
    schema: NewsletterSchema,
    onError: (error) => {
      console.error("[Frontend] useObject error callback triggered");
      console.error("[Frontend] Error type:", typeof error);
      console.error("[Frontend] Error value:", error);
      if (error instanceof Error) {
        console.error("[Frontend] Error message:", error.message);
        console.error("[Frontend] Error stack:", error.stack);
      }
      // This will be handled by the error useEffect below
    },
  });
  
  // Extract the actual newsletter data from the object
  // The useObject hook may return a schema structure with { type: "object", properties: {...} }
  // or the direct object, so we need to handle both cases
  const newsletter = React.useMemo(() => {
    if (!object) return undefined;
    
    // Check if object has the schema structure (type + properties)
    if ('type' in object && 'properties' in object && typeof object.properties === 'object' && object.properties !== null) {
      return object.properties as Partial<NewsletterObject>;
    }
    
    // Otherwise, assume it's the direct object
    return object as Partial<NewsletterObject>;
  }, [object]);
  
  // Debug: Log state changes
  React.useEffect(() => {
    const keys = object ? Object.keys(object) : null;
    const objectValues = object ? Object.entries(object).map(([key, value]) => ({
      key,
      type: typeof value,
      hasValue: !!value,
      length: Array.isArray(value) ? value.length : typeof value === 'string' ? value.length : null,
    })) : null;
    
    const newsletterKeys = newsletter ? Object.keys(newsletter) : null;
    
    console.log("[Frontend] State update:", {
      isLoading,
      hasObject: !!object,
      hasNewsletter: !!newsletter,
      hasBody: !!newsletter?.body,
      hasError: !!error,
      objectKeys: keys,
      newsletterKeys: newsletterKeys,
      objectDetails: objectValues,
      fullObject: object ? JSON.stringify(object, null, 2) : null,
      extractedNewsletter: newsletter ? JSON.stringify(newsletter, null, 2) : null,
    });
  }, [isLoading, object, newsletter, error]);
  
  // Set up timeout to detect stuck generation (3 minutes)
  React.useEffect(() => {
    if (isLoading && !hasTimedOut) {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Set new timeout
      timeoutRef.current = setTimeout(() => {
        if (isLoading && !newsletter?.body) {
          console.error("Newsletter generation timed out after 3 minutes");
          setHasTimedOut(true);
          toast.error(
            "Generation is taking too long. Please try again or check your OpenAI API configuration.",
            { duration: 10000 }
          );
        }
      }, 3 * 60 * 1000); // 3 minutes
    } else {
      // Clear timeout when not loading
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isLoading, newsletter?.body, hasTimedOut]);
  
  // Handle errors from AI generation
  React.useEffect(() => {
    if (error) {
      console.error("Newsletter generation error:", error);
      
      // Clear timeout on error
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      let errorMessage = "Failed to generate newsletter";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === "string") {
        errorMessage = error;
      } else if (error && typeof error === "object") {
        const errorObj = error as Record<string, unknown>;
        if ("message" in errorObj && typeof errorObj.message === "string") {
          errorMessage = errorObj.message;
        } else {
          errorMessage = JSON.stringify(error);
        }
      }
      
      // Check for specific OpenAI errors
      if (errorMessage.includes("API key") || errorMessage.includes("authentication")) {
        toast.error(
          "OpenAI API key error. Please check your API key configuration.",
          { duration: 10000 }
        );
      } else {
        toast.error(`Generation failed: ${errorMessage}`, { duration: 8000 });
      }
    }
  }, [error]);
  
  // Log when generation completes or gets stuck
  React.useEffect(() => {
    if (isLoading) {
      console.log("[Frontend] Newsletter generation started...");
    } else if (!isLoading && newsletter?.body) {
      console.log("[Frontend] Newsletter generation completed successfully");
    } else if (!isLoading && !newsletter?.body && !error && hasStartedRef.current) {
      console.warn("[Frontend] Generation stopped but no newsletter received. This might indicate an error.");
      console.warn("[Frontend] Object state:", {
        object: object,
        objectKeys: object ? Object.keys(object) : null,
        newsletterKeys: newsletter ? Object.keys(newsletter) : null,
        hasBody: !!newsletter?.body,
      });
      
      // Show user-friendly error if object exists but body is missing
      if (object && !newsletter?.body) {
        toast.error(
          "Newsletter generation completed but body is missing. The AI may have failed to generate the newsletter content. Please try again.",
          { duration: 10000 }
        );
      }
    }
  }, [isLoading, newsletter?.body, error, object, newsletter]);

  // Auto-start generation with pre-flight metadata check
  React.useEffect(() => {
    if (!params || hasStartedRef.current) {
      return;
    }

    hasStartedRef.current = true;

    const startGeneration = async () => {
      try {
        // Get metadata for toast notifications
        const response = await fetch("/api/newsletter/prepare", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
        });

        if (response.ok) {
          const data = await response.json();

          // Show toast for feed refresh if needed
          if (data.feedsToRefresh > 0) {
            toast.info(
              `Refreshing ${data.feedsToRefresh} feed${data.feedsToRefresh > 1 ? "s" : ""}...`,
            );
          }

          // Show toast for article analysis
          if (data.articlesFound > 0) {
            toast.info(
              `Analyzing ${data.articlesFound} article${data.articlesFound > 1 ? "s" : ""} from your feeds...`,
            );
            setArticlesCount(data.articlesFound);
          }
        }

        // Start AI generation
        submit(params);
      } catch (error) {
        console.error("Failed to prepare newsletter:", error);
        // Start generation anyway
        submit(params);
      }
    };

    startGeneration();
  }, [params, submit]);

  // Show success toast when generation completes
  React.useEffect(() => {
    if (!isLoading && newsletter?.body && articlesCount > 0) {
      toast.success(`Newsletter generated from ${articlesCount} articles!`);
    }
  }, [isLoading, newsletter?.body, articlesCount]);

  // Navigation guard - warn users before leaving during generation
  // This prevents accidental loss of work if they close the tab
  React.useEffect(() => {
    if (!isLoading) {
      return;
    }

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
      return "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isLoading]);

  /**
   * Saves the generated newsletter to database (Pro users only)
   */
  const handleSave = async () => {
    if (!newsletter || !params) {
      return;
    }

    try {
      await saveGeneratedNewsletter({
        newsletter: newsletter as GeneratedNewsletter,
        feedIds: params.feedIds,
        startDate: new Date(params.startDate),
        endDate: new Date(params.endDate),
        userInput: params.userInput,
      });

      toast.success("Newsletter saved to history!");
    } catch (error) {
      console.error("Failed to save newsletter:", error);
      toast.error("Failed to save newsletter");
    }
  };

  const handleBackToDashboard = () => {
    router.push("/dashboard");
  };

  // If no params, show error
  if (!params) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-black dark:to-gray-950">
        <div className="container mx-auto py-12 px-6 lg:px-8">
          <Card className="transition-all hover:shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl">
                Invalid Generation Request
              </CardTitle>
              <CardDescription className="text-base">
                Missing required parameters for newsletter generation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleBackToDashboard}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-black dark:to-gray-950">
      <div className="container mx-auto py-12 px-6 lg:px-8 space-y-8 max-w-[1600px]">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToDashboard}
              disabled={isLoading}
              className="hover:bg-accent"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="h-4 w-px bg-border" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                Newsletter Generation
              </h1>
            </div>
          </div>
          {isLoading && (
            <div className="flex items-center gap-2 text-base">
              <div className="inline-flex size-8 items-center justify-center rounded-md bg-gradient-to-br from-blue-600 to-purple-600 text-white animate-pulse">
                <Sparkles className="h-4 w-4" />
              </div>
              <span className="font-medium">Generating newsletter...</span>
            </div>
          )}
        </div>

        {/* Show loading card while generating */}
        {isLoading && !newsletter?.body && (
          <div className="transition-opacity duration-300 ease-in-out">
            <NewsletterLoadingCard />
          </div>
        )}

        {/* Newsletter display with smooth transition */}
        {newsletter?.body && (
          <div className="transition-opacity duration-500 ease-in-out animate-in fade-in">
            <NewsletterDisplay
              newsletter={newsletter}
              onSave={handleSave}
              isGenerating={isLoading}
            />
          </div>
        )}

        {/* Show error if object exists but body is missing after completion */}
        {!isLoading && object && !newsletter?.body && !error && (
          <Card className="transition-all hover:shadow-lg border-destructive">
            <CardHeader>
              <CardTitle className="text-2xl text-destructive">
                Generation Incomplete
              </CardTitle>
              <CardDescription className="text-base">
                The newsletter generation completed but the body content is missing. This may indicate an issue with the AI response.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground">
                <p>Raw object keys: {object ? Object.keys(object).join(", ") : "none"}</p>
                {newsletter && (
                  <p>Newsletter keys: {Object.keys(newsletter).join(", ")}</p>
                )}
                <p>This might be a temporary issue. Please try generating again.</p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    hasStartedRef.current = false;
                    submit(params);
                  }}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Retry Generation
                </Button>
                <Button
                  variant="outline"
                  onClick={handleBackToDashboard}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        )}


        {/* If generation hasn't started yet */}
        {!isLoading && !newsletter?.body && !error && (
          <Card className="transition-all hover:shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl">Preparing to Generate</CardTitle>
              <CardDescription className="text-base">
                Setting up newsletter generation...
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    </div>
  );
}