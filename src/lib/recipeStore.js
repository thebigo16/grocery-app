import { useLive, docsOf } from './useLive.js';
import {
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase.js';
import { parseIngredients } from './ingredients.js';
import { bg } from './groceryStore.js';

export const recipesCol = (hid) => collection(db, 'households', hid, 'recipes');

export function useRecipes(hid) {
  return useLive(
    () => hid && recipesCol(hid),
    (snap) => docsOf(snap).sort((a, b) => (a.title || '').localeCompare(b.title || '')),
    [hid],
  );
}

/** Normalize form fields into the stored shape. */
export function recipeFromForm(form) {
  const ingredientsText = String(form.ingredientsText || '').trim();
  return {
    title: String(form.title || '').trim() || 'Untitled recipe',
    servings: Number(form.servings) > 0 ? Number(form.servings) : null,
    ingredientsText,
    ingredients: parseIngredients(ingredientsText),
    instructions: String(form.instructions || '').trim(),
    sourceUrl: String(form.sourceUrl || '').trim(),
    notes: String(form.notes || '').trim(),
  };
}

/** Save a new recipe; returns its id right away (works offline). */
export function createRecipe(hid, form, by = '') {
  const ref = doc(recipesCol(hid));
  bg(setDoc(ref, { ...recipeFromForm(form), createdAt: serverTimestamp(), addedBy: by }));
  return ref.id;
}

export function saveRecipe(hid, id, form) {
  bg(updateDoc(doc(recipesCol(hid), id), { ...recipeFromForm(form), updatedAt: serverTimestamp() }));
}

export function deleteRecipe(hid, id) {
  bg(deleteDoc(doc(recipesCol(hid), id)));
}
