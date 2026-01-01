---
name: security-audit
description: Comprehensive framework for conducting security audits.
---

# Security Audit Skill

## Purpose
This skill provides a comprehensive framework for conducting security audits, identifying vulnerabilities, and implementing security best practices across applications.

## Triggers
Use this skill when:
- Conducting periodic security audits
- Before production deployment
- After security incident
- Reviewing new features
- Compliance requirements
- Third-party integration audit

## Context
Before conducting security audit, this skill reads:
- `.kilocode/memory-bank/tech.md` - Technology stack
- `.kilocode/patterns/security/security.md` - Security standards
- `.kilocode/rules/security-rules.md` - Security requirements (if exists)
- Protocol `brief.md` - Feature requirements

## Workflow

### Step 1: Threat Modeling (30-60 minutes)

#### Identify Assets

**What to protect:**
- User data (PII, credentials)
- Business logic
- Intellectual property
- Infrastructure access
- API keys / secrets
- Payment information
- Session tokens

#### Identify Threats (STRIDE Model)

**STRIDE Framework:**
- **S**poofing identity
- **T**ampering with data
- **R**epudiation
- **I**nformation disclosure
- **D**enial of service
- **E**levation of privilege

**Example Threat Model:**
```markdown
## Asset: User Authentication System

### Threats:
1. **Spoofing**: Attacker impersonates legitimate user
   - Risk: High
   - Impact: Account takeover

2. **Tampering**: JWT token manipulation
   - Risk: Medium
   - Impact: Privilege escalation

3. **Information Disclosure**: Password in logs
   - Risk: High
   - Impact: Credential leak
```

### Step 2: Code Security Review (60-90 minutes)

#### A. Authentication & Authorization

**1. Password Security**

```typescript
// ❌ CRITICAL: Plain text passwords
const user = {
  email: 'user@example.com',
  password: 'password123' // NEVER store plain text!
};

// ✅ GOOD: Hashed passwords
import bcrypt from 'bcrypt';

async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

**2. Session Management**

```typescript
// ❌ BAD: Predictable session IDs
const sessionId = `user-${userId}`; // Easily guessable!

// ✅ GOOD: Cryptographically secure random IDs
import crypto from 'crypto';

function generateSessionId(): string {
  return crypto.randomBytes(32).toString('hex');
}

// ✅ GOOD: Secure session configuration
app.use(session({
  secret: process.env.SESSION_SECRET, // From environment
  name: 'sessionId', // Don't use default name
  cookie: {
    httpOnly: true,     // Prevent XSS access
    secure: true,       // HTTPS only
    sameSite: 'strict', // CSRF protection
    maxAge: 3600000     // 1 hour expiry
  },
  resave: false,
  saveUninitialized: false
}));
```

**3. JWT Security**

```typescript
// ❌ BAD: Weak JWT implementation
const token = jwt.sign(
  { userId: user.id },
  'secret', // Hardcoded secret!
  { algorithm: 'none' } // No signature!
);

// ✅ GOOD: Secure JWT
const token = jwt.sign(
  {
    userId: user.id,
    role: user.role
  },
  process.env.JWT_SECRET, // Strong secret from env
  {
    algorithm: 'HS256',
    expiresIn: '1h',
    issuer: 'my-app',
    audience: 'my-app-users'
  }
);

// ✅ GOOD: Verify JWT properly
function verifyToken(token: string) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: 'my-app',
      audience: 'my-app-users'
    });
  } catch (error) {
    throw new UnauthorizedError('Invalid token');
  }
}
```

**4. Authorization Checks**

```typescript
// ❌ CRITICAL: Missing authorization
async function deleteUser(userId: string) {
  return db.users.delete(userId); // Anyone can delete anyone!
}

// ✅ GOOD: Proper authorization
async function deleteUser(userId: string, requestingUser: User) {
  // Check if admin or deleting own account
  if (!requestingUser.isAdmin && requestingUser.id !== userId) {
    throw new ForbiddenError('Not authorized to delete this user');
  }

  return db.users.delete(userId);
}

// ✅ GOOD: Role-based access control (RBAC)
function requireRole(...roles: string[]) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

