# Go Patterns & Standards

## Project Structure
```
project/
├── go.mod
├── go.sum
├── Makefile
├── cmd/
│   └── server/
│       └── main.go           # Entry point
├── internal/                  # Private application code
│   ├── config/
│   │   └── config.go
│   ├── domain/
│   │   ├── user.go           # Entities
│   │   └── errors.go
│   ├── service/
│   │   └── user_service.go   # Business logic
│   ├── repository/
│   │   ├── repository.go     # Interface
│   │   └── postgres/
│   │       └── user_repo.go
│   ├── handler/
│   │   ├── handler.go
│   │   └── user_handler.go
│   └── middleware/
│       ├── auth.go
│       └── logging.go
├── pkg/                       # Public libraries
│   └── validator/
├── migrations/
├── scripts/
└── docker/
```

## Error Handling
```go
// domain/errors.go
package domain

import (
    "errors"
    "fmt"
)

var (
    ErrNotFound       = errors.New("not found")
    ErrAlreadyExists  = errors.New("already exists")
    ErrInvalidInput   = errors.New("invalid input")
    ErrUnauthorized   = errors.New("unauthorized")
)

// Wrap errors with context
type AppError struct {
    Op      string // Operation
    Kind    error  // Category
    Err     error  // Underlying error
    Message string // User-friendly message
}

func (e *AppError) Error() string {
    return fmt.Sprintf("%s: %s", e.Op, e.Message)
}

func (e *AppError) Unwrap() error {
    return e.Err
}

func NewAppError(op string, kind error, err error, message string) *AppError {
    return &AppError{
        Op:      op,
        Kind:    kind,
        Err:     err,
        Message: message,
    }
}

// Check error type
func IsNotFound(err error) bool {
    var appErr *AppError
    if errors.As(err, &appErr) {
        return errors.Is(appErr.Kind, ErrNotFound)
    }
    return errors.Is(err, ErrNotFound)
}

// Usage
func (s *UserService) GetByID(ctx context.Context, id int64) (*User, error) {
    user, err := s.repo.FindByID(ctx, id)
    if err != nil {
        if errors.Is(err, sql.ErrNoRows) {
            return nil, NewAppError(
                "UserService.GetByID",
                ErrNotFound,
                err,
                fmt.Sprintf("user with id %d not found", id),
            )
        }
        return nil, fmt.Errorf("UserService.GetByID: %w", err)
    }
    return user, nil
}
```

## Interfaces & Dependency Injection
```go
// repository/repository.go
package repository

import "context"

// Accept interfaces, return structs
type UserRepository interface {
    FindByID(ctx context.Context, id int64) (*domain.User, error)
    FindByEmail(ctx context.Context, email string) (*domain.User, error)
    Create(ctx context.Context, user *domain.User) error
    Update(ctx context.Context, user *domain.User) error
    Delete(ctx context.Context, id int64) error
}

// service/user_service.go
package service

type UserService struct {
    repo   repository.UserRepository
    cache  cache.Cache
    logger *slog.Logger
}

func NewUserService(
    repo repository.UserRepository,
    cache cache.Cache,
    logger *slog.Logger,
) *UserService {
    return &UserService{
        repo:   repo,
        cache:  cache,
        logger: logger,
    }
}

// cmd/server/main.go - Wire everything together
func main() {
    cfg := config.Load()
    logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))

    db, err := sql.Open("postgres", cfg.DatabaseURL)
    if err != nil {
        logger.Error("failed to connect to database", "error", err)
        os.Exit(1)
    }

    userRepo := postgres.NewUserRepository(db)
    cache := redis.NewCache(cfg.RedisURL)
    userService := service.NewUserService(userRepo, cache, logger)
    userHandler := handler.NewUserHandler(userService, logger)

    // Setup routes...
}
```

## HTTP Handler Pattern
```go
// handler/user_handler.go
package handler

import (
    "encoding/json"
    "net/http"
    "strconv"
)

type UserHandler struct {
    service *service.UserService
    logger  *slog.Logger
}

func NewUserHandler(s *service.UserService, l *slog.Logger) *UserHandler {
    return &UserHandler{service: s, logger: l}
}

func (h *UserHandler) GetByID(w http.ResponseWriter, r *http.Request) {
    ctx := r.Context()

    idStr := chi.URLParam(r, "id")
    id, err := strconv.ParseInt(idStr, 10, 64)
    if err != nil {
        h.respondError(w, http.StatusBadRequest, "invalid id")
        return
    }

    user, err := h.service.GetByID(ctx, id)
    if err != nil {
        if domain.IsNotFound(err) {
            h.respondError(w, http.StatusNotFound, err.Error())
            return
        }
        h.logger.Error("failed to get user", "error", err)
        h.respondError(w, http.StatusInternalServerError, "internal error")
        return
    }

    h.respondJSON(w, http.StatusOK, user)
}

func (h *UserHandler) Create(w http.ResponseWriter, r *http.Request) {
    ctx := r.Context()

    var req CreateUserRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        h.respondError(w, http.StatusBadRequest, "invalid request body")
        return
    }

    if err := req.Validate(); err != nil {
        h.respondError(w, http.StatusBadRequest, err.Error())
        return
    }

    user, err := h.service.Create(ctx, req.ToUser())
    if err != nil {
        h.logger.Error("failed to create user", "error", err)
        h.respondError(w, http.StatusInternalServerError, "internal error")
        return
    }

    h.respondJSON(w, http.StatusCreated, user)
}

func (h *UserHandler) respondJSON(w http.ResponseWriter, status int, data any) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(status)
    json.NewEncoder(w).Encode(data)
}

func (h *UserHandler) respondError(w http.ResponseWriter, status int, message string) {
    h.respondJSON(w, status, map[string]string{"error": message})
}
```

