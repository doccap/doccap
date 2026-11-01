// ─────────────────────────────────────────────────────────────────────────────
//  CONFIGURAZIONE — l'unico file da modificare (più l'email in firestore.rules)
// ─────────────────────────────────────────────────────────────────────────────

// 1) Incolla qui l'oggetto firebaseConfig che trovi in
//    Console Firebase → Impostazioni progetto → Le tue app → App web.
export const firebaseConfig = {
  apiKey: 'INCOLLA_QUI',
  authDomain: 'INCOLLA_QUI.firebaseapp.com',
  projectId: 'INCOLLA_QUI',
  storageBucket: 'INCOLLA_QUI.firebasestorage.app',
  messagingSenderId: 'INCOLLA_QUI',
  appId: 'INCOLLA_QUI',
};

// 2) Email Google di chi organizza (accesso a /admin.html).
//    ⚠️ Deve essere IDENTICA a quella scritta in firestore.rules → isAdmin().
export const ADMIN_EMAIL = 'antonio.capone5@gmail.com';
