import { useMemo, useState } from 'react';
import { useRecipes, createRecipe, saveRecipe, deleteRecipe } from '../lib/recipeStore.js';
import { formatAmount } from '../lib/ingredients.js';
import RecipeImport from './RecipeImport.jsx';
import AddToListSheet from './AddToListSheet.jsx';

const firstName = (u) => (u.displayName || u.email || '').split(/[ @]/)[0];

export default function Recipes({ household, user }) {
  const hid = household.id;
  const recipes = useRecipes(hid);
  const [view, setView] = useState({ name: 'list' });
  const [plan, setPlan] = useState({}); // recipeId -> factor
  const [search, setSearch] = useState('');
  const [review, setReview] = useState(null); // [{recipe, factor}]

  const byId = useMemo(() => Object.fromEntries((recipes || []).map((r) => [r.id, r])), [recipes]);
  const planned = Object.entries(plan)
    .filter(([id]) => byId[id])
    .map(([id, factor]) => ({ recipe: byId[id], factor }));

  if (view.name === 'edit') {
    return (
      <RecipeEditor
        recipe={view.id ? byId[view.id] : view.draft || null}
        onCancel={() => setView(view.id ? { name: 'detail', id: view.id } : { name: 'list' })}
        onSave={(form) => {
          if (view.id) {
            saveRecipe(hid, view.id, form);
            setView({ name: 'detail', id: view.id });
          } else {
            const id = createRecipe(hid, form, firstName(user));
            setView({ name: 'detail', id });
          }
        }}
      />
    );
  }

  if (view.name === 'detail' && byId[view.id]) {
    return (
      <>
        <RecipeDetail
          recipe={byId[view.id]}
          onBack={() => setView({ name: 'list' })}
          onEdit={() => setView({ name: 'edit', id: view.id })}
          onDelete={() => {
            if (!window.confirm(`Delete “${byId[view.id].title}”?`)) return;
            deleteRecipe(hid, view.id);
            setView({ name: 'list' });
          }}
          onAddToList={(factor) => setReview([{ recipe: byId[view.id], factor }])}
        />
        {review && (
          <AddToListSheet household={household} user={user} selections={review} onClose={() => setReview(null)} />
        )}
      </>
    );
  }

  if (view.name === 'import') {
    return (
      <RecipeImport
        onCancel={() => setView({ name: 'list' })}
        onImported={(draft) => setView({ name: 'edit', draft })}
      />
    );
  }

  const q = search.trim().toLowerCase();
  const shown = (recipes || []).filter(
    (r) => !q || r.title.toLowerCase().includes(q) || (r.ingredientsText || '').toLowerCase().includes(q),
  );

  return (
    <section className={planned.length ? 'has-plan-bar' : ''}>
      <div className="add-bar">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search recipes or ingredients"
          aria-label="Search recipes"
        />
      </div>
      <div className="button-row">
        <button className="btn primary" onClick={() => setView({ name: 'import' })}>📷 Photo or link</button>
        <button className="btn" onClick={() => setView({ name: 'edit' })}>✏️ Type it in</button>
      </div>

      {recipes && recipes.length === 0 && (
        <div className="empty">
          <p>No recipes yet.</p>
          <p className="muted small">
            Snap a cookbook page, paste a recipe link, or type one in. Then tick the recipes you’re making this
            week and add their ingredients to the list in one go.
          </p>
        </div>
      )}

      {recipes && recipes.length > 0 && (
        <p className="muted small intro">Tick the recipes you’re making, then add them to the list together.</p>
      )}

      <ul className="recipe-list">
        {shown.map((r) => {
          const on = plan[r.id] !== undefined;
          return (
            <li key={r.id} className={`recipe-card ${on ? 'on' : ''}`}>
              <button
                className="check"
                aria-pressed={on}
                aria-label={on ? `Remove ${r.title} from plan` : `Plan ${r.title}`}
                onClick={() =>
                  setPlan((p) => {
                    const n = { ...p };
                    if (on) delete n[r.id];
                    else n[r.id] = 1;
                    return n;
                  })
                }
              >
                {on ? '✓' : ''}
              </button>
              <button className="row-body" onClick={() => setView({ name: 'detail', id: r.id })}>
                <span className="name">{r.title}</span>
                <span className="sub">
                  {r.ingredients?.length || 0} ingredients
                  {r.servings ? ` · serves ${r.servings}` : ''}
                </span>
              </button>
              {on && (
                <Servings
                  base={r.servings}
                  factor={plan[r.id]}
                  onChange={(f) => setPlan((p) => ({ ...p, [r.id]: f }))}
                />
              )}
            </li>
          );
        })}
      </ul>

      {planned.length > 0 && (
        <div className="plan-bar">
          <button className="link" onClick={() => setPlan({})}>Clear</button>
          <button className="btn primary" onClick={() => setReview(planned)}>
            Add {planned.length} recipe{planned.length > 1 ? 's' : ''} to list
          </button>
        </div>
      )}

      {review && (
        <AddToListSheet
          household={household}
          user={user}
          selections={review}
          onClose={(added) => {
            setReview(null);
            if (added) setPlan({});
          }}
        />
      )}
    </section>
  );
}

