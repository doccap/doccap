import os
import uuid
import random
from datetime import date, timedelta
from flask import Flask, jsonify, request, session
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"), override=True)

import truelayer_client as tl
import tink_client as tk
import analysis as an
import ai_insights

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "dev-secret")
CORS(app, supports_credentials=True, origins=["http://localhost:3000"])

PROVIDER = os.environ.get("PROVIDER", "tink")  # "tink" or "truelayer"
SANDBOX = os.environ.get("TRUELAYER_SANDBOX", "false").lower() == "true"
REDIRECT_URI = os.environ.get("REDIRECT_URI", "http://localhost:3000/callback")

_tokens: dict[str, dict] = {}
_demo_txs: dict[str, list] = {}


@app.route("/api/auth/url")
def auth_url():
    state = str(uuid.uuid4())
    session["oauth_state"] = state
    if PROVIDER == "tink":
        url = tk.get_auth_url(REDIRECT_URI, state)
    else:
        url = tl.get_auth_url(REDIRECT_URI, state, sandbox=SANDBOX)
    return jsonify({"url": url, "state": state})


@app.route("/api/auth/callback", methods=["POST"])
def auth_callback():
    body = request.json or {}
    code = body.get("code")
    if not code:
        return jsonify({"error": "missing code"}), 400
    if PROVIDER == "tink":
        token_data = tk.exchange_code(code, REDIRECT_URI)
    else:
        token_data = tl.exchange_code(code, REDIRECT_URI, sandbox=SANDBOX)
    token_id = str(uuid.uuid4())
    _tokens[token_id] = token_data
    session["token_id"] = token_id
    return jsonify({"token_id": token_id})


@app.route("/api/upload-csv", methods=["POST"])
def upload_csv():
    import csv, io
    f = request.files.get("file")
    if not f:
        return jsonify({"error": "no file"}), 400
    content = f.read().decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(content))
    rows = list(reader)
    if not rows:
        return jsonify({"error": "empty file"}), 400
    token_id = f"csv-{uuid.uuid4()}"
    txs = an.enrich_transactions_hype_csv(rows)
    _tokens[token_id] = {"access_token": "csv", "csv": True}
    _demo_txs[token_id] = txs
    iban = rows[0].get("Iban", "") if rows else ""
    _csv_meta[token_id] = {"iban": iban, "count": len(txs)}
    return jsonify({"token_id": token_id})


_csv_meta: dict[str, dict] = {}


@app.route("/api/demo")
def demo():
    random.seed(42)
    merchants = [
        ("Esselunga", -52.30), ("Netflix", -15.99), ("Spotify", -9.99),
        ("Trenitalia", -38.50), ("Amazon", -67.80), ("Farmacia Centrale", -23.40),
        ("Pizzeria Da Mario", -28.00), ("Enel Energia", -95.00), ("IKEA", -142.50),
        ("Starbucks", -6.50), ("Uber", -12.80), ("Lidl", -41.20),
        ("Tim Mobile", -19.99), ("McDonald's", -11.30), ("Decathlon", -55.00),
        ("Bar Centrale", -3.20), ("Zalando", -89.90), ("Zara", -64.00),
        ("Medico di base", -50.00), ("Palestra FitClub", -39.90),
        ("Stipendio", 1850.00), ("Freelance XYZ", 350.00),
    ]
    txs = []
    today = date.today()
    for i in range(90):
        tx_date = today - timedelta(days=i)
        for name, base_amount in random.sample(merchants, k=random.randint(3, 6)):
            jitter = random.uniform(0.85, 1.15) if base_amount < 0 else 1.0
            txs.append({
                "transaction_id": str(uuid.uuid4()),
                "amount": round(base_amount * jitter, 2),
                "description": name,
                "timestamp": tx_date.isoformat(),
                "currency": "EUR",
            })
    token_id = "demo-token"
    _tokens[token_id] = {"access_token": "demo", "demo": True}
    _demo_txs[token_id] = an.enrich_transactions_truelayer(txs)
    return jsonify({"token_id": token_id})


