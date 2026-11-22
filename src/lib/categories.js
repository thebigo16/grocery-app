// Grocery categories, in a typical walk-through-the-store order.
export const CATEGORIES = [
  { id: 'produce', label: 'Produce', emoji: '🥬' },
  { id: 'meat', label: 'Meat & Seafood', emoji: '🥩' },
  { id: 'dairy', label: 'Dairy & Eggs', emoji: '🥛' },
  { id: 'bakery', label: 'Bakery & Bread', emoji: '🍞' },
  { id: 'deli', label: 'Deli & Prepared', emoji: '🥪' },
  { id: 'pantry', label: 'Pantry & Dry Goods', emoji: '🍝' },
  { id: 'baking', label: 'Baking, Oils & Spices', emoji: '🧂' },
  { id: 'canned', label: 'Canned & Jarred', emoji: '🥫' },
  { id: 'condiments', label: 'Condiments & Sauces', emoji: '🍯' },
  { id: 'breakfast', label: 'Breakfast & Cereal', emoji: '🥣' },
  { id: 'snacks', label: 'Snacks', emoji: '🍿' },
  { id: 'frozen', label: 'Frozen', emoji: '🧊' },
  { id: 'beverages', label: 'Beverages', emoji: '🧃' },
  { id: 'household', label: 'Household & Cleaning', emoji: '🧻' },
  { id: 'personal', label: 'Personal Care', emoji: '🧴' },
  { id: 'baby', label: 'Baby & Pets', emoji: '🐾' },
  { id: 'other', label: 'Other', emoji: '🛒' },
];

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id);
export const categoryById = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));

