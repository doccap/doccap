// Prova end-to-end del flusso giocatore + admin sugli emulatori.
// Esegui:  cd test && npm run e2e    (screenshot in test/screens/)
import { createRequire } from 'node:module';
import { readFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

// Playwright: va installato a parte (npm i -D playwright && npx playwright install chromium)
const { chromium } = createRequire(import.meta.url)('playwright');

const BASE = 'http://127.0.0.1:5000';
const ADMIN_EMAIL = readFileSync(new URL('../public/config.js', import.meta.url), 'utf8').match(/ADMIN_EMAIL = '([^']+)'/)[1];
const SDK_DIR = fileURLToPath(new URL('./node_modules/firebase/', import.meta.url));
const SHOTS = fileURLToPath(new URL('./screens/', import.meta.url));
mkdirSync(SHOTS, { recursive: true });

const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: '127.0.0.1,localhost' } : undefined;
const browser = await chromium.launch({ proxy });
const log = (...a) => console.log('•', ...a);

async function newPage({ mobile = true, scheme = 'light', reducedMotion = 'no-preference' } = {}) {
  const ctx = await browser.newContext({
    ...(mobile ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1280, height: 860 } }),
    colorScheme: scheme, reducedMotion, ignoreHTTPSErrors: true,
  });
  // L'SDK Firebase dal CDN gstatic viene servito dal pacchetto npm (stessa versione 12.19.0)
  await ctx.route('https://www.gstatic.com/firebasejs/12.19.0/*', (route) => {
    const file = new URL(route.request().url()).pathname.split('/').pop();
    route.fulfill({ path: SDK_DIR + file, contentType: 'text/javascript' });
  });
  const page = await ctx.newPage();
  page.on('requestfailed', (r) => console.error('  [reqfail]', r.url().slice(0, 120)));
  page.on('pageerror', (e) => console.error('  [pageerror]', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.error('  [console]', m.text()); });
  return page;
}

// Login: in questo ambiente apis.google.com (necessario al popup) non è raggiungibile,
// quindi si usa il login di prova esposto da firebase.js solo su localhost.
async function signIn(page, email, name) {
  await page.waitForFunction(() => window.__testSignIn);
  await page.evaluate(([e, n]) => window.__testSignIn(e, n), [email, name]);
}

const visible = (page, view) => page.waitForSelector(`[data-view="${view}"]:not([hidden])`, { timeout: 15000 });

// ── 1. Admin carica i temi ────────────────────────────────────────────────
const admin = await newPage({ mobile: false });
await admin.goto(`${BASE}/admin.html`);
await visible(admin, 'signin');
await signIn(admin, ADMIN_EMAIL, 'Organizzatore');
await visible(admin, 'admin');
await admin.fill('#themes', 'Un gatto astronauta\nLa pizza che vola\n  un GATTO   astronauta \n\nIl vulcano timido\nUna nuvola arrabbiata\n');
await admin.click('#load');
await admin.waitForFunction(() => document.querySelector('#total').textContent === '4' && document.querySelector('#load-msg').textContent);
assert.match(await admin.textContent('#load-msg'), /Caricati 4 temi.*Tolto 1 doppione/);
log('admin: 4 temi caricati (1 doppione tolto)');
await admin.screenshot({ path: SHOTS + 'admin-vuoto.png', fullPage: true });

// ── 2. Non admin su /admin.html ──────────────────────────────────────────
const intruder = await newPage();
await intruder.goto(`${BASE}/admin.html`);
await visible(intruder, 'signin');
await signIn(intruder, 'curioso@example.com', 'Curioso');
await visible(intruder, 'denied');
log('non-admin su /admin.html: accesso negato');

// ── 3. Primo giocatore ───────────────────────────────────────────────────
const anna = await newPage();
await anna.goto(BASE);
await visible(anna, 'signin');
await anna.screenshot({ path: SHOTS + '1-login.png', fullPage: true });
await signIn(anna, 'anna@example.com', 'Anna Rossi');
await visible(anna, 'draw');
assert.match(await anna.textContent('.js-left'), /Restano 4 temi/);
await anna.screenshot({ path: SHOTS + '2-estrai.png' });
await anna.click('#draw');
await visible(anna, 'reveal');
await anna.waitForTimeout(150);
await anna.screenshot({ path: SHOTS + '3-chiuso-in-apertura.png' });
await anna.waitForSelector('#note[data-open="true"]');
await anna.waitForTimeout(1200);
await anna.screenshot({ path: SHOTS + '4-aperto.png' });
const themeAnna = await anna.textContent('#theme');
log('anna ha pescato:', themeAnna);

// Torna sul sito: stesso tema, nessun pulsante per estrarre
await anna.reload();
await visible(anna, 'reveal');
assert.equal(await anna.textContent('#theme'), themeAnna);
assert.equal(await anna.getAttribute('#note', 'data-open'), 'false');
await anna.screenshot({ path: SHOTS + '5-ritorno-chiuso.png' });
await anna.click('#toggle');
await anna.waitForTimeout(330);
await anna.screenshot({ path: SHOTS + '5b-a-meta.png' });
await anna.waitForTimeout(800);
assert.equal(await anna.getAttribute('#note', 'data-open'), 'true');
log('anna ricarica: stesso tema, non può estrarre di nuovo');

