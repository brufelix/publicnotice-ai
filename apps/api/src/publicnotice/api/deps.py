"""FastAPI dependency-injection helpers."""

from collections.abc import AsyncIterator
from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from publicnotice.config import Settings, get_settings
from publicnotice.infra.db import get_session


async def db_session() -> AsyncIterator[AsyncSession]:
    """Yield an async DB session per request."""
    async for session in get_session():
        yield session


SettingsDep = Annotated[Settings, Depends(get_settings)]
SessionDep = Annotated[AsyncSession, Depends(db_session)]
