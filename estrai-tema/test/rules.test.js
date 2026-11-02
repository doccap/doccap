// Test delle Firestore Security Rules con l'emulatore.
// Esegui:  cd test && npm run test:rules
import { readFileSync } from 'node:fs';
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  initializeTestEnvironment, assertFails, assertSucceeds,
} from '@firebase/rules-unit-testing';
import {
  doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, collection,
  runTransaction, serverTimestamp, writeBatch, increment, Timestamp,
} from 'firebase/firestore';

const rules = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
const ADMIN_EMAIL = rules.match(/token\.email == '([^']+)'/)[1];
const THEMES = ['Un gatto astronauta', 'Pizza con le ali', 'Il vulcano timido', 'Una nuvola arrabbiata'];

let env;

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-estrai-tema',
    firestore: { rules },
  });
});
after(() => env.cleanup());

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    for (let i = 0; i < THEMES.length; i++) await setDoc(doc(db, 'pool', String(i)), { text: THEMES[i] });
    await setDoc(doc(db, 'meta/counter'), { next: 0, total: THEMES.length });
  });
});

const player = (uid, extra = {}) =>
  env.authenticatedContext(uid, { email: `${uid}@example.com`, email_verified: true, name: uid, ...extra }).firestore();
const admin = () =>
  env.authenticatedContext('admin', { email: ADMIN_EMAIL, email_verified: true }).firestore();

// Stessa logica del client (public/index.html)
async function draw(db, uid) {
  return runTransaction(db, async (tx) => {
    const aRef = doc(db, 'assignments', uid);
    const cRef = doc(db, 'meta/counter');
    const a = await tx.get(aRef);
    if (a.exists()) return a.data().idx;
    const c = (await tx.get(cRef)).data();
    if (c.next >= c.total) throw new Error('finiti');
    const idx = String(c.next);
    tx.set(aRef, { idx, email: `${uid}@example.com`, name: uid, at: serverTimestamp() });
    tx.update(cRef, { next: c.next + 1 });
    return idx;
  });
}

// Come il client: riprova se la transazione perde la gara
async function drawWithRetry(db, uid) {
  for (let i = 0; ; i++) {
    try { return await draw(db, uid); } catch (e) {
      if (/finiti/.test(e.message) || i >= 8) throw e;
      await new Promise((r) => setTimeout(r, 50 + Math.random() * 200));
    }
  }
}

// Scrittura atomica "a mano" (batch) per provare varianti malevole
function rawDraw(db, uid, { idx, next, email, at, extra } = {}) {
  const b = writeBatch(db);
  b.set(doc(db, 'assignments', uid), {
    idx, email: email ?? `${uid}@example.com`, name: uid, at: at ?? serverTimestamp(), ...extra,
  });
  if (next !== undefined) b.update(doc(db, 'meta/counter'), { next });
  return b.commit();
}

test('estrazione valida: crea assegnazione e legge il proprio tema', async () => {
  const db = player('alice');
  const idx = await assertSucceeds(draw(db, 'alice'));
  assert.equal(idx, '0');
  const t = await assertSucceeds(getDoc(doc(db, 'pool', idx)));
  assert.equal(t.data().text, THEMES[0]);
  const c = await assertSucceeds(getDoc(doc(db, 'meta/counter')));
  assert.deepEqual(c.data(), { next: 1, total: THEMES.length });
});

test('un utente non legge i temi altrui (né prima né dopo aver estratto)', async () => {
  const db = player('alice');
  await assertFails(getDoc(doc(db, 'pool', '0')));
  await draw(db, 'alice'); // ottiene "0"
  await assertFails(getDoc(doc(db, 'pool', '1')));
  await assertFails(getDoc(doc(db, 'pool', '3')));
  await assertFails(getDocs(collection(db, 'pool')));
});

