import { useEffect, useState } from 'react';
import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../firebase.js';

const HID_KEY = 'grocery.householdId';

function readSaved() {
  try {
    return localStorage.getItem(HID_KEY);
  } catch {
    return null;
  }
}
function save(hid) {
  try {
    localStorage.setItem(HID_KEY, hid);
  } catch {
    /* ignore */
  }
}

/** Finds the household the signed-in user belongs to (live). */
export function useHousehold(user) {
  const [state, setState] = useState({ loading: true, household: null, all: [] });

  useEffect(() => {
    if (!user) return undefined;
    const q = query(collection(db, 'households'), where('members', 'array-contains', user.uid));
    const confirmed = new Set();
    return onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snap) => {
        // Skip a just-created household until the server has it, so the
        // security rules (which look the household up) let us read its lists.
        for (const d of snap.docs) if (!d.metadata.hasPendingWrites) confirmed.add(d.id);
        const all = snap.docs
          .filter((d) => confirmed.has(d.id))
          .map((d) => ({ id: d.id, ...d.data() }));
        const saved = readSaved();
        const household = all.find((h) => h.id === saved) || all[0] || null;
        setState({ loading: false, household, all });
      },
      (err) => {
        console.error(err);
        setState({ loading: false, household: null, all: [], error: err.message });
      },
    );
  }, [user]);

  return state;
}

export async function createHousehold(user, name) {
  const ref = await addDoc(collection(db, 'households'), {
    name: name || 'Our Kitchen',
    members: [user.uid],
    memberNames: { [user.uid]: user.displayName || user.email || 'Me' },
    createdAt: serverTimestamp(),
  });
  save(ref.id);
  return ref.id;
}

export async function joinHousehold(user, hid) {
  await updateDoc(doc(db, 'households', hid), { members: arrayUnion(user.uid) });
  save(hid);
  // Now that we're a member, record a display name for "added by" labels.
  try {
    await updateDoc(doc(db, 'households', hid), {
      [`memberNames.${user.uid}`]: user.displayName || user.email || 'Member',
    });
  } catch {
    /* non-critical */
  }
}

export function selectHousehold(hid) {
  save(hid);
}
