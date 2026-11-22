import { useMemo, useState } from 'react';
import { CATEGORIES, categoryById } from '../lib/categories.js';
import {
  MAIN_LIST,
  addItems,
  clearItems,
  createList,
  deleteList,
  listIdOf,
  renameList,
  toggleItem,
  useCategoryOverrides,
  useCurrentList,
  useItems,
  useLists,
} from '../lib/groceryStore.js';
import { restockIfStaple, usePantry } from '../lib/pantryStore.js';
import ItemSheet from './ItemSheet.jsx';

function firstName(user) {
  return (user.displayName || user.email || '').split(/[ @]/)[0];
}

/** "milk, eggs, bread" -> ["milk", "eggs", "bread"] */
function splitEntry(text) {
  return text
    .split(/\n|,|;/)
    .map((s) => s.trim())
    .filter(Boolean);
}

const millis = (t) => (t?.toMillis ? t.toMillis() : 0);

export default function GroceryList({ household, user }) {
  const hid = household.id;
  const allItems = useItems(hid);
  const lists = useLists(hid);
  const [listId, setListId] = useCurrentList(hid, lists);
  const list = (lists || []).find((l) => l.id === listId) || { id: listId, name: 'Groceries' };
  const items = useMemo(
    () => (allItems ? allItems.filter((i) => listIdOf(i) === listId) : null),
    [allItems, listId],
  );
  const openByList = useMemo(() => {
    const c = {};
    for (const i of allItems || []) if (!i.checked) c[listIdOf(i)] = (c[listIdOf(i)] || 0) + 1;
    return c;
  }, [allItems]);
  const [listSheet, setListSheet] = useState(null); // 'new' | 'edit'
  const overrides = useCategoryOverrides(hid);
  const pantry = usePantry(hid);
  const [text, setText] = useState('');
  const [toast, setToast] = useState('');
  const [editing, setEditing] = useState(null);

  const { groups, checked, openCount } = useMemo(() => {
    const open = (items || []).filter((i) => !i.checked);
    const done = (items || [])
      .filter((i) => i.checked)
      .sort((a, b) => millis(b.checkedAt) - millis(a.checkedAt));
    const byCat = new Map();
    for (const it of open) {
      const cat = categoryById[it.category] ? it.category : 'other';
      if (!byCat.has(cat)) byCat.set(cat, []);
      byCat.get(cat).push(it);
    }
    const gs = CATEGORIES.filter((c) => byCat.has(c.id)).map((c) => ({
      ...c,
      items: byCat.get(c.id).sort((a, b) => a.name.localeCompare(b.name)),
    }));
    return { groups: gs, checked: done, openCount: open.length };
  }, [items]);

  const flash = (msg) => {
    setToast(msg);
    window.clearTimeout(flash.t);
    flash.t = window.setTimeout(() => setToast(''), 2500);
  };

  const add = async (e) => {
    e.preventDefault();
    const names = splitEntry(text);
    if (!names.length) return;
    setText('');
    const res = await addItems(
      hid,
      names.map((name) => ({ name })),
      { items: items || [], overrides, by: firstName(user), listId },
    );
    if (res.existing && !res.added) flash('Already on the list');
    else if (res.existing) flash(`Added ${res.added}; ${res.existing} already on the list`);
  };

  const toggle = (it) => {
    toggleItem(hid, it);
    if (!it.checked) restockIfStaple(hid, pantry, it);
  };

  const clearChecked = async () => {
    if (!checked.length) return;
    await clearItems(hid, checked);
  };

  const clearAll = async () => {
    if (!items?.length) return;
    if (!window.confirm(`Remove all ${items.length} items from ${list.name}?`)) return;
    await clearItems(hid, items);
  };

  return (
    <section>
      <div className="list-switcher" role="tablist" aria-label="Lists">
        {(lists || [{ id: MAIN_LIST, name: 'Groceries' }]).map((l) => (
          <button
            key={l.id}
            role="tab"
            aria-selected={l.id === listId}
            className={`chip ${l.id === listId ? 'on' : ''}`}
            onClick={() => (l.id === listId ? setListSheet('edit') : setListId(l.id))}
          >
            {l.name}
            {openByList[l.id] ? <span className="count">{openByList[l.id]}</span> : null}
            {l.id === listId && <span className="chip-edit" aria-label="Edit list">✎</span>}
          </button>
        ))}
        <button className="chip add" onClick={() => setListSheet('new')}>+ New list</button>
      </div>

      <form className="add-bar" onSubmit={add}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Add to ${list.name} (e.g. milk, eggs)`}
          enterKeyHint="done"
          autoCapitalize="none"
          aria-label="Add items"
        />
        <button className="btn primary" disabled={!text.trim()} aria-label="Add">
          Add
        </button>
      </form>

      {items === null && <p className="muted center">Loading…</p>}

      {items && items.length === 0 && (
        <div className="empty">
          <p>{list.name} is empty.</p>
          <p className="muted small">Type above, or separate several items with commas.</p>
        </div>
      )}

      {groups.map((g) => (
        <div key={g.id} className="group">
          <h3>
            <span aria-hidden="true">{g.emoji}</span> {g.label}
            <span className="count">{g.items.length}</span>
          </h3>
          <ul>
            {g.items.map((it) => (
              <Row key={it.id} item={it} onToggle={() => toggle(it)} onEdit={() => setEditing(it)} />
            ))}
          </ul>
        </div>
      ))}

      {items && items.length > 0 && openCount === 0 && (
        <p className="muted center">Everything is checked off. 🎉</p>
      )}

      {checked.length > 0 && (
        <div className="group done">
          <h3>
            <span aria-hidden="true">✅</span> In the cart
            <span className="count">{checked.length}</span>
            <button className="link right" onClick={clearChecked}>Clear checked</button>
          </h3>
          <ul>
            {checked.map((it) => (
              <Row key={it.id} item={it} onToggle={() => toggle(it)} onEdit={() => setEditing(it)} />
            ))}
          </ul>
        </div>
      )}

      {items && items.length > 0 && (
        <div className="footer-actions">
          <button className="btn subtle danger" onClick={clearAll}>Clear this list</button>
        </div>
      )}

      {toast && <div className="toast" role="status">{toast}</div>}
      {listSheet && (
        <ListSheet
          list={listSheet === 'edit' ? list : null}
          onClose={() => setListSheet(null)}
          onSave={(name) => {
            if (listSheet === 'edit') renameList(hid, listId, name);
            else setListId(createList(hid, name, firstName(user)));
            setListSheet(null);
          }}
          onDelete={() => {
            const n = items?.length || 0;
            const msg = n
              ? `Delete “${list.name}” and the ${n} item${n === 1 ? '' : 's'} on it?`
              : `Delete “${list.name}”?`;
            if (!window.confirm(msg)) return;
            deleteList(hid, listId, allItems || []);
            setListId(MAIN_LIST);
            setListSheet(null);
          }}
        />
      )}
      {editing && (
        <ItemSheet
          lists={lists}
          hid={hid}
          item={(items || []).find((i) => i.id === editing.id) || editing}
          onClose={() => setEditing(null)}
        />
      )}
    </section>
  );
}

function Row({ item, onToggle, onEdit }) {
  return (
    <li className={`row ${item.checked ? 'checked' : ''}`}>
      <button
        className="check"
        onClick={onToggle}
        aria-label={item.checked ? `Uncheck ${item.name}` : `Check off ${item.name}`}
        aria-pressed={item.checked}
      >
        {item.checked ? '✓' : ''}
      </button>
      <button className="row-body" onClick={onEdit}>
        <span className="name">{item.name}</span>
        {(item.note || item.sources?.length > 0) && (
          <span className="sub">
            {[item.note, item.sources?.length ? `for ${item.sources.join(', ')}` : '']
              .filter(Boolean)
              .join(' · ')}
          </span>
        )}
      </button>
    </li>
  );
}

function ListSheet({ list, onClose, onSave, onDelete }) {
  const [name, setName] = useState(list?.name || '');
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <form
        className="sheet stack"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) onSave(name);
        }}
      >
        <h2>{list ? 'Edit list' : 'New list'}</h2>
        <label>
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Costco, Party, Trader Joe’s…"
            autoFocus
            maxLength={40}
          />
        </label>
        <div className="row-actions">
          {list && list.id !== MAIN_LIST && (
            <button type="button" className="btn subtle danger" onClick={onDelete}>Delete list</button>
          )}
          <span className="spacer" />
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={!name.trim()}>{list ? 'Save' : 'Create'}</button>
        </div>
      </form>
    </div>
  );
}
