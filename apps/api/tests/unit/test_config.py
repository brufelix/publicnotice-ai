"""Settings unit tests."""

import pytest

from publicnotice.config import Settings


@pytest.mark.unit
def test_cors_origins_list_parses_csv() -> None:
    s = Settings(cors_origins="http://a.com, http://b.com ,http://c.com")
    assert s.cors_origins_list == ["http://a.com", "http://b.com", "http://c.com"]


@pytest.mark.unit
def test_is_production_flag() -> None:
    assert Settings(app_env="production").is_production is True
    assert Settings(app_env="development").is_production is False


@pytest.mark.unit
def test_default_providers_are_ollama() -> None:
    s = Settings()
    assert s.llm_provider == "ollama"
    assert s.embedding_provider == "ollama"
    assert s.embedding_dimensions == 768
