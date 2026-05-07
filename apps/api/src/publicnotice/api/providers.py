"""Provider factory: instantiate adapters based on `Settings`.

Single source of truth for "which concrete impl is plugged in for which port".
Tests can override these in `app.dependency_overrides`.
"""

from __future__ import annotations

from publicnotice.adapters.chunker.base import Chunker
from publicnotice.adapters.chunker.recursive import RecursiveChunker
from publicnotice.adapters.embeddings.base import EmbeddingsProvider
from publicnotice.adapters.embeddings.ollama import OllamaEmbeddings
from publicnotice.adapters.embeddings.openai import OpenAIEmbeddings
from publicnotice.adapters.llm.base import LLMProvider as LLMPort
from publicnotice.adapters.llm.ollama import OllamaLLM
from publicnotice.adapters.llm.openai_compatible import OpenAICompatibleLLM
from publicnotice.adapters.pdf.base import PdfParser
from publicnotice.adapters.pdf.pymupdf import PyMuPDFParser
from publicnotice.config import Settings

_GROQ_BASE_URL = "https://api.groq.com/openai/v1"


def build_pdf_parser(_: Settings) -> PdfParser:
    return PyMuPDFParser()


def build_chunker(_: Settings) -> Chunker:
    return RecursiveChunker()


def build_embeddings(settings: Settings) -> EmbeddingsProvider:
    provider = settings.embedding_provider
    if provider == "ollama":
        return OllamaEmbeddings(
            base_url=settings.ollama_base_url,
            model=settings.embedding_model,
            dimensions=settings.embedding_dimensions,
        )
    if provider == "openai":
        if not settings.openai_api_key:
            raise RuntimeError("OPENAI_API_KEY is required for embedding_provider=openai")
        return OpenAIEmbeddings(
            api_key=settings.openai_api_key,
            model=settings.embedding_model,
            dimensions=settings.embedding_dimensions,
        )
    if provider == "gemini":
        raise NotImplementedError("Gemini embeddings adapter not implemented yet")
    raise RuntimeError(f"Unknown embedding_provider: {provider}")


def build_llm(settings: Settings) -> LLMPort:
    provider = settings.llm_provider
    if provider == "ollama":
        return OllamaLLM(base_url=settings.ollama_base_url, model=settings.llm_model)
    if provider == "groq":
        if not settings.groq_api_key:
            raise RuntimeError("GROQ_API_KEY is required for llm_provider=groq")
        return OpenAICompatibleLLM(
            api_key=settings.groq_api_key,
            model=settings.groq_model,
            base_url=_GROQ_BASE_URL,
        )
    if provider == "openai":
        if not settings.openai_api_key:
            raise RuntimeError("OPENAI_API_KEY is required for llm_provider=openai")
        return OpenAICompatibleLLM(
            api_key=settings.openai_api_key,
            model=settings.openai_model,
        )
    if provider == "gemini":
        if not settings.gemini_api_key:
            raise RuntimeError("GEMINI_API_KEY is required for llm_provider=gemini")
        from publicnotice.adapters.llm.gemini import GeminiLLM

        return GeminiLLM(api_key=settings.gemini_api_key, model=settings.gemini_model)
    raise RuntimeError(f"Unknown llm_provider: {provider}")