## Context Propagation
```go
// Always pass context as first parameter
func (s *UserService) GetByID(ctx context.Context, id int64) (*User, error) {
    // Check for cancellation
    select {
    case <-ctx.Done():
        return nil, ctx.Err()
    default:
    }

    // Pass context to downstream calls
    user, err := s.repo.FindByID(ctx, id)
    if err != nil {
        return nil, err
    }

    // Add context values
    ctx = context.WithValue(ctx, userIDKey, user.ID)

    return user, nil
}

// Middleware for request context
func RequestIDMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        requestID := uuid.New().String()
        ctx := context.WithValue(r.Context(), requestIDKey, requestID)
        w.Header().Set("X-Request-ID", requestID)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}
```

## Testing
```go
// Table-driven tests
func TestUserService_GetByID(t *testing.T) {
    tests := []struct {
        name    string
        id      int64
        setup   func(*mockRepository)
        want    *domain.User
        wantErr error
    }{
        {
            name: "existing user",
            id:   1,
            setup: func(m *mockRepository) {
                m.On("FindByID", mock.Anything, int64(1)).
                    Return(&domain.User{ID: 1, Name: "John"}, nil)
            },
            want:    &domain.User{ID: 1, Name: "John"},
            wantErr: nil,
        },
        {
            name: "not found",
            id:   999,
            setup: func(m *mockRepository) {
                m.On("FindByID", mock.Anything, int64(999)).
                    Return(nil, sql.ErrNoRows)
            },
            want:    nil,
            wantErr: domain.ErrNotFound,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            repo := new(mockRepository)
            tt.setup(repo)

            service := NewUserService(repo, nil, slog.Default())
            got, err := service.GetByID(context.Background(), tt.id)

            if tt.wantErr != nil {
                assert.True(t, domain.IsNotFound(err))
                return
            }

            assert.NoError(t, err)
            assert.Equal(t, tt.want, got)
            repo.AssertExpectations(t)
        })
    }
}

// Integration test with testcontainers
func TestUserRepository_Integration(t *testing.T) {
    if testing.Short() {
        t.Skip("skipping integration test")
    }

    ctx := context.Background()

    // Start PostgreSQL container
    postgres, err := testcontainers.GenericContainer(ctx, testcontainers.GenericContainerRequest{
        ContainerRequest: testcontainers.ContainerRequest{
            Image:        "postgres:15",
            ExposedPorts: []string{"5432/tcp"},
            Env: map[string]string{
                "POSTGRES_PASSWORD": "test",
                "POSTGRES_DB":       "test",
            },
            WaitingFor: wait.ForLog("database system is ready"),
        },
        Started: true,
    })
    require.NoError(t, err)
    defer postgres.Terminate(ctx)

    // Get connection string and run tests...
}
```

## Graceful Shutdown
```go
func main() {
    ctx, cancel := context.WithCancel(context.Background())
    defer cancel()

    server := &http.Server{
        Addr:    ":8080",
        Handler: router,
    }

    // Start server
    go func() {
        if err := server.ListenAndServe(); err != http.ErrServerClosed {
            log.Fatal(err)
        }
    }()

    // Wait for interrupt
    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
    <-quit

    // Graceful shutdown
    shutdownCtx, shutdownCancel := context.WithTimeout(ctx, 30*time.Second)
    defer shutdownCancel()

    if err := server.Shutdown(shutdownCtx); err != nil {
        log.Printf("Server shutdown error: %v", err)
    }

    // Close other resources
    db.Close()
    cache.Close()

    log.Println("Server stopped")
}
```

## Checklist
- [ ] `go fmt` and `go vet` pass
- [ ] `golangci-lint` configured
- [ ] Context propagation
- [ ] Error wrapping with `%w`
- [ ] Interface-based dependencies
- [ ] Table-driven tests
- [ ] Integration tests with testcontainers
- [ ] Graceful shutdown
- [ ] Structured logging (slog)
