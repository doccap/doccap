import os
import uuid
from flask import Flask, jsonify, request, session
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

import truelayer_client as tl
import analysis as an
import ai_insights

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "dev-secret")
CORS(app, supports_credentials=True, origins=["http://localhost:3000"])

SANDBOX = os.environ.get("TRUELAYER_SANDBOX", "false").lower() == "true"
REDIRECT_URI = os.environ.get("REDIRECT_URI", "http://localhost:3000/callback")

# In-memory token store (replace with DB / encrypted storage for production)
_tokens: dict[str, dict] = {}


@app.route("/api/auth/url")
def auth_url():
    state = str(uuid.uuid4())
    session["oauth_state"] = state
    url = tl.get_auth_url(REDIRECT_URI, state, sandbox=SANDBOX)
    return jsonify({"url": url, "state": state})


@app.route("/api/auth/callback", methods=["POST"])
def auth_callback():
    body = request.json or {}
    code = body.get("code")
    state = body.get("state")

    if not code:
        return jsonify({"error": "missing code"}), 400

    token_data = tl.exchange_code(code, REDIRECT_URI, sandbox=SANDBOX)
    token_id = str(uuid.uuid4())
    _tokens[token_id] = token_data
    session["token_id"] = token_id
    return jsonify({"token_id": token_id})


@app.route("/api/accounts")
def accounts():
    token_id = request.args.get("token_id") or session.get("token_id")
    token_data = _tokens.get(token_id)
    if not token_data:
        return jsonify({"error": "Not authenticated"}), 401

    access_token = token_data["access_token"]
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
    return jsonify(result)


@app.route("/api/transactions")
def transactions():
    token_id = request.args.get("token_id") or session.get("token_id")
    account_id = request.args.get("account_id")
    token_data = _tokens.get(token_id)

    if not token_data or not account_id:
        return jsonify({"error": "token_id and account_id required"}), 400

    date_from = request.args.get("date_from")
    date_to = request.args.get("date_to")

    raw = tl.get_account_transactions(
        token_data["access_token"], account_id, date_from, date_to, sandbox=SANDBOX
    )
    enriched = an.enrich_transactions_truelayer(raw)
    return jsonify(enriched)


@app.route("/api/analysis")
def analysis():
    token_id = request.args.get("token_id") or session.get("token_id")
    account_id = request.args.get("account_id")
    token_data = _tokens.get(token_id)

    if not token_data or not account_id:
        return jsonify({"error": "token_id and account_id required"}), 400

    date_from = request.args.get("date_from")
    date_to = request.args.get("date_to")

    raw = tl.get_account_transactions(
        token_data["access_token"], account_id, date_from, date_to, sandbox=SANDBOX
    )
    txs = an.enrich_transactions_truelayer(raw)

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
