"""Pytest fixtures shared across the test suite."""

import os

# Force test settings BEFORE importing the app
os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault(
    "DATABASE_URL",
    "postgresql+asyncpg://postgres:postgres@localhost:5432/publicnotice_test",
)
# Disable rate limiting in tests so repeated calls do not get throttled
os.environ.setdefault("RATE_LIMIT_ENABLED", "false")

import pytest
from fastapi.testclient import TestClient

from publicnotice.main import app


@pytest.fixture
def client() -> TestClient:
    """Synchronous test client backed by the FastAPI app."""
    return TestClient(app)
