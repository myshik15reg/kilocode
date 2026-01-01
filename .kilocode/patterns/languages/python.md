# Python Patterns & Standards

## Project Structure
```
project/
├── pyproject.toml
├── src/
│   └── mypackage/
│       ├── __init__.py
│       ├── py.typed           # PEP 561 marker
│       ├── config.py
│       ├── domain/
│       │   ├── __init__.py
│       │   ├── entities.py
│       │   └── exceptions.py
│       ├── services/
│       │   ├── __init__.py
│       │   └── user_service.py
│       ├── repositories/
│       │   ├── __init__.py
│       │   └── user_repository.py
│       └── api/
│           ├── __init__.py
│           ├── routes.py
│           └── schemas.py
├── tests/
│   ├── __init__.py
│   ├── conftest.py
│   ├── unit/
│   └── integration/
├── scripts/
└── docker/
    └── Dockerfile
```

## pyproject.toml Template
```toml
[project]
name = "mypackage"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
    "pydantic>=2.0",
    "sqlalchemy>=2.0",
    "httpx>=0.24",
]

[project.optional-dependencies]
dev = [
    "pytest>=7.0",
    "pytest-cov>=4.0",
    "pytest-asyncio>=0.21",
    "mypy>=1.0",
    "ruff>=0.1",
]

[tool.ruff]
line-length = 88
target-version = "py311"

[tool.ruff.lint]
select = ["E", "F", "I", "N", "W", "UP", "B", "A", "C4", "DTZ", "T10", "ISC", "ICN", "PIE", "PT", "RET", "SIM", "TID", "ARG", "PL", "TRY", "RUF"]
ignore = ["PLR0913"]

[tool.mypy]
python_version = "3.11"
strict = true
warn_return_any = true
disallow_untyped_defs = true

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
addopts = "--cov=src --cov-report=term-missing"
```

## Type Hints
```python
from typing import TypeVar, Generic, Protocol
from collections.abc import Sequence, Mapping

# Basic type hints
def greet(name: str, times: int = 1) -> str:
    return f"Hello, {name}!" * times

# Optional and Union
from typing import Optional
def find_user(user_id: int) -> Optional[User]:
    ...

# Python 3.10+ union syntax
def process(value: int | str | None) -> str:
    ...

# Generic types
T = TypeVar("T")

class Repository(Generic[T]):
    def get(self, id: int) -> T | None:
        ...

    def save(self, entity: T) -> T:
        ...

# Protocol (structural subtyping)
class Serializable(Protocol):
    def to_dict(self) -> dict[str, Any]:
        ...

def serialize(obj: Serializable) -> str:
    return json.dumps(obj.to_dict())

# TypedDict
from typing import TypedDict

class UserDict(TypedDict):
    id: int
    name: str
    email: str | None
```

## Dataclasses & Pydantic
```python
from dataclasses import dataclass, field
from pydantic import BaseModel, Field, field_validator

# Dataclass (for internal use)
@dataclass(frozen=True, slots=True)
class User:
    id: int
    name: str
    email: str
    roles: list[str] = field(default_factory=list)

# Pydantic (for validation/serialization)
class UserCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: str = Field(..., pattern=r"^[\w\.-]+@[\w\.-]+\.\w+$")
    age: int = Field(..., ge=0, le=150)

    @field_validator("name")
    @classmethod
    def name_must_not_be_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Name cannot be empty or whitespace")
        return v.strip()

class UserResponse(BaseModel):
    id: int
    name: str
    email: str

    model_config = {"from_attributes": True}
```

