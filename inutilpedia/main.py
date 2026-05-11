#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
INUTILPEDIA Automation - main.py

Cosa fa:
- Reminder "entro X giorni" (default daily: entro 2 giorni) su Telegram.
- Weekly buffer check: avvisa se ci sono meno di N contenuti in stato "Editato".
- Logging configurabile via env LOG_LEVEL (default INFO).
- Retry con backoff esponenziale per chiamate Notion e Telegram.
- Gestione errori con notifica su Telegram in daily/weekly.

Env richieste:
  NOTION_TOKEN, DATABASE_ID, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
Opzionali:
  LOG_LEVEL (DEBUG/INFO/WARNING/ERROR), MODE (daily/weekly),
  DAILY_WINDOW_DAYS (default 2), WEEKLY_MIN_READY (default 2)
"""

import os
import json
import time
import logging
import datetime as dt
from typing import Any, Dict, List, Tuple, Optional, Callable

import requests
from dateutil.tz import gettz
from notion_client import Client, APIResponseError

# =======================
# Config & Logging
# =======================
LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format="%(asctime)s | %(levelname)s | %(message)s",
)
logger = logging.getLogger(__name__)

# =======================
# ENV
# =======================
def _getenv(name: str) -> str:
    val = os.environ.get(name)
    if not val:
        logger.error("Variabile d'ambiente mancante: %s", name)
        raise RuntimeError(f"Missing env var: {name}")
    return val

NOTION_TOKEN = _getenv("NOTION_TOKEN")
DATABASE_ID  = _getenv("DATABASE_ID")
TG_TOKEN     = _getenv("TELEGRAM_BOT_TOKEN")
TG_CHAT_ID   = _getenv("TELEGRAM_CHAT_ID")

# Parametri opzionali
DAILY_WINDOW_DAYS = int(os.environ.get("DAILY_WINDOW_DAYS", "2"))
WEEKLY_MIN_READY  = int(os.environ.get("WEEKLY_MIN_READY", "2"))

# =======================
# Locale / timezone
# =======================
TZ = gettz("Europe/Rome")
today = dt.datetime.now(TZ).date()

# =======================
# Notion: mappatura campi
# =======================
PROP_TITLE  = "Title"                # proprietà Title (API: "Name")
PROP_ID     = "ID"                   # Text
PROP_STATO  = "Stato"                # Select: Scriptato/Grezzo/Editato/Pubblicato
PROP_PUBB   = "Data Pubblicazione"   # Date

# =======================
# Client
# =======================
notion = Client(auth=NOTION_TOKEN)

# =======================
# Helpers Notion
# =======================
def get_title(props: Dict[str, Any]) -> str:
    t = props[PROP_TITLE]["title"]
    return "".join(part["plain_text"] for part in t) if t else "(senza titolo)"

def get_text(props: Dict[str, Any], key: str) -> str:
    arr = props.get(key, {}).get("rich_text", [])
    return arr[0]["plain_text"] if arr else ""

def get_select(props: Dict[str, Any], key: str) -> str:
    sel = props.get(key, {}).get("select")
    return sel["name"] if sel else ""

def get_date(props: Dict[str, Any], key: str) -> Optional[dt.date]:
    d = props.get(key, {}).get("date", {})
    if not d or not d.get("start"):
        return None
    return dt.date.fromisoformat(d["start"])

# =======================
# Retry helper
# =======================
def with_retry(fn: Callable[[], Any], *, retries: int = 3, base_sleep: float = 2.0,
               exc_types: Tuple[type, ...] = (Exception,)) -> Any:
    last_exc: Optional[Exception] = None
    for i in range(retries):
        try:
            return fn()
        except exc_types as e:
            last_exc = e
            sleep_s = base_sleep * (2 ** i)
            logger.warning("Tentativo %d/%d fallito: %s (retry tra %.1fs)", i + 1, retries, e, sleep_s)
            time.sleep(sleep_s)
    assert last_exc is not None
    raise last_exc

# =======================
# Telegram
# =======================
def tg_send(msg: str) -> None:
    url = f"https://api.telegram.org/bot{TG_TOKEN}/sendMessage"
    payload = {"chat_id": TG_CHAT_ID, "text": msg}
    logger.debug("Invio Telegram: %s", msg.replace("\n", " | "))
    r = requests.post(url, json=payload, timeout=20)
    if r.status_code != 200:
        raise RuntimeError(f"Telegram HTTP {r.status_code}: {r.text}")

def tg_send_safe(msg: str) -> None:
    try:
        with_retry(lambda: tg_send(msg))
    except Exception as e:
        logger.error("Invio Telegram fallito definitivamente: %s", e)

# =======================
# Notion query
# =======================
def notion_query(filter_obj: Dict[str, Any]) -> Dict[str, Any]:
    logger.debug("Notion query filtro: %s", json.dumps(filter_obj, ensure_ascii=False))
    return with_retry(lambda: notion.databases.query(database_id=DATABASE_ID, filter=filter_obj),
                      exc_types=(APIResponseError, Exception))

# =======================
# Core logic
# =======================
def items_due_within(days: int) -> List[Dict[str, Any]]:
    """
    Ritorna gli item con Data Pubblicazione compresa tra 'oggi' e 'oggi+days', inclusi.
    Esclude sempre Stato = Pubblicato.
    """
    start_date = today
    end_date = today + dt.timedelta(days=days)

    resp = notion_query({
        "and": [
            {"property": PROP_STATO, "select": {"does_not_equal": "Pubblicato"}},
            {"property": PROP_PUBB,  "date":   {"on_or_after": str(start_date)}},
            {"property": PROP_PUBB,  "date":   {"on_or_before": str(end_date)}},
        ]
    })

    out: List[Dict[str, Any]] = []
    for r in resp.get("results", []):
        p = r["properties"]
        out.append({
            "id":     get_text(p, PROP_ID),
            "titolo": get_title(p),
            "stato":  get_select(p, PROP_STATO),
            "pubb":   get_date(p, PROP_PUBB),
        })
    logger.info("Trovati %d item entro %d giorni (dal %s al %s).",
                len(out), days, start_date.isoformat(), end_date.isoformat())
    return out

def count_editati() -> int:
    resp = notion_query({"property": PROP_STATO, "select": {"equals": "Editato"}})
    n = len(resp.get("results", []))
    logger.info("Contenuti in stato 'Editato': %d", n)
    return n

def daily_reminder(window_days: int = DAILY_WINDOW_DAYS) -> None:
    try:
        items = items_due_within(window_days)
        if items:
            lines = [f"INUTILPEDIA — Pubblicazioni entro {window_days} giorni:"]
            # Ordina per data
            items.sort(key=lambda it: (it["pubb"] or dt.date(2100,1,1), it["id"]))
            for it in items:
                pubb = it["pubb"].isoformat() if it["pubb"] else "—"
                lines.append(f"- {it['id']} · {it['titolo']}  (stato: {it['stato']}, pubb: {pubb})")
            tg_send_safe("\n".join(lines))
        else:
            logger.info("Nessuna pubblicazione entro %d giorni. Nessun messaggio Telegram inviato.", window_days)
    except Exception as e:
        logger.exception("Errore in daily_reminder: %s", e)
        tg_send_safe(f"INUTILPEDIA — Errore daily_reminder: {e}")

def weekly_buffer_check(min_ready: int = WEEKLY_MIN_READY) -> None:
    try:
        n = count_editati()
        if n < min_ready:
            plural = "" if n == 1 else "i"
            tg_send_safe(f"Buffer scarico: solo {n} contenut{plural} in EDITATO. Riempilo oggi.")
        else:
            logger.info("Buffer ok: %d in EDITATO (soglia %d).", n, min_ready)
    except Exception as e:
        logger.exception("Errore in weekly_buffer_check: %s", e)
        tg_send_safe(f"INUTILPEDIA — Errore weekly_buffer_check: {e}")

# =======================
# Entrypoint
# =======================
if __name__ == "__main__":
    mode = os.environ.get("MODE", "daily").strip().lower()
    logger.info("Avvio INUTILPEDIA automation | mode=%s | daily_window=%d | min_ready=%d",
                mode, DAILY_WINDOW_DAYS, WEEKLY_MIN_READY)
    if mode == "daily":
        daily_reminder(DAILY_WINDOW_DAYS)
    elif mode == "weekly":
        weekly_buffer_check(WEEKLY_MIN_READY)
    else:
        logger.error("MODE sconosciuta: %s (usa 'daily' o 'weekly')", mode)
        raise SystemExit(2)
