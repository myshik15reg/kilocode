# Refactoring Workflow

> **СИСТЕМАТИЧЕСКИЙ WORKFLOW:** Безопасный и эффективный рефакторинг legacy кода без ломания функциональности.

## Обзор

Refactoring workflow обеспечивает структурированный подход к улучшению качества кода, архитектуры и производительности без изменения внешнего поведения системы.

## Когда использовать Refactoring

**ОБЯЗАТЕЛЬНО** для:
- Technical debt накопился и влияет на velocity
- Code duplication (нарушение DRY) в 3+ местах
- Функция/класс > 200 lines
- Cyclomatic complexity > 15
- Test coverage < 60%
- Performance degradation очевидна

**НЕ НУЖНО** для:
- Косметические изменения ("просто чтобы красиво было")
- Преждевременная оптимизация
- Рефакторинг ради рефакторинга
- Working code без проблем

**ЗАПРЕЩЕНО** в:
- Active production incident (сначала hotfix)
- Feature freeze период
- Pre-release code freeze

## Refactoring Categories

```
Type                  → When to Apply
──────────────────────────────────────────────
Code Simplification   → Complex logic (complexity > 10)
Duplication Removal   → Same code in 3+ places
Performance          → Identified bottleneck (profiled)
Architecture         → Tight coupling, poor separation
Test Improvement     → Coverage < 60%, flaky tests
Security Hardening   → Security audit findings
API Redesign         → Breaking changes needed
Naming               → Confusing or misleading names
```

## Step-by-Step Process

### Step 1: Identify Refactoring Target

**Методы выявления:**

1. **Code Metrics Analysis**
   ```bash
   # Complexity analysis
   npx complexity-report src/

   # Find large files
   find src/ -name "*.ts" -exec wc -l {} \; | sort -rn | head -10

   # Code duplication
   npx jscpd src/

   # Test coverage
   npm test -- --coverage
   ```

2. **Code Smells Checklist**
   ```markdown
   ## Common Code Smells

   ### Bloaters
   - [ ] Long Method (> 50 lines)
   - [ ] Large Class (> 300 lines)
   - [ ] Long Parameter List (> 4 parameters)
   - [ ] Data Clumps (same group of variables together)

   ### Object-Orientation Abusers
   - [ ] Switch Statements (should be polymorphism)
   - [ ] Temporary Field (field used only sometimes)
   - [ ] Refused Bequest (subclass doesn't use parent methods)

   ### Change Preventers
   - [ ] Divergent Change (one class changed for different reasons)
   - [ ] Shotgun Surgery (one change requires changes in many classes)

   ### Dispensables
   - [ ] Comments (code should be self-documenting)
   - [ ] Duplicate Code
   - [ ] Dead Code
   - [ ] Speculative Generality (unused abstraction)

   ### Couplers
   - [ ] Feature Envy (method uses another class more than its own)
   - [ ] Inappropriate Intimacy (classes too coupled)
   - [ ] Message Chains (a.getB().getC().getD())
   - [ ] Middle Man (class just delegates to another)
   ```

3. **Performance Profiling**
   ```javascript
   // Node.js profiling
   node --prof app.js
   node --prof-process isolate-*.log > profiling.txt

   // Browser profiling
   // 1. Open DevTools
   // 2. Performance tab
   // 3. Record interaction
   // 4. Identify bottlenecks

   // Automated performance testing
   import { PerformanceObserver } from 'perf_hooks';

   const obs = new PerformanceObserver((items) => {
     items.getEntries().forEach((entry) => {
       console.log(`${entry.name}: ${entry.duration}ms`);
     });
   });
   obs.observe({ entryTypes: ['measure'] });

   performance.mark('start');
   // ... code to measure
   performance.mark('end');
   performance.measure('My Operation', 'start', 'end');
   ```

**Результат:** Приоритизированный список файлов/функций для рефакторинга

### Step 2: Create Refactoring Plan

