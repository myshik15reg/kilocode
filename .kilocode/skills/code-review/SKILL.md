---
name: code-review
description: Systematic approach to conducting thorough code reviews.
---

# Code Review Skill

## Purpose
This skill provides a systematic approach to conducting thorough code reviews, ensuring code quality, maintainability, and adherence to project standards.

## Triggers
Use this skill when:
- User requests code review
- Pull request needs review
- Protocol reaches review phase
- Code quality check needed
- Pre-merge validation required

## Context
Before conducting code review, this skill reads:
- `.kilocode/memory-bank/index.md` - Project status and standards
- `.kilocode/patterns/code-standards.md` - Coding standards
- `.kilocode/patterns/testing.md` - Testing requirements
- `.kilocode/patterns/security/security.md` - Security guidelines
- Protocol `brief.md` - Original requirements

## Workflow

### Step 1: Preparation (5-10 minutes)

#### Understand the Context

1. **Read the protocol brief** (if exists):
   ```bash
   cat .protocols/YYYY-MM-DD-feature-name/brief.md
   ```

2. **Review PR description:**
   - What problem does it solve?
   - What changes were made?
   - Are there breaking changes?

3. **Check related issues:**
   - Requirements fulfilled?
   - Edge cases considered?

#### Set Up Review Environment

```bash
# 1. Fetch latest changes
git fetch origin

# 2. Checkout PR branch
git checkout pr-branch-name

# 3. Install dependencies (if needed)
npm install

# 4. Run tests
npm test

# 5. Run linter
npm run lint

# 6. Build the project
npm run build
```

### Step 2: Systematic Review (30-60 minutes)

#### A. Architecture & Design Review

**Questions to ask:**
- [ ] Does the solution follow project architecture?
- [ ] Are design patterns used appropriately?
- [ ] Is the code modular and maintainable?
- [ ] Are dependencies minimized?
- [ ] Does it follow SOLID principles?

**Check for:**
```
✅ Proper separation of concerns
✅ Appropriate abstraction levels
✅ Clear component boundaries
✅ Minimal coupling
❌ God objects/classes
❌ Circular dependencies
❌ Tight coupling
```

#### B. Code Quality Review

**SOLID Principles:**

1. **Single Responsibility Principle**
   ```typescript
   // ❌ BAD: Multiple responsibilities
   class UserService {
     createUser() { }
     sendEmail() { }      // Email responsibility
     validateCard() { }   // Payment responsibility
   }

   // ✅ GOOD: Single responsibility
   class UserService {
     createUser() { }
   }
   class EmailService {
     sendEmail() { }
   }
   class PaymentService {
     validateCard() { }
   }
   ```

2. **Open/Closed Principle**
   ```typescript
   // ❌ BAD: Must modify for new types
   function calculateDiscount(type: string, price: number) {
     if (type === 'student') return price * 0.9;
     if (type === 'senior') return price * 0.8;
     // Need to modify for new discount types
   }

   // ✅ GOOD: Open for extension
   interface DiscountStrategy {
     calculate(price: number): number;
   }

   class StudentDiscount implements DiscountStrategy {
     calculate(price: number) { return price * 0.9; }
   }
   ```

3. **Liskov Substitution Principle**
   ```typescript
   // ❌ BAD: Subclass changes behavior
   class Rectangle {
     setWidth(w: number) { this.width = w; }
     setHeight(h: number) { this.height = h; }
   }

   class Square extends Rectangle {
     setWidth(w: number) {
       this.width = w;
       this.height = w;  // Violates LSP
     }
   }

   // ✅ GOOD: Proper abstraction
   interface Shape {
     area(): number;
   }

   class Rectangle implements Shape { }
   class Square implements Shape { }
   ```

**Code Smells to Watch For:**

```typescript
// ❌ Long Method (> 20-30 lines)
function processOrder() {
  // 100 lines of code
}

// ✅ Extract to smaller methods
function processOrder() {
  validateOrder();
  calculateTotal();
  applyDiscount();
  processPayment();
  sendConfirmation();
}

// ❌ Long Parameter List (> 3-4 params)
function createUser(name, email, age, address, phone, city, country) { }

// ✅ Use object parameter
function createUser(userData: UserData) { }

// ❌ Primitive Obsession
function sendEmail(to: string, subject: string, body: string) { }

// ✅ Use value objects
class Email {
  constructor(
    public recipient: EmailAddress,
    public subject: Subject,
    public body: Body
  ) { }
}

// ❌ Duplicated Code
function calculateStudentDiscount() { /* ... */ }
function calculateSeniorDiscount() { /* ... */ }

// ✅ Extract common logic
function calculateDiscount(strategy: DiscountStrategy) { }
```

