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

export const itemsCol = (hid) => collection(db, 'households', hid, 'items');
const overridesDoc = (hid) => doc(db, 'households', hid, 'settings', 'categoryOverrides');

/** Live list of grocery items. */
export function useItems(hid) {
  return useLive(() => hid && itemsCol(hid), docsOf, [hid]);
}

/** Live map of item name -> category the household picked by hand. */
export function useCategoryOverrides(hid) {
  return useLive(() => hid && overridesDoc(hid), (snap) => snap.data()?.map || {}, [hid]) || EMPTY;
}
const EMPTY = {};

/**
 * Add items to the list. Skips names already on the list (unchecked) and
 * re-activates names that were checked off. Returns { added, existing }.
 * Each entry: { name, note?, category?, sources? }
 */
export async function addItems(hid, entries, { items = [], overrides = {}, by = '' } = {}) {
  const byKey = new Map(items.map((i) => [i.nameKey, i]));
  // Also match loosely so "Onions" and "onion" land on the same row.
  const byLoose = new Map(items.map((i) => [ingredientKey(i.name), i]));
  const batch = writeBatch(db);
  let added = 0;
  let existing = 0;
  for (const e of entries) {
    const name = String(e.name || '').trim();
    if (!name) continue;
    const nameKey = normalizeName(name);
    const loose = ingredientKey(name);
    const prev = byKey.get(nameKey) || byLoose.get(loose);
    const sources = e.sources || [];
    if (prev) {
      const patch = {};
      if (prev.checked) {
        patch.checked = false;
        patch.checkedAt = null;
      }
      if (prev.checked) {
        if ((prev.note || '') !== (e.note || '')) patch.note = e.note || '';
      } else if (e.note && e.note !== prev.note) {
        patch.note = prev.note ? `${prev.note}; ${e.note}` : e.note;
      }
      const base = prev.checked ? [] : prev.sources || [];
      const newSources = sources.filter((x) => !base.includes(x));
      if (newSources.length || (prev.checked && (prev.sources || []).length)) {
        patch.sources = [...base, ...newSources];
      }
      if (Object.keys(patch).length) {
        batch.update(doc(itemsCol(hid), prev.id), patch);
      }
      if (prev.checked) added += 1;
      else existing += 1;
      continue;
    }
    const ref = doc(itemsCol(hid));
    const item = {
      name,
      nameKey,
      note: e.note || '',
      category: e.category || guessCategory(name, overrides),
      checked: false,
      checkedAt: null,
      createdAt: serverTimestamp(),
      addedBy: by,
      sources,
    };
    batch.set(ref, item);
    byKey.set(nameKey, { id: ref.id, ...item });
    byLoose.set(loose, { id: ref.id, ...item });
    added += 1;
  }
  // Don't wait for the server: offline, the write is queued and the local
  // listener updates right away.
  batch.commit().catch((e) => console.error('addItems', e));
  return { added, existing };
}

export function toggleItem(hid, item) {
  return bg(updateDoc(doc(itemsCol(hid), item.id), {
    checked: !item.checked,
    checkedAt: item.checked ? null : serverTimestamp(),
  }));
}

export function updateItem(hid, item, patch) {
  const full = { ...patch };
  if (patch.name) full.nameKey = normalizeName(patch.name);
  bg(updateDoc(doc(itemsCol(hid), item.id), full));
  if (patch.category && patch.category !== item.category) {
    // Remember the choice so the same item lands in the same group next time.
    const key = normalizeName(patch.name || item.name);
    bg(setDoc(overridesDoc(hid), { map: { [key]: patch.category } }, { merge: true }));
  }
}

export function deleteItem(hid, item) {
  bg(deleteDoc(doc(itemsCol(hid), item.id)));
}

export function clearItems(hid, items) {
  // Firestore batches are limited to 500 writes.
  for (let i = 0; i < items.length; i += 450) {
    const batch = writeBatch(db);
    for (const it of items.slice(i, i + 450)) batch.delete(doc(itemsCol(hid), it.id));
    bg(batch.commit());
  }
}

/**
 * Firestore applies writes locally at once but only resolves the promise when
 * the server confirms, which never happens while offline. Fire and forget.
 */
export function bg(promise) {
  promise.catch((e) => console.error('Sync error', e));
}