// ── 4. Due giocatori estraggono nello stesso istante ─────────────────────
const [bruno, carla] = await Promise.all([newPage({ scheme: 'dark' }), newPage()]);
for (const [p, e, n] of [[bruno, 'bruno@example.com', 'Bruno'], [carla, 'carla@example.com', 'Carla']]) {
  await p.goto(BASE); await visible(p, 'signin'); await signIn(p, e, n); await visible(p, 'draw');
}
await Promise.all([bruno.click('#draw'), carla.click('#draw')]);
await Promise.all([visible(bruno, 'reveal'), visible(carla, 'reveal')]);
await bruno.waitForTimeout(1500);
await bruno.screenshot({ path: SHOTS + '6-aperto-dark.png', fullPage: true });
const themes = [themeAnna, await bruno.textContent('#theme'), await carla.textContent('#theme')];
log('bruno e carla (simultanei):', themes[1], '|', themes[2]);
assert.equal(new Set(themes).size, 3, 'temi duplicati!');

// ── 5. Ultimo tema, poi finiti ───────────────────────────────────────────
const dario = await newPage();
await dario.goto(BASE); await visible(dario, 'signin'); await signIn(dario, 'dario@example.com', 'Dario');
await visible(dario, 'draw');
assert.match(await dario.textContent('.js-left'), /Resta un solo tema/);
await dario.click('#draw'); await visible(dario, 'reveal');
themes.push(await dario.textContent('#theme'));
assert.equal(new Set(themes).size, 4);

const elena = await newPage({ reducedMotion: 'reduce' });
await elena.goto(BASE); await visible(elena, 'signin'); await signIn(elena, 'elena@example.com', 'Elena');
await visible(elena, 'message');
assert.match(await elena.textContent('[data-view="message"]'), /I temi sono finiti[\s\S]*Avvisa chi organizza/);
await elena.screenshot({ path: SHOTS + '7-finiti.png' });
log('elena: "I temi sono finiti"');

// ── 6. Tabella admin in tempo reale ──────────────────────────────────────
await admin.waitForFunction(() => document.querySelectorAll('#rows tr').length === 4);
assert.equal(await admin.textContent('#drawn'), '4');
assert.equal(await admin.textContent('#left'), '0');
const rows = await admin.$$eval('#rows tr', (trs) => trs.map((tr) => [...tr.children].map((td) => td.textContent)));
const byEmail = Object.fromEntries(rows.map((r) => [r[1], r[2]]));
assert.equal(byEmail['anna@example.com'], themeAnna);
assert.equal(rows.find((r) => r[1] === 'anna@example.com')[0], 'Anna Rossi');
assert.ok(rows.every((r) => /\d{2}\/\d{2}/.test(r[3])));
await admin.screenshot({ path: SHOTS + 'admin-pieno.png', fullPage: true });
const adminMobile = await newPage({ scheme: 'dark' });
log('admin vede 4 estrazioni in tempo reale');

// ── 7. Caricare temi con estrazioni presenti chiede conferma ─────────────
let dialogs = [];
admin.on('dialog', (d) => { dialogs.push(d.message()); d.dismiss(); });
await admin.fill('#themes', 'Tema A\nTema B');
await admin.click('#load');
await admin.waitForTimeout(500);
assert.match(dialogs[0], /4 persone hanno già estratto/);
assert.equal(await admin.textContent('#total'), '4', 'annullando non deve cambiare nulla');
log('caricare temi con estrazioni: chiede conferma (annullato → nulla cambia)');

// ── 8. Azzera le estrazioni ──────────────────────────────────────────────
admin.removeAllListeners('dialog');
admin.on('dialog', (d) => { dialogs.push(d.message()); d.accept(); });
await admin.click('#reset');
await admin.waitForFunction(() => document.querySelectorAll('#rows tr').length === 0 && document.querySelector('#total').textContent === '4');
assert.match(dialogs.at(-1), /Azzerare/);
log('admin azzera: tabella vuota, 0 su 4');

await anna.reload();
await visible(anna, 'draw');
log('anna dopo l\'azzeramento può estrarre di nuovo');

await elena.reload();
await visible(elena, 'draw');
await elena.click('#draw'); await visible(elena, 'reveal');
await elena.screenshot({ path: SHOTS + '8-reduced-motion.png' });

// Admin su telefono (dark)
await adminMobile.goto(`${BASE}/admin.html`);
await visible(adminMobile, 'signin');
await signIn(adminMobile, ADMIN_EMAIL, 'Organizzatore');
await visible(adminMobile, 'admin');
await adminMobile.waitForFunction(() => document.querySelectorAll('#rows tr').length === 1);
await adminMobile.screenshot({ path: SHOTS + 'admin-mobile-dark.png', fullPage: true });

await browser.close();
console.log('\n✔ flusso completo giocatore + admin OK');
