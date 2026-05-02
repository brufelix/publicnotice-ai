"""API v1."""

from fastapi import APIRouter

from publicnotice.api.v1 import health

router = APIRouter(prefix="/api/v1")
router.include_router(health.router)