**Template плана:**
```markdown
# Refactoring Plan: [Component Name]

## Motivation
**Why:** [What problem are we solving?]
**Impact:** [How it affects development/performance/users]
**Risk Level:** Low / Medium / High

## Current State Analysis
**Lines of Code:** [number]
**Complexity:** [cyclomatic complexity score]
**Test Coverage:** [percentage]
**Dependencies:** [number of files that import this]
**Issues:**
- [Issue 1]
- [Issue 2]

## Proposed Changes

### Change 1: [Name]
**Type:** Extract Method / Rename / Move / Inline / etc.
**Affected Files:**
- `path/to/file1.ts`
- `path/to/file2.ts`

**Before:**
```javascript
// Current problematic code
```

**After:**
```javascript
// Improved code
```

**Benefits:**
- [Benefit 1]
- [Benefit 2]

**Risks:**
- [Risk 1 + mitigation]

### Change 2: [Name]
...

## Testing Strategy
- [ ] Existing tests must continue to pass
- [ ] Add tests for edge cases (if missing)
- [ ] Performance benchmarks (if applicable)
- [ ] Manual smoke testing checklist

## Rollout Strategy
- **Approach:** Big Bang / Incremental / Feature Flag
- **Steps:**
  1. [Step 1]
  2. [Step 2]
- **Rollback Plan:** [How to undo if needed]

## Success Criteria
- [ ] All tests pass
- [ ] Code complexity reduced by X%
- [ ] Test coverage increased to Y%
- [ ] No performance regression
- [ ] No new bugs introduced
```

**Пример:**
```markdown
# Refactoring Plan: UserService

## Motivation
**Why:** UserService.ts is 850 lines, complexity 23, hard to maintain
**Impact:** Every user-related feature requires touching this file
**Risk Level:** Medium (high usage, but good test coverage)

## Current State Analysis
**Lines of Code:** 850
**Complexity:** 23 (should be < 15)
**Test Coverage:** 78%
**Dependencies:** 15 files import UserService
**Issues:**
- Mixes authentication, authorization, and user CRUD
- God object anti-pattern
- 12 methods over 50 lines each
- Tight coupling to database layer

## Proposed Changes

### Change 1: Extract AuthenticationService
**Type:** Extract Class
**Affected Files:**
- `src/services/UserService.ts`
- `src/services/AuthenticationService.ts` (new)

**Before:**
```typescript
class UserService {
  async login(email: string, password: string) { /* ... */ }
  async logout(userId: string) { /* ... */ }
  async refreshToken(token: string) { /* ... */ }
  async createUser(data: UserData) { /* ... */ }
  async updateUser(id: string, data: UserData) { /* ... */ }
  // ... 20 more methods
}
```

**After:**
```typescript
// AuthenticationService.ts
class AuthenticationService {
  async login(email: string, password: string) { /* ... */ }
  async logout(userId: string) { /* ... */ }
  async refreshToken(token: string) { /* ... */ }
}

// UserService.ts
class UserService {
  async createUser(data: UserData) { /* ... */ }
  async updateUser(id: string, data: UserData) { /* ... */ }
  // Only user CRUD methods
}
```

**Benefits:**
- Single Responsibility Principle
- Easier to test authentication independently
- Reduces UserService to ~400 lines

**Risks:**
- Breaking change for consumers (mitigation: facade pattern temporarily)
```

### Step 3: Write Comprehensive Tests

**КРИТИЧНО:** Тесты ПЕРЕД рефакторингом, не после!

```typescript
// Step 3.1: Characterization Tests (capture current behavior)
describe('UserService - Current Behavior', () => {
  // Test EVERYTHING, even weird edge cases
  it('should handle null email', async () => {
    const result = await userService.createUser({ email: null });
    // Even if behavior is wrong, test captures it
    expect(result).toBe(currentBehavior);
  });

  it('should return specific error for duplicate email', async () => {
    // Captures exact current error message
    await expect(
      userService.createUser({ email: 'existing@example.com' })
    ).rejects.toThrow('Email already exists');
  });

  // Test ALL methods
  describe('login', () => { /* all login scenarios */ });
  describe('logout', () => { /* all logout scenarios */ });
  // ... etc
});

// Step 3.2: Integration Tests
describe('UserService - Integration', () => {
  it('should complete full user lifecycle', async () => {
    // Create -> Read -> Update -> Delete
    const user = await userService.createUser(userData);
    const found = await userService.getUser(user.id);
    const updated = await userService.updateUser(user.id, newData);
    await userService.deleteUser(user.id);
  });
});

// Step 3.3: Performance Benchmarks (if refactoring for performance)
describe('UserService - Performance', () => {
  it('should create user in < 100ms', async () => {
    const start = Date.now();
    await userService.createUser(userData);
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(100);
  });
});
```

