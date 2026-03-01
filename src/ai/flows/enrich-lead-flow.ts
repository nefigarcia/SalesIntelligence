
'use server';
/**
 * @fileOverview A flow to enrich business leads by scraping their websites for emails.
 *
 * - enrichLead - A function that handles the website scraping and email extraction.
 * - EnrichLeadInput - The input type for the enrichLead function.
 * - EnrichLeadOutput - The return type for the enrichLead function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const EnrichLeadInputSchema = z.object({
  websiteUrl: z.string().url().describe('The URL of the business website to scrape.'),
});
export type EnrichLeadInput = z.infer<typeof EnrichLeadInputSchema>;

const EnrichLeadOutputSchema = z.object({
  email: z.string().optional().describe('The identified contact email address.'),
  found: z.boolean().describe('Whether or not an email was successfully found.'),
  error: z.string().optional().describe('Description of any error encountered.'),
});
export type EnrichLeadOutput = z.infer<typeof EnrichLeadOutputSchema>;

const scrapeWebsiteTool = ai.defineTool(
  {
    name: 'scrapeWebsite',
    description: 'Fetches the text content of a website to find contact information.',
    inputSchema: z.object({ url: z.string().url() }),
    outputSchema: z.string(),
  },
  async (input) => {
    try {
      const response = await fetch(input.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });
      
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const html = await response.text();
      
      // Basic cleanup to reduce token usage and noise
      const cleaned = html
        .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gmb, '')
        .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gmb, '')
        .replace(/<svg\b[^>]*>([\s\S]*?)<\/svg>/gmb, '')
        .replace(/\s\s+/g, ' ') // Collapse whitespace
        .substring(0, 15000); // Take the first 15k characters which usually contain contact info
        
      return cleaned;
    } catch (e: any) {
      return `Failed to fetch website: ${e.message}`;
    }
  }
);

export async function enrichLead(input: EnrichLeadInput): Promise<EnrichLeadOutput> {
  return enrichLeadFlow(input);
}

const enrichLeadFlow = ai.defineFlow(
  {
    name: 'enrichLeadFlow',
    inputSchema: EnrichLeadInputSchema,
    outputSchema: EnrichLeadOutputSchema,
  },
  async (input) => {
    const { output } = await ai.generate({
      prompt: `You are an expert at extracting business contact information from website HTML.
      
      Website URL: ${input.websiteUrl}
      
      Use the scrapeWebsite tool to get the content of the website. 
      Analyze the text to find a professional contact email address. 
      Look for patterns like mailto: links, or text in the footer/header.
      
      If you find multiple, choose the most generic professional one (e.g. info@, contact@, admin@).`,
      tools: [scrapeWebsiteTool],
      output: { schema: EnrichLeadOutputSchema },
    });

    if (!output) {
      return { found: false, error: 'No output from model' };
    }

    return output;
  }
);
