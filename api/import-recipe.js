import { z } from 'zod';
import { allowPost, requireUser } from './_lib/auth.js';
import { apiErrorMessage, extract, imageBlock } from './_lib/claude.js';
import { fetchPage, pageText, recipeFromJsonLd } from './_lib/recipePage.js';

const Recipe = z.object({
  is_recipe: z.boolean().describe('false if the input does not contain a recipe'),
  title: z.string(),
  servings: z.number().int().nullable().describe('number of servings, or null if not stated'),
  ingredients: z
    .array(z.string())
    .describe('one ingredient per entry exactly as written, with amount and unit, e.g. "2 tbsp olive oil"'),
  instructions: z.array(z.string()).describe('one step per entry, without step numbers'),
  notes: z.string().describe('short tips or variations worth keeping; empty string if none'),
});

const SYSTEM = `You read recipes from cookbook photos, web pages and pasted text and return them as structured data.
Copy ingredient lines faithfully, keeping amounts, units and preparation notes (e.g. "1 onion, diced").
Use fractions as written. If an ingredient list is split into sections (e.g. "For the sauce"), keep the
ingredients and drop the section headings. If the photo shows more than one recipe, return the one that
fills most of the page. Ignore page furniture such as ads, comments and navigation.`;

const MAX_TEXT = 60_000;

export default async function handler(req, res) {
  if (!allowPost(req, res)) return;
  if (!(await requireUser(req, res))) return;

  const { images, url, text } = req.body || {};
  try {
    let content;
    let sourceUrl = '';
    let warning = '';

    if (Array.isArray(images) && images.length) {
      content = [
        ...images.slice(0, 4).map(imageBlock),
        { type: 'text', text: 'Extract the recipe from these cookbook photos.' },
      ];
    } else if (url) {
      const page = await fetchPage(String(url));
      sourceUrl = page.finalUrl;
      const structured = recipeFromJsonLd(page.html);
      if (structured) {
        return res.status(200).json({ ...structured, sourceUrl, warning: 'Imported from the page. Check it over, then tap Save.' });
      }
      const body = pageText(page.html);
      if (body.length < 400) {
        throw new Error('That page didn’t show a recipe (it may be behind a login). Take a photo or paste the text instead.');
      }
      if (body.length > MAX_TEXT) warning = 'The page was very long, so only the first part was read. Check the recipe is complete.';
      content = [{ type: 'text', text: `Extract the recipe from this web page text:\n\n${body.slice(0, MAX_TEXT)}` }];
    } else if (text && String(text).trim()) {
      const t = String(text);
      if (t.length > MAX_TEXT) throw new Error('That text is too long. Paste just the recipe.');
      content = [{ type: 'text', text: `Extract the recipe from this text:\n\n${t}` }];
    } else {
      return res.status(400).json({ error: 'Send a photo, a link, or some text.' });
    }

    const r = await extract({ system: SYSTEM, content, schema: Recipe });
    if (!r.is_recipe || !r.ingredients.length) {
      return res.status(422).json({ error: 'I couldn’t find a recipe in that. Try a clearer photo or paste the text.' });
    }
    return res.status(200).json({
      title: r.title,
      servings: r.servings,
      ingredients: r.ingredients,
      instructions: r.instructions,
      notes: r.notes,
      sourceUrl,
      warning: warning || 'Read by Claude. Check it over, then tap Save.',
    });
  } catch (err) {
    console.error('import-recipe', err);
    return res.status(500).json({ error: apiErrorMessage(err) });
  }
}