def _get_accounts(token_data):
    access_token = token_data["access_token"]
    if PROVIDER == "tink":
        return tk.get_accounts(access_token)
    accs = tl.get_accounts(access_token, sandbox=SANDBOX)
    result = []
    for acc in accs:
        balance = tl.get_account_balance(access_token, acc["account_id"], sandbox=SANDBOX)
        result.append({
            "id": acc["account_id"],
            "display_name": acc.get("display_name", ""),
            "account_type": acc.get("account_type", ""),
            "currency": acc.get("currency", "EUR"),
            "iban": acc.get("account_number", {}).get("iban", ""),
            "balance": balance,
        })
    return result


def _get_transactions(token_data, account_id, date_from=None, date_to=None):
    access_token = token_data["access_token"]
    if PROVIDER == "tink":
        raw = tk.get_transactions(access_token, account_id, date_from, date_to)
        return an.enrich_transactions_tink(raw)
    raw = tl.get_account_transactions(access_token, account_id, date_from, date_to, sandbox=SANDBOX)
    return an.enrich_transactions_truelayer(raw)


@app.route("/api/accounts")
def accounts():
    token_id = request.args.get("token_id") or session.get("token_id")
    if token_id and token_id.startswith("csv-"):
        meta = _csv_meta.get(token_id, {})
        return jsonify([{
            "id": f"{token_id}-account",
            "display_name": "Hype (CSV)",
            "account_type": "TRANSACTION",
            "currency": "EUR",
            "iban": meta.get("iban", ""),
            "balance": {"available": None, "current": None, "currency": "EUR"},
        }])
    if token_id == "demo-token":
        return jsonify([{
            "id": "demo-account",
            "display_name": "Conto Demo",
            "account_type": "TRANSACTION",
            "currency": "EUR",
            "iban": "IT60 X054 2811 1010 0000 0123 456",
            "balance": {"available": 2340.50, "current": 2340.50, "currency": "EUR"},
        }])
    token_data = _tokens.get(token_id)
    if not token_data:
        return jsonify({"error": "Not authenticated"}), 401
    return jsonify(_get_accounts(token_data))


@app.route("/api/transactions")
def transactions():
    token_id = request.args.get("token_id") or session.get("token_id")
    account_id = request.args.get("account_id")
    if token_id == "demo-token" or (token_id and token_id.startswith("csv-")):
        return jsonify(_demo_txs.get(token_id, []))
    token_data = _tokens.get(token_id)
    if not token_data:
        return jsonify({"error": "Not authenticated"}), 401
    date_from = request.args.get("date_from")
    date_to = request.args.get("date_to")
    return jsonify(_get_transactions(token_data, account_id, date_from, date_to))


@app.route("/api/analysis")
def analysis():
    token_id = request.args.get("token_id") or session.get("token_id")
    account_id = request.args.get("account_id")
    if token_id == "demo-token" or (token_id and token_id.startswith("csv-")):
        txs = _demo_txs.get(token_id, [])
    else:
        token_data = _tokens.get(token_id)
        if not token_data:
            return jsonify({"error": "Not authenticated"}), 401
        date_from = request.args.get("date_from")
        date_to = request.args.get("date_to")
        txs = _get_transactions(token_data, account_id, date_from, date_to)
    return jsonify({
        "by_category": an.expenses_by_category(txs),
        "monthly_trends": an.monthly_trends(txs),
        "recurring": an.detect_recurring(txs),
        "top_merchants": an.top_merchants(txs),
        "total_expenses": round(sum(abs(t["amount"]) for t in txs if t["amount"] < 0), 2),
        "total_income": round(sum(t["amount"] for t in txs if t["amount"] > 0), 2),
        "transaction_count": len(txs),
    })


@app.route("/api/insights", methods=["POST"])
def insights():
    body = request.json or {}
    try:
        result = ai_insights.get_optimization_suggestions(
            body.get("by_category", {}),
            body.get("monthly_trends", {}),
            body.get("recurring", []),
            body.get("top_merchants", []),
        )
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True, port=5050)