**Test Coverage Requirements:**
```markdown
## Test Coverage Checklist

Before starting refactoring:
- [ ] Unit tests: > 80% coverage
- [ ] Integration tests: key workflows covered
- [ ] Edge cases tested
- [ ] Error scenarios tested
- [ ] Performance benchmarks (if applicable)

All tests must pass BEFORE refactoring begins!
```

### Step 4: Incremental Refactoring

**Принцип:** Small, safe steps with green tests between each step.

```typescript
// WRONG: Big bang refactoring
// ❌ Change everything at once
// ❌ Tests fail for hours
// ❌ Hard to identify what broke

// RIGHT: Incremental refactoring
// ✅ Small atomic changes
// ✅ Tests pass after each change
// ✅ Easy to rollback if needed

// Example: Extract Method refactoring

// Step 4.1: Identify method to extract
class UserService {
  async createUser(data: UserData) {
    // 1. Validate input (can be extracted)
    if (!data.email || !data.password) {
      throw new ValidationError('Email and password required');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      throw new ValidationError('Invalid email format');
    }
    if (data.password.length < 8) {
      throw new ValidationError('Password too short');
    }

    // 2. Hash password
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // 3. Save to database
    return this.db.users.create({ ...data, password: hashedPassword });
  }
}

// Step 4.2: Extract validation method
class UserService {
  async createUser(data: UserData) {
    this.validateUserData(data); // Extracted!
    const hashedPassword = await bcrypt.hash(data.password, 10);
    return this.db.users.create({ ...data, password: hashedPassword });
  }

  private validateUserData(data: UserData): void {
    if (!data.email || !data.password) {
      throw new ValidationError('Email and password required');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      throw new ValidationError('Invalid email format');
    }
    if (data.password.length < 8) {
      throw new ValidationError('Password too short');
    }
  }
}

// Run tests → ✅ All pass

// Step 4.3: Extract password hashing
class UserService {
  async createUser(data: UserData) {
    this.validateUserData(data);
    const hashedPassword = await this.hashPassword(data.password); // Extracted!
    return this.db.users.create({ ...data, password: hashedPassword });
  }

  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  private validateUserData(data: UserData): void { /* ... */ }
}

// Run tests → ✅ All pass

// Step 4.4: Now easier to test each part
describe('UserService', () => {
  describe('validateUserData', () => {
    // Test validation in isolation
  });

  describe('hashPassword', () => {
    // Test hashing in isolation
  });
});
```

**Refactoring Patterns:**

```typescript
// Pattern 1: Extract Method
// Before: Long method
function processOrder(order) {
  // 100 lines of code
}

// After: Extracted smaller methods
function processOrder(order) {
  validateOrder(order);
  calculateTotal(order);
  applyDiscounts(order);
  chargePayment(order);
  sendConfirmation(order);
}

// Pattern 2: Extract Class
// Before: God class
class OrderService {
  // 50 methods mixing concerns
}

// After: Separated concerns
class OrderService { /* Order CRUD */ }
class PaymentService { /* Payment logic */ }
class NotificationService { /* Emails, SMS */ }

// Pattern 3: Replace Conditional with Polymorphism
// Before: Switch statement
function calculateShipping(type) {
  switch(type) {
    case 'express': return 20;
    case 'standard': return 10;
    case 'economy': return 5;
  }
}

// After: Polymorphism
interface ShippingStrategy {
  calculateCost(): number;
}

class ExpressShipping implements ShippingStrategy {
  calculateCost() { return 20; }
}

class StandardShipping implements ShippingStrategy {
  calculateCost() { return 10; }
}

// Pattern 4: Introduce Parameter Object
// Before: Long parameter list
function createUser(
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  age: number,
  country: string
) { /* ... */ }

// After: Parameter object
interface UserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  age: number;
  country: string;
}

function createUser(data: UserData) { /* ... */ }

// Pattern 5: Replace Magic Numbers with Constants
// Before: Magic numbers
if (user.age >= 18) { /* ... */ }
setTimeout(callback, 300000);

// After: Named constants
const LEGAL_AGE = 18;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

if (user.age >= LEGAL_AGE) { /* ... */ }
setTimeout(callback, CACHE_TTL_MS);
```

