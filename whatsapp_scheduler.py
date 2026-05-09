import os
import time
import logging
from apscheduler.schedulers.blocking import BlockingScheduler
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
logger = logging.getLogger(__name__)

RECIPIENT = os.environ['WHATSAPP_RECIPIENT']   # numero con prefisso, es. +39XXXXXXXXXX
MESSAGE   = os.environ['WHATSAPP_MESSAGE']
SESSION_DIR = os.path.join(os.path.dirname(__file__), '.whatsapp_session')


def build_driver(headless: bool) -> webdriver.Chrome:
    options = Options()
    options.add_argument(f'--user-data-dir={SESSION_DIR}')
    options.add_argument('--profile-directory=Default')
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument('--disable-gpu')
    if headless:
        options.add_argument('--headless=new')
    service = Service(ChromeDriverManager().install())
    return webdriver.Chrome(service=service, options=options)


def is_logged_in(driver: webdriver.Chrome) -> bool:
    try:
        WebDriverWait(driver, 20).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, '[data-testid="chat-list"]'))
        )
        return True
    except Exception:
        return False


def wait_for_qr_login(driver: webdriver.Chrome):
    """Apre il browser visibile e aspetta che l'utente scansioni il QR code."""
    logger.info("Scansiona il QR code con WhatsApp sul tuo telefono...")
    try:
        WebDriverWait(driver, 120).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, '[data-testid="chat-list"]'))
        )
        logger.info("Login effettuato. Sessione salvata in %s", SESSION_DIR)
    except Exception as exc:
        driver.quit()
        raise RuntimeError("Timeout scansione QR code. Riavvia lo script.") from exc


def send_message(headless: bool = True):
    driver = build_driver(headless=headless)
    try:
        driver.get('https://web.whatsapp.com')

        if not is_logged_in(driver):
            if headless:
                driver.quit()
                raise RuntimeError(
                    "Sessione WhatsApp scaduta. Esegui: python whatsapp_scheduler.py --login"
                )
            wait_for_qr_login(driver)

        # Apre la chat cercando il contatto per numero
        url = f'https://web.whatsapp.com/send?phone={RECIPIENT.replace("+", "")}&text='
        driver.get(url)

        input_box = WebDriverWait(driver, 30).until(
            EC.presence_of_element_located(
                (By.CSS_SELECTOR, '[data-testid="conversation-compose-box-input"]')
            )
        )
        time.sleep(2)
        input_box.click()
        input_box.send_keys(MESSAGE)
        time.sleep(1)
        input_box.send_keys(Keys.ENTER)
        time.sleep(3)
        logger.info("Messaggio inviato a %s", RECIPIENT)
    finally:
        driver.quit()


if __name__ == '__main__':
    import sys

    if '--login' in sys.argv:
        # Prima esecuzione: browser visibile per la scansione QR
        send_message(headless=False)
    else:
        # Invio immediato + scheduler ogni 4 ore in headless
        send_message(headless=True)
        scheduler = BlockingScheduler()
        scheduler.add_job(send_message, 'interval', hours=4)
        logger.info("Scheduler avviato. Prossimo invio tra 4 ore.")
        scheduler.start()