test('non si può estrarre due volte', async () => {
  const db = player('alice');
  await draw(db, 'alice');
  // la transazione del client restituisce la stessa assegnazione
  assert.equal(await draw(db, 'alice'), '0');
  // tentativo forzato di una seconda assegnazione
  await assertFails(rawDraw(db, 'alice', { idx: '1', next: 2 }));
  const c = (await getDoc(doc(db, 'meta/counter'))).data();
  assert.equal(c.next, 1);
});

test("non si può modificare né cancellare l'assegnazione", async () => {
  const db = player('alice');
  await draw(db, 'alice');
  await assertFails(updateDoc(doc(db, 'assignments/alice'), { idx: '2' }));
  await assertFails(setDoc(doc(db, 'assignments/alice'), { idx: '2', email: 'alice@example.com', name: 'a', at: serverTimestamp() }));
  await assertFails(deleteDoc(doc(db, 'assignments/alice')));
});

test('non si incrementa il counter da soli', async () => {
  const db = player('alice');
  await assertFails(updateDoc(doc(db, 'meta/counter'), { next: 1 }));
  await assertFails(updateDoc(doc(db, 'meta/counter'), { next: increment(1) }));
  await assertFails(updateDoc(doc(db, 'meta/counter'), { total: 99 }));
  await assertFails(setDoc(doc(db, 'meta/counter'), { next: 0, total: 99 }));
  await assertFails(deleteDoc(doc(db, 'meta/counter')));
});

test("non si crea l'assegnazione senza incrementare il counter, o con idx sbagliato", async () => {
  const db = player('alice');
  await assertFails(rawDraw(db, 'alice', { idx: '0' }));                // senza counter
  await assertFails(rawDraw(db, 'alice', { idx: '2', next: 1 }));       // idx scelto a mano
  await assertFails(rawDraw(db, 'alice', { idx: '0', next: 2 }));       // salto di 2
  await assertFails(rawDraw(db, 'alice', { idx: 0, next: 1 }));         // idx numerico
});

test("campi dell'assegnazione validati (email, at, campi extra, uid)", async () => {
  const db = player('alice');
  await assertFails(rawDraw(db, 'alice', { idx: '0', next: 1, email: 'bob@example.com' }));
  await assertFails(rawDraw(db, 'alice', { idx: '0', next: 1, at: Timestamp.fromDate(new Date(2020, 0, 1)) }));
  await assertFails(rawDraw(db, 'alice', { idx: '0', next: 1, extra: { admin: true } }));
  // assegnazione a nome di un altro uid
  const b = writeBatch(db);
  b.set(doc(db, 'assignments/bob'), { idx: '0', email: 'alice@example.com', name: 'x', at: serverTimestamp() });
  b.update(doc(db, 'meta/counter'), { next: 1 });
  await assertFails(b.commit());
  // la versione corretta passa
  await assertSucceeds(rawDraw(db, 'alice', { idx: '0', next: 1 }));
});

test('temi finiti: nessuna estrazione possibile', async () => {
  for (let i = 0; i < THEMES.length; i++) await draw(player('u' + i), 'u' + i);
  await assert.rejects(draw(player('late'), 'late'), /finiti/);
  await assertFails(rawDraw(player('late'), 'late', { idx: String(THEMES.length), next: THEMES.length + 1 }));
});

test('estrazioni concorrenti producono temi tutti diversi', async () => {
  const uids = ['p0', 'p1', 'p2', 'p3', 'p4', 'p5'];
  const results = await Promise.allSettled(uids.map((u) => drawWithRetry(player(u), u)));
  const ok = results.filter((r) => r.status === 'fulfilled').map((r) => r.value);
  const ko = results.filter((r) => r.status === 'rejected').map((r) => r.reason.message);
  // 4 temi per 6 persone: esattamente 4 riescono, ognuno con un idx diverso
  assert.deepEqual([...ok].sort(), ['0', '1', '2', '3']);
  assert.deepEqual(ko, ['finiti', 'finiti']);
  await env.withSecurityRulesDisabled(async (ctx) => {
    const snap = await getDocs(collection(ctx.firestore(), 'assignments'));
    const idxs = snap.docs.map((d) => d.data().idx);
    assert.equal(idxs.length, 4);
    assert.equal(new Set(idxs).size, 4);
    const c = (await getDoc(doc(ctx.firestore(), 'meta/counter'))).data();
    assert.equal(c.next, 4);
  });
});

