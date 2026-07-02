# Finance Dashboard

Dashboard per analisi delle spese bancarie tramite Open Banking PSD2.

## Stack
- **Backend**: Python / Flask + TrueLayer API (Open Banking PSD2)
- **Frontend**: React + Recharts
- **AI**: Claude (suggerimenti di ottimizzazione)

## Setup

### 1. Registrati su TrueLayer (gratis)
1. Vai su [console.truelayer.com](https://console.truelayer.com/)
2. Crea un account e una nuova app
3. Nella sezione **Credentials** ottieni `Client ID` e `Client Secret`
4. In **Redirect URIs** aggiungi: `http://localhost:3000/callback`
5. Assicurati di abilitare i permessi: `accounts`, `balance`, `transactions`

> **Nota sandbox**: per testare senza una vera banca, imposta `TRUELAYER_SANDBOX=true` nel `.env`
> e usa le credenziali di test della sandbox TrueLayer.

### 2. Backend

```bash
cd finance/backend
cp .env.example .env
# Compila .env con le tue credenziali TrueLayer e Anthropic

pip install -r requirements.txt
python app.py
# Server su http://localhost:5050
```

### 3. Frontend

```bash
cd finance/frontend
npm install
npm start
# App su http://localhost:3000
```

## Variabili d'ambiente

| Variabile | Descrizione |
|---|---|
| `TRUELAYER_CLIENT_ID` | Client ID dall'app TrueLayer |
| `TRUELAYER_CLIENT_SECRET` | Client Secret dall'app TrueLayer |
| `TRUELAYER_SANDBOX` | `true` per usare la sandbox (default: false) |
| `REDIRECT_URI` | URI di redirect (default: `http://localhost:3000/callback`) |
| `ANTHROPIC_API_KEY` | API key per i suggerimenti AI |
| `FLASK_SECRET_KEY` | Stringa casuale per le sessioni Flask |

## Flusso

1. Apri `http://localhost:3000`
2. Clicca "Collega il tuo conto"
3. Scegli la tua banca nel portale TrueLayer e autorizza
4. Vieni reindirizzato alla dashboard
5. Visualizza categorie, trend mensili, spese ricorrenti
6. Clicca "Analizza con AI" per suggerimenti di ottimizzazione

## API Backend

| Endpoint | Descrizione |
|---|---|
| `GET /api/auth/url` | Genera URL OAuth TrueLayer |
| `POST /api/auth/callback` | Scambia code per access token |
| `GET /api/accounts?token_id=...` | Conti e saldi |
| `GET /api/analysis?token_id=...&account_id=...` | Analisi completa |
| `GET /api/transactions?token_id=...&account_id=...` | Lista movimenti |
| `POST /api/insights` | Suggerimenti AI |