/** Servings stepper. With a known base it shows servings; otherwise a multiplier. */
export function Servings({ base, factor, onChange }) {
  if (base) {
    const servings = Math.round(base * factor * 2) / 2;
    const step = (d) => {
      const next = Math.max(1, servings + d);
      onChange(next / base);
    };
    return (
      <div className="stepper" aria-label="Servings">
        <button onClick={() => step(-1)} aria-label="Fewer servings">−</button>
        <span>{servings} serv.</span>
        <button onClick={() => step(1)} aria-label="More servings">+</button>
      </div>
    );
  }
  const step = (d) => onChange(Math.max(0.5, Math.round((factor + d) * 2) / 2));
  return (
    <div className="stepper" aria-label="Recipe multiplier">
      <button onClick={() => step(-0.5)} aria-label="Smaller batch">−</button>
      <span>×{factor}</span>
      <button onClick={() => step(0.5)} aria-label="Bigger batch">+</button>
    </div>
  );
}

function RecipeDetail({ recipe, onBack, onEdit, onDelete, onAddToList }) {
  const [factor, setFactor] = useState(1);
  return (
    <section className="recipe-detail">
      <div className="detail-top">
        <button className="link" onClick={onBack}>‹ Recipes</button>
        <span className="spacer" />
        <button className="link" onClick={onEdit}>Edit</button>
      </div>
      <h2>{recipe.title}</h2>
      {recipe.sourceUrl && (
        <a className="small" href={recipe.sourceUrl} target="_blank" rel="noreferrer">
          {safeHost(recipe.sourceUrl)} ↗
        </a>
      )}

      <div className="add-row">
        <Servings base={recipe.servings} factor={factor} onChange={setFactor} />
        <button className="btn primary" onClick={() => onAddToList(factor)}>Add to grocery list</button>
      </div>

      <h3>Ingredients</h3>
      <ul className="ingredients">
        {(recipe.ingredients || []).map((ing, i) => (
          <li key={i}>
            {ing.quantity != null && factor !== 1 ? (
              <>
                <b>{formatAmount(ing.quantity * factor, ing.unit)}</b> {ing.name}
                {ing.note ? <span className="muted">, {ing.note}</span> : null}
              </>
            ) : (
              ing.raw
            )}
          </li>
        ))}
      </ul>

      {recipe.instructions && (
        <>
          <h3>Steps</h3>
          <ol className="steps">
            {recipe.instructions
              .split(/\n+/)
              .map((s) => s.replace(/^\s*(\d+[.)]|step \d+:?)\s*/i, '').trim())
              .filter(Boolean)
              .map((s, i) => (
                <li key={i}>{s}</li>
              ))}
          </ol>
        </>
      )}
      {recipe.notes && (
        <>
          <h3>Notes</h3>
          <p className="pre">{recipe.notes}</p>
        </>
      )}
      <div className="footer-actions">
        <button className="btn subtle danger" onClick={onDelete}>Delete recipe</button>
      </div>
    </section>
  );
}

function safeHost(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function RecipeEditor({ recipe, onCancel, onSave }) {
  const [form, setForm] = useState(() => ({
    title: recipe?.title || '',
    servings: recipe?.servings || '',
    ingredientsText:
      recipe?.ingredientsText || (recipe?.ingredients || []).map((i) => i.raw).join('\n') || '',
    instructions: recipe?.instructions || '',
    sourceUrl: recipe?.sourceUrl || '',
    notes: recipe?.notes || '',
  }));
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <form
      className="stack recipe-editor"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(form);
      }}
    >
      <div className="detail-top">
        <button type="button" className="link" onClick={onCancel}>Cancel</button>
        <span className="spacer" />
        <button className="btn primary">Save</button>
      </div>
      {recipe?.importWarning && <p className="info">{recipe.importWarning}</p>}
      <label>
        Title
        <input value={form.title} onChange={set('title')} placeholder="Weeknight chicken tacos" required />
      </label>
      <label>
        Serves
        <input type="number" min="1" inputMode="numeric" value={form.servings} onChange={set('servings')} placeholder="4" />
      </label>
      <label>
        Ingredients <span className="muted small">(one per line)</span>
        <textarea
          rows={10}
          value={form.ingredientsText}
          onChange={set('ingredientsText')}
          placeholder={'1 lb chicken thighs\n2 tbsp olive oil\n1 onion, diced\n8 corn tortillas'}
        />
      </label>
      <label>
        Steps
        <textarea rows={8} value={form.instructions} onChange={set('instructions')} />
      </label>
      <label>
        Link <span className="muted small">(optional)</span>
        <input type="url" value={form.sourceUrl} onChange={set('sourceUrl')} placeholder="https://" />
      </label>
      <label>
        Notes <span className="muted small">(optional)</span>
        <textarea rows={3} value={form.notes} onChange={set('notes')} />
      </label>
    </form>
  );
}
