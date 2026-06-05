import os
import requests

BASE_URL = "https://bankaccountdata.gocardless.com/api/v2"


def _get_token():
    resp = requests.post(f"{BASE_URL}/token/new/", json={
        "secret_id": os.environ["NORDIGEN_SECRET_ID"],
        "secret_key": os.environ["NORDIGEN_SECRET_KEY"],
    })
    resp.raise_for_status()
    return resp.json()["access"]


def list_institutions(country="IT"):
    token = _get_token()
    resp = requests.get(
        f"{BASE_URL}/institutions/",
        params={"country": country},
        headers={"Authorization": f"Bearer {token}"},
    )
    resp.raise_for_status()
    return resp.json()


def create_requisition(institution_id: str, redirect_url: str, reference: str):
    token = _get_token()
    resp = requests.post(
        f"{BASE_URL}/requisitions/",
        json={
            "redirect": redirect_url,
            "institution_id": institution_id,
            "reference": reference,
            "user_language": "IT",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    resp.raise_for_status()
    return resp.json()


def get_requisition(requisition_id: str):
    token = _get_token()
    resp = requests.get(
        f"{BASE_URL}/requisitions/{requisition_id}/",
        headers={"Authorization": f"Bearer {token}"},
    )
    resp.raise_for_status()
    return resp.json()


def get_account_transactions(account_id: str, date_from: str = None, date_to: str = None):
    token = _get_token()
    params = {}
    if date_from:
        params["date_from"] = date_from
    if date_to:
        params["date_to"] = date_to
    resp = requests.get(
        f"{BASE_URL}/accounts/{account_id}/transactions/",
        params=params,
        headers={"Authorization": f"Bearer {token}"},
    )
    resp.raise_for_status()
    return resp.json().get("transactions", {}).get("booked", [])


def get_account_details(account_id: str):
    token = _get_token()
    resp = requests.get(
        f"{BASE_URL}/accounts/{account_id}/details/",
        headers={"Authorization": f"Bearer {token}"},
    )
    resp.raise_for_status()
    return resp.json().get("account", {})


def get_account_balances(account_id: str):
    token = _get_token()
    resp = requests.get(
        f"{BASE_URL}/accounts/{account_id}/balances/",
        headers={"Authorization": f"Bearer {token}"},
    )
    resp.raise_for_status()
    return resp.json().get("balances", [])
