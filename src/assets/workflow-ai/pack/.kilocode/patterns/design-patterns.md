# Design Patterns (Best Practices)

## Goal
- Improve readability, testability, and extensibility.
- Use patterns only when there is a clear need (KISS/YAGNI).
- Prefer composition over inheritance.

## Quick guide (when to use)
- **Observer**: events, pub/sub, reactive streams.
- **Strategy**: interchangeable algorithms.
- **Factory / Abstract Factory**: object creation and object families.
- **Builder**: complex object construction.
- **Adapter**: incompatible interfaces.
- **Facade**: simplify a subsystem.
- **Decorator**: add behavior without inheritance.
- **Proxy**: access control, caching, lazy loading.
- **Chain of Responsibility**: handler pipelines.
- **Command**: actions as objects, queues/undo.
- **State**: behavior depends on state.
- **Template Method**: shared algorithm skeleton with variable steps.
- **Iterator**: safe collection traversal.
- **Mediator**: centralized coordination.
- **Visitor**: add operations without changing classes.
- **Composite**: tree "part-whole" structures.
- **Prototype**: clone complex objects.
- **Memento**: state snapshots.

## GoF categories

### Creational
- Factory Method
- Abstract Factory
- Builder
- Prototype
- Singleton (avoid unless unavoidable)

### Structural
- Adapter
- Facade
- Decorator
- Proxy
- Composite
- Bridge
- Flyweight

### Behavioral
- Observer
- Strategy
- Command
- State
- Chain of Responsibility
- Template Method
- Iterator
- Mediator
- Visitor
- Memento

## Architectural patterns (as needed)
- **Dependency Injection**: required for testability.
- **Repository + Unit of Work**: isolate data access.
- **Service Layer**: separate domain logic.
- **Clean/Hexagonal Architecture**: clear boundaries, ports/adapters.
- **CQRS**: when read/write models diverge.
- **Event-Driven**: async scaling and decoupling.
- **DDD**: Value Object, Aggregate, Domain Service for complex domains.

## Anti-patterns (avoid)
- **God Object** -> split responsibilities.
- **Unnecessary Singleton** -> hidden dependencies.
- **Tight coupling** -> prefer interfaces and DI.

## Quality checks
- Pattern reduces complexity, not increases it.
- Behavior is covered by tests.
- For non-trivial patterns, record the rationale in `plan.md`/`execution.md`.
