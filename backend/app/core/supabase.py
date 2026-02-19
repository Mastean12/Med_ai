from supabase import create_client, Client
from app.core.config import SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

def supabase_anon() -> Client:
    return create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

def supabase_admin() -> Client:
    # Use ONLY on backend (never expose this key to frontend)
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
