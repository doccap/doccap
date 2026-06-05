# Finance Dashboard

Dashboard per analisi delle spese bancarie tramite Open Banking PSD2.

## Stack
- **Backend**: Python / Flask + Nordigen API (GoCardless Bank Account Data)
- **Frontend**: React + Recharts
- **AI**: Claude (suggerimenti di ottimizzazione)

## Setup

### 1. Registrati su Nordigen (gratis)
1. Vai su [bankaccountdata.gocardless.com](https://bankaccountdata.gocardless.com/)
2. Crea un account e ottieni `Secret ID` e `Secret Key`

### 2. Backend

```bash
cd finance/backend
cp .env.example .env
# Compila .env con le tue credenziali

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

## Flusso

1. Apri `http://localhost:3000`
2. Cerca e seleziona la tua banca
3. Autorizza l'accesso tramite il portale della banca (OAuth PSD2)
4. Vieni reindirizzato alla dashboard
5. Visualizza categorie, trend mensili, spese ricorrenti
6. Clicca "Analizza con AI" per suggerimenti di ottimizzazione

## API Backend

| Endpoint | Descrizione |
|---|---|
| `GET /api/institutions?country=IT` | Lista banche italiane |
| `POST /api/connect` | Avvia connessione OAuth |
| `GET /api/accounts` | Conti collegati |
| `GET /api/analysis?account_id=...` | Analisi completa |
| `GET /api/transactions?account_id=...` | Lista movimenti |
| `POST /api/insights` | Suggerimenti AI |