app.delete('/api/users/:id', requireRole('admin'), deleteUser);
```

#### B. Input Validation & Sanitization

**1. SQL Injection Prevention**

```typescript
// ❌ CRITICAL: SQL Injection vulnerability
async function getUser(email: string) {
  return db.query(`SELECT * FROM users WHERE email = '${email}'`);
  // Vulnerable to: email = "'; DROP TABLE users; --"
}

// ✅ GOOD: Parameterized queries
async function getUser(email: string) {
  return db.query('SELECT * FROM users WHERE email = $1', [email]);
}

// ✅ GOOD: ORM with validation
async function getUser(email: string) {
  if (!isValidEmail(email)) {
    throw new ValidationError('Invalid email format');
  }
  return User.findOne({ where: { email } });
}
```

**2. XSS Prevention**

```typescript
// ❌ CRITICAL: XSS vulnerability
function displayComment(comment: string) {
  element.innerHTML = comment; // Executes malicious scripts!
}

// ✅ GOOD: Sanitize user input
import DOMPurify from 'dompurify';

function displayComment(comment: string) {
  element.innerHTML = DOMPurify.sanitize(comment);
}

// ✅ BETTER: Use textContent for plain text
function displayComment(comment: string) {
  element.textContent = comment; // No HTML interpretation
}

// ✅ GOOD: Content Security Policy (CSP)
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"], // Avoid 'unsafe-inline' in production
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", 'data:', 'https:'],
    connectSrc: ["'self'"],
    fontSrc: ["'self'"],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    frameSrc: ["'none'"]
  }
}));
```

**3. Command Injection**

```typescript
// ❌ CRITICAL: Command injection
import { exec } from 'child_process';

function convertImage(filename: string) {
  exec(`convert ${filename} output.png`); // Vulnerable!
  // filename = "input.jpg; rm -rf /"
}

// ✅ GOOD: Validate and sanitize input
function convertImage(filename: string) {
  // Whitelist allowed characters
  if (!/^[a-zA-Z0-9_.-]+$/.test(filename)) {
    throw new ValidationError('Invalid filename');
  }

  // Use array format (prevents shell interpretation)
  execFile('convert', [filename, 'output.png'], (error, stdout) => {
    // Handle result
  });
}
```

**4. Path Traversal**

```typescript
// ❌ CRITICAL: Path traversal vulnerability
app.get('/files/:filename', (req, res) => {
  const filename = req.params.filename;
  res.sendFile(`/uploads/${filename}`);
  // Vulnerable to: filename = "../../etc/passwd"
});

// ✅ GOOD: Validate and sanitize path
import path from 'path';

app.get('/files/:filename', (req, res) => {
  const filename = path.basename(req.params.filename); // Remove path components
  const filePath = path.join('/uploads', filename);

  // Ensure path is within allowed directory
  if (!filePath.startsWith('/uploads/')) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  res.sendFile(filePath);
});
```

#### C. Data Protection

**1. Sensitive Data in Logs**

```typescript
// ❌ CRITICAL: Logging sensitive data
logger.info('User login', {
  email: user.email,
  password: user.password, // NEVER log passwords!
  creditCard: user.creditCard // NEVER log payment info!
});

// ✅ GOOD: Exclude sensitive data
logger.info('User login', {
  userId: user.id,
  email: user.email
  // No password, no payment info
});

// ✅ GOOD: Mask sensitive data
function maskCreditCard(card: string): string {
  return `****-****-****-${card.slice(-4)}`;
}

logger.info('Payment processed', {
  cardNumber: maskCreditCard(user.creditCard)
});
```

**2. Encryption at Rest**

```typescript
// ✅ GOOD: Encrypt sensitive data before storing
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // 32 bytes
const IV_LENGTH = 16;

function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(
    'aes-256-cbc',
    Buffer.from(ENCRYPTION_KEY, 'hex'),
    iv
  );

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text: string): string {
  const parts = text.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];

  const decipher = crypto.createDecipheriv(
    'aes-256-cbc',
    Buffer.from(ENCRYPTION_KEY, 'hex'),
    iv
  );

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
```

**3. HTTPS Enforcement**

```typescript
// ✅ GOOD: Redirect HTTP to HTTPS
app.use((req, res, next) => {
  if (req.header('x-forwarded-proto') !== 'https') {
    res.redirect(`https://${req.header('host')}${req.url}`);
  } else {
    next();
  }
});