#### C. Testing Review

**Coverage Requirements:**
- Unit tests: ≥ 70% coverage
- Integration tests for API endpoints
- E2E tests for critical flows
- Edge cases covered

**Test Quality Checklist:**
- [ ] Tests are independent (no test dependencies)
- [ ] Tests use AAA pattern (Arrange, Act, Assert)
- [ ] Test names are descriptive
- [ ] Mock external dependencies
- [ ] No hardcoded values in tests
- [ ] Negative test cases included

**Example Review:**
```typescript
// ❌ BAD: Poor test quality
test('test user', async () => {
  const user = await createUser('test@example.com', '123');
  expect(user).toBeTruthy();
});

// ✅ GOOD: Comprehensive test
describe('UserService.createUser', () => {
  it('should create user with valid data', async () => {
    // Arrange
    const userData = {
      email: 'test@example.com',
      password: 'SecurePass123!'
    };

    // Act
    const user = await userService.createUser(userData);

    // Assert
    expect(user.id).toBeDefined();
    expect(user.email).toBe(userData.email);
    expect(user.createdAt).toBeInstanceOf(Date);
  });

  it('should reject duplicate email', async () => {
    // Arrange
    await userService.createUser({ email: 'test@example.com', password: 'pass' });

    // Act & Assert
    await expect(
      userService.createUser({ email: 'test@example.com', password: 'pass' })
    ).rejects.toThrow('Email already exists');
  });

  it('should hash password before storing', async () => {
    // Arrange
    const password = 'PlainPassword123';

    // Act
    const user = await userService.createUser({
      email: 'test@example.com',
      password
    });

    // Assert
    expect(user.password).not.toBe(password);
    expect(user.password).toMatch(/^\$2[aby]\$/); // bcrypt hash
  });
});
```

#### D. Security Review

**Critical Security Checks:**

1. **Input Validation**
   ```typescript
   // ❌ BAD: No validation
   async function getUser(id: string) {
     return db.query(`SELECT * FROM users WHERE id = ${id}`); // SQL Injection!
   }

   // ✅ GOOD: Validated and parameterized
   async function getUser(id: string) {
     if (!isValidUUID(id)) {
       throw new ValidationError('Invalid user ID');
     }
     return db.query('SELECT * FROM users WHERE id = $1', [id]);
   }
   ```

2. **XSS Prevention**
   ```typescript
   // ❌ BAD: Unsanitized user input
   element.innerHTML = userInput;

   // ✅ GOOD: Sanitized
   element.textContent = sanitize(userInput);
   ```

3. **Authentication & Authorization**
   ```typescript
   // ❌ BAD: No auth check
   async function deleteUser(userId: string) {
     return db.users.delete(userId);
   }

   // ✅ GOOD: Proper auth
   async function deleteUser(userId: string, requestingUser: User) {
     if (!requestingUser.isAdmin && requestingUser.id !== userId) {
       throw new ForbiddenError();
     }
     return db.users.delete(userId);
   }
   ```

4. **Sensitive Data**
   ```typescript
   // ❌ BAD: Logging sensitive data
   logger.info('User logged in', { password: user.password });

   // ✅ GOOD: Never log sensitive data
   logger.info('User logged in', { userId: user.id });

   // ❌ BAD: Returning password
   return {
     id: user.id,
     email: user.email,
     password: user.password  // Never!
   };

   // ✅ GOOD: Exclude sensitive fields
   return {
     id: user.id,
     email: user.email
   };
   ```

**Security Checklist:**
- [ ] No hardcoded secrets/credentials
- [ ] Environment variables used for config
- [ ] Input validation on all user data
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (sanitized output)
- [ ] CSRF tokens for state-changing operations
- [ ] Rate limiting on public endpoints
- [ ] Proper error messages (no info leakage)

#### E. Performance Review

**Check for:**

1. **N+1 Queries**
   ```typescript
   // ❌ BAD: N+1 query problem
   const users = await db.users.findAll();
   for (const user of users) {
     user.posts = await db.posts.findByUserId(user.id); // N queries!
   }

   // ✅ GOOD: Single query with join
   const users = await db.users.findAll({
     include: [{ model: 'posts' }]
   });
   ```

