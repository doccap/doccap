// Inizializzazione Firebase condivisa da index.html e admin.html.
// SDK modulare da CDN, versione pinnata.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult,
  onAuthStateChanged, signOut, connectAuthEmulator, signInWithCredential,
} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import { getFirestore, connectFirestoreEmulator } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
import { firebaseConfig, ADMIN_EMAIL } from './config.js';

// In locale (firebase emulators) si usano gli emulatori, mai il progetto vero.
export const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname);
export const configMissing = !isLocal && /INCOLLA/.test(firebaseConfig.apiKey);

const config = isLocal
  ? { ...firebaseConfig, apiKey: 'demo-key', projectId: 'demo-estrai-tema', authDomain: location.host }
  : firebaseConfig;

const app = initializeApp(config);
export const auth = getAuth(app);
auth.languageCode = 'it';
export const db = getFirestore(app);

if (isLocal) {
  connectAuthEmulator(auth, `http://${location.hostname}:9099`, { disableWarnings: true });
  connectFirestoreEmulator(db, location.hostname, 8080);
  // Solo in locale, per i test automatici: login con un account Google finto (accettato
  // solo dall'emulatore Auth). Online non esiste.
  window.__testSignIn = (email, name) => signInWithCredential(auth, GoogleAuthProvider.credential(
    JSON.stringify({ sub: email, email, email_verified: true, name }),
  ));
}

export { ADMIN_EMAIL, onAuthStateChanged, signOut };

export const isAdminUser = (u) =>
  !!u && u.emailVerified && (u.email || '').toLowerCase() === ADMIN_EMAIL.toLowerCase();

// Errori del ritorno da signInWithRedirect (se usato)
export const redirectResult = getRedirectResult(auth).catch((e) => e);

// Login: popup con scelta account; se il popup è bloccato (es. Safari su iPhone) → redirect.
export async function login() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    await signInWithPopup(auth, provider);
  } catch (e) {
    const fallback = [
      'auth/popup-blocked',
      'auth/operation-not-supported-in-environment',
      'auth/web-storage-unsupported',
    ];
    if (fallback.includes(e.code)) return signInWithRedirect(auth, provider);
    if (['auth/popup-closed-by-user', 'auth/cancelled-popup-request'].includes(e.code)) return;
    throw e;
  }
}

export function friendlyError(e) {
  const code = e?.code || '';
  if (code === 'auth/network-request-failed' || code === 'unavailable') return 'Connessione assente. Riprova tra poco.';
  if (code === 'auth/unauthorized-domain') return 'Questo indirizzo non è autorizzato per il login (vedi LEGGIMI).';
  if (code === 'permission-denied') return 'Operazione non consentita.';
  return 'Qualcosa è andato storto. Riprova.';
}
