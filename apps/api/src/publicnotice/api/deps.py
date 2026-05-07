"""FastAPI dependency-injection helpers."""

from collections.abc import AsyncIterator
from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from publicnotice.adapters.chunker.base import Chunker
from publicnotice.adapters.embeddings.base import EmbeddingsProvider
from publicnotice.adapters.llm.base import LLMProvider as LLMPort
from publicnotice.adapters.pdf.base import PdfParser
from publicnotice.adapters.vectorstore.base import VectorStore
from publicnotice.adapters.vectorstore.pgvector import PgVectorStore
from publicnotice.api.providers import (
    build_chunker,
    build_embeddings,
    build_llm,
    build_pdf_parser,
)
from publicnotice.config import Settings, get_settings
from publicnotice.infra.db import get_session
from publicnotice.infra.repositories import DocumentRepository
from publicnotice.services.chat import ChatService
from publicnotice.services.ingestion import IngestionService
from publicnotice.services.retrieval import RetrievalService


async def db_session() -> AsyncIterator[AsyncSession]:
    """Yield an async DB session per request."""
    async for session in get_session():
        yield session


SettingsDep = Annotated[Settings, Depends(get_settings)]
SessionDep = Annotated[AsyncSession, Depends(db_session)]


# ─── Adapter factories ─────────────────────────────────────────
def get_pdf_parser(settings: SettingsDep) -> PdfParser:
    return build_pdf_parser(settings)


def get_chunker(settings: SettingsDep) -> Chunker:
    return build_chunker(settings)


def get_llm(settings: SettingsDep) -> LLMPort:
    return build_llm(settings)


def get_embeddings(settings: SettingsDep) -> EmbeddingsProvider:
    return build_embeddings(settings)


def get_vector_store(session: SessionDep) -> VectorStore:
    return PgVectorStore(session)


def get_document_repository(session: SessionDep) -> DocumentRepository:
    return DocumentRepository(session)


# ─── Service factory ───────────────────────────────────────────
def get_ingestion_service(
    pdf_parser: Annotated[PdfParser, Depends(get_pdf_parser)],
    chunker: Annotated[Chunker, Depends(get_chunker)],
    embeddings: Annotated[EmbeddingsProvider, Depends(get_embeddings)],
    vector_store: Annotated[VectorStore, Depends(get_vector_store)],
    documents: Annotated[DocumentRepository, Depends(get_document_repository)],
) -> IngestionService:
    return IngestionService(
        pdf_parser=pdf_parser,
        chunker=chunker,
        embeddings=embeddings,
        vector_store=vector_store,
        documents=documents,
    )


def get_retrieval_service(
    embeddings: Annotated[EmbeddingsProvider, Depends(get_embeddings)],
    vector_store: Annotated[VectorStore, Depends(get_vector_store)],
) -> RetrievalService:
    return RetrievalService(embeddings=embeddings, vector_store=vector_store)


def get_chat_service(
    retrieval: Annotated[RetrievalService, Depends(get_retrieval_service)],
    llm: Annotated[LLMPort, Depends(get_llm)],
) -> ChatService:
    return ChatService(retrieval=retrieval, llm=llm)


PdfParserDep = Annotated[PdfParser, Depends(get_pdf_parser)]
ChunkerDep = Annotated[Chunker, Depends(get_chunker)]
EmbeddingsDep = Annotated[EmbeddingsProvider, Depends(get_embeddings)]
LLMDep = Annotated[LLMPort, Depends(get_llm)]
VectorStoreDep = Annotated[VectorStore, Depends(get_vector_store)]
DocumentRepositoryDep = Annotated[DocumentRepository, Depends(get_document_repository)]
IngestionServiceDep = Annotated[IngestionService, Depends(get_ingestion_service)]
RetrievalServiceDep = Annotated[RetrievalService, Depends(get_retrieval_service)]
ChatServiceDep = Annotated[ChatService, Depends(get_chat_service)]
