import { useMemo, useState } from 'react';
import { CATEGORIES, categoryById } from '../lib/categories.js';
import { useCategoryOverrides, useItems } from '../lib/groceryStore.js';
import {
  STARTER_STAPLES,
  STATUSES,
  addStaples,
  deleteStaple,
  renameStaple,
  setStapleStatus,
  usePantry,
} from '../lib/pantryStore.js';
import PantryScan from './PantryScan.jsx';

const firstName = (u) => (u.displayName || u.email || '').split(/[ @]/)[0];

export default function Pantry({ household, user }) {
  const hid = household.id;
  const pantry = usePantry(hid);
  const groceryItems = useItems(hid);
  const overrides = useCategoryOverrides(hid);
  const [text, setText] = useState('');
  const [filter, setFilter] = useState('all');
  const [editing, setEditing] = useState(null);
  const [toast, setToast] = useState('');
  const [scanning, setScanning] = useState(false);

  const counts = useMemo(() => {
    const c = { all: 0, have: 0, low: 0, out: 0 };
    for (const p of pantry || []) {
      c.all += 1;
      c[p.status || 'have'] += 1;
    }
    return c;
  }, [pantry]);

  const groups = useMemo(() => {
    const shown = (pantry || []).filter((p) => filter === 'all' || (p.status || 'have') === filter);
    const byCat = new Map();
    for (const p of shown) {
      const cat = categoryById[p.category] ? p.category : 'other';
      if (!byCat.has(cat)) byCat.set(cat, []);
      byCat.get(cat).push(p);
    }
    return CATEGORIES.filter((c) => byCat.has(c.id)).map((c) => ({
      ...c,
      items: byCat.get(c.id).sort((a, b) => a.name.localeCompare(b.name)),
    }));
  }, [pantry, filter]);

  const add = async (e) => {
    e.preventDefault();
    const names = text.split(/\n|,|;/).map((s) => s.trim()).filter(Boolean);
    if (!names.length) return;
    setText('');
    const n = await addStaples(hid, names, pantry || [], overrides);
    if (!n) flash('Already in the pantry');
  };

  const flash = (msg) => {
    setToast(msg);
    window.clearTimeout(flash.t);
    flash.t = window.setTimeout(() => setToast(''), 2500);
  };

  const setStatus = async (staple, status) => {
    if ((staple.status || 'have') === status) return;
    await setStapleStatus(hid, staple, status, {
      groceryItems: groceryItems || [],
      overrides,
      by: firstName(user),
    });
    if (status !== 'have') flash(`${staple.name} added to the grocery list`);
  };

  return (
    <section>
      <p className="muted small intro">
        Staples you keep on hand. Mark something <b>Low</b> or <b>Out</b> and it goes on the grocery
        list. Checking it off the list marks it <b>Have</b> again.
      </p>

      <form className="add-bar" onSubmit={add}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a staple (e.g. sesame oil)"
          enterKeyHint="done"
          aria-label="Add a staple"
        />
        <button className="btn primary" disabled={!text.trim()}>Add</button>
      </form>
      <div className="button-row">
        <button className="btn" onClick={() => setScanning(true)}>📷 Scan shelves to add staples</button>
      </div>

      {pantry && pantry.length === 0 && (
        <div className="card stack">
          <h2>Start with common staples?</h2>
          <p className="muted small">
            Adds {STARTER_STAPLES.length} everyday basics like oils, spices, flour and rice. Delete any you
            don’t keep.
          </p>
          <button className="btn primary" onClick={() => addStaples(hid, STARTER_STAPLES, [], overrides)}>
            Add common staples
          </button>
        </div>
      )}

      {pantry && pantry.length > 0 && (
        <div className="filters" role="tablist">
          {[['all', 'All'], ['low', 'Low'], ['out', 'Out']].map(([id, label]) => (
            <button
              key={id}
              role="tab"
              aria-selected={filter === id}
              className={`chip ${filter === id ? 'on' : ''} ${id}`}
              onClick={() => setFilter(id)}
            >
              {label} <span className="count">{counts[id]}</span>
            </button>
          ))}
        </div>
      )}

      {groups.map((g) => (
        <div key={g.id} className="group">
          <h3>
            <span aria-hidden="true">{g.emoji}</span> {g.label}
          </h3>
          <ul>
            {g.items.map((p) => (
              <li key={p.id} className={`row pantry-row status-${p.status || 'have'}`}>
                <button className="row-body" onClick={() => setEditing(p)}>
                  <span className="name">{p.name}</span>
                </button>
                <div className="seg" role="group" aria-label={`${p.name} status`}>
                  {STATUSES.map((s) => (
                    <button
                      key={s.id}
                      className={`${(p.status || 'have') === s.id ? 'on' : ''} ${s.id}`}
                      aria-pressed={(p.status || 'have') === s.id}
                      onClick={() => setStatus(p, s.id)}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}

      {pantry && pantry.length > 0 && groups.length === 0 && (
        <p className="muted center">Nothing marked {filter}.</p>
      )}

      {toast && <div className="toast" role="status">{toast}</div>}
      {scanning && (
        <PantryScan hid={hid} pantry={pantry} overrides={overrides} onClose={() => setScanning(false)} />
      )}
      {editing && <StapleSheet hid={hid} staple={editing} onClose={() => setEditing(null)} />}
    </section>
  );
}

function StapleSheet({ hid, staple, onClose }) {
  const [name, setName] = useState(staple.name);
  const save = async (e) => {
    e.preventDefault();
    if (name.trim() && name.trim() !== staple.name) await renameStaple(hid, staple, name.trim());
    onClose();
  };
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <form className="sheet stack" onClick={(e) => e.stopPropagation()} onSubmit={save}>
        <h2>Edit staple</h2>
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <div className="row-actions">
          <button
            type="button"
            className="btn subtle danger"
            onClick={async () => {
              await deleteStaple(hid, staple);
              onClose();
            }}
          >
            Remove from pantry
          </button>
          <span className="spacer" />
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary">Save</button>
        </div>
      </form>
    </div>
  );
}
