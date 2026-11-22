// Parse and combine recipe ingredient lines.
import { normalizeName } from './categories.js';

const UNICODE_FRACTIONS = {
  '¼': 0.25, '½': 0.5, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3, '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875,
  '⅕': 0.2, '⅖': 0.4, '⅗': 0.6, '⅘': 0.8, '⅙': 1 / 6, '⅚': 5 / 6,
};

// Canonical unit -> aliases. `family` lets us add tsp + tbsp etc.
const UNITS = {
  tsp: { aliases: ['tsp', 'tsps', 'teaspoon', 'teaspoons', 't'], family: 'volume', ml: 4.92892 },
  tbsp: { aliases: ['tbsp', 'tbsps', 'tbs', 'tablespoon', 'tablespoons', 'T'], family: 'volume', ml: 14.7868 },
  cup: { aliases: ['cup', 'cups', 'c'], family: 'volume', ml: 236.588 },
  'fl oz': { aliases: ['fl oz', 'fluid ounce', 'fluid ounces'], family: 'volume', ml: 29.5735 },
  pint: { aliases: ['pint', 'pints', 'pt'], family: 'volume', ml: 473.176 },
  quart: { aliases: ['quart', 'quarts', 'qt'], family: 'volume', ml: 946.353 },
  gallon: { aliases: ['gallon', 'gallons', 'gal'], family: 'volume', ml: 3785.41 },
  ml: { aliases: ['ml', 'milliliter', 'milliliters', 'millilitre', 'millilitres'], family: 'volume', ml: 1 },
  l: { aliases: ['l', 'liter', 'liters', 'litre', 'litres'], family: 'volume', ml: 1000 },
  oz: { aliases: ['oz', 'ounce', 'ounces'], family: 'weight', g: 28.3495 },
  lb: { aliases: ['lb', 'lbs', 'pound', 'pounds'], family: 'weight', g: 453.592 },
  g: { aliases: ['g', 'gram', 'grams', 'gr'], family: 'weight', g: 1 },
  kg: { aliases: ['kg', 'kilogram', 'kilograms'], family: 'weight', g: 1000 },
  clove: { aliases: ['clove', 'cloves'] },
  can: { aliases: ['can', 'cans'] },
  jar: { aliases: ['jar', 'jars'] },
  package: { aliases: ['package', 'packages', 'pkg', 'packet', 'packets'] },
  bunch: { aliases: ['bunch', 'bunches'] },
  head: { aliases: ['head', 'heads'] },
  stalk: { aliases: ['stalk', 'stalks', 'rib', 'ribs'] },
  sprig: { aliases: ['sprig', 'sprigs'] },
  slice: { aliases: ['slice', 'slices'] },
  stick: { aliases: ['stick', 'sticks'] },
  pinch: { aliases: ['pinch', 'pinches'] },
  dash: { aliases: ['dash', 'dashes'] },
  handful: { aliases: ['handful', 'handfuls'] },
  piece: { aliases: ['piece', 'pieces'] },
  bag: { aliases: ['bag', 'bags'] },
  box: { aliases: ['box', 'boxes'] },
  bottle: { aliases: ['bottle', 'bottles'] },
};

const ALIAS_TO_UNIT = new Map();
for (const [unit, def] of Object.entries(UNITS)) {
  for (const a of def.aliases) ALIAS_TO_UNIT.set(a, unit);
}

function parseNumberToken(tok) {
  if (!tok) return null;
  let t = tok;
  let total = 0;
  // Trailing unicode fraction, e.g. "1½"
  const last = t.slice(-1);
  if (UNICODE_FRACTIONS[last] !== undefined) {
    total += UNICODE_FRACTIONS[last];
    t = t.slice(0, -1);
    if (!t) return total;
  }
  if (/^\d+\/\d+$/.test(t)) {
    const [a, b] = t.split('/').map(Number);
    return b ? total + a / b : null;
  }
  if (/^\d*\.?\d+$/.test(t)) return total + Number(t);
  return null;
}

