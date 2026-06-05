"""Expense analysis: categorization, trends, recurring detection, AI insights."""
import re
from collections import defaultdict
from datetime import datetime


CATEGORY_RULES = [
    ("Supermercato", ["esselunga", "coop", "lidl", "aldi", "conad", "carrefour", "eurospin", "pam", "ipercoop", "penny", "tigros"]),
    ("Ristoranti & Bar", ["bar ", "caffe", "café", "ristorante", "pizzeria", "trattoria", "mcdonald", "burger", "kfc", "starbucks", "sushi"]),
    ("Trasporti", ["atm ", "trenitalia", "italo", "ryanair", "easyjet", "flixbus", "uber", "bolt", "taxi", "autostrada", "telepass", "parking", "parcheggio"]),
    ("Abbonamenti", ["netflix", "spotify", "amazon prime", "disney", "dazn", "sky", "youtube premium", "apple", "google one", "icloud", "dropbox"]),
    ("Salute & Farmacia", ["farmacia", "medico", "dentista", "laboratorio", "visita", "analisi", "ospedale", "clinica"]),
    ("Casa & Utenze", ["enel", "eni", "a2a", "hera", "iren", "acqua ", "gas ", "luce ", "affitto", "mutuo", "condominio", "internet", "wind", "tim ", "vodafone", "iliad"]),
    ("Shopping", ["zara", "h&m", "primark", "zalando", "amazon", "ikea", "decathlon", "mediaworld", "unieuro"]),
    ("Sport & Benessere", ["palestra", "gym", "fitness", "piscina", "yoga", "crossfit"]),
    ("Istruzione", ["università", "corso", "udemy", "coursera", "libro", "libreria", "scuola"]),
    ("Banca & Finanza", ["commissione", "canone", "bollo", "bonifico", "prelievo", "atm"]),
    ("Intrattenimento", ["cinema", "teatro", "concerti", "museo", "ticketmaster", "ticketone", "eventbrite"]),
]


def categorize(description: str) -> str:
    desc_lower = (description or "").lower()
    for category, keywords in CATEGORY_RULES:
        for kw in keywords:
            if kw in desc_lower:
                return category
    return "Altro"


def parse_amount(tx: dict) -> float:
    try:
        return float(tx.get("transactionAmount", {}).get("amount", 0))
    except (ValueError, TypeError):
        return 0.0


def enrich_transactions(transactions: list) -> list:
    enriched = []
    for tx in transactions:
        amount = parse_amount(tx)
        desc = tx.get("remittanceInformationUnstructured") or tx.get("creditorName") or ""
        enriched.append({
            "id": tx.get("transactionId", ""),
            "date": tx.get("bookingDate", ""),
            "amount": amount,
            "description": desc,
            "category": categorize(desc),
            "currency": tx.get("transactionAmount", {}).get("currency", "EUR"),
        })
    return enriched


def expenses_by_category(transactions: list) -> dict:
    totals = defaultdict(float)
    for tx in transactions:
        if tx["amount"] < 0:
            totals[tx["category"]] += abs(tx["amount"])
    return dict(sorted(totals.items(), key=lambda x: x[1], reverse=True))


def monthly_trends(transactions: list) -> dict:
    monthly = defaultdict(float)
    for tx in transactions:
        if tx["amount"] < 0 and tx.get("date"):
            month = tx["date"][:7]  # YYYY-MM
            monthly[month] += abs(tx["amount"])
    return dict(sorted(monthly.items()))


def detect_recurring(transactions: list) -> list:
    """Detect recurring payments by finding similar descriptions with regular intervals."""
    desc_map = defaultdict(list)
    for tx in transactions:
        if tx["amount"] < 0:
            key = _normalize_desc(tx["description"])
            desc_map[key].append(tx)

    recurring = []
    for key, txs in desc_map.items():
        if len(txs) >= 2:
            txs_sorted = sorted(txs, key=lambda t: t["date"])
            amounts = [abs(t["amount"]) for t in txs_sorted]
            avg_amount = sum(amounts) / len(amounts)
            if max(amounts) - min(amounts) < avg_amount * 0.1:  # <10% variance = recurring
                recurring.append({
                    "description": txs_sorted[-1]["description"],
                    "category": txs_sorted[-1]["category"],
                    "avg_amount": round(avg_amount, 2),
                    "frequency": len(txs_sorted),
                    "last_date": txs_sorted[-1]["date"],
                    "annual_cost": round(avg_amount * len(txs_sorted), 2),
                })
    return sorted(recurring, key=lambda x: x["annual_cost"], reverse=True)


def _normalize_desc(desc: str) -> str:
    desc = (desc or "").lower()
    desc = re.sub(r"\d{2,}", "", desc)  # remove numbers (dates, refs)
    desc = re.sub(r"\s+", " ", desc).strip()
    return desc[:40]


def top_merchants(transactions: list, n: int = 10) -> list:
    totals = defaultdict(float)
    for tx in transactions:
        if tx["amount"] < 0 and tx["description"]:
            totals[tx["description"][:50]] += abs(tx["amount"])
    sorted_m = sorted(totals.items(), key=lambda x: x[1], reverse=True)
    return [{"merchant": m, "total": round(v, 2)} for m, v in sorted_m[:n]]
