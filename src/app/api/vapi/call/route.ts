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
          name: leadName || undefined,
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
          firstMessage: `Hi, am I speaking with someone from ${leadName || 'your business'}?`,
          model: {
            provider: 'openai',
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: `You are Isabella, a professional sales development representative calling on behalf of the Rosys AI sales team. Your name is Isabella — always introduce yourself as Isabella. You are reaching out to ${leadName || 'this business'} to introduce services that help organizations implement AI and optimize their operations.

CRITICAL RULES — follow these before anything else:
- If you hear a voicemail greeting, beep, automated message, IVR menu, or any pre-recorded audio, say "Goodbye" immediately and end the call. Do not leave a message.
- If no one answers within a few seconds, say "Goodbye" and end the call.
- If you are placed on hold or hear hold music, say "Goodbye" and end the call.
- Only continue the conversation if a real human answers and engages with you.

If a real person answers: be concise, warm, and professional. Ask one or two qualifying questions to understand their current situation. If they are not interested, thank them politely and end the call.`,
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