### Step 5: Continuous Testing

**После КАЖДОГО изменения:**

```bash
# Run affected tests
npm test -- path/to/changed-file.test.ts

# Run all tests (to catch regressions)
npm test

# Check test coverage (should not decrease)
npm test -- --coverage

# Type checking
npm run typecheck

# Linting
npm run lint

# If any fail → Revert change and try again
```

**Automated Safety Net:**
```javascript
// Pre-commit hook (.husky/pre-commit)
#!/bin/sh
npm run typecheck || exit 1
npm run lint || exit 1
npm test || exit 1

echo "✅ All checks passed, proceeding with commit"
```

### Step 6: Update Documentation

**После рефакторинга обновить:**

```markdown
## Documentation Update Checklist

- [ ] JSDoc/TSDoc comments updated
- [ ] README.md (if public API changed)
- [ ] API documentation (if endpoints changed)
- [ ] Architecture diagrams (if structure changed)
- [ ] Migration guide (if breaking changes)
- [ ] Changelog entry added

## Example: API Documentation Update

### Before Refactoring
```typescript
/**
 * UserService handles all user-related operations
 */
class UserService {
  /**
   * Login user
   */
  async login(email: string, password: string): Promise<User> { /* ... */ }
}
```

### After Refactoring
```typescript
/**
 * UserService handles user CRUD operations.
 * For authentication, see AuthenticationService.
 *
 * @see {@link AuthenticationService} for login/logout
 * @see {@link AuthorizationService} for permissions
 */
class UserService {
  /**
   * Creates a new user account
   *
   * @param data - User registration data
   * @returns Created user (without password)
   * @throws ValidationError if data invalid
   * @throws DuplicateEmailError if email already exists
   *
   * @example
   * const user = await userService.createUser({
   *   email: 'user@example.com',
   *   password: 'securepassword123',
   *   firstName: 'John',
   *   lastName: 'Doe'
   * });
   */
  async createUser(data: UserData): Promise<User> { /* ... */ }
}

/**
 * AuthenticationService handles user authentication flows.
 * Extracted from UserService for better separation of concerns.
 *
 * @since 2.0.0
 */
class AuthenticationService {
  /**
   * Authenticates user with email and password
   *
   * @param email - User email
   * @param password - Plain text password
   * @returns User object with authentication token
   * @throws InvalidCredentialsError if login fails
   * @throws AccountLockedError if too many failed attempts
   */
  async login(email: string, password: string): Promise<AuthResult> { /* ... */ }
}
```

### Migration Guide (for breaking changes)
```markdown
# Migration Guide: UserService v1 → v2

## Breaking Changes

### Authentication Methods Moved

**What changed:** `login()`, `logout()`, `refreshToken()` moved to `AuthenticationService`

**Before (v1):**
```typescript
import { UserService } from './services/UserService';

const userService = new UserService();
await userService.login(email, password);
```

**After (v2):**
```typescript
import { AuthenticationService } from './services/AuthenticationService';

const authService = new AuthenticationService();
await authService.login(email, password);
```

**Automated Migration:**
```bash
# Find and replace
sed -i 's/userService\.login/authService.login/g' src/**/*.ts
sed -i 's/userService\.logout/authService.logout/g' src/**/*.ts
```
```
```

### Step 7: Performance Validation

**Если рефакторинг был для производительности:**

```typescript
// Benchmark before and after
import Benchmark from 'benchmark';

const suite = new Benchmark.Suite();

// Old implementation (for comparison)
suite.add('Old#processData', function() {
  oldImplementation.processData(testData);
});

// New implementation
suite.add('New#processData', function() {
  newImplementation.processData(testData);
});

suite
  .on('cycle', function(event) {
    console.log(String(event.target));
  })
  .on('complete', function() {
    console.log('Fastest is ' + this.filter('fastest').map('name'));
  })
  .run({ async: true });

// Expected output:
// Old#processData x 1,234 ops/sec ±2.34%
// New#processData x 5,678 ops/sec ±1.23%  (faster!)
// Fastest is New#processData
```

