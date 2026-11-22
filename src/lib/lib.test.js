import test from 'node:test';
import assert from 'node:assert/strict';
import { guessCategory } from './categories.js';
import { parseIngredient, parseIngredients, combineIngredients, ingredientKey, formatAmount } from './ingredients.js';

test('categories', () => {
  const cases = {
    'Bananas': 'produce', 'peanut butter': 'pantry', 'butter': 'dairy', 'Chicken thighs': 'meat',
    'olive oil': 'baking', 'coconut milk': 'canned', 'paper towels': 'household', 'frozen peas': 'frozen',
    'sourdough bread': 'bakery', 'Greek yogurt': 'dairy', 'soy sauce': 'condiments', 'eggs': 'dairy',
    'cumin': 'baking', 'chicken broth': 'canned', 'ice cream': 'frozen', 'toothpaste': 'personal',
    'xyzzy': 'other', 'sweet potatoes': 'produce', 'black pepper': 'baking', 'red bell pepper': 'produce',
    'garlic powder': 'baking', 'garlic': 'produce', 'oat milk': 'dairy', 'tortilla chips': 'pantry',
  };
  for (const [name, cat] of Object.entries(cases)) assert.equal(guessCategory(name), cat, name);
  assert.equal(guessCategory('Bananas', { bananas: 'snacks' }), 'snacks');
});

test('parseIngredient', () => {
  const p = (s) => { const r = parseIngredient(s); return [r.quantity, r.unit, r.name, r.note]; };
  assert.deepEqual(p('2 1/2 cups all-purpose flour, sifted'), [2.5, 'cup', 'all-purpose flour', 'sifted']);
  assert.deepEqual(p('1 large onion, diced'), [1, null, 'large onion', 'diced']);
  assert.deepEqual(p('½ tsp kosher salt'), [0.5, 'tsp', 'kosher salt', '']);
  assert.deepEqual(p('3 cloves garlic, minced'), [3, 'clove', 'garlic', 'minced']);
  assert.deepEqual(p('1 (14.5 oz) can diced tomatoes'), [1, 'can', 'diced tomatoes', '14.5 oz']);
  assert.deepEqual(p('Salt and pepper to taste'), [null, null, 'Salt and pepper', 'to taste']);
  assert.deepEqual(p('2 Tbsp olive oil'), [2, 'tbsp', 'olive oil', '']);
  assert.deepEqual(p('1-2 jalapeños'), [2, null, 'jalapeños', '']);
  assert.deepEqual(p('1 lb ground beef'), [1, 'lb', 'ground beef', '']);
  assert.deepEqual(p('4 tablespoons unsalted butter (softened)'), [4, 'tbsp', 'unsalted butter', 'softened']);
  assert.deepEqual(p('1½ cups milk'), [1.5, 'cup', 'milk', '']);
  assert.deepEqual(p('2 eggs'), [2, null, 'eggs', '']);
  assert.deepEqual(p('1 cup of sugar'), [1, 'cup', 'sugar', '']);
});

test('ingredientKey', () => {
  assert.equal(ingredientKey('Onions'), ingredientKey('large onion'));
  assert.equal(ingredientKey('tomatoes'), 'tomato');
  assert.equal(ingredientKey('extra-virgin olive oil'), 'olive oil');
});

test('combine', () => {
  const a = ['1 onion', '2 tbsp olive oil', '1 cup rice'].map(parseIngredient);
  const b = ['2 onions', '1/4 cup olive oil', 'salt'].map(parseIngredient);
  const out = combineIngredients([{ recipe: 'A', ingredients: a }, { recipe: 'B', ingredients: b, factor: 2 }]);
  const by = Object.fromEntries(out.map((o) => [o.key, o]));
  assert.equal(by.onion.amountText, '5');
  assert.deepEqual(by.onion.recipes, ['A', 'B']);
  assert.equal(by['olive oil'].amountText, '10 tbsp');
  assert.equal(by.salt.amountText, '');
  assert.equal(formatAmount(2, 'cup'), '2 cups');
  assert.equal(formatAmount(0.333333, 'cup'), '⅓ cup');
});

test('pairs', () => {
  assert.deepEqual(parseIngredients('Salt and pepper to taste').map((i) => i.name), ['Salt', 'pepper']);
  assert.deepEqual(parseIngredients('1 cup half and half').map((i) => i.name), ['half and half']);
});
