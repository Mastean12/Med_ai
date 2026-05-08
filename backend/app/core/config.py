from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    ENV: str = "dev"

    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_ROLE_KEY: str

    FREE_DAILY_AI_LIMIT: int = 10
    LLM_API_KEY: str = ""

    DEEPSEEK_API_KEY: str = ""
    DEEPSEEK_BASE_URL: str = "https://api.deepseek.com"
    DEEPSEEK_MODEL: str = "deepseek-chat"

    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_PUBLISHABLE_KEY: str = ""

    MPESA_CONSUMER_KEY: str = ""
    MPESA_CONSUMER_SECRET: str = ""
    MPESA_SHORTCODE: str = ""
    MPESA_PASSKEY: str = ""
    MPESA_CALLBACK_URL: str = ""
    MPESA_ENVIRONMENT: str = "sandbox"

    APP_BASE_URL: str = "http://localhost:3000"
    BACKEND_BASE_URL: str = "http://localhost:8000"

    model_config = SettingsConfigDict(env_file=".env")


settings = Settings()

SUPABASE_URL = settings.SUPABASE_URL
SUPABASE_ANON_KEY = settings.SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY = settings.SUPABASE_SERVICE_ROLE_KEY
FREE_DAILY_AI_LIMIT = settings.FREE_DAILY_AI_LIMIT
LLM_API_KEY = settings.LLM_API_KEY
DEEPSEEK_API_KEY = settings.DEEPSEEK_API_KEY
DEEPSEEK_BASE_URL = settings.DEEPSEEK_BASE_URL
DEEPSEEK_MODEL = settings.DEEPSEEK_MODEL
STRIPE_SECRET_KEY = settings.STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET = settings.STRIPE_WEBHOOK_SECRET
STRIPE_PUBLISHABLE_KEY = settings.STRIPE_PUBLISHABLE_KEY
MPESA_CONSUMER_KEY = settings.MPESA_CONSUMER_KEY
MPESA_CONSUMER_SECRET = settings.MPESA_CONSUMER_SECRET
MPESA_SHORTCODE = settings.MPESA_SHORTCODE
MPESA_PASSKEY = settings.MPESA_PASSKEY
MPESA_CALLBACK_URL = settings.MPESA_CALLBACK_URL
MPESA_ENVIRONMENT = settings.MPESA_ENVIRONMENT
APP_BASE_URL = settings.APP_BASE_URL
BACKEND_BASE_URL = settings.BACKEND_BASE_URL
ENV = settings.ENV
