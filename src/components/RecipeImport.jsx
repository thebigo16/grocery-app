import { useState } from 'react';
import { callApi, imageToDataUrl } from '../lib/api.js';

export default function RecipeImport({ onCancel, onImported, initialLink = '' }) {
  const [mode, setMode] = useState(initialLink ? 'link' : 'photo');
  const [files, setFiles] = useState([]);
  const [url, setUrl] = useState(initialLink);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const body = {};
      if (mode === 'photo') {
        if (!files.length) throw new Error('Pick or take a photo first.');
        body.images = await Promise.all(files.slice(0, 4).map((f) => imageToDataUrl(f)));
      } else if (mode === 'link') {
        body.url = url.trim();
      } else {
        body.text = text.trim();
      }
      const r = await callApi('import-recipe', body);
      onImported({
        title: r.title || '',
        servings: r.servings || '',
        ingredientsText: (r.ingredients || []).join('\n'),
        instructions: (r.instructions || []).join('\n'),
        sourceUrl: r.sourceUrl || (mode === 'link' ? url.trim() : ''),
        notes: r.notes || '',
        importWarning: r.warning || 'Check the recipe over, then tap Save.',
      });
    } catch (ex) {
      setError(ex.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="stack" onSubmit={run}>
      <div className="detail-top">
        <button type="button" className="link" onClick={onCancel}>‹ Recipes</button>
      </div>
      <h2>Add a recipe</h2>
      <div className="filters" role="tablist">
        {[['photo', '📷 Photo'], ['link', '🔗 Link'], ['text', '📋 Paste text']].map(([id, label]) => (
          <button
            type="button"
            key={id}
            role="tab"
            aria-selected={mode === id}
            className={`chip ${mode === id ? 'on' : ''}`}
            onClick={() => setMode(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === 'photo' && (
        <>
          <p className="muted small">Take a photo of the cookbook page (up to 4 photos if it runs over a page).</p>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setFiles([...e.target.files])}
            aria-label="Recipe photos"
          />
          {files.length > 0 && <p className="small">{files.length} photo{files.length > 1 ? 's' : ''} selected</p>}
        </>
      )}
      {mode === 'link' && (
        <>
          <p className="muted small">
            Paste a link to a recipe page. Sites behind a paywall (like NYT Cooking) usually can’t be read; use a
            photo or paste the text instead.
          </p>
          <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" required />
        </>
      )}
      {mode === 'text' && (
        <>
          <p className="muted small">Copy the recipe from any page or app and paste it here.</p>
          <textarea rows={10} value={text} onChange={(e) => setText(e.target.value)} required />
        </>
      )}

      <button className="btn primary" disabled={busy}>{busy ? 'Reading the recipe…' : 'Import'}</button>
      {error && <p className="error">{error}</p>}
    </form>
  );
}
