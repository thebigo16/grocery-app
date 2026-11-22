// Read a recipe web page. Most recipe sites embed schema.org Recipe data
// (JSON-LD), which we can read for free without calling Claude.

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', frac12: '½', frac14: '¼', frac34: '¾', deg: '°' };

export function decodeEntities(s) {
  return String(s || '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+\d*);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);
}

const clean = (s) => decodeEntities(String(s || '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

function isPrivateHost(host) {
  const h = host.toLowerCase();
  return (
    h === 'localhost' ||
    h.endsWith('.local') ||
    h.endsWith('.internal') ||
    /^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(h) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(h) ||
    h.startsWith('[') ||
    !h.includes('.')
  );
}

export async function fetchPage(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error('That doesn’t look like a web link.');
  }
  if (!/^https?:$/.test(url.protocol) || isPrivateHost(url.hostname)) {
    throw new Error('That link can’t be opened.');
  }
  const res = await fetch(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(12000),
    headers: {
      'User-Agent':
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
      Accept: 'text/html,application/xhtml+xml',
    },
  });
  if (!res.ok) {
    throw new Error(
      res.status === 401 || res.status === 403
        ? 'That site blocked the app from reading it. Take a photo or paste the text instead.'
        : `That page couldn’t be opened (${res.status}).`,
    );
  }
  const html = (await res.text()).slice(0, 3_000_000);
  return { html, finalUrl: res.url || url.toString() };
}

function findRecipeNode(node) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const n of node) {
      const r = findRecipeNode(n);
      if (r) return r;
    }
    return null;
  }
  const type = node['@type'];
  if (type === 'Recipe' || (Array.isArray(type) && type.includes('Recipe'))) return node;
  if (node['@graph']) return findRecipeNode(node['@graph']);
  if (node.mainEntity) return findRecipeNode(node.mainEntity);
  return null;
}

function flattenInstructions(ins) {
  if (!ins) return [];
  if (typeof ins === 'string') return ins.split(/\n+|(?<=\.)\s+(?=[A-Z])/).map(clean).filter(Boolean);
  if (Array.isArray(ins)) return ins.flatMap(flattenInstructions);
  if (ins['@type'] === 'HowToSection') {
    const steps = flattenInstructions(ins.itemListElement);
    return ins.name ? [`${clean(ins.name)}:`, ...steps] : steps;
  }
  if (ins.text) return [clean(ins.text)];
  if (ins.name) return [clean(ins.name)];
  return [];
}

function parseYield(y) {
  const list = Array.isArray(y) ? y : [y];
  for (const v of list) {
    const m = String(v ?? '').match(/\d+/);
    if (m) return Number(m[0]);
  }
  return null;
}

/** Returns a recipe from JSON-LD, or null if the page has none. */
export function recipeFromJsonLd(html) {
  const blocks = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi) || [];
  for (const b of blocks) {
    const json = b.replace(/^<script[^>]*>/i, '').replace(/<\/script>$/i, '').trim();
    let data;
    try {
      data = JSON.parse(json);
    } catch {
      continue;
    }
    const r = findRecipeNode(data);
    if (!r) continue;
    const ingredients = (Array.isArray(r.recipeIngredient) ? r.recipeIngredient : [r.recipeIngredient])
      .filter(Boolean)
      .map(clean)
      .filter(Boolean);
    if (!ingredients.length) continue;
    return {
      title: clean(r.name),
      servings: parseYield(r.recipeYield),
      ingredients,
      instructions: flattenInstructions(r.recipeInstructions),
      notes: '',
    };
  }
  return null;
}

/** Visible text of a page, for when there's no structured recipe data. */
export function pageText(html) {
  return decodeEntities(
    html
      .replace(/<(script|style|noscript|svg|nav|footer|header|form|iframe)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<br\s*\/?>|<\/(p|li|h\d|div|tr)>/gi, '\n')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
}
