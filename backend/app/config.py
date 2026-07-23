from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str
    DATABASE_SYNC_URL: str

    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    SSO_SHARED_SECRET: str = ""

    # AI provider
    AI_PROVIDER: str = "xai"
    XAI_API_KEY: str = ""
    XAI_MODEL: str = "grok-4.3"
    XAI_BASE_URL: str = "https://api.x.ai/v1"
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o"
    ANTHROPIC_API_KEY: str = ""
    ANTHROPIC_MODEL: str = "claude-sonnet-4-20250514"

    # Facebook Marketing API
    FB_ACCESS_TOKEN: str = ""
    FB_AD_ACCOUNT_ID: str = ""
    FB_API_VERSION: str = "v21.0"

    # Qdrant
    QDRANT_URL: str = "http://localhost:6333"
    QDRANT_API_KEY: str = ""
    QDRANT_COLLECTION: str = "ad_embeddings"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Frontend
    FRONTEND_URL: str = "http://localhost:5173"

    # Behavior
    CONFIDENCE_THRESHOLD: int = 65
    AUTO_ANALYZE: bool = True
    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_SIZE_MB: int = 10
    LOG_LEVEL: str = "INFO"
    ENVIRONMENT: str = "development"

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
