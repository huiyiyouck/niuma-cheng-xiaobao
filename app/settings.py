from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    db_ssl_verify: bool = True
    admin_allowed_ips: str = "127.0.0.1"
    cors_allow_origins: str = "*"
    admin_token: Optional[str] = None
    admin_require_both: bool = False
    trust_proxy_headers: bool = False
    http_proxy: Optional[str] = None
    https_proxy: Optional[str] = None
    task_stale_seconds: int = 600
    llm_max_retries: int = 3
    llm_retry_base_seconds: float = 1.0

    openai_base_url: str = "https://api.openai.com/v1"
    openai_api_key: Optional[str] = None
    openai_model: str = "gpt-4o-mini"

    worker_id: str = "worker-1"
    scheduler_scan_seconds: int = 5
    fetch_concurrency: int = 2
    process_concurrency: int = 1

    default_fetch_every_seconds: int = 600
    default_max_items_per_run: int = 20
    default_fail_alert_threshold: int = 5
    default_zero_new_hours: int = 24


settings = Settings()
