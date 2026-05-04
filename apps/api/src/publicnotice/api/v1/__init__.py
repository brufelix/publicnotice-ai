"""API v1."""

from fastapi import APIRouter

from publicnotice.api.v1 import chat, documents, health

router = APIRouter(prefix="/api/v1")
router.include_router(health.router)
router.include_router(documents.router)
router.include_router(chat.router)
