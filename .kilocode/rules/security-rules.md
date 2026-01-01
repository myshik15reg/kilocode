# Security Rules

> Обязательные правила безопасности для всех агентов и разработчиков.

## Критичные принципы

### 1. Never Trust User Input
**ВСЕГДА** валидируй и санитизируй входные данные:
- SQL queries - используй prepared statements
- HTML output - escape/sanitize для XSS prevention
- File paths - валидация против path traversal
- Commands - никогда не выполняй напрямую user input

### 2. Secrets Management
**ЗАПРЕЩЕНО** хранить секреты в коде:
- ❌ API keys в коде
- ❌ Пароли в конфигах
- ❌ Tokens в environment variables без шифрования
- ✅ Используй: `.env` (в .gitignore), Secret Manager, Vault

### 3. Authentication & Authorization
**Обязательно:**
- Используй bcrypt/argon2 для паролей (НИКОГДА plain text/MD5)
- Implement RBAC (Role-Based Access Control)
- JWT с коротким TTL + refresh tokens
- Multi-factor authentication для критичных операций

### 4. OWASP Top 10 Protection

#### A01: Broken Access Control
- Проверяй permissions на сервере (не только на клиенте)
- Deny by default
- Логируй access control failures

#### A02: Cryptographic Failures
- TLS 1.3+ обязательно
- Strong ciphers только
- Никогда не изобретай свой crypto

#### A03: Injection
- Prepared statements для SQL
- Parameterized queries
- Input validation + sanitization
- Content Security Policy (CSP)

#### A04: Insecure Design
- Threat modeling обязателен
- Security requirements в brief.md
- Principle of Least Privilege

#### A05: Security Misconfiguration
- Remove default credentials
- Disable directory listing
- Error messages без stack traces в production

#### A06: Vulnerable Components
- Regular dependency updates
- Security scanning (npm audit, pip-audit)
- No deprecated dependencies

#### A07: Identification Failures
- Strong password policy
- Account lockout после N failed attempts
- Secure session management

#### A08: Software Integrity Failures
- Code signing
- Dependency integrity checks (SRI)
- Trusted sources только

#### A09: Logging Failures
- Log security events
- Centralized logging
- Alert на suspicious activity
- НЕ логировать sensitive data

#### A10: SSRF
- Whitelist allowed hosts
- Disable redirects
- Network segmentation

## Обязательные проверки перед merge

### Security Checklist:
- [ ] Input validation everywhere
- [ ] No secrets in code/configs
- [ ] HTTPS/TLS enforced
- [ ] Authentication implemented correctly
- [ ] Authorization checks на всех endpoints
- [ ] SQL injection protection (prepared statements)
- [ ] XSS protection (sanitization/escaping)
- [ ] CSRF protection (tokens)
- [ ] Security headers (CSP, HSTS, X-Frame-Options)
- [ ] Error handling не раскрывает sensitive info
- [ ] Dependencies scanned (no known vulnerabilities)
- [ ] Logging security events
- [ ] Rate limiting на API
- [ ] No hardcoded credentials

## Security Testing

### Обязательные тесты:
1. **Static Analysis:** ESLint security plugins, Bandit (Python), etc.
2. **Dependency Scanning:** `npm audit`, `pip-audit`, Snyk
3. **SAST:** SonarQube, Semgrep
4. **Penetration Testing:** Для critical features

### Security Code Review:
- Reviewer ОБЯЗАН проверить Security Checklist
- Security issues = blocking для merge
- Критичные находки → немедленный fix

## Incident Response

При обнаружении security issue:
1. **Немедленно** сообщить team lead
2. **НЕ** публиковать details публично
3. Создать hotfix protocol
4. Post-mortem после исправления

## Compliance

### GDPR/Privacy:
- Минимизация данных
- Право на удаление
- Encrypted at rest and in transit
- Data retention policies

### Logging Sensitive Data:
**ЗАПРЕЩЕНО** логировать:
- Пароли
- Credit card numbers
- SSN/Passport numbers
- Session tokens

## Security Tools

### Рекомендуемые:
- **SAST:** SonarQube, Semgrep
- **DAST:** OWASP ZAP
- **Dependency Scan:** Snyk, Dependabot
- **Secrets Detection:** GitGuardian, TruffleHog
- **WAF:** Cloudflare, AWS WAF

## Security Training

Все разработчики ОБЯЗАНЫ знать:
- OWASP Top 10
- Secure coding practices
- Common vulnerabilities (SQLi, XSS, CSRF, etc.)

## References

- OWASP: https://owasp.org/
- CWE Top 25: https://cwe.mitre.org/top25/
- `.kilocode/patterns/security/security.md` - детальные паттерны
