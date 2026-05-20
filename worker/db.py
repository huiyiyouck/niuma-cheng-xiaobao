import asyncpg
import ssl

from app.pg_notify import _to_asyncpg_dsn
from app.settings import settings


async def create_pool() -> asyncpg.Pool:
    dsn = _to_asyncpg_dsn(settings.database_url)
    ctx = ssl.create_default_context()
    if not settings.db_ssl_verify:
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
    return await asyncpg.create_pool(dsn, min_size=1, max_size=5, ssl=ctx)
