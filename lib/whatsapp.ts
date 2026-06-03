import "server-only";

/**
 * Meta WhatsApp Cloud API delivery.
 *
 * Replaces the old hardcoded axios call (routes/sorteio.js): phone-number
 * id and template name now come from env, the template name bug is fixed
 * (WA_TEMPLATE_NAME, not the token), and per-recipient errors are
 * collected and returned instead of being swallowed in a console.error.
 */

const GRAPH_VERSION = "v19.0";

export interface SendInput {
  /** recipient phone in international format, digits only e.g. 351912345678 */
  to: string;
  /** first template body param — always the giver's name */
  giverName: string;
  /** second template body param — assignee name OR reveal URL */
  secondParam: string;
}

export interface SendResult {
  to: string;
  ok: boolean;
  error?: string;
}

function getConfig() {
  const token = process.env.WA_API_TOKEN;
  const phoneId = process.env.WA_PHONE_NUMBER_ID;
  const template = process.env.WA_TEMPLATE_NAME;
  const language = process.env.WA_TEMPLATE_LANGUAGE ?? "pt_PT";
  if (!token || !phoneId || !template) {
    throw new Error(
      "WhatsApp not configured: set WA_API_TOKEN, WA_PHONE_NUMBER_ID and WA_TEMPLATE_NAME.",
    );
  }
  return { token, phoneId, template, language };
}

/** True when the env is configured enough to attempt WhatsApp sends. */
export function isWhatsAppConfigured(): boolean {
  return Boolean(
    process.env.WA_API_TOKEN &&
      process.env.WA_PHONE_NUMBER_ID &&
      process.env.WA_TEMPLATE_NAME,
  );
}

async function sendOne(input: SendInput): Promise<SendResult> {
  const { token, phoneId, template, language } = getConfig();
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${phoneId}/messages`;

  const body = {
    messaging_product: "whatsapp",
    to: input.to,
    type: "template",
    template: {
      name: template,
      language: { code: language },
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: input.giverName },
            { type: "text", text: input.secondParam },
          ],
        },
      ],
    },
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      return { to: input.to, ok: false, error: `HTTP ${res.status}: ${text}` };
    }
    return { to: input.to, ok: true };
  } catch (e) {
    return {
      to: input.to,
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

/** Send to every recipient, collecting per-recipient results. */
export async function sendBatch(inputs: SendInput[]): Promise<SendResult[]> {
  return Promise.all(inputs.map(sendOne));
}