test('due batch "grezzi" con lo stesso idx: solo uno passa', async () => {
  const r = await Promise.allSettled([
    rawDraw(player('a'), 'a', { idx: '0', next: 1 }),
    rawDraw(player('b'), 'b', { idx: '0', next: 1 }),
  ]);
  assert.equal(r.filter((x) => x.status === 'fulfilled').length, 1);
});

test('un non-admin non legge assignments (altrui o in lista) né pool', async () => {
  const alice = player('alice');
  await draw(player('bob'), 'bob');
  await assertFails(getDoc(doc(alice, 'assignments/bob')));
  await assertFails(getDocs(collection(alice, 'assignments')));
  await assertFails(getDocs(collection(alice, 'pool')));
  await assertSucceeds(getDoc(doc(alice, 'assignments/alice'))); // la propria (anche se non esiste)
  // finto admin: email giusta ma non verificata
  const fake = env.authenticatedContext('fake', { email: ADMIN_EMAIL, email_verified: false }).firestore();
  await assertFails(getDocs(collection(fake, 'assignments')));
  await assertFails(getDocs(collection(fake, 'pool')));
});

test('utente non autenticato non legge niente', async () => {
  const db = env.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(db, 'meta/counter')));
  await assertFails(getDoc(doc(db, 'pool/0')));
  await assertFails(getDocs(collection(db, 'assignments')));
});

test("l'admin legge tutto, carica temi e azzera", async () => {
  await draw(player('alice'), 'alice');
  const db = admin();
  await assertSucceeds(getDocs(collection(db, 'assignments')));
  await assertSucceeds(getDocs(collection(db, 'pool')));
  await assertSucceeds(deleteDoc(doc(db, 'assignments/alice')));
  await assertSucceeds(setDoc(doc(db, 'pool/0'), { text: 'Nuovo' }));
  await assertSucceeds(setDoc(doc(db, 'meta/counter'), { next: 0, total: 1 }));
  await assertSucceeds(deleteDoc(doc(db, 'pool/3')));
});

test('serate e voti: solo l\'admin legge e scrive', async () => {
  const adm = admin();
  await assertSucceeds(setDoc(doc(adm, 'sessions/s1'), { title: 'Serata', present: 5, createdAt: serverTimestamp() }));
  await assertSucceeds(setDoc(doc(adm, 'sessions/s1/drawings/d1'), { name: 'Anna', theme: 'X', order: 0, author: 0, themeOk: 0 }));
  await assertSucceeds(updateDoc(doc(adm, 'sessions/s1/drawings/d1'), { author: increment(1) }));
  await assertSucceeds(getDocs(collection(adm, 'sessions/s1/drawings')));

  const alice = player('alice');
  await assertFails(getDoc(doc(alice, 'sessions/s1')));
  await assertFails(getDocs(collection(alice, 'sessions')));
  await assertFails(getDocs(collection(alice, 'sessions/s1/drawings')));
  await assertFails(updateDoc(doc(alice, 'sessions/s1/drawings/d1'), { author: increment(1) }));
  await assertFails(setDoc(doc(alice, 'sessions/s2'), { title: 'Mia', present: 3 }));
  const fake = env.authenticatedContext('fake', { email: ADMIN_EMAIL, email_verified: false }).firestore();
  await assertFails(getDocs(collection(fake, 'sessions')));
  await assertFails(getDocs(collection(env.unauthenticatedContext().firestore(), 'sessions')));
});
