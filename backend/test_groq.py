import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()
client = Groq(api_key=os.environ.get('GROQ_API_KEY'))
try:
    print('Testing Groq Model...')
    models = client.models.list()
    valid = [m.id for m in models.data if 'vision' in m.id]
    print(f'Valid vision models: {valid}')
except Exception as e:
    print(e)