/** Reads a leading quantity like "1", "1 1/2", "½", "1-2", "1.5". Returns [qty, rest]. */
function readQuantity(text) {
  const tokens = text.split(/\s+/);
  let qty = null;
  let used = 0;
  for (let i = 0; i < tokens.length && i < 2; i++) {
    let tok = tokens[i];
    // Ranges "1-2" or "1–2": take the upper bound so we buy enough.
    const range = tok.match(/^([\d./¼½¾⅓⅔⅛⅜⅝⅞]+)[-–]([\d./¼½¾⅓⅔⅛⅜⅝⅞]+)$/);
    if (range) tok = range[2];
    const n = parseNumberToken(tok);
    if (n === null) break;
    if (i === 1 && !/\//.test(tokens[1]) && UNICODE_FRACTIONS[tokens[1]] === undefined) break;
    qty = (qty || 0) + n;
    used = i + 1;
  }
  // "1 to 2 cups"
  if (qty !== null && tokens[used] === 'to') {
    const n = parseNumberToken(tokens[used + 1]);
    if (n !== null) {
      qty = n;
      used += 2;
    }
  }
  return [qty, tokens.slice(used).join(' ')];
}

function readUnit(text) {
  // Parenthesized size like "(14.5 oz)" before a unit: keep as part of note.
  let size = '';
  let rest = text;
  const paren = rest.match(/^\(([^)]*)\)\s*/);
  if (paren) {
    size = paren[1];
    rest = rest.slice(paren[0].length);
  }
  const two = rest.split(/\s+/).slice(0, 2).join(' ').replace(/\.$/, '');
  const twoKey = two.toLowerCase();
  if (ALIAS_TO_UNIT.has(twoKey) && twoKey.includes(' ')) {
    return [ALIAS_TO_UNIT.get(twoKey), rest.slice(two.length).trim(), size];
  }
  const m = rest.match(/^([A-Za-z]+)\.?(\s+|$)/);
  if (m) {
    const word = m[1];
    // Capital "T" means tablespoon, lower "t" teaspoon; otherwise case-insensitive.
    const unit = word === 'T' ? 'tbsp' : word === 't' ? 'tsp' : ALIAS_TO_UNIT.get(word.toLowerCase());
    if (unit && !(word.length === 1 && !/^[tTcgl]$/.test(word))) {
      return [unit, rest.slice(m[0].length).trim().replace(/^of\s+/i, ''), size];
    }
  }
  return [null, rest, size];
}

const PREP_WORDS =
  /\b(chopped|minced|diced|sliced|grated|shredded|crushed|peeled|softened|melted|beaten|divided|optional|to taste|for serving|for garnish|finely|roughly|thinly|freshly|at room temperature|room temperature|plus more.*|packed|sifted|rinsed|drained|trimmed|halved|quartered|cubed|julienned|zested|juiced|cut into.*|or more.*)\b/gi;

/** Simple singular form for matching ("onions" -> "onion"). */
export function singular(word) {
  const w = word.toLowerCase();
  if (/(ss|us|is)$/.test(w)) return w;
  if (/ies$/.test(w)) return w.slice(0, -3) + 'y';
  if (/(tomato|potato)es$/.test(w)) return w.slice(0, -2);
  if (/(ch|sh|x)es$/.test(w)) return w.slice(0, -2);
  if (/oes$/.test(w)) return w.slice(0, -1);
  if (/s$/.test(w) && !/(asparagus|hummus|couscous|molasses|swiss|grits|greens|oats|brussels)$/.test(w)) return w.slice(0, -1);
  return w;
}

/** Key used to combine the same ingredient across recipes. */
export function ingredientKey(name) {
  const n = normalizeName(name)
    .replace(/\b(large|medium|small|fresh|whole|boneless|skinless|unsalted|salted|extra[- ]virgin|ripe|organic|kosher|good[- ]quality)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const words = n.split(' ');
  if (words.length) words[words.length - 1] = singular(words[words.length - 1]);
  return words.join(' ');
}

/**
 * Parse one ingredient line.
 * "2 1/2 cups all-purpose flour, sifted" ->
 *   { raw, quantity: 2.5, unit: 'cup', name: 'all-purpose flour', note: 'sifted' }
 */
export function parseIngredient(line) {
  const raw = String(line || '').trim();
  let text = raw.replace(/^[-•*▢□◻️\s]+/, '').replace(/\s+/g, ' ').trim();
  if (!text) return null;
  // Separate unicode fractions glued to words: "½cup" -> "½ cup"
  text = text.replace(/([¼½¾⅓⅔⅛⅜⅝⅞])(?=[A-Za-z])/g, '$1 ');
  const [quantity, afterQty] = readQuantity(text);
  const [unit, afterUnit, size] = quantity !== null ? readUnit(afterQty) : readUnit(text);
  let name = afterUnit;
  const notes = [];
  if (size) notes.push(size);
  // Split on first comma or parenthetical: "onion, diced" / "butter (softened)"
  const parens = name.match(/\(([^)]*)\)/g);
  if (parens) {
    for (const p of parens) notes.push(p.slice(1, -1));
    name = name.replace(/\([^)]*\)/g, ' ');
  }
  const comma = name.indexOf(',');
  if (comma > -1) {
    notes.push(name.slice(comma + 1).trim());
    name = name.slice(0, comma);
  }
  // Keep "diced tomatoes" intact for cans/jars: it's a product, not a prep step.
  const container = ['can', 'jar', 'package', 'bag', 'box', 'bottle'].includes(unit);
  const prep = container ? null : name.match(PREP_WORDS);
  if (prep) {
    notes.push(...prep.map((p) => p.trim()));
    name = name.replace(PREP_WORDS, ' ');
  }
  name = name.replace(/\s+/g, ' ').replace(/^(of|the)\s+/i, '').trim();
  if (!name) name = afterUnit.trim() || raw;
  return {
    raw,
    quantity,
    unit: quantity === null && unit === null ? null : unit,
    name,
    note: notes.filter(Boolean).join(', '),
  };
}

