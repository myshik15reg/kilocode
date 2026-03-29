# Framework Selection (Top Choices)

## Selection rules
- Use the defaults from this list.
- Record exceptions in `plan.md`/`execution.md`.
- Pick the simplest framework that fits the task.

## When no default fits
- You may choose another framework if no listed option fits the task.
- Document the rationale, risks, and migration/rollback notes in the protocol.
- Ensure the testing stack and linting still meet 100% coverage + 0 warnings.

## Exception checklist
- Why the default is a poor fit (constraints, platform, ecosystem).
- Why the chosen framework is better (capabilities, maturity).
- Impact on testing, tooling, and onboarding.

## Backend

| Stack | Default choice | Alternatives | When to choose |
|---|---|---|---|
| **Node.js** | NestJS | Fastify, Express | NestJS for complex APIs; Fastify for high perf |
| **Python** | FastAPI | Django | Django for admin/CRUD; FastAPI for API-first |
| **Java** | Spring Boot | Quarkus | Quarkus for cloud-native and faster startup |
| **Go** | Gin | Fiber, Chi | Gin for mature ecosystem |
| **Rust** | Axum | Actix Web | Actix for maximum performance |
| **C#** | ASP.NET Core | Minimal APIs | Minimal APIs for small services |
| **Kotlin** | Ktor | Spring Boot | Ktor for lightweight services |

## Frontend

| Stack | Default choice | When to choose |
|---|---|---|
| **React** | Next.js | SSR/SSG, SEO, complex apps |
| **Vue** | Nuxt | SSR/SSG and unified framework |
| **Angular** | Angular (standalone + signals) | Enterprise and large teams |
| **SPA** | Vite + React/Vue | Fast dev cycle and small apps |

## Mobile

| Stack | Default choice | Alternatives | When to choose |
|---|---|---|---|
| **iOS** | SwiftUI | UIKit | SwiftUI for new apps; UIKit for legacy |
| **Android** | Kotlin + Jetpack Compose | XML Views | Compose for new apps; XML for legacy |
| **Cross-platform** | Flutter | React Native | Flutter for consistent UI; RN for JS teams |

## Data Engineering
- **Orchestration**: Airflow (default), Prefect (alt).
- **Batch processing**: Spark (default), Beam (alt).
- **Transformations**: dbt for warehouse modeling.

## ML/AI
- **Deep learning**: PyTorch (default), TensorFlow (alt).
- **Classical ML**: scikit-learn.
- **Serving**: FastAPI + ONNX Runtime (simple), BentoML (packaged).

## DevOps/IaC
- **IaC**: Terraform (default), Pulumi (alt).
- **Kubernetes**: Helm (charts), ArgoCD (GitOps).

## Data/ORM
- **Node.js**: Prisma (default), TypeORM (if you need active record/DSL).
- **Python**: Django ORM, SQLAlchemy.
- **Java**: Hibernate/JPA.
- **Go**: GORM.
- **C#**: Entity Framework Core.

## Testing
- **JS/TS**: Vitest or Jest.
- **Python**: Pytest.
- **Java**: JUnit + Mockito.
- **Go**: testing + Testify.
- **C#**: xUnit/NUnit.

## Where to look next
- Language patterns: `.kilocode/patterns/languages/`
- Frontend frameworks: `.kilocode/patterns/frontend/frameworks/`
