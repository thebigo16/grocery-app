import { useEffect, useState } from 'react';
import { onSnapshot } from 'firebase/firestore';

/**
 * Subscribe to a Firestore query or document and keep it live.
 * A listener that errors is dead in Firestore, so we resubscribe with backoff
 * (this happens e.g. right after a household is created, before the server
 * has the household doc that the security rules look up).
 */
export function useLive(makeRef, map, deps) {
  const [value, setValue] = useState(null);
  useEffect(() => {
    const ref = makeRef();
    if (!ref) return undefined;
    let unsub = () => {};
    let timer;
    let attempt = 0;
    let stopped = false;
    const start = () => {
      unsub = onSnapshot(
        ref,
        (snap) => {
          attempt = 0;
          setValue(map(snap));
        },
        (err) => {
          console.warn('Listener error, retrying', err.code);
          if (stopped) return;
          attempt += 1;
          timer = setTimeout(start, Math.min(15000, 500 * 2 ** attempt));
        },
      );
    };
    start();
    return () => {
      stopped = true;
      clearTimeout(timer);
      unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return value;
}

export const docsOf = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }));