export function parseIngredients(text) {
  return String(text || '')
    .split('\n')
    .map(parseIngredient)
    .filter(Boolean)
    .flatMap(splitPair);
}

/** "Salt and pepper" (no amount) is really two ingredients. */
function splitPair(ing) {
  if (ing.quantity !== null) return [ing];
  const m = ing.name.match(/^([a-z]+(?: [a-z]+)?) (?:and|&) ([a-z]+(?: [a-z]+)?)$/i);
  if (!m || /^(half|mac|macaroni|peanut butter)$/i.test(m[1])) return [ing];
  return [
    { ...ing, name: m[1] },
    { ...ing, name: m[2], raw: ing.raw },
  ];
}

export function formatQuantity(q) {
  if (q === null || q === undefined) return '';
  const whole = Math.floor(q + 1e-9);
  const frac = q - whole;
  const fracs = [
    [0, ''], [0.125, '⅛'], [0.25, '¼'], [1 / 3, '⅓'], [0.375, '⅜'], [0.5, '½'],
    [0.625, '⅝'], [2 / 3, '⅔'], [0.75, '¾'], [0.875, '⅞'], [1, ''],
  ];
  let best = fracs[0];
  for (const f of fracs) if (Math.abs(frac - f[0]) < Math.abs(frac - best[0])) best = f;
  if (Math.abs(frac - best[0]) > 0.04) return String(Math.round(q * 100) / 100);
  const w = best[0] === 1 ? whole + 1 : whole;
  if (!w) return best[1] || '0';
  return `${w}${best[1] ? ` ${best[1]}` : ''}`;
}

export function formatAmount(quantity, unit) {
  const q = formatQuantity(quantity);
  if (!q) return unit || '';
  if (!unit) return q;
  const plural = quantity > 1 && !['tsp', 'tbsp', 'oz', 'lb', 'g', 'kg', 'ml', 'l', 'fl oz'].includes(unit);
  const u = plural ? (/(ch|sh|x)$/.test(unit) ? `${unit}es` : `${unit}s`) : unit;
  return `${q} ${u}`;
}

/** Scale an ingredient by a factor (e.g. 2 for doubling). */
export function scaleIngredient(ing, factor) {
  if (ing.quantity === null || ing.quantity === undefined || factor === 1) return ing;
  return { ...ing, quantity: ing.quantity * factor };
}

/**
 * Combine ingredients from several recipes.
 * Input: [{ recipe: 'Tacos', ingredients: [...parsed], factor: 1 }]
 * Output: [{ key, name, amounts: [{quantity, unit}], amountText, recipes: [...] }]
 */
export function combineIngredients(selections) {
  const map = new Map();
  for (const sel of selections) {
    for (const ing0 of sel.ingredients || []) {
      const ing = scaleIngredient(ing0, sel.factor || 1);
      const key = ingredientKey(ing.name);
      if (!key) continue;
      if (!map.has(key)) map.set(key, { key, name: ing.name, amounts: [], recipes: [], unknown: false });
      const entry = map.get(key);
      if (!entry.recipes.includes(sel.recipe)) entry.recipes.push(sel.recipe);
      if (ing.quantity === null || ing.quantity === undefined) {
        entry.unknown = true;
        continue;
      }
      addAmount(entry.amounts, ing.quantity, ing.unit || null);
    }
  }
  return [...map.values()].map((e) => ({
    ...e,
    amountText: e.amounts.map((a) => formatAmount(a.quantity, a.unit)).join(' + '),
  }));
}

function addAmount(amounts, quantity, unit) {
  const def = unit ? UNITS[unit] : null;
  // Same unit: just add.
  const same = amounts.find((a) => a.unit === unit);
  if (same) {
    same.quantity += quantity;
    return;
  }
  // Same family (e.g. tbsp + cup): convert into the existing unit.
  if (def?.family) {
    const other = amounts.find((a) => a.unit && UNITS[a.unit]?.family === def.family);
    if (other) {
      const base = def.family === 'volume' ? 'ml' : 'g';
      other.quantity += (quantity * def[base]) / UNITS[other.unit][base];
      return;
    }
  }
  amounts.push({ quantity, unit });
}
