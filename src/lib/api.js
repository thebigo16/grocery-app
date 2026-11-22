import { auth } from '../firebase.js';

/** Shrink a photo to a JPEG data URL so uploads stay small and fast. */
export async function imageToDataUrl(file, maxSide = 1600, quality = 0.85) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('Could not read that image.'));
      i.src = url;
    });
    const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** POST to one of our /api functions with the user's sign-in token. */
export async function callApi(path, body) {
  if (!navigator.onLine) throw new Error('You’re offline. Try again when you have a connection.');
  const token = await auth.currentUser?.getIdToken();
  const res = await fetch(`/api/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* not JSON */
  }
  if (!res.ok) {
    if (res.status === 404) throw new Error('Photo and link import isn’t switched on yet.');
    throw new Error(data?.error || `Something went wrong (${res.status}).`);
  }
  return data;
}
