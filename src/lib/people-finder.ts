
'use server';

export interface PersonResult {
  name: string;
  title?: string;
  email?: string;
  confidence?: number;
  linkedin?: string;
  seniority?: string;
  department?: string;
}

export interface PeopleFinderResult {
  people: PersonResult[];
  companyName?: string;
  companySize?: string;
  industry?: string;
  description?: string;
  hasApiKey: boolean;
  error?: string;
}

export async function findPeopleAtDomain(domain: string): Promise<PeopleFinderResult> {
  const apiKey = process.env.HUNTER_API_KEY;

  if (!apiKey) {
    return {
      people: [],
      hasApiKey: false,
      error: "HUNTER_API_KEY not configured.",
    };
  }

  try {
    const cleanDomain = domain
      .replace(/^https?:\/\//, '')
      .replace(/\/.*$/, '')
      .replace(/^www\./, '');

    const url = `https://api.hunter.io/v2/domain-search?domain=${cleanDomain}&api_key=${apiKey}&limit=10`;
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    const data = await response.json();

    if (data.errors?.length) {
      return { people: [], hasApiKey: true, error: data.errors[0]?.details || "Hunter.io API error" };
    }

    const company = data.data;
    const people: PersonResult[] = (company?.emails || []).map((e: any) => ({
      name: [e.first_name, e.last_name].filter(Boolean).join(' ') || 'Unknown',
      title: e.position,
      email: e.value,
      confidence: e.confidence,
      linkedin: e.linkedin,
      seniority: e.seniority,
      department: e.department,
    }));

    return {
      people,
      companyName: company?.organization,
      companySize: company?.size ? formatSize(company.size) : undefined,
      industry: company?.industry,
      description: company?.description,
      hasApiKey: true,
    };
  } catch (err: any) {
    return { people: [], hasApiKey: true, error: err.message };
  }
}

function formatSize(size: string): string {
  const map: Record<string, string> = {
    '1': '1 employee',
    '2_10': '2–10 employees',
    '11_50': '11–50 employees',
    '51_200': '51–200 employees',
    '201_500': '201–500 employees',
    '501_1000': '501–1,000 employees',
    '1001_5000': '1,001–5,000 employees',
    '5001_10000': '5,001–10,000 employees',
    '10001': '10,001+ employees',
  };
  return map[size] || size;
}
