"""TrueLayer Open Banking client (PSD2)."""
import os
import requests
from urllib.parse import urlencode

AUTH_URL = "https://auth.truelayer.com"
DATA_URL = "https://api.truelayer.com/data/v1"
SANDBOX_AUTH_URL = "https://auth.truelayer-sandbox.com"
SANDBOX_DATA_URL = "https://api.truelayer-sandbox.com/data/v1"

PROVIDERS = [
    "uk-ob-all", "it-ob-all",  # aggregated
    # Italian banks (TrueLayer provider IDs)
    "intesa-sanpaolo-it", "unicredit-it", "bnl-it", "mediolanum-it",
    "fineco-it", "banco-bpm-it", "mps-it", "credem-it", "bper-it",
    "ing-it", "n26-it", "revolut", "wise",
]


def _base(sandbox: bool = False):
    return (SANDBOX_AUTH_URL, SANDBOX_DATA_URL) if sandbox else (AUTH_URL, DATA_URL)


def get_auth_url(redirect_uri: str, state: str, sandbox: bool = False) -> str:
    auth_base, _ = _base(sandbox)
    params = {
        "response_type": "code",
        "client_id": os.environ["TRUELAYER_CLIENT_ID"],
        "scope": "info accounts balance transactions",
        "redirect_uri": redirect_uri,
        "state": state,
    }
    if sandbox:
        params["providers"] = "mock"
    return f"{auth_base}/?{urlencode(params)}"


def exchange_code(code: str, redirect_uri: str, sandbox: bool = False) -> dict:
    auth_base, _ = _base(sandbox)
    resp = requests.post(f"{auth_base}/connect/token", data={
        "grant_type": "authorization_code",
        "client_id": os.environ["TRUELAYER_CLIENT_ID"],
        "client_secret": os.environ["TRUELAYER_CLIENT_SECRET"],
        "code": code,
        "redirect_uri": redirect_uri,
    })
    resp.raise_for_status()
    return resp.json()


def refresh_token(refresh_tok: str, sandbox: bool = False) -> dict:
    auth_base, _ = _base(sandbox)
    resp = requests.post(f"{auth_base}/connect/token", data={
        "grant_type": "refresh_token",
        "client_id": os.environ["TRUELAYER_CLIENT_ID"],
        "client_secret": os.environ["TRUELAYER_CLIENT_SECRET"],
        "refresh_token": refresh_tok,
    })
    resp.raise_for_status()
    return resp.json()


def _auth_header(access_token: str) -> dict:
    return {"Authorization": f"Bearer {access_token}"}


def get_accounts(access_token: str, sandbox: bool = False) -> list:
    _, data_base = _base(sandbox)
    resp = requests.get(f"{data_base}/accounts", headers=_auth_header(access_token))
    resp.raise_for_status()
    return resp.json().get("results", [])


def get_account_transactions(access_token: str, account_id: str,
                              date_from: str = None, date_to: str = None,
                              sandbox: bool = False) -> list:
    _, data_base = _base(sandbox)
    # Sandbox mock bank only has pre-seeded data; ignore date filters to avoid 400s
    params = {} if sandbox else {}
    if not sandbox:
        if date_from:
            params["from"] = f"{date_from}T00:00:00Z"
        if date_to:
            params["to"] = f"{date_to}T23:59:59Z"
    resp = requests.get(
        f"{data_base}/accounts/{account_id}/transactions",
        headers=_auth_header(access_token),
        params=params,
    )
    resp.raise_for_status()
    return resp.json().get("results", [])


def get_account_balance(access_token: str, account_id: str, sandbox: bool = False) -> dict:
    _, data_base = _base(sandbox)
    resp = requests.get(
        f"{data_base}/accounts/{account_id}/balance",
        headers=_auth_header(access_token),
    )
    resp.raise_for_status()
    results = resp.json().get("results", [])
    return results[0] if results else {}