**Performance Metrics:**
```markdown
## Performance Comparison

| Metric            | Before    | After     | Change    |
|-------------------|-----------|-----------|-----------|
| Response Time p50 | 250ms     | 180ms     | -28% ✅   |
| Response Time p95 | 800ms     | 450ms     | -44% ✅   |
| Memory Usage      | 512MB     | 380MB     | -26% ✅   |
| CPU Usage         | 45%       | 32%       | -29% ✅   |
| Throughput        | 100 req/s | 150 req/s | +50% ✅   |

✅ All metrics improved or maintained
```

### Step 8: Code Review

**Refactoring-Specific Review Checklist:**

```markdown
## Refactoring Code Review

### Behavior Preservation
- [ ] All existing tests pass
- [ ] No new bugs introduced
- [ ] External API unchanged (or documented)
- [ ] Performance not degraded

### Code Quality
- [ ] Code complexity reduced
- [ ] Duplication eliminated
- [ ] Naming improved (clearer intent)
- [ ] SOLID principles followed
- [ ] Design patterns appropriate

### Testing
- [ ] Test coverage maintained or improved
- [ ] New tests for extracted methods
- [ ] Edge cases still covered
- [ ] Performance benchmarks (if applicable)

### Documentation
- [ ] Code comments updated
- [ ] API docs updated
- [ ] Migration guide (if breaking)
- [ ] Changelog entry

### Architecture
- [ ] Dependencies reduced
- [ ] Coupling decreased
- [ ] Cohesion increased
- [ ] Separation of concerns improved

### Safety
- [ ] Incremental changes (not big bang)
- [ ] Rollback plan exists
- [ ] Feature flag (if risky)
- [ ] Monitoring unchanged
```

## Refactoring Strategies

### Strategy 1: Strangler Fig Pattern

**Для больших рефакторингов (legacy systems):**

```typescript
// Постепенно заменяем старый код новым

// Phase 1: Create new implementation alongside old
class UserServiceV1 {
  // Old implementation (still in use)
}

class UserServiceV2 {
  // New implementation (gradually adopted)
}

// Phase 2: Add facade/adapter
class UserService {
  constructor(
    private v1: UserServiceV1,
    private v2: UserServiceV2,
    private featureFlags: FeatureFlags
  ) {}

  async createUser(data: UserData) {
    // Route to new or old based on feature flag
    if (this.featureFlags.isEnabled('new_user_service')) {
      return this.v2.createUser(data);
    }
    return this.v1.createUser(data);
  }
}

// Phase 3: Gradually migrate users
// - Start with 1% traffic
// - Monitor for issues
// - Increase to 10%, 50%, 100%
// - Remove old implementation

// Phase 4: Cleanup
class UserService {
  // Only new implementation remains
  async createUser(data: UserData) {
    return this.v2.createUser(data);
  }
}
```

### Strategy 2: Branch by Abstraction

**Для рефакторинга с минимальным риском:**

```typescript
// Step 1: Create abstraction
interface PaymentProcessor {
  processPayment(amount: number): Promise<PaymentResult>;
}

// Step 2: Old implementation implements interface
class StripePaymentProcessor implements PaymentProcessor {
  async processPayment(amount: number): Promise<PaymentResult> {
    // Old Stripe implementation
  }
}

// Step 3: New implementation
class ModernPaymentProcessor implements PaymentProcessor {
  async processPayment(amount: number): Promise<PaymentResult> {
    // New improved implementation
  }
}

// Step 4: Use dependency injection
class OrderService {
  constructor(private paymentProcessor: PaymentProcessor) {}

  async checkout(order: Order) {
    await this.paymentProcessor.processPayment(order.total);
  }
}

// Step 5: Switch implementation via config
const paymentProcessor = config.useModernPayment
  ? new ModernPaymentProcessor()
  : new StripePaymentProcessor();

const orderService = new OrderService(paymentProcessor);
```

### Strategy 3: Parallel Run

**Для критических систем (с высокой нагрузкой):**