// ✅ GOOD: HSTS header
app.use(helmet.hsts({
  maxAge: 31536000, // 1 year
  includeSubDomains: true,
  preload: true
}));
```

#### D. API Security

**1. Rate Limiting**

```typescript
import rateLimit from 'express-rate-limit';

// ✅ GOOD: Rate limiting
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

app.post('/api/login', loginLimiter, loginHandler);

// ✅ GOOD: Different limits for different endpoints
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

app.use('/api/', apiLimiter);
```

**2. CORS Configuration**

```typescript
// ❌ BAD: Overly permissive CORS
app.use(cors({
  origin: '*', // Allows all origins!
  credentials: true
}));

// ✅ GOOD: Restricted CORS
app.use(cors({
  origin: ['https://myapp.com', 'https://www.myapp.com'],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400
}));
```

**3. API Key Security**

```typescript
// ❌ BAD: API key in code
const API_KEY = 'sk_live_1234567890';

// ✅ GOOD: Environment variables
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error('API_KEY environment variable not set');
}

// ✅ GOOD: Secure API key transmission
app.use('/api', (req, res, next) => {
  const apiKey = req.header('X-API-Key');

  if (!apiKey || !isValidApiKey(apiKey)) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  next();
});
```

#### E. Dependency Security

**1. Audit Dependencies**

```bash
# Check for known vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix

# Force fix (may introduce breaking changes)
npm audit fix --force

# Use Snyk
npm install -g snyk
snyk test
snyk monitor
```

**2. Keep Dependencies Updated**

```bash
# Check for outdated packages
npm outdated

# Update dependencies
npm update

# Use Dependabot (GitHub) for automated PR updates
```

**3. Review New Dependencies**

```markdown
## Dependency Checklist
- [ ] Check npm weekly downloads
- [ ] Review GitHub stars/activity
- [ ] Check for known CVEs
- [ ] Review license compatibility
- [ ] Audit package permissions
- [ ] Check for typosquatting
```

### Step 3: Infrastructure Security (30-45 minutes)

#### A. Environment Variables

```typescript
// ❌ CRITICAL: Secrets in code
const DATABASE_URL = 'postgresql://user:password@localhost/db';
const JWT_SECRET = 'super-secret-key';

// ✅ GOOD: Use environment variables
const DATABASE_URL = process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET;

// Validate required env vars on startup
function validateEnvironment() {
  const required = ['DATABASE_URL', 'JWT_SECRET', 'API_KEY'];

  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }
}

validateEnvironment();
```

#### B. Secrets Management

```bash
# ❌ BAD: .env file in git
git add .env

# ✅ GOOD: .env in .gitignore
echo ".env" >> .gitignore

# ✅ GOOD: Use secrets management
# AWS Secrets Manager, HashiCorp Vault, etc.
```

```typescript
// ✅ GOOD: Load secrets from vault
import AWS from 'aws-sdk';

async function getSecret(secretName: string): Promise<string> {
  const client = new AWS.SecretsManager({
    region: 'us-east-1'
  });

  const data = await client.getSecretValue({ SecretId: secretName }).promise();

  if (data.SecretString) {
    return JSON.parse(data.SecretString);
  }

  throw new Error('Secret not found');
}
```

#### C. Docker Security

```dockerfile
# ❌ BAD: Running as root
FROM node:18
WORKDIR /app
COPY . .
RUN npm install
CMD ["node", "server.js"]

# ✅ GOOD: Non-root user
FROM node:18
WORKDIR /app

# Create non-root user
RUN groupadd -r nodejs && useradd -r -g nodejs nodejs

# Install dependencies as root
COPY package*.json ./
RUN npm ci --only=production

# Copy app files
COPY --chown=nodejs:nodejs . .

# Switch to non-root user
USER nodejs

CMD ["node", "server.js"]
```

### Step 4: Security Testing (45-60 minutes)

#### A. Automated Security Scanning

**1. SAST (Static Application Security Testing)**

```bash
# SonarQube
sonar-scanner

# ESLint with security plugin
npm install --save-dev eslint-plugin-security
```

**2. DAST (Dynamic Application Security Testing)**

```bash
# OWASP ZAP
zap-cli quick-scan http://localhost:3000

# Burp Suite
# Manual testing with proxy
```

**3. Dependency Scanning**

```bash
# Snyk
snyk test
snyk monitor

