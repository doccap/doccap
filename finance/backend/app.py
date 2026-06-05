import os
import uuid
from flask import Flask, jsonify, request, session
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

import nordigen_client as ng
import analysis as an
import ai_insights

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "dev-secret")
CORS(app, supports_credentials=True, origins=["http://localhost:3000"])

# In-memory store for demo (replace with DB for production)
_requisitions = {}


@app.route("/api/institutions")
def institutions():
    country = request.args.get("country", "IT")
    data = ng.list_institutions(country)
    return jsonify(data)


@app.route("/api/connect", methods=["POST"])
def connect():
    body = request.json or {}
    institution_id = body.get("institution_id")
    if not institution_id:
        return jsonify({"error": "institution_id required"}), 400

    redirect_url = body.get("redirect_url", "http://localhost:3000/callback")
    reference = str(uuid.uuid4())
    req = ng.create_requisition(institution_id, redirect_url, reference)
    _requisitions[reference] = req["id"]
    session["requisition_id"] = req["id"]
    return jsonify({"link": req["link"], "requisition_id": req["id"], "reference": reference})


@app.route("/api/accounts")
def accounts():
    req_id = request.args.get("requisition_id") or session.get("requisition_id")
    if not req_id:
        return jsonify({"error": "Not connected"}), 400
    req = ng.get_requisition(req_id)
    account_ids = req.get("accounts", [])
    accounts_data = []
    for acc_id in account_ids:
        details = ng.get_account_details(acc_id)
        balances = ng.get_account_balances(acc_id)
        accounts_data.append({"id": acc_id, "details": details, "balances": balances})
    return jsonify(accounts_data)


@app.route("/api/transactions")
def transactions():
    account_id = request.args.get("account_id")
    if not account_id:
        return jsonify({"error": "account_id required"}), 400

    date_from = request.args.get("date_from")
    date_to = request.args.get("date_to")

    raw = ng.get_account_transactions(account_id, date_from, date_to)
    enriched = an.enrich_transactions(raw)
    return jsonify(enriched)


@app.route("/api/analysis")
def analysis():
    account_id = request.args.get("account_id")
    if not account_id:
        return jsonify({"error": "account_id required"}), 400

    date_from = request.args.get("date_from")
    date_to = request.args.get("date_to")

    raw = ng.get_account_transactions(account_id, date_from, date_to)
    txs = an.enrich_transactions(raw)

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
