/**
 * Express **AI advisory** (`POST /ai/chat`) — separate system from the Python
 * maintenance advisor (`advisor_server.mjs` + `obd_maintenance_advisor.py`).
 *
 * REQ-17–REQ-23 (partial): supports `sessionId`, short `history`; disclaimer on every response.
 */
import { getBackendBaseUrl } from './api-config';

export type AiUrgencyLabel = 'Immediate' | 'Within a Week' | 'Monitor';

export type AiChatTurn = { role: 'user' | 'ai'; text: string };

export type AiChatResponse = {
  reply: string;
  urgency: AiUrgencyLabel;
  disclaimer: string;
  sessionId?: string;
  suggestions?: string[];
};

function normalizeUrgency(raw: unknown): AiUrgencyLabel {
  const s = String(raw || '').trim();
  if (s === 'Immediate') return 'Immediate';
  if (s === 'Within a Week') return 'Within a Week';
  return 'Monitor';
}

export async function postAiChat(
  message: string,
  vehicleContext: { name: string },
  getAccessToken: () => Promise<string | null>,
  options?: {
    sessionId?: string | null;
    history?: AiChatTurn[];
  }
): Promise<AiChatResponse | null> {
  const token = await getAccessToken();
  if (!token) return null;

  try {
    const res = await fetch(`${getBackendBaseUrl()}/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        message,
        vehicleContext: { name: vehicleContext.name },
        sessionId: options?.sessionId || undefined,
        history: options?.history?.slice(-16) ?? undefined,
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      reply?: string;
      urgency?: string;
      disclaimer?: string;
      sessionId?: string;
      suggestions?: string[];
    };
    if (!data.reply || typeof data.reply !== 'string') return null;
    return {
      reply: data.reply,
      urgency: normalizeUrgency(data.urgency),
      disclaimer:
        typeof data.disclaimer === 'string' && data.disclaimer.trim()
          ? data.disclaimer.trim()
          : 'Consult a certified professional for serious or uncertain issues.',
      sessionId: typeof data.sessionId === 'string' ? data.sessionId : undefined,
      suggestions: Array.isArray(data.suggestions) ? data.suggestions.slice(0, 5) : undefined,
    };
  } catch {
    return null;
  }
}
