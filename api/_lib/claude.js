import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';

const client = new Anthropic();
export const MODEL = 'claude-opus-5-5';

/** Turn "data:image/jpeg;base64,..." into an image content block. */
export function imageBlock(dataUrl) {
  const m = /^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/.exec(String(dataUrl || ''));
  if (!m) throw new Error('One of the photos could not be read.');
  return { type: 'image', source: { type: 'base64', media_type: m[1], data: m[2] } };
}

/**
 * One structured-output request. Returns the parsed object.
 * Refusals fall back server-side to whichever model fits the refusal category.
 */
export async function extract({ system, content, schema, maxTokens = 8000 }) {
  const message = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: maxTokens,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system,
    output_config: { effort: 'low', format: betaZodOutputFormat(schema) },
    messages: [{ role: 'user', content }],
  });
  if (message.stop_reason === 'refusal') {
    throw new Error('Claude couldn’t read that one. Try another photo or paste the text.');
  }
  if (message.stop_reason === 'max_tokens' || !message.parsed_output) {
    throw new Error('That recipe was too long to read in one go. Try pasting the text.');
  }
  return message.parsed_output;
}

/** Map SDK errors to a short message for the phone. */
export function apiErrorMessage(err) {
  if (err instanceof Anthropic.AuthenticationError) return 'The Claude API key is not valid.';
  if (err instanceof Anthropic.PermissionDeniedError) return 'The Claude API key is not allowed to do this.';
  if (err instanceof Anthropic.RateLimitError) return 'Too many requests right now. Try again in a minute.';
  if (err instanceof Anthropic.BadRequestError) {
    if (/credit|billing/i.test(err.message)) return 'The Claude API account is out of credit.';
    return 'Claude couldn’t process that request.';
  }
  if (err instanceof Anthropic.APIError) return `Claude is having trouble (${err.status}). Try again.`;
  return err?.message || 'Something went wrong.';
}
