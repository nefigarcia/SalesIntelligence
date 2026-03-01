
'use server';

/**
 * @fileOverview Rule-based email extraction service.
 * This replaces AI with standard Software Engineering regex patterns.
 */

export async function scrapeEmailFromWebsite(websiteUrl: string) {
  try {
    const response = await fetch(websiteUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(8000), // 8 second timeout to prevent hanging
    });

    if (!response.ok) {
      return { found: false, error: `Connection failed: HTTP ${response.status}` };
    }

    const html = await response.text();
    
    // Regular Expression for finding professional emails
    // A classic rule-based ETL approach.
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const matches = html.match(emailRegex);

    if (matches && matches.length > 0) {
      // Data Cleaning: Filter out common junk and duplicates
      const junkKeywords = ['sentry.io', 'google.com', 'example.com', 'png', 'jpg', 'svg', 'wix', 'wordpress'];
      const uniqueEmails = Array.from(new Set(matches)).filter(email => 
        !junkKeywords.some(junk => email.toLowerCase().includes(junk))
      );

      if (uniqueEmails.length > 0) {
        // Return the first valid business email found
        return { found: true, email: uniqueEmails[0] };
      }
    }

    return { found: false, error: 'No email patterns detected in page source.' };
  } catch (err: any) {
    return { found: false, error: 'Website is blocking access or offline.' };
  }
}
