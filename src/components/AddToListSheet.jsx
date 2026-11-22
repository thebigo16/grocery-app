import { useMemo, useState } from 'react';
import { combineIngredients } from '../lib/ingredients.js';
import { addItems, useCategoryOverrides, useItems } from '../lib/groceryStore.js';
import { findStaple, usePantry } from '../lib/pantryStore.js';

const firstName = (u) => (u.displayName || u.email || '').split(/[ @]/)[0];

/** Clean up an ingredient name for the grocery list ("large yellow onions" -> "Yellow onions"). */
function listName(name) {
  const n = name
    .replace(/\b(large|medium|small|fresh|freshly|good[- ]quality)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  return n.charAt(0).toUpperCase() + n.slice(1);
}

/**
 * Review screen: combined ingredients from the selected recipes, with
 * pantry staples you already have unticked.
 * selections: [{ recipe, factor }]
 */
export default function AddToListSheet({ household, user, selections, onClose }) {
  const hid = household.id;
  const pantry = usePantry(hid);
  const items = useItems(hid);
  const overrides = useCategoryOverrides(hid);

  const rows = useMemo(() => {
    const combined = combineIngredients(
      selections.map((s) => ({ recipe: s.recipe.title, ingredients: s.recipe.ingredients || [], factor: s.factor })),
    );
    return combined.map((c) => {
      const staple = findStaple(pantry, c.name);
      const onList = (items || []).some((i) => !i.checked && i.nameKey && i.nameKey === c.key);
      return { ...c, staple, onList };
    });
  }, [selections, pantry, items]);

  // Default: skip staples we have; include everything else.
  const [skipped, setSkipped] = useState(null);
  const skip =
    skipped ||
    new Set(rows.filter((r) => r.staple && (r.staple.status || 'have') === 'have').map((r) => r.key));

  const toggle = (key) => {
    const next = new Set(skip);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSkipped(next);
  };

  const chosen = rows.filter((r) => !skip.has(r.key));
  const fromPantry = rows.filter((r) => r.staple);
  const toBuy = rows.filter((r) => !r.staple);

  const add = async () => {
    await addItems(
      hid,
      chosen.map((r) => ({
        name: r.staple ? r.staple.name : listName(r.name),
        note: r.amountText,
        sources: r.recipes,
        category: r.staple?.category,
      })),
      { items: items || [], overrides, by: firstName(user) },
    );
    onClose(true);
  };

  const Row = ({ r }) => (
    <li className={`row ${skip.has(r.key) ? 'skipped' : ''}`}>
      <button className="check" aria-pressed={!skip.has(r.key)} onClick={() => toggle(r.key)}>
        {skip.has(r.key) ? '' : '✓'}
      </button>
      <button className="row-body" onClick={() => toggle(r.key)}>
        <span className="name">{r.staple ? r.staple.name : listName(r.name)}</span>
        <span className="sub">
          {[
            r.amountText,
            r.staple ? `pantry: ${r.staple.status || 'have'}` : '',
            r.onList ? 'already on list' : '',
            selections.length > 1 ? r.recipes.join(', ') : '',
          ]
            .filter(Boolean)
            .join(' · ')}
        </span>
      </button>
    </li>
  );

  return (
    <div className="sheet-backdrop" onClick={() => onClose(false)}>
      <div className="sheet tall" onClick={(e) => e.stopPropagation()}>
        <h2>Add to grocery list</h2>
        <p className="muted small">
          {selections.map((s) => s.recipe.title).join(', ')}. Untick anything you already have.
        </p>
        <div className="sheet-scroll">
          {toBuy.length > 0 && (
            <div className="group">
              <h3>To buy</h3>
              <ul>{toBuy.map((r) => <Row key={r.key} r={r} />)}</ul>
            </div>
          )}
          {fromPantry.length > 0 && (
            <div className="group">
              <h3>From your pantry</h3>
              <ul>{fromPantry.map((r) => <Row key={r.key} r={r} />)}</ul>
            </div>
          )}
          {rows.length === 0 && <p className="muted">These recipes have no ingredients yet.</p>}
        </div>
        <div className="row-actions">
          <button className="btn" onClick={() => onClose(false)}>Cancel</button>
          <span className="spacer" />
          <button className="btn primary" disabled={!chosen.length} onClick={add}>
            Add {chosen.length} item{chosen.length === 1 ? '' : 's'}
          </button>
        </div>
      </div>
    </div>
  );
}
