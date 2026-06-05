#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Check dependencies
command -v python3 >/dev/null 2>&1 || { echo "ERROR: python3 non trovato"; exit 1; }
command -v node >/dev/null 2>&1 || { echo "ERROR: node non trovato"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "ERROR: npm non trovato"; exit 1; }

# Create .env if missing
if [ ! -f "$SCRIPT_DIR/backend/.env" ]; then
  cp "$SCRIPT_DIR/backend/.env.example" "$SCRIPT_DIR/backend/.env"
  echo ""
  echo "ATTENZIONE: Creato backend/.env da template."
  echo "Inserisci le tue credenziali in finance/backend/.env e riesegui questo script."
  echo ""
  exit 1
fi

echo "=> Installazione dipendenze backend..."
cd "$SCRIPT_DIR/backend"
pip install -r requirements.txt -q

echo "=> Installazione dipendenze frontend..."
cd "$SCRIPT_DIR/frontend"
npm install --silent

echo ""
echo "=> Avvio backend su http://localhost:5050 ..."
cd "$SCRIPT_DIR/backend"
python3 app.py &
BACKEND_PID=$!

echo "=> Avvio frontend su http://localhost:3000 ..."
cd "$SCRIPT_DIR/frontend"
BROWSER=none npm start &
FRONTEND_PID=$!

echo ""
echo "============================================"
echo "  Finance Dashboard avviata!"
echo "  Apri: http://localhost:3000"
echo "  (Ctrl+C per fermare tutto)"
echo "============================================"
echo ""

# Stop both on Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'Fermato.'" INT TERM
wait