2. **Inefficient Algorithms**
   ```typescript
   // ❌ BAD: O(n²) complexity
   function hasDuplicates(arr: number[]): boolean {
     for (let i = 0; i < arr.length; i++) {
       for (let j = i + 1; j < arr.length; j++) {
         if (arr[i] === arr[j]) return true;
       }
     }
     return false;
   }

   // ✅ GOOD: O(n) with Set
   function hasDuplicates(arr: number[]): boolean {
     return new Set(arr).size !== arr.length;
   }
   ```

3. **Memory Leaks**
   ```typescript
   // ❌ BAD: Memory leak with event listeners
   class Component {
     constructor() {
       window.addEventListener('resize', this.handleResize);
     }
     // No cleanup!
   }

   // ✅ GOOD: Proper cleanup
   class Component {
     constructor() {
       window.addEventListener('resize', this.handleResize);
     }

     destroy() {
       window.removeEventListener('resize', this.handleResize);
     }
   }
   ```

4. **Large Payloads**
   ```typescript
   // ❌ BAD: Loading all data
   const users = await db.users.findAll(); // Could be 100k records!

   // ✅ GOOD: Pagination
   const users = await db.users.findAll({
     limit: 50,
     offset: page * 50
   });
   ```

**Performance Checklist:**
- [ ] Database queries optimized
- [ ] Appropriate indexes on database
- [ ] No N+1 query problems
- [ ] Pagination for large datasets
- [ ] Caching where appropriate
- [ ] Efficient algorithms (time complexity)
- [ ] No memory leaks

#### F. Documentation Review

**Required Documentation:**
- [ ] README updated (if needed)
- [ ] API documentation (JSDoc/docstrings)
- [ ] Complex logic explained
- [ ] Configuration documented
- [ ] Migration guides (breaking changes)

**Example:**
```typescript
// ❌ BAD: No documentation
function calc(a, b, c) {
  return (a * b) - (c / 100 * a * b);
}

// ✅ GOOD: Clear documentation
/**
 * Calculate final price after discount
 *
 * @param price - Original price in cents
 * @param quantity - Number of items
 * @param discountPercent - Discount percentage (0-100)
 * @returns Final price in cents after discount
 *
 * @example
 * calculateFinalPrice(1000, 2, 10) // Returns 1800
 * // Original: 1000 * 2 = 2000 cents
 * // Discount: 10% = 200 cents
 * // Final: 2000 - 200 = 1800 cents
 */
function calculateFinalPrice(
  price: number,
  quantity: number,
  discountPercent: number
): number {
  const subtotal = price * quantity;
  const discount = (discountPercent / 100) * subtotal;
  return subtotal - discount;
}
```

### Step 3: Provide Feedback (15-30 minutes)

#### Feedback Structure

```markdown
## Code Review: [Feature Name]

### Summary
Brief overview of changes and overall assessment.

### ✅ Strengths
- What was done well
- Good patterns used
- Excellent test coverage

### 🔴 Critical Issues (Must Fix)
1. **Security**: [Specific issue]
   - Location: `file.ts:line`
   - Problem: [Description]
   - Fix: [Suggestion]

2. **Bug**: [Specific issue]
   - Location: `file.ts:line`
   - Problem: [Description]
   - Fix: [Suggestion]

### 🟡 Important Issues (Should Fix)
1. **Performance**: [Issue]
   - Suggestion: [How to improve]

2. **Code Quality**: [Issue]
   - Suggestion: [How to improve]

### 💡 Suggestions (Nice to Have)
1. **Refactoring**: [Suggestion]
2. **Documentation**: [Suggestion]
3. **Testing**: [Suggestion]

### Metrics
- Test Coverage: 85% ✅
- Security Issues: 0 ✅
- Code Smells: 2 ⚠️
- Performance Issues: 1 ⚠️

### Verdict
- ✅ **APPROVED** - Ready to merge
- ⚠️ **APPROVED WITH COMMENTS** - Minor issues, can merge
- ❌ **CHANGES REQUESTED** - Must address critical issues

### Next Steps
1. Fix critical issues
2. Address important issues
3. Consider suggestions
4. Re-request review
```

#### Feedback Best Practices

