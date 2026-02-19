from supabase import create_client
import os
from dotenv import load_dotenv

load_dotenv()  # loads backend/.env

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_ANON_KEY:
    print("Missing SUPABASE_URL or SUPABASE_ANON_KEY in backend/.env")
    raise SystemExit(1)

sb = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

# TODO: replace with the test user you created in Supabase
email = "admin@medai.com"
password = "Admin123"

print(f"Using SUPABASE_URL={SUPABASE_URL}")
print(f"Attempting sign-in for: {email}")

res = sb.auth.sign_in_with_password({"email": email, "password": password})

# Print full response for debugging
print(res)

# Print access token if available
try:
    token = res.session.access_token
    print("access_token:\n", token)
except Exception:
    print("No access token returned. Check credentials and user exists in Supabase Auth.")
