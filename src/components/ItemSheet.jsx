import { useState } from 'react';
import { CATEGORIES } from '../lib/categories.js';
import { deleteItem, listIdOf, updateItem } from '../lib/groceryStore.js';

export default function ItemSheet({ hid, item, lists, onClose }) {
  const [name, setName] = useState(item.name);
  const [note, setNote] = useState(item.note || '');
  const [category, setCategory] = useState(item.category);
  const [listId, setListId] = useState(listIdOf(item));

  const save = async (e) => {
    e.preventDefault();
    const patch = {};
    if (name.trim() && name.trim() !== item.name) patch.name = name.trim();
    if (note !== (item.note || '')) patch.note = note.trim();
    if (category !== item.category) patch.category = category;
    if (listId !== listIdOf(item)) patch.listId = listId;
    if (Object.keys(patch).length) await updateItem(hid, item, patch);
    onClose();
  };

  const remove = async () => {
    await deleteItem(hid, item);
    onClose();
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <form className="sheet stack" onClick={(e) => e.stopPropagation()} onSubmit={save}>
        <h2>Edit item</h2>
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          Note <span className="muted small">(amount, brand…)</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. 2 lb, organic" />
        </label>
        <label>
          Group
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.emoji} {c.label}
              </option>
            ))}
          </select>
        </label>
        {lists && lists.length > 1 && (
          <label>
            List
            <select value={listId} onChange={(e) => setListId(e.target.value)}>
              {lists.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </label>
        )}
        {category !== item.category && (
          <p className="muted small">The app will remember this group for “{name}” next time.</p>
        )}
        {item.addedBy && <p className="muted small">Added by {item.addedBy}</p>}
        <div className="row-actions">
          <button type="button" className="btn subtle danger" onClick={remove}>Delete</button>
          <span className="spacer" />
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary">Save</button>
        </div>
      </form>
    </div>
  );
}
