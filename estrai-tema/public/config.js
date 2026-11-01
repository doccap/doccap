// ─────────────────────────────────────────────────────────────────────────────
//  CONFIGURAZIONE — l'unico file da modificare (più l'email in firestore.rules)
// ─────────────────────────────────────────────────────────────────────────────

// 1) Incolla qui l'oggetto firebaseConfig che trovi in
//    Console Firebase → Impostazioni progetto → Le tue app → App web.
export const firebaseConfig = {
  apiKey: 'AIzaSyC0YZ6NTKgkjH8JQcjC60WHufqDOW6UlyQ',
  authDomain: 'doccap-drawing-challenge.firebaseapp.com',
  projectId: 'doccap-drawing-challenge',
  storageBucket: 'doccap-drawing-challenge.firebasestorage.app',
  messagingSenderId: '518763898504',
  appId: '1:518763898504:web:0178ca475b9f94d552613d',
};

// 2) Email Google di chi organizza (accesso a /admin.html).
//    ⚠️ Deve essere IDENTICA a quella scritta in firestore.rules → isAdmin().
export const ADMIN_EMAIL = 'antonio.capone5@gmail.com';