// Keywords per category. Longest matching keyword wins, so
// "peanut butter" (pantry) beats "butter" (dairy).
const KEYWORDS = {
  produce: [
    'apple', 'banana', 'orange', 'lemon', 'lime', 'grape', 'berry', 'berries', 'strawberr', 'blueberr',
    'raspberr', 'blackberr', 'cherr', 'peach', 'pear', 'plum', 'mango', 'pineapple', 'melon', 'watermelon',
    'cantaloupe', 'kiwi', 'avocado', 'tomato', 'potato', 'sweet potato', 'yam', 'onion', 'shallot', 'garlic',
    'ginger', 'carrot', 'celery', 'cucumber', 'zucchini', 'squash', 'pumpkin', 'pepper', 'bell pepper',
    'jalapeno', 'jalapeño', 'chile', 'chili pepper', 'lettuce', 'romaine', 'spinach', 'kale', 'arugula',
    'cabbage', 'broccoli', 'broccolini', 'cauliflower', 'brussels', 'asparagus', 'green bean', 'pea', 'snap pea',
    'corn on the cob', 'ear of corn', 'mushroom', 'eggplant', 'radish', 'beet', 'turnip', 'parsnip', 'leek',
    'scallion', 'green onion', 'herb', 'cilantro', 'parsley', 'basil', 'mint', 'dill', 'rosemary', 'thyme',
    'sage', 'chive', 'fennel', 'bok choy', 'salad', 'sprout', 'fruit', 'veggie', 'vegetable', 'grapefruit',
    'clementine', 'nectarine', 'apricot', 'fig', 'pomegranate', 'cranberr', 'okra', 'artichoke', 'tomatillo',
    'lemongrass', 'microgreen', 'coleslaw mix', 'butternut',
  ],
  meat: [
    'chicken', 'beef', 'steak', 'ground beef', 'ground turkey', 'pork', 'bacon', 'sausage', 'ham', 'turkey',
    'lamb', 'veal', 'ribs', 'brisket', 'chop', 'tenderloin', 'roast', 'fish', 'salmon', 'tuna steak', 'cod',
    'tilapia', 'halibut', 'shrimp', 'prawn', 'scallop', 'crab', 'lobster', 'clam', 'mussel', 'oyster',
    'chorizo', 'meatball', 'drumstick', 'thigh', 'breast', 'wings', 'mahi', 'trout', 'duck', 'pancetta',
    'prosciutto', 'hot dog', 'bratwurst',
  ],
  dairy: [
    'milk', 'butter', 'cheese', 'cheddar', 'mozzarella', 'parmesan', 'parmigiano', 'feta', 'ricotta',
    'brie', 'gouda', 'swiss', 'provolone', 'monterey jack', 'cream cheese', 'sour cream', 'heavy cream',
    'whipping cream', 'half and half', 'half & half', 'cream', 'yogurt', 'yoghurt', 'egg', 'eggs',
    'cottage cheese', 'creme fraiche', 'crème fraîche', 'mascarpone', 'goat cheese', 'kefir', 'ghee',
    'creamer', 'string cheese', 'oat milk', 'almond milk',
  ],
  bakery: [
    'bread', 'bagel', 'bun', 'buns', 'roll', 'rolls', 'baguette', 'croissant', 'muffin', 'tortilla',
    'pita', 'naan', 'english muffin', 'sourdough', 'brioche', 'ciabatta', 'flatbread', 'cake', 'donut',
    'doughnut', 'pie crust', 'wrap', 'wraps',
  ],
  deli: ['deli', 'rotisserie', 'hummus', 'salami', 'pepperoni', 'lunch meat', 'sliced turkey', 'pesto', 'guacamole', 'salsa fresca'],
  pantry: [
    'pasta', 'spaghetti', 'penne', 'macaroni', 'noodle', 'lasagna', 'rice', 'quinoa', 'couscous', 'oats',
    'oatmeal', 'lentil', 'dried bean', 'barley', 'farro', 'bulgur', 'breadcrumb', 'panko', 'cracker',
    'peanut butter', 'almond butter', 'nut butter', 'jelly', 'jam', 'nuts', 'almonds', 'walnut', 'pecan',
    'cashew', 'pistachio', 'peanut', 'seed', 'chia', 'flax', 'raisin', 'dried fruit', 'ramen', 'orzo',
    'polenta', 'grits', 'stuffing', 'mac and cheese', 'tortilla chip', 'taco shell', 'nutella', 'gnocchi',
  ],
  baking: [
    'flour', 'sugar', 'brown sugar', 'powdered sugar', 'baking soda', 'baking powder', 'yeast', 'vanilla',
    'cocoa', 'chocolate chip', 'cornstarch', 'corn starch', 'cornmeal', 'oil', 'olive oil', 'vegetable oil',
    'canola oil', 'sesame oil', 'coconut oil', 'avocado oil', 'cooking spray', 'shortening', 'salt',
    'kosher salt', 'black pepper', 'peppercorn', 'cumin', 'paprika', 'smoked paprika', 'chili powder',
    'cinnamon', 'nutmeg', 'oregano', 'garlic powder', 'onion powder', 'cayenne', 'turmeric', 'curry powder',
    'coriander', 'bay leaf', 'bay leaves', 'red pepper flake', 'italian seasoning', 'seasoning', 'spice',
    'allspice', 'cloves', 'cardamom', 'garam masala', 'dried thyme', 'dried oregano', 'dried basil',
    'molasses', 'gelatin', 'sprinkles', 'food coloring', 'extract', 'honey', 'maple syrup', 'agave',
    'cream of tartar', 'mustard seed', 'sesame seed', 'everything bagel seasoning', 'old bay', 'za\'atar',
  ],
  canned: [
    'canned', 'can of', 'tomato paste', 'tomato sauce', 'crushed tomato', 'diced tomato', 'whole tomato',
    'san marzano', 'black beans', 'kidney beans', 'chickpea', 'garbanzo', 'cannellini', 'pinto', 'refried',
    'broth', 'stock', 'bouillon', 'soup', 'coconut milk', 'tuna', 'sardine', 'anchov', 'olive', 'olives',
    'pickle', 'capers', 'artichoke heart', 'roasted red pepper', 'pumpkin puree', 'evaporated milk',
    'condensed milk', 'marinara', 'pasta sauce', 'enchilada sauce', 'green chile', 'chipotle',
  ],
  condiments: [
    'ketchup', 'mustard', 'dijon', 'mayo', 'mayonnaise', 'soy sauce', 'tamari', 'fish sauce',
    'worcestershire', 'hot sauce', 'sriracha', 'vinegar', 'balsamic', 'bbq sauce', 'barbecue sauce',
    'dressing', 'ranch', 'salsa', 'hoisin', 'oyster sauce', 'teriyaki', 'tahini', 'miso', 'gochujang',
    'harissa', 'relish', 'horseradish', 'mirin', 'sambal', 'chili crisp', 'curry paste',
  ],
  breakfast: ['cereal', 'granola', 'pancake mix', 'waffle', 'syrup', 'pop tart', 'breakfast bar', 'oatmeal packet'],
  snacks: [
    'chips', 'pretzel', 'popcorn', 'cookie', 'cookies', 'candy', 'chocolate', 'granola bar', 'protein bar',
    'trail mix', 'fruit snack', 'goldfish', 'rice cake', 'jerky', 'snack',
  ],
  frozen: [
    'frozen', 'ice cream', 'popsicle', 'pizza', 'frozen pea', 'frozen corn', 'frozen berries', 'tater tot',
    'fries', 'french fries', 'waffles', 'ice', 'sorbet', 'gelato', 'edamame', 'dumpling', 'pot sticker',
    'potsticker',
  ],
  beverages: [
    'water', 'sparkling water', 'seltzer', 'soda', 'juice', 'coffee', 'tea', 'beer', 'wine', 'kombucha',
    'lemonade', 'gatorade', 'sports drink', 'energy drink', 'la croix', 'coke', 'sprite', 'espresso',
    'cold brew', 'liquor', 'vodka', 'whiskey', 'bourbon', 'gin', 'rum', 'tequila',
  ],
  household: [
    'paper towel', 'toilet paper', 'tissue', 'napkin', 'trash bag', 'garbage bag', 'foil', 'aluminum foil',
    'plastic wrap', 'parchment', 'zip', 'ziploc', 'sandwich bag', 'dish soap', 'dishwasher', 'detergent',
    'laundry', 'fabric softener', 'dryer sheet', 'bleach', 'cleaner', 'sponge', 'lysol', 'wipes',
    'light bulb', 'battery', 'batteries', 'candle', 'windex', 'swiffer', 'trash', 'cling wrap',
  ],
  personal: [
    'shampoo', 'conditioner', 'soap', 'body wash', 'toothpaste', 'toothbrush', 'floss', 'mouthwash',
    'deodorant', 'razor', 'shaving', 'lotion', 'sunscreen', 'tylenol', 'advil', 'ibuprofen', 'vitamin',
    'band-aid', 'bandage', 'cotton', 'q-tip', 'tampon', 'pad', 'contact solution', 'lip balm', 'chapstick',
    'medicine', 'allergy',
  ],
  baby: ['diaper', 'baby', 'formula', 'dog food', 'cat food', 'cat litter', 'litter', 'pet', 'treats', 'wipes baby'],
};