## Async Patterns
```python
import asyncio
from contextlib import asynccontextmanager

# Async function
async def fetch_user(user_id: int) -> User:
    async with httpx.AsyncClient() as client:
        response = await client.get(f"/users/{user_id}")
        response.raise_for_status()
        return User(**response.json())

# Parallel execution
async def fetch_users_and_orders(user_id: int) -> tuple[User, list[Order]]:
    user_task = fetch_user(user_id)
    orders_task = fetch_orders(user_id)

    user, orders = await asyncio.gather(user_task, orders_task)
    return user, orders

# Async context manager
@asynccontextmanager
async def get_db_session():
    session = AsyncSession(engine)
    try:
        yield session
        await session.commit()
    except Exception:
        await session.rollback()
        raise
    finally:
        await session.close()

# Async generator
async def stream_data() -> AsyncGenerator[bytes, None]:
    async with aiofiles.open("large_file.bin", "rb") as f:
        while chunk := await f.read(8192):
            yield chunk
```

## Exception Handling
```python
from typing import NoReturn

# Custom exception hierarchy
class AppError(Exception):
    """Base application error."""

    def __init__(self, message: str, code: str = "APP_ERROR") -> None:
        self.message = message
        self.code = code
        super().__init__(message)

class NotFoundError(AppError):
    """Resource not found."""

    def __init__(self, entity: str, id: int | str) -> None:
        super().__init__(
            f"{entity} with id {id} not found",
            code="NOT_FOUND"
        )

class ValidationError(AppError):
    """Validation failed."""

    def __init__(self, errors: dict[str, list[str]]) -> None:
        self.errors = errors
        super().__init__(
            f"Validation failed: {errors}",
            code="VALIDATION_ERROR"
        )

# Usage
def get_user(user_id: int) -> User:
    user = repository.find_by_id(user_id)
    if user is None:
        raise NotFoundError("User", user_id)
    return user

# Context manager for cleanup
from contextlib import contextmanager

@contextmanager
def managed_resource():
    resource = acquire_resource()
    try:
        yield resource
    finally:
        resource.cleanup()
```

## Testing with pytest
```python
import pytest
from unittest.mock import Mock, AsyncMock, patch

# Fixtures
@pytest.fixture
def user() -> User:
    return User(id=1, name="John", email="john@example.com")

@pytest.fixture
def mock_repository() -> Mock:
    return Mock(spec=UserRepository)

# Unit test
def test_user_creation(user: User) -> None:
    assert user.name == "John"
    assert user.email == "john@example.com"

# Test with mock
def test_get_user_returns_user(mock_repository: Mock) -> None:
    # Arrange
    expected_user = User(id=1, name="John", email="john@example.com")
    mock_repository.find_by_id.return_value = expected_user
    service = UserService(mock_repository)

    # Act
    result = service.get_user(1)

    # Assert
    assert result == expected_user
    mock_repository.find_by_id.assert_called_once_with(1)

# Async test
@pytest.mark.asyncio
async def test_async_function() -> None:
    result = await async_operation()
    assert result is not None

# Parametrized test
@pytest.mark.parametrize(
    "email,expected",
    [
        ("test@example.com", True),
        ("invalid", False),
        ("", False),
    ],
)
def test_email_validation(email: str, expected: bool) -> None:
    assert is_valid_email(email) == expected

# Exception test
def test_not_found_raises_exception(mock_repository: Mock) -> None:
    mock_repository.find_by_id.return_value = None
    service = UserService(mock_repository)

    with pytest.raises(NotFoundError) as exc_info:
        service.get_user(999)

    assert "999" in str(exc_info.value)
```

## Logging
```python
import logging
import structlog

# Configure structlog
structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.add_log_level,
        structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
)

logger = structlog.get_logger()

# Usage
def process_order(order_id: int) -> None:
    log = logger.bind(order_id=order_id)
    log.info("Processing order started")

    try:
        # ... process
        log.info("Order processed successfully")
    except Exception as e:
        log.error("Order processing failed", error=str(e))
        raise
```

## Checklist
- [ ] Type hints on all functions
- [ ] Docstrings (Google style)
- [ ] `ruff check` passes
- [ ] `mypy --strict` passes
- [ ] pytest coverage > 80%
- [ ] Async for I/O operations
- [ ] Pydantic for validation
- [ ] Structured logging
- [ ] Custom exception hierarchy
