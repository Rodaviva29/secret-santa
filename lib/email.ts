import "server-only";
import { Resend } from "resend";

/**
 * Optional transactional email via Resend. Config is env-driven (secrets
 * never live in the DB):
 *   RESEND_API_KEY   — Resend API key
 *   RESEND_FROM      — verified sender, e.g. "Santa <santa@your.domain>"
 * When unset, email is simply skipped (every call is config-gated).
 */

export interface EmailInput {
  to: string;
  subject: string;
  /** plain-text body; also wrapped in a minimal HTML shell */
  text: string;
  html?: string;
}

export interface EmailResult {
  to: string;
  ok: boolean;
  error?: string;
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM);
}

function client(): { resend: Resend; from: string } {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!key || !from) {
    throw new Error("Email not configured: set RESEND_API_KEY and RESEND_FROM.");
  }
  return { resend: new Resend(key), from };
}

async function sendOne(input: EmailInput): Promise<EmailResult> {
  const { resend, from } = client();
  try {
    const { error } = await resend.emails.send({
      from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html ?? `<p>${escapeHtml(input.text)}</p>`,
    });
    if (error) return { to: input.to, ok: false, error: error.message };
    return { to: input.to, ok: true };
  } catch (e) {
    return {
      to: input.to,
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export async function sendEmailBatch(
  inputs: EmailInput[],
): Promise<EmailResult[]> {
  return Promise.all(inputs.map(sendOne));
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
