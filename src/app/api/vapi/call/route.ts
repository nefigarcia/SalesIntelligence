import { NextRequest, NextResponse } from 'next/server';

const VAPI_API_KEY = process.env.VAPI_API_KEY!;
const VAPI_PHONE_NUMBER = process.env.VAPI_PHONE_NUMBER!;

let cachedPhoneNumberId: string | null = null;

async function getPhoneNumberId(): Promise<string> {
  if (cachedPhoneNumberId) return cachedPhoneNumberId;

  const res = await fetch('https://api.vapi.ai/phone-number', {
    headers: { Authorization: `Bearer ${VAPI_API_KEY}` },
  });

  const body = await res.json();

  if (!res.ok) {
    throw new Error(
      `Vapi /phone-number returned ${res.status}: ${JSON.stringify(body)}`
    );
  }

  // Vapi may return an array directly or a paginated { results: [] } object
  const numbers: any[] = Array.isArray(body) ? body : (body.results ?? []);

  const match = numbers.find((n: any) =>
    n.number?.replace(/\D/g, '') === VAPI_PHONE_NUMBER.replace(/\D/g, '')
  );

  if (!match) {
    const available = numbers.map((n: any) => n.number).join(', ');
    throw new Error(
      `Phone number ${VAPI_PHONE_NUMBER} not found. Numbers in account: [${available}]`
    );
  }

  cachedPhoneNumberId = match.id;
  return match.id;
}

function toE164(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  return digits.startsWith('1') ? `+${digits}` : `+1${digits}`;
}

export async function POST(req: NextRequest) {
  try {
    const { phoneNumber, leadName } = await req.json();

    if (!phoneNumber) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    const phoneNumberId = await getPhoneNumberId();
    const customerNumber = toE164(phoneNumber);

    const vapiRes = await fetch('https://api.vapi.ai/call/phone', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phoneNumberId,
        customer: {
          number: customerNumber,
          name: leadName ? leadName.slice(0, 40) : undefined,
        },
        assistant: {
          voicemailDetection: {
            provider: 'twilio',
            enabled: true,
            voicemailDetectionTypes: [
              'machine_start',
              'machine_end_beep',
              'machine_end_silence',
              'machine_end_other',
            ],
            machineDetectionTimeout: 5,
          },
          firstMessage: `Hi, this is Isabella, an AI assistant calling on behalf of Rosys AI. Am I speaking with someone from ${leadName || 'your business'}?`,
          model: {
            provider: 'openai',
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: `
You are Isabella, an AI assistant calling on behalf of Rosys AI.

IMPORTANT: Always be transparent — you are an AI assistant, not a human.

Your goal is to start natural conversations, identify inefficiencies in the business, and connect interested prospects to a human consultant.

========================
CALL BEHAVIOR RULES
========================

1. VOICEMAIL / IVR DETECTION:
- If you are 100% sure it is a voicemail (beep, "leave a message", etc.), say:
  "I'll try again another time. Goodbye."
  Then end call.
- DO NOT hang up if there is ANY chance it is a live transfer or hold.

2. HOLD / TRANSFER HANDLING:
- If the person says:
  "hold on", "one second", "let me transfer you"
  → enter HOLD MODE
- In HOLD MODE:
  - Wait patiently up to 60 seconds
  - Ignore background messages, ads, or music
  - DO NOT hang up
- If unsure, say:
  "Hi, just checking — am I still on hold or connected to someone?"

3. HUMAN DETECTION:
- If a new person joins, greet them and restart context briefly:
  "Hi, this is Isabella from Rosys AI — I was just speaking with your team."

========================
CONVERSATION STRATEGY
========================

DO NOT start by selling AI.

Instead:

STEP 1 — OPEN NATURALLY
Ask about operations:
"Quick question — how are you currently handling things like client intake, follow-ups, or internal workflows? Is most of that manual?"

STEP 2 — IDENTIFY PAIN
Listen for:
- manual work
- inefficiencies
- time-consuming tasks

STEP 3 — POSITION VALUE
Say:
"That's actually where we help — usually by simplifying or automating parts of that so your team can focus on higher-value work."

STEP 4 — INTRODUCE AI (ONLY AFTER CONTEXT)
"We use Artificial Intelligence as part of that, but only where it actually makes sense and creates real impact."

STEP 5 — QUALIFY
Ask:
- "Is that something you're currently trying to improve?"
- "Who usually handles decisions around operations or systems like that?"

STEP 6 — HANDOFF TRIGGER
If they show interest:
Say:
"This might be worth a quick conversation with our specialist. We usually do a short 20-minute session to identify a couple of quick wins."

Then:
→ Offer callback or meeting

========================
TONE
========================
- Conversational, not robotic
- Curious, not pushy
- Short sentences
- Let them talk more than you

========================
END CONDITIONS
========================
- If clearly not interested → politely exit
- If asked to be removed → comply immediately
- If engaged → continue and qualify

Never rush to hang up unless it's clearly voicemail.
`,
              },
            ],
          },
          voice: {
            provider: '11labs',
            voiceId: 'paula',
          },
          endCallMessage: 'Thank you for your time. Have a great day!',
          endCallPhrases: ['goodbye', 'bye', 'not interested', 'take me off your list', 'remove me'],
        },
      }),
    });

    const data = await vapiRes.json();

    if (!vapiRes.ok) {
      return NextResponse.json(
        { error: data.message || 'Vapi call failed' },
        { status: vapiRes.status }
      );
    }

    return NextResponse.json({ callId: data.id, status: data.status });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
