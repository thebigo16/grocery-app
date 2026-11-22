// Remembers an invite (?join=<householdId>) across the sign-in step.
const KEY = 'grocery.pendingJoin';

export function capturePendingJoin() {
  const params = new URLSearchParams(window.location.search);
  const hid = params.get('join');
  if (hid) {
    try {
      sessionStorage.setItem(KEY, hid);
    } catch {
      /* ignore */
    }
    params.delete('join');
    const qs = params.toString();
    window.history.replaceState(null, '', window.location.pathname + (qs ? `?${qs}` : ''));
  }
}

export function getPendingJoin() {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function clearPendingJoin() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export function inviteLink(hid) {
  return `${window.location.origin}/?join=${encodeURIComponent(hid)}`;
}