```typescript
// Run old and new implementations in parallel, compare results

class DualRunService {
  constructor(
    private oldService: OldService,
    private newService: NewService,
    private logger: Logger
  ) {}

  async processData(input: Data): Promise<Result> {
    // Run both implementations
    const [oldResult, newResult] = await Promise.allSettled([
      this.oldService.processData(input),
      this.newService.processData(input),
    ]);

    // Compare results
    if (!this.resultsMatch(oldResult, newResult)) {
      this.logger.warn('Results mismatch', {
        input,
        oldResult,
        newResult,
      });
    }

    // Return old result (safe)
    // Will switch to new result once confident
    return oldResult.status === 'fulfilled'
      ? oldResult.value
      : newResult.value;
  }

  private resultsMatch(old: any, new: any): boolean {
    // Deep equality check
    return JSON.stringify(old) === JSON.stringify(new);
  }
}
```

## Best Practices

### DO:
- ✅ Write tests BEFORE refactoring
- ✅ Small incremental changes
- ✅ Run tests after EACH change
- ✅ Keep commits small and atomic
- ✅ Update documentation
- ✅ Use feature flags for risky changes
- ✅ Monitor after deployment
- ✅ Follow code standards (`.kilocode/patterns/code-standards.md`)

### DON'T:
- ❌ Refactor and add features simultaneously
- ❌ Change behavior during refactoring
- ❌ Skip tests "to save time"
- ❌ Big bang refactoring
- ❌ Refactor without clear goal
- ❌ Ignore code review
- ❌ Deploy on Friday

## Troubleshooting

### Problem: Tests failing after refactoring
**Solution:**
```bash
# Revert to last green state
git revert HEAD

# Or reset
git reset --hard HEAD~1

# Identify what broke
npm test -- --verbose

# Fix incrementally
# Make smaller change → test → commit
```

### Problem: Performance regression
**Solution:**
```javascript
// Profile before and after
// Identify bottleneck
import { performance } from 'perf_hooks';

performance.mark('start');
// Refactored code
performance.mark('end');
performance.measure('refactored', 'start', 'end');

// Compare with baseline
// If slower, investigate why:
// - Extra object creation?
// - More function calls?
// - Less efficient algorithm?
```

### Problem: Breaking external consumers
**Solution:**
```typescript
// Add deprecation warnings
/**
 * @deprecated Use AuthenticationService.login() instead
 * Will be removed in v3.0.0
 */
async login(email: string, password: string) {
  console.warn('UserService.login() is deprecated. Use AuthenticationService.login()');
  return this.authService.login(email, password);
}

// Maintain backward compatibility temporarily
// Provide migration guide
// Give consumers time to update (1-2 releases)
```

## Integration with Agent Orchestration

```markdown
## Agents for Refactoring

1. **refactorer** - Main refactoring agent
   → .kilocode/agents/quality/refactorer/

2. **code-reviewer** - Review refactored code
   → .kilocode/agents/quality/code-reviewer/

3. **test-analyzer** - Ensure test coverage
   → .kilocode/agents/testing/test-analyzer/

4. **performance-analyst** - Validate performance
   → .kilocode/agents/analysis/performance-analyst/

## Orchestration Example
```javascript
// Complex refactoring workflow
const refactoringPlan = await orchestrator.decompose({
  task: 'Refactor UserService',
  agents: [
    'refactorer',        // Create refactoring plan
    'test-analyzer',     // Ensure tests comprehensive
    'code-reviewer',     // Review changes
    'performance-analyst' // Validate performance
  ]
});
```
```

## Metrics

**Track Refactoring Success:**

```markdown
## Refactoring Metrics

### Code Quality
- Code complexity: [before] → [after]
- Lines of code: [before] → [after]
- Code duplication: [before] → [after]
- Test coverage: [before] → [after]

### Maintainability
- Time to add feature: [before] → [after]
- Bug rate: [before] → [after]
- Developer satisfaction: [survey results]

### Performance
- Response time: [before] → [after]
- Memory usage: [before] → [after]
- CPU usage: [before] → [after]
```

## References

- Code Standards: `.kilocode/patterns/code-standards.md`
- Testing Patterns: `.kilocode/patterns/testing.md`
- Security Patterns: `.kilocode/patterns/security/security.md`
- Agent Orchestration: `.kilocode/workflows/agent-orchestration.md`
- Language-Specific: `.kilocode/patterns/languages/{language}.md`

---

**Key Principle:** Refactoring is about improving internal structure without changing external behavior. Tests are your safety net - invest in them before refactoring.
