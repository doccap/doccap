"""Tink Open Banking client."""
import os
import requests
from urllib.parse import urlencode

TINK_LINK_URL = "https://link.tink.com/1.0/transactions/connect-accounts"
TINK_API_URL = "https://api.tink.com"


def get_auth_url(redirect_uri: str, state: str) -> str:
    params = {
        "client_id": os.environ["TINK_CLIENT_ID"],
        "redirect_uri": redirect_uri,
        "scope": "accounts:read,transactions:read,balances:read",
        "market": "IT",
        "locale": "it_IT",
        "state": state,
    }
    return f"{TINK_LINK_URL}?{urlencode(params)}"


def exchange_code(code: str, redirect_uri: str) -> dict:
    resp = requests.post(f"{TINK_API_URL}/api/v1/oauth/token", data={
        "code": code,
        "client_id": os.environ["TINK_CLIENT_ID"],
        "client_secret": os.environ["TINK_CLIENT_SECRET"],
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code",
    })
    resp.raise_for_status()
    return resp.json()


def _auth_header(access_token: str) -> dict:
    return {"Authorization": f"Bearer {access_token}"}


def _parse_amount(amount_obj: dict) -> float:
    try:
        val = amount_obj.get("value", {})
        scale = int(val.get("scale", 0))
        unscaled = int(val.get("unscaledValue", 0))
        return unscaled / (10 ** scale)
    except (ValueError, TypeError, ZeroDivisionError):
        return 0.0


def get_accounts(access_token: str) -> list:
    resp = requests.get(
        f"{TINK_API_URL}/data/v2/accounts",
        headers=_auth_header(access_token),
    )
    resp.raise_for_status()
    accounts = resp.json().get("accounts", [])
    result = []
    for acc in accounts:
        balances = acc.get("balances", {})
        available = balances.get("available") or balances.get("booked") or {}
        balance_amount = _parse_amount(available.get("amount", {}))
        currency = (available.get("amount", {}).get("currencyCode") or "EUR")
        result.append({
            "id": acc.get("id", ""),
            "display_name": acc.get("name", ""),
            "account_type": acc.get("type", ""),
            "currency": currency,
            "iban": acc.get("identifiers", {}).get("iban", {}).get("iban", ""),
            "balance": {"available": balance_amount, "current": balance_amount, "currency": currency},
        })
    return result


def get_transactions(access_token: str, account_id: str = None,
                     date_from: str = None, date_to: str = None) -> list:
    params = {"pageSize": 100}
    if account_id:
        params["accountIdIn"] = account_id
    if date_from:
        params["bookedDateGte"] = date_from
    if date_to:
        params["bookedDateLte"] = date_to

    all_txs = []
    next_page_token = None
    while True:
        if next_page_token:
            params["pageToken"] = next_page_token
        resp = requests.get(
            f"{TINK_API_URL}/data/v2/transactions",
            headers=_auth_header(access_token),
            params=params,
        )
        resp.raise_for_status()
        data = resp.json()
        all_txs.extend(data.get("transactions", []))
        next_page_token = data.get("nextPageToken")
        if not next_page_token:
            break
    return all_txs
