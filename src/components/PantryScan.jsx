import { useMemo, useState } from 'react';
import { callApi, imageToDataUrl } from '../lib/api.js';
import { addStaples, findStaple } from '../lib/pantryStore.js';
import PhotoPicker from './PhotoPicker.jsx';

/** Take a photo of shelves; Claude suggests staples to add. */
export default function PantryScan({ hid, pantry, overrides, onClose }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [found, setFound] = useState(null);
  const [picked, setPicked] = useState(new Set());

  const scan = async (files) => {
    if (!files.length) return;
    setError('');
    setBusy(true);
    try {
      const images = await Promise.all([...files].slice(0, 4).map((f) => imageToDataUrl(f)));
      const r = await callApi('identify-items', { images });
      const rows = (r.items || []).map((it) => ({ ...it, existing: findStaple(pantry, it.name) }));
      setFound(rows);
      setPicked(new Set(rows.filter((x) => !x.perishable && !x.existing).map((x) => x.name)));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const toggle = (name) => {
    const n = new Set(picked);
    if (n.has(name)) n.delete(name);
    else n.add(name);
    setPicked(n);
  };

  const add = () => {
    addStaples(hid, [...picked], pantry || [], overrides);
    onClose();
  };

  const rows = useMemo(() => found || [], [found]);

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet tall" onClick={(e) => e.stopPropagation()}>
        <h2>Scan your shelves</h2>
        {!found && (
          <>
            <p className="muted small">
              Take a photo of a cupboard, spice rack or fridge door. Claude will suggest what to add to your staples.
            </p>
            {busy ? (
              <p className="center">Looking at your photo…</p>
            ) : (
              <PhotoPicker files={[]} onChange={(f) => scan(f)} />
            )}
          </>
        )}
        {found && (
          <div className="sheet-scroll">
            {rows.length === 0 && <p className="muted">Nothing recognisable in that photo. Try a closer shot.</p>}
            <ul className="plain-list">
              {rows.map((it) => (
                <li key={it.name} className={`row ${picked.has(it.name) ? '' : 'skipped'}`}>
                  <button className="check" aria-pressed={picked.has(it.name)} onClick={() => toggle(it.name)}>
                    {picked.has(it.name) ? '✓' : ''}
                  </button>
                  <button className="row-body" onClick={() => toggle(it.name)}>
                    <span className="name">{it.name}</span>
                    {(it.existing || it.perishable) && (
                      <span className="sub">
                        {it.existing ? `already in pantry as ${it.existing.name}` : 'perishable, so not a staple'}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {error && <p className="error">{error}</p>}
        <div className="row-actions">
          <button className="btn" onClick={onClose}>Cancel</button>
          <span className="spacer" />
          {found && (
            <button className="btn primary" disabled={!picked.size} onClick={add}>
              Add {picked.size} staple{picked.size === 1 ? '' : 's'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
