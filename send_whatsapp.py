import os
import requests

instance  = os.environ['ULTRAMSG_INSTANCE']
token     = os.environ['ULTRAMSG_TOKEN']
recipient = os.environ['WHATSAPP_RECIPIENT']   # es. +39XXXXXXXXXX
message   = os.environ['WHATSAPP_MESSAGE']

response = requests.post(
    f'https://api.ultramsg.com/{instance}/messages/chat',
    data={'token': token, 'to': recipient, 'body': message},
    timeout=30,
)
response.raise_for_status()
print('Inviato:', response.json())
