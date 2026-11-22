import { useEffect, useState } from 'react';

/**
 * "Take photo" opens the phone camera directly (capture="environment").
 * "Choose from photos" opens the photo library. Photos collect as thumbnails,
 * so a recipe that runs over two pages can be shot page by page.
 */
export default function PhotoPicker({ files, onChange, max = 4, disabled = false }) {
  const [urls, setUrls] = useState([]);

  useEffect(() => {
    const u = files.map((f) => URL.createObjectURL(f));
    setUrls(u);
    return () => u.forEach((x) => URL.revokeObjectURL(x));
  }, [files]);

  const add = (list) => {
    const next = [...files, ...list].slice(0, max);
    onChange(next);
  };

  const full = files.length >= max;

  return (
    <div className="stack photo-picker">
      {files.length > 0 && (
        <div className="thumbs">
          {urls.map((u, i) => (
            <div key={u} className="thumb">
              <img src={u} alt={`Photo ${i + 1}`} />
              <button
                type="button"
                aria-label={`Remove photo ${i + 1}`}
                onClick={() => onChange(files.filter((_, j) => j !== i))}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="button-row">
        <label className={`btn ${files.length ? '' : 'primary'} file-btn ${disabled || full ? 'disabled' : ''}`}>
          📷 {files.length ? 'Add another page' : 'Take photo'}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            disabled={disabled || full}
            onChange={(e) => {
              add([...e.target.files]);
              e.target.value = '';
            }}
            hidden
          />
        </label>
        <label className={`btn file-btn ${disabled || full ? 'disabled' : ''}`}>
          🖼️ Choose from photos
          <input
            type="file"
            accept="image/*"
            multiple
            disabled={disabled || full}
            onChange={(e) => {
              add([...e.target.files]);
              e.target.value = '';
            }}
            hidden
          />
        </label>
      </div>
    </div>
  );
}
