# Doccap Drawing Challenge ✏️

Piccolo sito per un gioco tra amici: ognuno entra con Google e pesca un tema segreto da disegnare.
Temi unici, ognuno vede solo il proprio, niente seconde estrazioni. Pagina di regia su `/admin.html`.

Sito statico (HTML/CSS/JS, nessun build) + Firebase Auth (Google) + Cloud Firestore + Firebase Hosting.
Resta nel piano gratuito **Spark**: nessuna Cloud Function. Unicità e segretezza sono garantite da `firestore.rules`.

## File

| File | Cosa contiene |
|---|---|
| `public/config.js` | **da compilare**: `firebaseConfig` + `ADMIN_EMAIL` |
| `firestore.rules` | regole di sicurezza (contiene di nuovo l'email admin in `isAdmin()`) |
| `public/index.html` | pagina dei giocatori |
| `public/admin.html` | regia: carica temi, tabella in tempo reale, azzera |
| `public/voti.html` | voti delle serate (solo admin): per ogni disegno quanti indovinano autore e tema, chi balla |
| `public/firebase.js` | inizializzazione Firebase e login (popup → redirect se bloccato) |
| `public/style.css` | stile |
| `firebase.json` | configurazione Hosting/Firestore/emulatori |
| `.firebaserc` | progetto Firebase (`doccap-drawing-challenge`) |
| `test/` | test delle regole + prova end-to-end sugli emulatori |

## Messa online (una volta sola, ~10 minuti)

Serve Node.js 20+ sul computer.

1. **Crea il progetto** — <https://console.firebase.google.com> → *Aggiungi progetto* → un nome (es. `estrai-tema`). Google Analytics non serve.
2. **Abilita il login Google** — *Build → Authentication → Inizia → Metodo di accesso → Google → Abilita*, scegli l'email di assistenza, *Salva*.
3. **Crea il database** — *Build → Firestore Database → Crea database* → edizione **Standard**, ID `(default)`, località **`europe-west8` (Milano)** → *Avvia in modalità produzione*. La località non si può cambiare dopo.
4. **Registra l'app web** — *Impostazioni progetto (⚙️) → Generali → Le tue app → `</>` Web* → un nickname → *Registra app* (la casella "Hosting" qui non serve). Copia l'oggetto `firebaseConfig`.
5. **Compila la configurazione**
   - `public/config.js`: incolla i valori di `firebaseConfig` e controlla `ADMIN_EMAIL`.
   - `firestore.rules`: in `isAdmin()` la stessa email (minuscola, identica).
6. **Pubblica** (dalla cartella `estrai-tema/`):
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase deploy --only firestore:rules,hosting
   ```
7. **Carica i temi** — apri `https://<ID-PROGETTO>.firebaseapp.com/admin.html`, entra con l'account admin, incolla i temi (uno per riga) → *Carica temi*.
8. **Condividi il link** `https://<ID-PROGETTO>.firebaseapp.com/` con gli amici.

> **Perché `.firebaseapp.com` e non `.web.app`?** Su iPhone/Safari il login funziona in modo affidabile
> solo se il sito è sullo stesso dominio di `authDomain` (cioè `<ID-PROGETTO>.firebaseapp.com`).
> Entrambi gli indirizzi servono lo stesso sito: condividi quello `firebaseapp.com`.
> Se usi un dominio tuo, aggiungilo in *Authentication → Impostazioni → Domini autorizzati*.

## Come funziona (e perché è sicuro senza backend)

- `pool/{i}` — i temi già mescolati (`crypto.getRandomValues`), id `"0"`, `"1"`, …
- `meta/counter` — `{next, total}`: il prossimo numero libero.
- `assignments/{uid}` — `{idx, email, name, at}`.

L'estrazione è una transazione che crea `assignments/{uid}` con `idx = next` **e** porta `next` a `next + 1`
nella stessa scrittura. Le regole accettano solo esattamente questo (con `getAfter`/`existsAfter`), quindi
due persone che estraggono nello stesso istante non possono prendere lo stesso numero: una delle due
scritture viene rifiutata e il client riprova con il numero successivo. Ogni giocatore può leggere solo
`pool/{idx della propria assegnazione}`; non può modificare né cancellare l'assegnazione.

Regia: *Carica temi* deduplica (senza distinguere maiuscole e spazi), mescola e salva; se qualcuno ha già
estratto chiede conferma e azzera le estrazioni. *Azzera le estrazioni* cancella le assegnazioni e rimescola.
Durante queste operazioni le estrazioni sono bloccate per un attimo (`total = 0`).

## Provarlo in locale / test

Serve Java 11+ (per l'emulatore Firestore).

```bash
cd test
npm install
npm run test:rules   # test delle regole (@firebase/rules-unit-testing)
npm run serve        # emulatori auth+firestore+hosting → http://127.0.0.1:5000
# prova automatica giocatore+admin (serve Playwright: npm i -D playwright && npx playwright install chromium)
npm run e2e
```

Su `localhost`/`127.0.0.1` il sito usa sempre gli emulatori, mai il progetto vero.
