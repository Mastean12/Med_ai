import os
from dotenv import load_dotenv

load_dotenv()

ENV = os.getenv("ENV", "dev")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

FREE_DAILY_AI_LIMIT = int(os.getenv("FREE_DAILY_AI_LIMIT", "10"))
LLM_API_KEY = os.getenv("LLM_API_KEY")
