from collections.abc import AsyncIterator
import json
import ssl

from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine

from app.settings import settings


_ssl = ssl.create_default_context()
if not settings.db_ssl_verify:
    _ssl.check_hostname = False
    _ssl.verify_mode = ssl.CERT_NONE

engine: AsyncEngine = create_async_engine(
    settings.database_url,
    pool_pre_ping=True,
    connect_args={"ssl": _ssl},
    json_serializer=json.dumps,
    json_deserializer=json.loads,
)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)


async def get_session() -> AsyncIterator[AsyncSession]:
    async with SessionLocal() as session:
        yield session
