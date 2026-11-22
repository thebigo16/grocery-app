import { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase.js';
import { getPendingJoin } from '../lib/pendingJoin.js';

const MESSAGES = {
  'auth/invalid-credential': 'Email or password is incorrect.',
  'auth/wrong-password': 'Email or password is incorrect.',
  'auth/user-not-found': 'No account with that email yet. Tap "Create an account".',
  'auth/email-already-in-use': 'That email already has an account. Sign in instead.',
  'auth/weak-password': 'Use at least 6 characters for the password.',
  'auth/invalid-email': 'That email address looks wrong.',
  'auth/popup-closed-by-user': 'Google sign-in was closed before it finished.',
  'auth/popup-blocked': 'The Google sign-in window was blocked. Try email instead.',
  'auth/network-request-failed': 'No connection. Try again when you are online.',
};

const friendly = (e) => MESSAGES[e?.code] || e?.message || 'Something went wrong.';

export default function SignIn() {
  const [mode, setMode] = useState('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const invited = !!getPendingJoin();

  const google = async () => {
    setError('');
    setBusy(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      setError(friendly(e));
    } finally {
      setBusy(false);
    }
  };

  const submit = async (ev) => {
    ev.preventDefault();
    setError('');
    setInfo('');
    setBusy(true);
    try {
      if (mode === 'signup') {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (name.trim()) await updateProfile(cred.user, { displayName: name.trim() });
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
    } catch (e) {
      setError(friendly(e));
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    setError('');
    if (!email.trim()) {
      setError('Type your email above first, then tap "Forgot password".');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setInfo('Password reset email sent.');
    } catch (e) {
      setError(friendly(e));
    }
  };

  return (
    <div className="auth">
      <img src="/icon.svg" alt="" width="64" height="64" />
      <h1>Groceries</h1>
      <p className="muted">
        {invited ? 'You were invited to a shared list. Sign in to join it.' : 'Your shared grocery list, pantry and recipes.'}
      </p>

      <button className="btn google" onClick={google} disabled={busy}>
        <span aria-hidden="true">G</span> Continue with Google
      </button>

      <div className="divider">
        <span>or use email</span>
      </div>

      <form onSubmit={submit} className="stack">
        {mode === 'signup' && (
          <input
            placeholder="Your first name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="given-name"
          />
        )}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          required
          minLength={6}
        />
        <button className="btn primary" disabled={busy}>
          {mode === 'signup' ? 'Create account' : 'Sign in'}
        </button>
      </form>

      {error && <p className="error">{error}</p>}
      {info && <p className="info">{info}</p>}

      <div className="auth-links">
        {mode === 'signin' ? (
          <>
            <button className="link" onClick={() => setMode('signup')}>Create an account</button>
            <button className="link" onClick={reset}>Forgot password</button>
          </>
        ) : (
          <button className="link" onClick={() => setMode('signin')}>I already have an account</button>
        )}
      </div>
    </div>
  );
}