**DO:**
- Be specific (cite line numbers, files)
- Explain the "why" behind suggestions
- Provide examples of better approaches
- Acknowledge good work
- Use constructive tone

**DON'T:**
- Make it personal
- Use vague criticism ("this is bad")
- Nitpick style issues (use linter instead)
- Request changes without explanation
- Overwhelm with too many comments

### Step 4: Follow-up

#### After Feedback Provided

1. **Be available for questions**
2. **Re-review after changes**
3. **Verify all issues addressed**
4. **Approve when ready**

#### When to Approve

**Approve when:**
- All critical issues resolved
- Tests pass
- Coverage maintained/improved
- Security concerns addressed
- Code follows standards

**Request changes when:**
- Critical bugs present
- Security vulnerabilities found
- Tests failing
- Standards violations

## Review Checklists

### Quick Review Checklist (5 minutes)
- [ ] Tests pass
- [ ] No obvious bugs
- [ ] Follows code style
- [ ] No security issues
- [ ] Documentation present

### Standard Review Checklist (30 minutes)
- [ ] Architecture appropriate
- [ ] Code quality good
- [ ] Tests comprehensive (≥70% coverage)
- [ ] Security reviewed
- [ ] Performance acceptable
- [ ] Documentation complete
- [ ] No breaking changes (or documented)

### Deep Review Checklist (60+ minutes)
- [ ] All standard checklist items
- [ ] Edge cases handled
- [ ] Error handling robust
- [ ] Logging appropriate
- [ ] Monitoring/observability
- [ ] Scalability considered
- [ ] Backwards compatibility
- [ ] Database migrations reviewed

## Integration with Protocols

When reviewing code as part of a protocol:

1. **Review against brief.md:**
   - All requirements met?
   - Definition of Done satisfied?

2. **Check plan.md completion:**
   - All steps completed?
   - Any deviations documented?

3. **Update execution.md:**
   ```markdown
   ## Code Review Completed

   **Reviewer:** [Name]
   **Date:** [Date]
   **Verdict:** Approved / Changes Requested

   **Issues Found:** 2 critical, 3 minor
   **Issues Fixed:** All critical, 2 minor
   **Outstanding:** 1 minor (documented)
   ```

## Automated Review Tools

### Linters
```bash
# JavaScript/TypeScript
npm run lint

# Python
pylint src/
flake8 src/

# Rust
cargo clippy
```

### Security Scanners
```bash
# Dependency vulnerabilities
npm audit
snyk test

# Code security
bandit -r src/  # Python
```

### Code Quality
```bash
# SonarQube
sonar-scanner

# CodeClimate
codeclimate analyze
```

## Common Review Patterns

### Pattern 1: Missing Error Handling
```typescript
// ❌ Found in review
async function fetchUser(id: string) {
  const response = await fetch(`/api/users/${id}`);
  return response.json();
}

// ✅ Suggested fix
async function fetchUser(id: string): Promise<User> {
  try {
    const response = await fetch(`/api/users/${id}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch user: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    logger.error('Failed to fetch user', { id, error });
    throw new UserFetchError(`Could not fetch user ${id}`, { cause: error });
  }
}
```

### Pattern 2: Inconsistent Naming
```typescript
// ❌ Found in review
const usr = await getUser();
const userInfo = await getUserData();
const u = await fetchUserDetails();

// ✅ Suggested fix
const user = await getUser();
const userProfile = await getUserProfile();
const userSettings = await getUserSettings();
```

### Pattern 3: Magic Numbers
```typescript
// ❌ Found in review
if (user.age > 18 && user.age < 65) {
  // ...
}

// ✅ Suggested fix
const MIN_ADULT_AGE = 18;
const RETIREMENT_AGE = 65;

if (user.age > MIN_ADULT_AGE && user.age < RETIREMENT_AGE) {
  // ...
}
```

## Tips for Effective Reviews

1. **Start with the big picture** - Architecture first, then details
2. **Review in small batches** - Max 400 lines at a time
3. **Take breaks** - Better focus after 20-30 minutes
4. **Test the code** - Don't just read, run it
5. **Learn from reviews** - Note patterns for future
6. **Be timely** - Review within 24 hours
7. **Use tools** - Automate what you can

## Metrics to Track

- Average review time
- Issues found per review
- Critical issues per 1000 LOC
- Test coverage trend
- Code quality scores
- Security issues found
