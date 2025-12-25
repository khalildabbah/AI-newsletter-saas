import { z } from "zod";

/**
 * Newsletter generation result schema
 *
 * Defines the structure of AI-generated newsletters.
 * The AI SDK validates responses against this schema.
 */
export const NewsletterSchema = z.object({
  suggestedTitles: z.array(z.string()).length(5),
  suggestedSubjectLines: z.array(z.string()).length(5),
  body: z.string(),
  topAnnouncements: z.array(z.string()).length(5),
  additionalInfo: z.string().optional(),
});

export type GeneratedNewsletter = z.infer<typeof NewsletterSchema>;

