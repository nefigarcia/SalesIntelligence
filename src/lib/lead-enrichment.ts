
'use server';

/**
 * @fileOverview Sales Intelligence Enrichment Service.
 * Performs multi-stage data extraction: Email, Social Links, Tech Stack, and Propensity Scoring.
 */

export interface LeadEnrichmentResult {
  email?: string;
  techStack?: string[];
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    linkedin?: string;
    twitter?: string;
  };
  score: number;
  intentSignals: string[];
  error?: string;
}

export async function enrichLeadAction(websiteUrl: string, businessName: string): Promise<LeadEnrichmentResult> {
  try {
    const response = await fetch(websiteUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    const htmlLower = html.toLowerCase();

    // 1. Email Discovery (Regex)
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emailMatches = html.match(emailRegex);
    const junkKeywords = ['sentry.io', 'google.com', 'example.com', 'png', 'jpg', 'svg', 'wix', 'wordpress', 'github'];
    const email = emailMatches ? Array.from(new Set(emailMatches)).find(e => !junkKeywords.some(j => e.toLowerCase().includes(j))) : undefined;

    // 2. Technographic Detection (Fingerprinting)
    const techStack: string[] = [];
    if (htmlLower.includes('wp-content')) techStack.push('WordPress');
    if (htmlLower.includes('shopify')) techStack.push('Shopify');
    if (htmlLower.includes('wix.com')) techStack.push('Wix');
    if (htmlLower.includes('squarespace')) techStack.push('Squarespace');
    if (htmlLower.includes('googletagmanager')) techStack.push('GTM');
    if (htmlLower.includes('facebook-jssdk')) techStack.push('FB Pixel');
    if (htmlLower.includes('hubspot')) techStack.push('HubSpot');

    // 3. Social Discovery (Regex for major platforms)
    const socialLinks: any = {};
    const fbMatch = html.match(/facebook\.com\/([a-zA-Z0-9.]+)/);
    const igMatch = html.match(/instagram\.com\/([a-zA-Z0-9.]+)/);
    const liMatch = html.match(/linkedin\.com\/(company|in)\/([a-zA-Z0-9.-]+)/);
    const twMatch = html.match(/twitter\.com\/([a-zA-Z0-9_]+)/);

    if (fbMatch) socialLinks.facebook = `https://facebook.com/${fbMatch[1]}`;
    if (igMatch) socialLinks.instagram = `https://instagram.com/${igMatch[1]}`;
    if (liMatch) socialLinks.linkedin = `https://linkedin.com/${liMatch[1]}/${liMatch[2]}`;
    if (twMatch) socialLinks.twitter = `https://twitter.com/${twMatch[1]}`;

    // 4. Propensity Scoring & Intent Signals
    let score = 20; // Baseline
    const signals: string[] = [];

    if (email) score += 30;
    if (Object.keys(socialLinks).length > 0) score += 20;
    if (techStack.length > 3) {
      score += 15;
      signals.push('High tech maturity');
    }
    if (techStack.includes('Shopify')) signals.push('E-commerce potential');
    if (!techStack.includes('GTM')) signals.push('Needs tracking setup');

    return {
      email,
      techStack: techStack.length > 0 ? techStack : ['Generic HTML'],
      socialLinks,
      score: Math.min(score, 100),
      intentSignals: signals
    };

  } catch (err: any) {
    return {
      score: 10,
      intentSignals: ['Offline or Protected'],
      error: err.message
    };
  }
}
