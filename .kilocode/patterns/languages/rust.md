# Rust Patterns & Standards

## Project Structure
```
project/
├── Cargo.toml
├── Cargo.lock
├── src/
│   ├── main.rs          # Entry point (bin)
│   ├── lib.rs           # Library root
│   ├── config.rs        # Configuration
│   ├── error.rs         # Custom errors
│   ├── domain/          # Business logic
│   │   ├── mod.rs
│   │   └── entities.rs
│   ├── services/        # Application services
│   │   ├── mod.rs
│   │   └── user_service.rs
│   └── infrastructure/  # External concerns
│       ├── mod.rs
│       ├── db.rs
│       └── api.rs
├── tests/               # Integration tests
│   └── integration_test.rs
├── benches/             # Benchmarks
│   └── benchmark.rs
└── examples/            # Usage examples
    └── basic.rs
```

## Cargo.toml Template
```toml
[package]
name = "project-name"
version = "0.1.0"
edition = "2021"
rust-version = "1.75"

[dependencies]
tokio = { version = "1", features = ["full"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
thiserror = "1"
anyhow = "1"
tracing = "0.1"
tracing-subscriber = "0.3"

[dev-dependencies]
tokio-test = "0.4"
mockall = "0.12"
criterion = "0.5"

[profile.release]
lto = true
codegen-units = 1

[lints.rust]
unsafe_code = "forbid"

[lints.clippy]
all = "deny"
pedantic = "warn"
nursery = "warn"
```

## Error Handling
```rust
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),

    #[error("Not found: {entity} with id {id}")]
    NotFound { entity: &'static str, id: String },

    #[error("Validation error: {0}")]
    Validation(String),

    #[error("Internal error")]
    Internal(#[source] anyhow::Error),
}

pub type Result<T> = std::result::Result<T, AppError>;
```

## Async Patterns
```rust
use tokio::sync::{mpsc, oneshot};

// Channel-based actor pattern
pub struct Actor {
    receiver: mpsc::Receiver<Message>,
}

impl Actor {
    pub fn new() -> (Self, ActorHandle) {
        let (sender, receiver) = mpsc::channel(100);
        (Self { receiver }, ActorHandle { sender })
    }

    pub async fn run(mut self) {
        while let Some(msg) = self.receiver.recv().await {
            self.handle_message(msg).await;
        }
    }
}

// Graceful shutdown
async fn run_with_shutdown<F>(fut: F, shutdown: oneshot::Receiver<()>)
where
    F: std::future::Future,
{
    tokio::select! {
        _ = fut => {},
        _ = shutdown => {
            tracing::info!("Shutting down gracefully");
        }
    }
}
```

## Builder Pattern
```rust
#[derive(Debug, Default)]
pub struct ConfigBuilder {
    host: Option<String>,
    port: Option<u16>,
    timeout: Option<Duration>,
}

impl ConfigBuilder {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn host(mut self, host: impl Into<String>) -> Self {
        self.host = Some(host.into());
        self
    }

    pub fn port(mut self, port: u16) -> Self {
        self.port = Some(port);
        self
    }

    pub fn build(self) -> Result<Config> {
        Ok(Config {
            host: self.host.ok_or(AppError::Validation("host required".into()))?,
            port: self.port.unwrap_or(8080),
            timeout: self.timeout.unwrap_or(Duration::from_secs(30)),
        })
    }
}
```

## Testing
```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sync_function() {
        // Arrange
        let input = 42;

        // Act
        let result = process(input);

        // Assert
        assert_eq!(result, 84);
    }

    #[tokio::test]
    async fn test_async_function() {
        let result = async_process().await;
        assert!(result.is_ok());
    }
}

// Integration tests (tests/integration_test.rs)
#[tokio::test]
async fn test_full_workflow() {
    let app = TestApp::spawn().await;

    let response = app.client
        .post(&format!("{}/api/users", app.address))
        .json(&json!({"name": "test"}))
        .send()
        .await
        .expect("Failed to send request");

    assert_eq!(response.status(), 201);
}
```

## Traits & Generics
```rust
// Define behavior with traits
pub trait Repository<T, ID> {
    async fn find_by_id(&self, id: ID) -> Result<Option<T>>;
    async fn save(&self, entity: &T) -> Result<()>;
    async fn delete(&self, id: ID) -> Result<()>;
}

// Generic implementation
impl<T, ID> InMemoryRepository<T, ID>
where
    T: Clone + Send + Sync,
    ID: Eq + Hash + Send + Sync,
{
    pub async fn find_by_id(&self, id: ID) -> Result<Option<T>> {
        Ok(self.storage.read().await.get(&id).cloned())
    }
}
```

## Memory Safety Checklist
- [ ] No `unsafe` blocks (or justified with safety comments)
- [ ] No `.unwrap()` in production code (use `?` or explicit handling)
- [ ] Lifetimes annotated where not obvious
- [ ] `Arc<Mutex<T>>` for shared mutable state
- [ ] `Send + Sync` bounds verified for async code
- [ ] No data races (ensured by compiler)

## Performance Checklist
- [ ] `#[inline]` for hot paths
- [ ] Stack allocation where possible
- [ ] Avoid unnecessary clones
- [ ] Use iterators over loops
- [ ] Profile with `cargo flamegraph`
