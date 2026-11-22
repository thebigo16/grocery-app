import { createRemoteJWKSet, jwtVerify } from 'jose';

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'grocery-app-e849a';
const JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'),
);

/**
 * Checks the caller's Firebase sign-in token so only our app's users can spend
 * API credit. If ALLOWED_EMAILS is set (comma separated), only those people can.
 * Returns the token claims, or sends an error response and returns null.
 */
export async function requireUser(req, res) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) {
    res.status(401).json({ error: 'Please sign in again.' });
    return null;
  }
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://securetoken.google.com/${PROJECT_ID}`,
      audience: PROJECT_ID,
    });
    const allowed = (process.env.ALLOWED_EMAILS || '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (allowed.length && !allowed.includes(String(payload.email || '').toLowerCase())) {
      res.status(403).json({ error: 'This account isn’t allowed to use photo import.' });
      return null;
    }
    return payload;
  } catch {
    res.status(401).json({ error: 'Please sign in again.' });
    return null;
  }
}

export function allowPost(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Use POST.' });
    return false;
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    res.status(503).json({ error: 'Photo and link import isn’t switched on yet (no API key).' });
    return false;
  }
  return true;
}
