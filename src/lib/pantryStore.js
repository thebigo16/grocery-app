import { useLive, docsOf } from './useLive.js';
import {
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase.js';
import { guessCategory, normalizeName } from './categories.js';
import { ingredientKey } from './ingredients.js';
import { addItems, bg } from './groceryStore.js';

export const pantryCol = (hid) => collection(db, 'households', hid, 'pantry');

export const STARTER_STAPLES = [
  'Olive oil', 'Vegetable oil', 'Cooking spray', 'Kosher salt', 'Black pepper', 'Garlic powder',
  'Onion powder', 'Paprika', 'Cumin', 'Chili powder', 'Dried oregano', 'Italian seasoning',
  'Red pepper flakes', 'Cinnamon', 'All-purpose flour', 'Sugar', 'Brown sugar', 'Baking soda',
  'Baking powder', 'Vanilla extract', 'Honey', 'Rice', 'Pasta', 'Chicken broth', 'Soy sauce',
  'White vinegar', 'Balsamic vinegar', 'Ketchup', 'Mustard', 'Mayonnaise', 'Hot sauce',
  'Peanut butter', 'Canned tomatoes', 'Coffee', 'Paper towels', 'Aluminum foil', 'Dish soap',
  'Trash bags',
];

export const STATUSES = [
  { id: 'have', label: 'Have' },
  { id: 'low', label: 'Low' },
  { id: 'out', label: 'Out' },
];

export function usePantry(hid) {
  return useLive(() => hid && pantryCol(hid), docsOf, [hid]);
}

export async function addStaples(hid, names, existing = [], overrides = {}) {
  const have = new Set(existing.map((p) => p.nameKey));
  const batch = writeBatch(db);
  let n = 0;
  for (const raw of names) {
    const name = raw.trim();
    const nameKey = normalizeName(name);
    if (!name || have.has(nameKey)) continue;
    have.add(nameKey);
    batch.set(doc(pantryCol(hid)), {
      name,
      nameKey,
      matchKey: ingredientKey(name),
      category: guessCategory(name, overrides),
      status: 'have',
      updatedAt: serverTimestamp(),
    });
    n += 1;
  }
  if (n) bg(batch.commit());
  return n;
}

/**
 * Change a staple's status. Low/Out puts it on the grocery list.
 */
export async function setStapleStatus(hid, staple, status, { groceryItems = [], overrides = {}, by = '' } = {}) {
  bg(updateDoc(doc(pantryCol(hid), staple.id), { status, updatedAt: serverTimestamp() }));
  if (status === 'low' || status === 'out') {
    await addItems(
      hid,
      [{ name: staple.name, category: staple.category, note: status === 'low' ? 'running low' : 'out' }],
      { items: groceryItems, overrides, by },
    );
  }
}

export function deleteStaple(hid, staple) {
  bg(deleteDoc(doc(pantryCol(hid), staple.id)));
}

export function renameStaple(hid, staple, name) {
  bg(updateDoc(doc(pantryCol(hid), staple.id), {
    name,
    nameKey: normalizeName(name),
    matchKey: ingredientKey(name),
  }));
}

/** When a grocery item is checked off, a matching low/out staple is restocked. */
export function restockIfStaple(hid, pantry, item) {
  const staple = (pantry || []).find((p) => p.nameKey === item.nameKey);
  if (staple && staple.status && staple.status !== 'have') {
    bg(updateDoc(doc(pantryCol(hid), staple.id), { status: 'have', updatedAt: serverTimestamp() }));
  }
}

/** Find the pantry staple that covers an ingredient or grocery item name. */
export function findStaple(pantry, name) {
  if (!pantry?.length) return null;
  const key = ingredientKey(name);
  const nk = normalizeName(name);
  let best = null;
  for (const p of pantry) {
    const mk = p.matchKey || ingredientKey(p.name);
    if (mk === key || p.nameKey === nk) return p;
    // "extra-virgin olive oil" is covered by "olive oil"; "salt" by "kosher salt".
    const re = new RegExp(`(^|\\s)${mk.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s|$)`);
    if (re.test(key) || new RegExp(`(^|\\s)${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`).test(mk)) {
      if (!best || mk.length > (best.matchKey || '').length) best = p;
    }
  }
  return best;
}

/* ---------- Sections the household makes for its own pantry ---------- */

const sectionsDoc = (hid) => doc(db, 'households', hid, 'settings', 'pantrySections');

/** Live, ordered list of sections: [{ id, name }]. Staples point at one with `section`. */
export function usePantrySections(hid) {
  return useLive(() => hid && sectionsDoc(hid), (snap) => snap.data()?.list || [], [hid]);
}

export function saveSections(hid, list) {
  bg(setDoc(sectionsDoc(hid), { list }));
}

export const newSectionId = () => Math.random().toString(36).slice(2, 10);

export function setStapleSection(hid, staple, sectionId) {
  bg(updateDoc(doc(pantryCol(hid), staple.id), { section: sectionId || null }));
}

/** Delete a section; its staples go back to "Not in a section". */
export function deleteSection(hid, sections, pantry, sectionId) {
  saveSections(hid, sections.filter((x) => x.id !== sectionId));
  const batch = writeBatch(db);
  let n = 0;
  for (const p of pantry || []) {
    if (p.section === sectionId) {
      batch.update(doc(pantryCol(hid), p.id), { section: null });
      n += 1;
    }
  }
  if (n) bg(batch.commit());
}
