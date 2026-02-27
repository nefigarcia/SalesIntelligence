'use server';
/**
 * @fileOverview Provides smart search suggestions for business categories.
 *
 * - smartSearchSuggestions - A function that suggests relevant business categories based on user input.
 * - SmartSearchSuggestionsInput - The input type for the smartSearchSuggestions function.
 * - SmartSearchSuggestionsOutput - The return type for the smartSearchSuggestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SmartSearchSuggestionsInputSchema = z
  .object({
    query: z
      .string()
      .describe(
        'The partial business type or search term for which to suggest categories.'
      ),
  })
  .describe('Input for smart search suggestions, containing a partial query string.');
export type SmartSearchSuggestionsInput = z.infer<
  typeof SmartSearchSuggestionsInputSchema
>;

const SmartSearchSuggestionsOutputSchema = z
  .object({
    suggestions: z
      .array(z.string())
      .describe('An array of suggested business categories or terms.'),
  })
  .describe('Output containing a list of suggested business categories.');
export type SmartSearchSuggestionsOutput = z.infer<
  typeof SmartSearchSuggestionsOutputSchema
>;

export async function smartSearchSuggestions(
  input: SmartSearchSuggestionsInput
): Promise<SmartSearchSuggestionsOutput> {
  return smartSearchSuggestionsFlow(input);
}

const smartSearchSuggestionsPrompt = ai.definePrompt({
  name: 'smartSearchSuggestionsPrompt',
  input: {schema: SmartSearchSuggestionsInputSchema},
  output: {schema: SmartSearchSuggestionsOutputSchema},
  prompt: `You are a helpful assistant that suggests popular and relevant business categories or terms based on a partial search input.
Provide a list of up to 5 suggestions that are highly relevant to the partial search term, in a JSON array format.

Partial search term: {{{query}}}

Examples:
- If the input is 'plu', a good output would be ["Plumbers", "Plumbing Services", "Plumbing Repair"]
- If the input is 'dent', a good output would be ["Dentists", "Dental Clinics", "Orthodontists", "Pediatric Dentists"]
- If the input is 'resta', a good output would be ["Restaurants", "Restaurant Equipment", "Restaurant Consultants"]
- If the input is 'gym', a good output would be ["Gyms", "Fitness Centers", "Personal Trainers"]
`,
});

const smartSearchSuggestionsFlow = ai.defineFlow(
  {
    name: 'smartSearchSuggestionsFlow',
    inputSchema: SmartSearchSuggestionsInputSchema,
    outputSchema: SmartSearchSuggestionsOutputSchema,
  },
  async input => {
    const {output} = await smartSearchSuggestionsPrompt(input);
    return output!;
  }
);
