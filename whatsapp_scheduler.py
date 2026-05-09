import os
import logging
from apscheduler.schedulers.blocking import BlockingScheduler
from twilio.rest import Client

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
logger = logging.getLogger(__name__)

ACCOUNT_SID = os.environ['TWILIO_ACCOUNT_SID']
AUTH_TOKEN = os.environ['TWILIO_AUTH_TOKEN']
FROM_NUMBER = os.environ['TWILIO_WHATSAPP_FROM']   # es. whatsapp:+14155238886
TO_NUMBER = os.environ['WHATSAPP_RECIPIENT']        # es. whatsapp:+39XXXXXXXXXX
MESSAGE_TEXT = os.environ['WHATSAPP_MESSAGE']


def send_whatsapp_message():
    client = Client(ACCOUNT_SID, AUTH_TOKEN)
    message = client.messages.create(
        from_=FROM_NUMBER,
        to=TO_NUMBER,
        body=MESSAGE_TEXT,
    )
    logger.info("Messaggio inviato: SID=%s", message.sid)


if __name__ == '__main__':
    scheduler = BlockingScheduler()
    scheduler.add_job(send_whatsapp_message, 'interval', hours=4)
    logger.info("Scheduler avviato. Primo invio tra 4 ore.")
    send_whatsapp_message()   # invio immediato al primo avvio
    scheduler.start()
