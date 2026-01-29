# Security Patterns & Standards

## OWASP Top 10 Checklist

### 1. Injection Prevention
```typescript
// SQL Injection - Use parameterized queries
// BAD
const query = `SELECT * FROM users WHERE id = ${userId}`;

// GOOD - Parameterized
const query = 'SELECT * FROM users WHERE id = $1';
const result = await db.query(query, [userId]);

// GOOD - ORM
const user = await prisma.user.findUnique({ where: { id: userId } });

// Command Injection - Avoid shell execution
// BAD
exec(`ls ${userInput}`);

// GOOD - Use specific APIs
const files = await fs.readdir(sanitizedPath);

// NoSQL Injection
// BAD
db.users.find({ name: userInput });

// GOOD - Validate and sanitize
const sanitizedInput = typeof userInput === 'string' ? userInput : '';
db.users.find({ name: { $eq: sanitizedInput } });
```

### 2. Broken Authentication
```typescript
// Password hashing
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Rate limiting for login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: 'Too many login attempts',
  skipSuccessfulRequests: true,
});

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET!,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
}));

// JWT best practices
const token = jwt.sign(
  { userId: user.id, role: user.role },
  process.env.JWT_SECRET!,
  {
    expiresIn: '15m',
    issuer: 'your-app',
    audience: 'your-app-users',
  }
);
```

### 3. Sensitive Data Exposure
```typescript
// Never log sensitive data
// BAD
console.log(`User login: ${email}, password: ${password}`);

// GOOD
console.log(`User login attempt: ${email}`);

// Mask sensitive data in responses
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  const maskedLocal = local.slice(0, 2) + '***';
  return `${maskedLocal}@${domain}`;
}

// Environment variables
// BAD - hardcoded
const apiKey = 'sk-1234567890';

// GOOD - from environment
const apiKey = process.env.API_KEY;
if (!apiKey) throw new Error('API_KEY not configured');

// HTTPS enforcement
app.use((req, res, next) => {
  if (req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  next();
});
```

### 4. XML External Entities (XXE)
```typescript
// Disable external entities in XML parsers
import { XMLParser } from 'fast-xml-parser';

const parser = new XMLParser({
  allowBooleanAttributes: true,
  // Disable external entity processing
  processEntities: false,
  htmlEntities: false,
});

// Prefer JSON over XML when possible
```

### 5. Broken Access Control
```typescript
// Authorization middleware
function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    next();
  };
}

// Resource ownership check
async function getResource(req: Request, res: Response) {
  const resource = await db.resource.findUnique({
    where: { id: req.params.id },
  });

  if (!resource) {
    return res.status(404).json({ error: 'Not found' });
  }

  // Check ownership
  if (resource.userId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  res.json(resource);
}

// IDOR prevention
// BAD - Direct object reference
app.get('/api/users/:id', (req, res) => {
  const user = await db.user.findUnique({ where: { id: req.params.id } });
  res.json(user);
});

// GOOD - Check authorization
app.get('/api/users/:id', requireAuth, async (req, res) => {
  if (req.params.id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const user = await db.user.findUnique({ where: { id: req.params.id } });
  res.json(user);
});
```

### 6. Security Misconfiguration
```typescript
// Security headers with Helmet
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Avoid if possible
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://api.example.com'],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

// CORS configuration
app.use(cors({
  origin: ['https://example.com', 'https://app.example.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Remove server fingerprints
app.disable('x-powered-by');
```

### 7. Cross-Site Scripting (XSS)
```typescript
// Output encoding
import { encode } from 'html-entities';

function renderUserContent(content: string): string {
  return encode(content);
}

// React automatically escapes
// SAFE
<div>{userInput}</div>

// DANGEROUS - avoid
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// Content-Type headers
res.setHeader('Content-Type', 'application/json');
res.setHeader('X-Content-Type-Options', 'nosniff');

// Input validation
import { z } from 'zod';

const userInputSchema = z.string()
  .min(1)
  .max(1000)
  .regex(/^[a-zA-Z0-9\s\-_.]+$/); // Whitelist allowed characters
```

### 8. Insecure Deserialization
```typescript
// Validate all incoming data
const requestSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(100),
  data: z.record(z.string(), z.unknown()).optional(),
});

// Don't deserialize untrusted data
// BAD
const obj = eval(`(${userInput})`);
const obj = new Function('return ' + userInput)();

// GOOD
try {
  const obj = JSON.parse(userInput);
  const validated = requestSchema.parse(obj);
} catch (e) {
  // Handle error
}

// Avoid dangerous deserialization libraries
// Use safe alternatives with schema validation
```

### 9. Using Components with Known Vulnerabilities
```bash
# Regular dependency audits
npm audit
npm audit fix

# Use Snyk or similar
npx snyk test
npx snyk monitor

# Keep dependencies updated
npm outdated
npm update

# Lock file for reproducible builds
npm ci # In CI/CD
```

### 10. Insufficient Logging & Monitoring
```typescript
// Structured security logging
import { createLogger, format, transports } from 'winston';

const securityLogger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
  transports: [
    new transports.File({ filename: 'security.log' }),
  ],
});

// Log security events
function logSecurityEvent(event: {
  type: string;
  userId?: string;
  ip: string;
  details: Record<string, unknown>;
}) {
  securityLogger.info({
    ...event,
    timestamp: new Date().toISOString(),
  });
}

// Log failed login attempts
logSecurityEvent({
  type: 'FAILED_LOGIN',
  ip: req.ip,
  details: { email: req.body.email, reason: 'invalid_password' },
});

// Log authorization failures
logSecurityEvent({
  type: 'AUTHORIZATION_FAILURE',
  userId: req.user?.id,
  ip: req.ip,
  details: { resource: req.path, method: req.method },
});
```

## Input Validation Checklist
- [ ] Validate on server side (never trust client)
- [ ] Use allowlist validation when possible
- [ ] Validate data types, length, format, range
- [ ] Sanitize before storage and display
- [ ] Use parameterized queries
- [ ] Encode output based on context

## Authentication Checklist
- [ ] Strong password requirements
- [ ] Secure password storage (bcrypt/argon2)
- [ ] Rate limiting on login
- [ ] Account lockout policy
- [ ] Secure session management
- [ ] MFA support

## Authorization Checklist
- [ ] Deny by default
- [ ] Check on every request
- [ ] Validate resource ownership
- [ ] Audit privilege escalation paths
- [ ] Log authorization failures

## Security Headers Checklist
- [ ] Content-Security-Policy
- [ ] Strict-Transport-Security
- [ ] X-Content-Type-Options: nosniff
- [ ] X-Frame-Options: DENY
- [ ] Referrer-Policy
- [ ] Permissions-Policy