// Build a list of [keyword, category] sorted by keyword length descending.
const KEYWORD_LIST = Object.entries(KEYWORDS)
  .flatMap(([cat, words]) => words.map((w) => [w.toLowerCase(), cat]))
  .sort((a, b) => b[0].length - a[0].length);

export function normalizeName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}&'\- ]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const KEYWORD_RES = KEYWORD_LIST.map(([kw, cat]) => [
  // Match at a word start; allow plural / suffixes after the keyword.
  new RegExp(`(^|[^\\p{L}])${escapeRe(kw)}`, 'u'),
  cat,
  kw,
]);

/**
 * Guess a category for a grocery item name.
 * `overrides` is a map of normalized name -> category the household has chosen before.
 */
export function guessCategory(name, overrides = {}) {
  const n = normalizeName(name);
  if (!n) return 'other';
  if (overrides[n]) return overrides[n];
  if (/^(frozen)\b/.test(n)) return 'frozen';
  if (/^(canned|can of|tinned)\b/.test(n)) return 'canned';
  // English puts the main noun last ("chicken broth" is broth), so prefer the
  // keyword that ends in the latest word; break ties with the longest keyword.
  let best = null;
  for (const [re, cat, kw] of KEYWORD_RES) {
    const m = re.exec(n);
    if (!m) continue;
    let end = m.index + m[0].length;
    const space = n.indexOf(' ', end);
    end = space === -1 ? n.length : space;
    if (!best || end > best.end || (end === best.end && kw.length > best.len)) {
      best = { end, len: kw.length, cat };
    }
  }
  if (best) return best.cat;
  return 'other';
}
