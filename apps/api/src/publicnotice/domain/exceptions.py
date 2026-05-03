"""Domain exceptions — translated to HTTP errors at the API boundary."""


class DomainError(Exception):
    """Base class for all domain errors."""


class NotFoundError(DomainError):
    """Requested resource does not exist."""


class ValidationError(DomainError):
    """Invalid input from the user (business rule violation)."""


class ExternalServiceError(DomainError):
    """A downstream service (LLM, embeddings, …) failed."""
