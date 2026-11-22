import { useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase.js';
import { createHousehold, joinHousehold } from '../lib/useHousehold.js';

function extractId(text) {
  const t = text.trim();
  try {
    const u = new URL(t);
    return u.searchParams.get('join') || '';
  } catch {
    return t;
  }
}

export default function HouseholdSetup({ user, error }) {
  const [name, setName] = useState('Our Kitchen');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const create = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      await createHousehold(user, name.trim());
    } catch (ex) {
      setErr(ex.message);
      setBusy(false);
    }
  };

  const join = async (e) => {
    e.preventDefault();
    const id = extractId(code);
    if (!id) return;
    setBusy(true);
    setErr('');
    try {
      await joinHousehold(user, id);
    } catch (ex) {
      setErr(`That invite didn't work (${ex.code || ex.message}). Ask for a fresh link.`);
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      <h1>Welcome{user.displayName ? `, ${user.displayName.split(' ')[0]}` : ''}!</h1>
      <p className="muted">Start a shared list, or join the one your partner already made.</p>

      <form className="card stack" onSubmit={create}>
        <h2>Start a new list</h2>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Household name" />
        <button className="btn primary" disabled={busy}>Create</button>
      </form>

      <form className="card stack" onSubmit={join}>
        <h2>Join with an invite</h2>
        <p className="muted small">Paste the invite link your partner sent you.</p>
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Invite link" />
        <button className="btn" disabled={busy || !code.trim()}>Join</button>
      </form>

      {(err || error) && <p className="error">{err || error}</p>}
      <button className="link" onClick={() => signOut(auth)}>Sign out ({user.email})</button>
    </div>
  );
}
