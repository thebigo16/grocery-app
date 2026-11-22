import { z } from 'zod';
import { allowPost, requireUser } from './_lib/auth.js';
import { apiErrorMessage, extract, imageBlock } from './_lib/claude.js';

const Items = z.object({
  items: z
    .array(
      z.object({
        name: z
          .string()
          .describe('short generic grocery name a person would put on a list, e.g. "Olive oil", "Smoked paprika"'),
        perishable: z.boolean().describe('true for fresh produce, meat, dairy and other items that spoil within weeks'),
      }),
    )
    .describe('each distinct product visible, once'),
});

const SYSTEM = `You look at photos of a kitchen pantry, spice rack, fridge door or cupboard and list the products you can see.
Name each product generically (no brand names) the way it would appear on a grocery list, e.g. "Soy sauce",
"Ground cumin", "All-purpose flour". Read labels where you can. List each product once. Skip anything you
cannot identify with reasonable confidence.`;

export default async function handler(req, res) {
  if (!allowPost(req, res)) return;
  if (!(await requireUser(req, res))) return;

  const { images } = req.body || {};
  if (!Array.isArray(images) || !images.length) {
    return res.status(400).json({ error: 'Send at least one photo.' });
  }
  try {
    const r = await extract({
      system: SYSTEM,
      content: [
        ...images.slice(0, 4).map(imageBlock),
        { type: 'text', text: 'What pantry items are in these photos?' },
      ],
      schema: Items,
      maxTokens: 4000,
    });
    return res.status(200).json({ items: r.items });
  } catch (err) {
    console.error('identify-items', err);
    return res.status(500).json({ error: apiErrorMessage(err) });
  }
}