# npm audit
npm audit

# Safety (Python)
safety check

# Cargo audit (Rust)
cargo audit
```

#### B. Penetration Testing Checklist

**OWASP Top 10 (2021):**

- [ ] **A01: Broken Access Control**
  - Test unauthorized access to resources
  - Test privilege escalation
  - Test IDOR (Insecure Direct Object Reference)

- [ ] **A02: Cryptographic Failures**
  - Test for weak encryption
  - Test for sensitive data exposure
  - Test SSL/TLS configuration

- [ ] **A03: Injection**
  - Test SQL injection
  - Test NoSQL injection
  - Test command injection
  - Test XSS

- [ ] **A04: Insecure Design**
  - Review threat model
  - Test business logic flaws

- [ ] **A05: Security Misconfiguration**
  - Test default credentials
  - Test directory listing
  - Test verbose error messages

- [ ] **A06: Vulnerable Components**
  - Audit dependencies
  - Check for outdated libraries

- [ ] **A07: Identification and Authentication Failures**
  - Test weak passwords
  - Test session fixation
  - Test brute force protection

- [ ] **A08: Software and Data Integrity Failures**
  - Test CI/CD pipeline security
  - Test unsigned/unverified code

- [ ] **A09: Security Logging & Monitoring Failures**
  - Test logging of security events
  - Test alert mechanisms

- [ ] **A10: Server-Side Request Forgery (SSRF)**
  - Test SSRF vulnerabilities
  - Test URL validation

### Step 5: Security Documentation (15-30 minutes)

#### Security Audit Report Template

```markdown
# Security Audit Report

**Date:** YYYY-MM-DD
**Auditor:** [Name]
**Scope:** [Application/Component]
**Version:** [Version Number]

## Executive Summary

Brief overview of findings and risk assessment.

## Methodology

- Code review
- Automated scanning (tools used)
- Manual testing
- Dependency audit

## Findings

### Critical (Fix Immediately)
1. **SQL Injection in User Search**
   - **Severity:** Critical
   - **Location:** `src/api/users.ts:45`
   - **Description:** User input not sanitized
   - **Impact:** Database compromise
   - **Remediation:** Use parameterized queries
   - **Status:** Open

### High (Fix Within 7 Days)
...

### Medium (Fix Within 30 Days)
...

### Low (Fix as Time Permits)
...

## Compliance Status

- [ ] OWASP Top 10: 8/10 compliant
- [ ] GDPR: Compliant
- [ ] PCI-DSS: Not applicable

## Recommendations

1. Implement automated security scanning in CI/CD
2. Conduct quarterly security audits
3. Provide security training for developers

## Metrics

- Total vulnerabilities found: 15
- Critical: 2
- High: 5
- Medium: 6
- Low: 2

## Next Steps

1. Address critical vulnerabilities immediately
2. Schedule follow-up audit in 30 days
3. Implement security monitoring
```

## Security Best Practices

### Development
- [ ] Use linters with security rules
- [ ] Code review focuses on security
- [ ] Security testing in CI/CD
- [ ] Regular dependency updates
- [ ] Secrets in environment variables
- [ ] Input validation everywhere

### Production
- [ ] HTTPS only
- [ ] Security headers (CSP, HSTS, etc.)
- [ ] Rate limiting
- [ ] Web Application Firewall (WAF)
- [ ] DDoS protection
- [ ] Regular security audits
- [ ] Incident response plan
- [ ] Security monitoring & alerts

### Data
- [ ] Encryption at rest
- [ ] Encryption in transit
- [ ] Secure backups
- [ ] Data retention policy
- [ ] GDPR/privacy compliance
- [ ] Regular data purging

## Security Tools

### Static Analysis
- SonarQube
- ESLint + security plugins
- Bandit (Python)
- Brakeman (Ruby)
- Semgrep

### Dependency Scanning
- Snyk
- npm audit
- Dependabot
- OWASP Dependency-Check

### Dynamic Testing
- OWASP ZAP
- Burp Suite
- Nikto

### Monitoring
- Sentry
- LogRocket
- DataDog Security Monitoring

## Compliance Frameworks

- OWASP Top 10
- OWASP ASVS
- PCI-DSS
- GDPR
- HIPAA
- SOC 2
- ISO 27001
