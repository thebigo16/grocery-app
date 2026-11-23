import { useEffect, useMemo, useRef, useState } from 'react';
import { useCategoryOverrides, useItems } from '../lib/groceryStore.js';
import {
  STARTER_STAPLES,
  STATUSES,
  addStaples,
  deleteSection,
  deleteStaple,
  newSectionId,
  renameStaple,
  saveSections,
  setStapleSection,
  setStapleStatus,
  usePantry,
  usePantrySections,
} from '../lib/pantryStore.js';
import PantryScan from './PantryScan.jsx';

const firstName = (u) => (u.displayName || u.email || '').split(/[ @]/)[0];
const NONE = 'none'; // drop target for staples that aren't in a section

export default function Pantry({ household, user }) {
  const hid = household.id;
  const pantry = usePantry(hid);
  const sections = usePantrySections(hid) || [];
  const groceryItems = useItems(hid);
  const overrides = useCategoryOverrides(hid);
  const [text, setText] = useState('');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [sectionSheet, setSectionSheet] = useState(null); // 'new' | section
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

  const q = search.trim();
  const narrowed = Boolean(q) || filter !== 'all';

  const groups = useMemo(() => {
    // Match the start of any word, so "oil" finds olive oil but not aluminum foil.
    const esc = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = esc ? new RegExp(`(^|[^a-z])${esc}`, 'i') : null;
    const shown = (pantry || [])
      .filter((p) => (filter === 'all' || (p.status || 'have') === filter) && (!re || re.test(p.name)))
      .sort((a, b) => a.name.localeCompare(b.name));
    const known = new Set(sections.map((s) => s.id));
    const bySection = new Map([[NONE, []], ...sections.map((s) => [s.id, []])]);
    for (const p of shown) bySection.get(known.has(p.section) ? p.section : NONE).push(p);
    const gs = sections.map((s) => ({ ...s, items: bySection.get(s.id) }));
    gs.push({ id: NONE, name: sections.length ? 'Not in a section' : '', items: bySection.get(NONE) });
    return gs;
  }, [pantry, sections, filter, q]);

  const shownCount = groups.reduce((n, g) => n + g.items.length, 0);

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

  const moveTo = (staple, sectionId) => {
    const target = sectionId === NONE ? null : sectionId;
    if ((staple.section || null) === target) return;
    setStapleSection(hid, staple, target);
  };

  const drag = useDrag((staple, sectionId) => moveTo(staple, sectionId));

  return (
    <section className={drag.active ? 'dragging' : ''}>
      {pantry && pantry.length > 0 && (
        <div className="search-bar">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Search the pantry"
            aria-label="Search the pantry"
            enterKeyHint="search"
            autoCapitalize="none"
          />
          {search && (
            <button className="search-clear" onClick={() => setSearch('')} aria-label="Clear search">×</button>
          )}
        </div>
      )}

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
        <div className="filters pantry-filters">
          <div role="tablist" className="filter-chips">
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
          <button className="chip add" onClick={() => setSectionSheet('new')}>+ Section</button>
        </div>
      )}

      {pantry && pantry.length > 0 && sections.length > 0 && !narrowed && (
        <p className="muted small hint">Drag ⠿ to move a staple to another section, or tap it.</p>
      )}

      {pantry &&
        pantry.length > 0 &&
        groups.map((g) => {
          // While searching or filtering, hide sections with nothing to show.
          const hide = !g.items.length && (narrowed || (g.id === NONE && (!drag.active || !sections.length)));
          if (hide) return null;
          const over = drag.active && drag.over === g.id;
          return (
            <div key={g.id} className={`group section ${over ? 'drop-over' : ''}`} data-section={g.id}>
              {g.name && (
                <h3>
                  {g.id === NONE ? (
                    <span>{g.name}</span>
                  ) : (
                    <button className="section-name" onClick={() => setSectionSheet(g)} aria-label={`Edit section ${g.name}`}>
                      {g.name} <span className="edit-icon" aria-hidden="true">✎</span>
                    </button>
                  )}
                  <span className="count">{g.items.length}</span>
                </h3>
              )}
              {g.items.length > 0 ? (
                <ul>
                  {g.items.map((p) => (
                    <li
                      key={p.id}
                      className={`row pantry-row status-${p.status || 'have'} ${drag.id === p.id ? 'drag-source' : ''}`}
                    >
                      {sections.length > 0 && (
                        <span
                          className="drag-handle"
                          aria-hidden="true"
                          onPointerDown={(e) => drag.start(e, p, g.id)}
                        >
                          ⠿
                        </span>
                      )}
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
              ) : (
                <div className="drop-empty">{drag.active ? 'Drop here' : 'Drag staples here'}</div>
              )}
            </div>
          );
        })}

      {pantry && pantry.length > 0 && shownCount === 0 && !q && filter !== 'all' && (
        <p className="muted center">Nothing marked {filter}.</p>
      )}
      {pantry && pantry.length > 0 && shownCount === 0 && q && (
        <div className="empty">
          <p>
            No staples match “{q}”{filter !== 'all' ? ` in ${filter}` : ''}.
          </p>
          {filter !== 'all' && (
            <button className="btn" onClick={() => setFilter('all')}>Search all staples</button>
          )}
          {filter === 'all' && (
            <button
              className="btn primary"
              onClick={() => {
                addStaples(hid, [q], pantry || [], overrides);
                setSearch('');
              }}
            >
              Add “{q}” to the pantry
            </button>
          )}
        </div>
      )}

      {drag.active && (
        <div className="drag-ghost" style={{ transform: `translate(${drag.x}px, ${drag.y}px)` }}>
          {drag.name}
        </div>
      )}

      {toast && <div className="toast" role="status">{toast}</div>}
      {scanning && (
        <PantryScan hid={hid} pantry={pantry} overrides={overrides} onClose={() => setScanning(false)} />
      )}
      {editing && (
        <StapleSheet
          hid={hid}
          staple={editing}
          sections={sections}
          onMove={(sectionId) => moveTo(editing, sectionId)}
          onClose={() => setEditing(null)}
        />
      )}
      {sectionSheet && (
        <SectionSheet
          section={sectionSheet === 'new' ? null : sectionSheet}
          sections={sections}
          onClose={() => setSectionSheet(null)}
          onSave={(name) => {
            if (sectionSheet === 'new') saveSections(hid, [...sections, { id: newSectionId(), name }]);
            else saveSections(hid, sections.map((s) => (s.id === sectionSheet.id ? { ...s, name } : s)));
            setSectionSheet(null);
          }}
          onMove={(dir) => {
            const i = sections.findIndex((s) => s.id === sectionSheet.id);
            const j = i + dir;
            if (i < 0 || j < 0 || j >= sections.length) return;
            const next = [...sections];
            [next[i], next[j]] = [next[j], next[i]];
            saveSections(hid, next);
          }}
          onDelete={() => {
            const n = (pantry || []).filter((p) => p.section === sectionSheet.id).length;
            const msg = n
              ? `Delete the “${sectionSheet.name}” section? Its ${n} staple${n === 1 ? '' : 's'} stay in the pantry, just not in a section.`
              : `Delete the “${sectionSheet.name}” section?`;
            if (!window.confirm(msg)) return;
            deleteSection(hid, sections, pantry, sectionSheet.id);
            setSectionSheet(null);
          }}
        />
      )}
    </section>
  );
}

/**
 * Drag a staple by its handle and drop it on a section. Works with touch and
 * mouse via pointer events; scrolls the page when the finger nears an edge.
 */
function useDrag(onDrop) {
  const [state, setState] = useState(null); // { id, name, from, over, x, y }
  const ref = useRef(null);
  ref.current = state;
  const dropRef = useRef(onDrop);
  dropRef.current = onDrop;
  const stapleRef = useRef(null);

  const sectionAt = (x, y) => document.elementFromPoint(x, y)?.closest('[data-section]')?.dataset.section;

  useEffect(() => {
    if (!state) return undefined;
    const move = (e) => {
      e.preventDefault();
      const over = sectionAt(e.clientX, e.clientY) || ref.current.over;
      setState((s) => s && { ...s, x: e.clientX, y: e.clientY, over });
    };
    const up = () => {
      const s = ref.current;
      if (s && s.over && s.over !== s.from) dropRef.current(stapleRef.current, s.over);
      setState(null);
    };
    // Scroll while the finger sits near the top or bottom of the screen.
    const timer = setInterval(() => {
      const s = ref.current;
      if (!s) return;
      // Faster the closer the finger is to the edge (top bar ~70px, tab bar ~70px).
      const top = 130;
      const bottom = window.innerHeight - 130;
      let dy = 0;
      if (s.y < top) dy = -Math.min(20, 4 + (top - s.y) / 4);
      else if (s.y > bottom) dy = Math.min(20, 4 + (s.y - bottom) / 4);
      if (dy) {
        window.scrollBy(0, dy);
        const over = sectionAt(s.x, s.y) || s.over;
        if (over !== s.over) setState((p) => p && { ...p, over });
      }
    }, 16);
    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      clearInterval(timer);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [Boolean(state)]); // eslint-disable-line react-hooks/exhaustive-deps

  const start = (e, staple, from) => {
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault();
    stapleRef.current = staple;
    navigator.vibrate?.(10);
    setState({ id: staple.id, name: staple.name, from, over: from, x: e.clientX, y: e.clientY });
  };

  return {
    active: Boolean(state),
    id: state?.id,
    name: state?.name,
    over: state?.over,
    x: state?.x || 0,
    y: state?.y || 0,
    start,
  };
}

function StapleSheet({ hid, staple, sections, onMove, onClose }) {
  const [name, setName] = useState(staple.name);
  const current = sections.some((s) => s.id === staple.section) ? staple.section : NONE;
  const [section, setSection] = useState(current);
  const save = async (e) => {
    e.preventDefault();
    if (name.trim() && name.trim() !== staple.name) await renameStaple(hid, staple, name.trim());
    if (section !== current) onMove(section);
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
        {sections.length > 0 && (
          <label>
            Section
            <select value={section} onChange={(e) => setSection(e.target.value)}>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
              <option value={NONE}>Not in a section</option>
            </select>
          </label>
        )}
        <div className="row-actions">
          <button
            type="button"
            className="btn subtle danger"
            onClick={async () => {
              await deleteStaple(hid, staple);
              onClose();
            }}
          >
            Remove
          </button>
          <span className="spacer" />
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary">Save</button>
        </div>
      </form>
    </div>
  );
}

function SectionSheet({ section, sections, onClose, onSave, onMove, onDelete }) {
  const [name, setName] = useState(section?.name || '');
  const i = section ? sections.findIndex((s) => s.id === section.id) : -1;
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <form
        className="sheet stack"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) onSave(name.trim());
        }}
      >
        <h2>{section ? 'Edit section' : 'New section'}</h2>
        {!section && (
          <p className="muted small">
            Make sections that match your kitchen, like Spice rack or Baking shelf, then drag staples into them.
          </p>
        )}
        <label>
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Spice rack, Baking shelf, Under the sink…"
            autoFocus={!section}
            maxLength={40}
          />
        </label>
        {section && sections.length > 1 && (
          <div className="row-actions">
            <span className="muted small">Order</span>
            <span className="spacer" />
            <button type="button" className="btn" disabled={i <= 0} onClick={() => onMove(-1)}>↑ Up</button>
            <button type="button" className="btn" disabled={i >= sections.length - 1} onClick={() => onMove(1)}>
              ↓ Down
            </button>
          </div>
        )}
        <div className="row-actions">
          {section && (
            <button type="button" className="btn subtle danger" onClick={onDelete}>Delete</button>
          )}
          <span className="spacer" />
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={!name.trim()}>{section ? 'Save' : 'Create'}</button>
        </div>
      </form>
    </div>
  );
}
