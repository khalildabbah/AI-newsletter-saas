import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

/**
 * Redirect handler that checks if user has a plan after login
 * - If user has starter or pro plan: redirect to dashboard
 * - If user doesn't have a plan: redirect to pricing page
 */
export async function GET() {
  const { has, userId } = await auth();

  // If not authenticated, redirect to home
  if (!userId) {
    redirect("/");
  }

  // Check if user has a paid plan (starter or pro)
  const hasPaidPlan =
    (await has({ plan: "pro" })) || (await has({ plan: "starter" }));

  if (hasPaidPlan) {
    // User has a plan, redirect to dashboard
    redirect("/dashboard");
  } else {
    // User doesn't have a plan, redirect to pricing
    redirect("/#pricing");
  }
}

