import { useState } from 'react';
import { signOut } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase.js';
import { inviteLink } from '../lib/pendingJoin.js';
import { selectHousehold } from '../lib/useHousehold.js';
import { bg } from '../lib/groceryStore.js';

export default function Settings({ household, user, households }) {
  const link = inviteLink(household.id);
  const [copied, setCopied] = useState(false);
  const [name, setName] = useState(household.name || '');
  const members = Object.entries(household.memberNames || {}).filter(([uid]) =>
    household.members.includes(uid),
  );

  const share = async () => {
    const data = { title: 'Join our grocery list', text: 'Join our shared grocery list:', url: link };
    if (navigator.share) {
      try {
        await navigator.share(data);
        return;
      } catch {
        /* cancelled: fall back to copying */
      }
    }
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copy this invite link:', link);
    }
  };

  return (
    <section className="stack settings">
      <div className="card stack">
        <h2>Invite your partner</h2>
        <p className="muted small">
          Send this link. They open it on their phone, sign in, and they’re on the same list. Anyone with the link
          can join, so only send it to people in your household.
        </p>
        <code className="invite">{link}</code>
        <button className="btn primary" onClick={share}>{copied ? 'Copied!' : 'Share invite link'}</button>
      </div>

      <div className="card stack">
        <h2>Household</h2>
        <form
          className="add-bar"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) bg(updateDoc(doc(db, 'households', household.id), { name: name.trim() }));
          }}
        >
          <input value={name} onChange={(e) => setName(e.target.value)} aria-label="Household name" />
          <button className="btn" disabled={!name.trim() || name.trim() === household.name}>Rename</button>
        </form>
        <p className="small">
          Members: {members.length ? members.map(([, n]) => n).join(', ') : household.members.length}
        </p>
        {households.length > 1 && (
          <label>
            Switch list
            <select
              value={household.id}
              onChange={(e) => {
                selectHousehold(e.target.value);
                window.location.reload();
              }}
            >
              {households.map((h) => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="card stack">
        <h2>Install on your phone</h2>
        <p className="small"><b>iPhone (Safari):</b> tap the Share button, then “Add to Home Screen”.</p>
        <p className="small"><b>Android (Chrome):</b> tap the ⋮ menu, then “Add to Home screen” or “Install app”.</p>
      </div>

      <div className="card stack">
        <p className="small">Signed in as {user.email}</p>
        <button className="btn subtle danger" onClick={() => signOut(auth)}>Sign out</button>
      </div>
    </section>
  );
}
