# Dependency Management Workflow

> **КРИТИЧНЫЙ WORKFLOW:** Безопасное управление зависимостями, security updates и мониторинг vulnerabilities.

## Обзор

Dependency Management workflow обеспечивает систематический подход к обновлению зависимостей, закрытию security vulnerabilities и поддержанию здорового состояния dependency tree.

## Когда использовать

**ОБЯЗАТЕЛЬНО** для:
- Security vulnerabilities (CVE) обнаружены
- Critical dependencies устарели (major versions behind)
- Dependabot/Snyk alerts
- Quarterly dependency health check
- Pre-release dependency audit

**РЕГУЛЯРНО** (каждый спринт):
- Minor/patch updates
- Security patches
- Dependency audit

**НЕ НУЖНО**:
- Обновлять dependencies "просто так"
- Гнаться за latest version без причины
- Обновлять все сразу

## Dependency Types

```
Type              → Update Strategy
──────────────────────────────────────────
Security Critical → Immediate (< 24 hours)
Production Deps   → Careful (test thoroughly)
Dev Dependencies  → Regular (lower risk)
Transitive Deps   → Via parent update
Deprecated Deps   → Plan migration
```

## Step-by-Step Process

### Step 1: Dependency Audit

**Регулярный аудит зависимостей:**

```bash
# NPM Audit (Node.js)
npm audit
npm audit --json > audit-report.json

# Yarn Audit
yarn audit
yarn audit --json > audit-report.json

# PNPM Audit
pnpm audit

# Python (pip-audit)
pip-audit
pip-audit --format json > audit-report.json

# Go
go list -m -u all
nancy go.sum  # OSS Index vulnerability scanner

# Rust
cargo audit

# Java (Maven)
mvn dependency:tree
mvn versions:display-dependency-updates

# .NET
dotnet list package --vulnerable
dotnet list package --outdated
```

**Automated Security Scanning:**

```yaml
# .github/workflows/security-scan.yml
name: Security Scan

on:
  schedule:
    - cron: '0 0 * * 1'  # Weekly on Monday
  push:
    branches: [main]
  pull_request:

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Run Snyk Security Scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}

      - name: NPM Audit
        run: npm audit --audit-level=moderate

      - name: Check for outdated dependencies
        run: npm outdated || true

      - name: Upload audit results
        uses: actions/upload-artifact@v3
        with:
          name: security-audit
          path: audit-report.json
```

**Результат анализа:**

```markdown
# Dependency Audit Report - 2025-12-30

## Summary
- **Total Dependencies:** 234
- **Direct Dependencies:** 45
- **Dev Dependencies:** 23
- **Transitive Dependencies:** 166

## Vulnerabilities
- **Critical:** 2
- **High:** 5
- **Medium:** 12
- **Low:** 8

## Outdated Packages
- **Major versions behind:** 8
- **Minor versions behind:** 23
- **Patch versions behind:** 34

## Deprecated Packages
- `request` (use `axios` or `node-fetch`)
- `moment` (use `date-fns` or `dayjs`)

## Action Items
- [ ] Fix critical vulnerabilities immediately
- [ ] Plan major version updates
- [ ] Review deprecated packages
```

### Step 2: Prioritize Updates

**Severity Classification:**

```markdown
## P0 - Critical (Fix within 24 hours)
- [ ] CVE with CVSS score ≥ 9.0
- [ ] Actively exploited vulnerabilities
- [ ] Remote code execution (RCE)
- [ ] SQL injection, XSS in production dependencies

## P1 - High (Fix within 1 week)
- [ ] CVE with CVSS score 7.0-8.9
- [ ] Authentication bypass
- [ ] Data exposure risks
- [ ] DoS vulnerabilities in public-facing services

## P2 - Medium (Fix within 1 month)
- [ ] CVE with CVSS score 4.0-6.9
- [ ] Deprecated packages with security concerns
- [ ] Major version updates for critical dependencies

## P3 - Low (Plan for next sprint)
- [ ] Minor version updates
- [ ] Patch updates
- [ ] Dev dependency updates
- [ ] Nice-to-have improvements
```

**Dependency Update Matrix:**

```
Package          Current   Latest   Severity   Breaking   Priority
────────────────────────────────────────────────────────────────
express          4.17.1    4.18.2   Critical   No         P0
jsonwebtoken     8.5.1     9.0.0    High       Yes        P1
lodash           4.17.19   4.17.21  High       No         P1
react            17.0.2    18.2.0   Medium     Yes        P2
typescript       4.5.5     5.0.2    Low        Yes        P3
jest             27.0.0    29.0.0   Low        Yes        P3
```

### Step 3: Create Update Plan

**Template для Major Updates:**

```markdown
# Dependency Update Plan: React 17 → 18

## Motivation
**Why:** React 18 has concurrent rendering, automatic batching, new hooks
**Security:** No CVEs, but staying current reduces future risk
**Risk Level:** Medium (breaking changes in APIs we use)

## Impact Analysis

### Breaking Changes
1. **ReactDOM.render deprecated**
   - Affected files: `src/index.tsx`
   - Migration: Use `ReactDOM.createRoot()`

2. **Automatic batching**
   - May affect state update timing
   - Need to review async state updates

3. **StrictMode more strict**
   - Will catch more issues in development
   - May need to fix warnings

### Compatibility Check
- ✅ TypeScript 4.5+ (we have 4.5.5)
- ✅ React Testing Library 12+ (we have 13.0)
- ⚠️  React Router needs update (5 → 6)
- ❌ Some third-party UI libs not compatible yet

### Dependencies to Update Together
```json
{
  "react": "17.0.2 → 18.2.0",
  "react-dom": "17.0.2 → 18.2.0",
  "@types/react": "17.0.2 → 18.0.28",
  "@types/react-dom": "17.0.2 → 18.0.11",
  "react-router-dom": "5.3.0 → 6.8.0"  // Required update
}
```

## Testing Strategy
- [ ] Run all existing tests
- [ ] Manual testing of critical user flows
- [ ] Performance benchmarks (new concurrent features)
- [ ] Visual regression testing
- [ ] Canary deployment (10% traffic for 24h)

## Rollback Plan
- Keep old version in git history
- Feature flag for React 18 features
- Quick rollback procedure documented

## Timeline
- Day 1: Update dev environment, fix build issues
- Day 2: Fix test failures
- Day 3: Manual QA testing
- Day 4: Canary deployment
- Day 5: Full rollout (if canary successful)

## References
- [React 18 Upgrade Guide](https://react.dev/blog/2022/03/08/react-18-upgrade-guide)
- [Breaking Changes](https://github.com/facebook/react/blob/main/CHANGELOG.md#1800)
```

### Step 4: Update Dependencies

**Strategy A: Security Patches (Low Risk)**

```bash
# Step 4.1: Create branch
git checkout -b deps/security-patches-2025-12-30

# Step 4.2: Update specific package (patch/minor)
npm update lodash  # Updates to latest patch/minor

# Or specific version
npm install lodash@4.17.21

# Step 4.3: Run tests immediately
npm test

# Step 4.4: Check for breaking changes
npm run typecheck
npm run lint
npm run build

# Step 4.5: Commit if all pass
git add package.json package-lock.json
git commit -m "fix(deps): update lodash to 4.17.21 (security patch)"

# Step 4.6: Push and create PR
git push origin deps/security-patches-2025-12-30
gh pr create --title "Security patches: lodash, express" \
  --body "Fixes CVE-2021-23337 and CVE-2022-24999"
```

**Strategy B: Major Version Updates (High Risk)**

```bash
# Step 4.1: Create dedicated branch
git checkout -b deps/react-18-upgrade

# Step 4.2: Update package.json manually
# Edit package.json:
# "react": "^18.2.0",
# "react-dom": "^18.2.0"

# Step 4.3: Clean install
rm -rf node_modules package-lock.json
npm install

# Step 4.4: Fix TypeScript errors
npm run typecheck
# Fix errors one by one

# Step 4.5: Fix breaking changes
# Update ReactDOM.render → createRoot
# src/index.tsx

# Before:
# import ReactDOM from 'react-dom';
# ReactDOM.render(<App />, document.getElementById('root'));

# After:
import { createRoot } from 'react-dom/client';
const root = createRoot(document.getElementById('root')!);
root.render(<App />);

# Step 4.6: Update tests
npm test
# Fix test failures

# Step 4.7: Manual testing checklist
# [ ] Login flow works
# [ ] Dashboard loads
# [ ] Forms submit correctly
# [ ] Real-time features work
# [ ] No console errors

# Step 4.8: Performance check
npm run build
# Check bundle size didn't explode

# Step 4.9: Commit incrementally
git add src/index.tsx
git commit -m "refactor: migrate to React 18 createRoot API"

git add src/tests/
git commit -m "test: update tests for React 18"

# Step 4.10: Create PR with detailed description
gh pr create --title "feat: upgrade to React 18" \
  --body "$(cat <<EOF
# React 18 Upgrade

## Changes
- Updated React 17.0.2 → 18.2.0
- Migrated to createRoot API
- Fixed test compatibility issues

## Testing
- ✅ All unit tests pass
- ✅ Integration tests pass
- ✅ Manual testing completed
- ✅ Bundle size: 245KB → 248KB (+1.2%)

## Breaking Changes
None for end users. Internal API changes only.

## Rollback Plan
Revert this PR if issues found in canary.

## References
- [Migration Guide](https://react.dev/blog/2022/03/08/react-18-upgrade-guide)
EOF
)"
```

**Strategy C: Automated Updates (Dependabot)**

```yaml
# .github/dependabot.yml
version: 2
updates:
  # NPM dependencies
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "09:00"
    open-pull-requests-limit: 5
    reviewers:
      - "tech-lead"
    assignees:
      - "dev-team"
    labels:
      - "dependencies"
    # Group minor/patch updates
    groups:
      development-dependencies:
        dependency-type: "development"
        update-types:
          - "minor"
          - "patch"

  # Security updates (more frequent)
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "daily"
    open-pull-requests-limit: 10
    # Only security updates
    allow:
      - dependency-type: "all"
        update-types: ["security"]

  # Docker base images
  - package-ecosystem: "docker"
    directory: "/"
    schedule:
      interval: "weekly"

  # GitHub Actions
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "monthly"
```

### Step 5: Dependency Testing

**Comprehensive Testing Checklist:**

```markdown
## Pre-Update Testing
- [ ] Document current test results (baseline)
- [ ] Run full test suite (unit + integration + e2e)
- [ ] Performance benchmarks
- [ ] Security scan (npm audit)

## Post-Update Testing
- [ ] All tests pass
- [ ] No new TypeScript errors
- [ ] No new linting errors
- [ ] Build succeeds
- [ ] Bundle size acceptable (< 10% increase)
- [ ] No console warnings/errors
- [ ] Security scan clean

## Integration Testing
- [ ] Test with real API
- [ ] Test critical user flows
- [ ] Test error scenarios
- [ ] Test edge cases

## Performance Testing
- [ ] Page load time
- [ ] Time to interactive
- [ ] Bundle size
- [ ] Memory usage
- [ ] CPU usage

## Compatibility Testing
- [ ] Chrome latest
- [ ] Firefox latest
- [ ] Safari latest
- [ ] Mobile browsers
- [ ] Different Node.js versions (if relevant)
```

**Automated Regression Tests:**

```typescript
// tests/dependency-regression.test.ts
describe('Dependency Update Regression Tests', () => {
  describe('Security', () => {
    it('should not have high/critical vulnerabilities', async () => {
      const { execSync } = require('child_process');
      const audit = execSync('npm audit --json').toString();
      const result = JSON.parse(audit);

      const critical = result.metadata.vulnerabilities.critical || 0;
      const high = result.metadata.vulnerabilities.high || 0;

      expect(critical).toBe(0);
      expect(high).toBe(0);
    });
  });

  describe('Bundle Size', () => {
    it('should not increase bundle size by more than 10%', async () => {
      const fs = require('fs');
      const path = require('path');

      const bundlePath = path.join(__dirname, '../dist/main.js');
      const currentSize = fs.statSync(bundlePath).size;

      // Baseline: 250KB (250000 bytes)
      const baselineSize = 250000;
      const maxSize = baselineSize * 1.1; // 10% increase allowed

      expect(currentSize).toBeLessThan(maxSize);
    });
  });

  describe('Performance', () => {
    it('should maintain performance benchmarks', async () => {
      const { performance } = require('perf_hooks');

      performance.mark('start');
      // Test critical operation
      await criticalOperation();
      performance.mark('end');

      const measure = performance.measure('critical-op', 'start', 'end');

      // Should complete in < 100ms
      expect(measure.duration).toBeLessThan(100);
    });
  });

  describe('API Compatibility', () => {
    it('should maintain public API surface', () => {
      // Test that public exports still exist
      const pkg = require('../src/index');

      expect(pkg.criticalFunction).toBeDefined();
      expect(pkg.CriticalClass).toBeDefined();
      expect(typeof pkg.criticalFunction).toBe('function');
    });

    it('should maintain function signatures', () => {
      const pkg = require('../src/index');

      // Test function can be called with expected params
      expect(() => {
        pkg.criticalFunction('param1', 123, { option: true });
      }).not.toThrow();
    });
  });
});
```

### Step 6: Canary Deployment

**Для критических dependency updates:**

```yaml
# kubernetes/deployment-canary.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-canary
spec:
  replicas: 1  # Start with 1 pod (vs 10 for stable)
  selector:
    matchLabels:
      app: myapp
      version: canary
  template:
    metadata:
      labels:
        app: myapp
        version: canary
    spec:
      containers:
      - name: app
        image: myapp:v2.0.0-deps-update  # New dependencies
        env:
        - name: VERSION
          value: "canary"

---
# Service sends 10% traffic to canary
apiVersion: v1
kind: Service
metadata:
  name: app-service
spec:
  selector:
    app: myapp
  ports:
  - port: 80
    targetPort: 8080
  # Traffic splitting handled by Istio/Linkerd
```

**Canary Monitoring:**

```javascript
// monitoring/canary-check.js
const prometheus = require('prom-client');

// Compare canary vs stable metrics
async function checkCanaryHealth() {
  const metrics = await prometheus.query({
    query: `
      # Error rate
      rate(http_requests_total{status=~"5.."}[5m])
    `,
  });

  const canaryErrorRate = metrics.find(m => m.version === 'canary').value;
  const stableErrorRate = metrics.find(m => m.version === 'stable').value;

  // Canary should not have significantly higher error rate
  if (canaryErrorRate > stableErrorRate * 1.5) {
    console.error('Canary error rate too high, rolling back');
    await rollbackCanary();
    return false;
  }

  // Check latency
  const latency = await prometheus.query({
    query: `histogram_quantile(0.95, http_request_duration_seconds)`,
  });

  const canaryP95 = latency.find(m => m.version === 'canary').value;
  const stableP95 = latency.find(m => m.version === 'stable').value;

  if (canaryP95 > stableP95 * 1.2) {
    console.error('Canary latency too high, rolling back');
    await rollbackCanary();
    return false;
  }

  console.log('✅ Canary healthy, proceeding with rollout');
  return true;
}

// Run every 5 minutes for 24 hours
setInterval(checkCanaryHealth, 5 * 60 * 1000);
```

**Gradual Rollout:**

```bash
# Hour 0: Deploy canary (10% traffic)
kubectl apply -f deployment-canary.yaml

# Hour 1: Monitor metrics, check health
node monitoring/canary-check.js

# Hour 4: If healthy, increase to 50%
kubectl scale deployment app-canary --replicas=5

# Hour 8: If still healthy, increase to 100%
kubectl scale deployment app-canary --replicas=10
kubectl scale deployment app-stable --replicas=0

# Hour 12: Remove old deployment
kubectl delete deployment app-stable
```

### Step 7: Post-Update Validation

**24-Hour Monitoring Checklist:**

```markdown
## Hour 0-1 (Immediate)
- [ ] Deployment successful
- [ ] Health checks passing
- [ ] No error spikes in logs
- [ ] Response times normal
- [ ] No customer reports

## Hour 1-4 (Short-term)
- [ ] Error rate < baseline
- [ ] P95 latency < baseline
- [ ] Memory usage stable
- [ ] No new exceptions
- [ ] Business metrics normal (conversions, etc.)

## Hour 4-24 (Medium-term)
- [ ] No memory leaks
- [ ] No gradual performance degradation
- [ ] All async jobs completing
- [ ] Database queries performing well
- [ ] Third-party integrations working

## Day 2-7 (Long-term)
- [ ] Weekly metrics look good
- [ ] No pattern of new errors
- [ ] User satisfaction unchanged
- [ ] Team velocity maintained
```

**Rollback Procedure:**

```bash
# If issues detected, rollback immediately

# Method 1: Kubernetes rollback
kubectl rollout undo deployment/app

# Method 2: Scale down canary
kubectl scale deployment app-canary --replicas=0
kubectl scale deployment app-stable --replicas=10

# Method 3: Revert git commit
git revert <commit-sha>
git push origin main

# Method 4: Redeploy old version
kubectl set image deployment/app app=myapp:v1.9.0

# Verify rollback
kubectl rollout status deployment/app
curl https://api.production.com/health

# Notify team
# Post-mortem on what went wrong
```

### Step 8: Documentation

**Update Dependency Documentation:**

```markdown
# DEPENDENCIES.md

## Current Stack

### Core Dependencies
| Package       | Version | Purpose                  | Last Updated |
|---------------|---------|--------------------------|--------------|
| express       | 4.18.2  | Web framework            | 2025-12-30   |
| react         | 18.2.0  | UI library               | 2025-12-30   |
| postgresql    | 14.7    | Database                 | 2025-11-15   |
| redis         | 7.0.8   | Caching                  | 2025-10-20   |

### Security-Critical Dependencies
| Package       | CVEs     | Action Required           |
|---------------|----------|---------------------------|
| jsonwebtoken  | None     | Keep updated              |
| bcrypt        | None     | Keep updated              |
| helmet        | None     | Keep updated              |

### Deprecated Dependencies
| Package | Replacement  | Migration Deadline | Status     |
|---------|--------------|-------------------|------------|
| request | axios        | 2026-01-31        | Planned    |
| moment  | date-fns     | 2026-03-31        | In Progress|

## Update Policy

### Security Updates
- **Critical/High:** Within 24 hours
- **Medium:** Within 1 week
- **Low:** Next sprint

### Feature Updates
- **Major versions:** Quarterly review
- **Minor versions:** Monthly review
- **Patch versions:** Automated (Dependabot)

## Known Issues
- `react-router@6.8.0` has minor TypeScript issues (#1234)
- `webpack@5.75.0` slow on Windows (acceptable)

## Compatibility Matrix
| Node.js | NPM  | Supported |
|---------|------|-----------|
| 18.x    | 9.x  | ✅ Yes    |
| 16.x    | 8.x  | ⚠️  EOL soon |
| 14.x    | 6.x  | ❌ No     |
```

**Changelog Entry:**

```markdown
# CHANGELOG.md

## [2.1.0] - 2025-12-30

### Security
- Updated `lodash` from 4.17.19 to 4.17.21 (CVE-2021-23337)
- Updated `express` from 4.17.1 to 4.18.2 (CVE-2022-24999)

### Changed
- Upgraded React from 17.0.2 to 18.2.0
  - Migrated to new createRoot API
  - Enabled concurrent rendering features
  - See [migration guide](docs/react-18-migration.md)

### Dependencies
- Updated 23 dependencies (15 security patches, 8 minor updates)
- Full dependency changes: see [dependency-diff.md](docs/dependency-diff.md)

### Breaking Changes
None for end users. Internal API changes documented in UPGRADING.md.
```

## Dependency Lock Files

**Best Practices:**

```bash
# Always commit lock files
git add package-lock.json  # NPM
git add yarn.lock          # Yarn
git add pnpm-lock.yaml     # PNPM
git add Cargo.lock         # Rust
git add go.sum             # Go
git add Gemfile.lock       # Ruby

# Use exact versions in CI
npm ci  # Uses package-lock.json exactly

# Regenerate lock file if corrupted
rm package-lock.json
npm install

# Verify lock file integrity
npm audit signatures
```

**Lock File in CI:**

```yaml
# .github/workflows/ci.yml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      # Verify lock file is up to date
      - name: Check lock file
        run: |
          npm ci
          git diff --exit-code package-lock.json

      # Fail if lock file changed
      # (means package.json and lock are out of sync)
```

## Advanced Dependency Management

### Dependency Pinning Strategy

```json
// package.json
{
  "dependencies": {
    // Exact version (security-critical)
    "jsonwebtoken": "9.0.0",

    // Patch updates allowed (^)
    "express": "^4.18.2",  // Allows 4.18.x, not 4.19.0

    // Minor updates allowed (~)
    "lodash": "~4.17.21",  // Allows 4.17.x, not 4.18.0

    // Range (avoid in production)
    "debug": ">=4.0.0 <5.0.0",

    // Git dependency (avoid if possible)
    "custom-lib": "git+https://github.com/org/custom-lib.git#v2.1.0",

    // Local dependency
    "@myorg/shared": "file:../shared"
  },
  "devDependencies": {
    // Dev deps can be more relaxed
    "jest": "^29.0.0",
    "typescript": "^5.0.0"
  }
}
```

### Monorepo Dependency Management

```json
// package.json (root)
{
  "workspaces": [
    "packages/*",
    "apps/*"
  ],
  "devDependencies": {
    // Shared dev deps at root
    "typescript": "^5.0.0",
    "jest": "^29.0.0"
  }
}

// packages/shared/package.json
{
  "name": "@myorg/shared",
  "version": "1.0.0",
  "dependencies": {
    "lodash": "^4.17.21"
  }
}

// apps/web/package.json
{
  "name": "@myorg/web",
  "dependencies": {
    "@myorg/shared": "workspace:*",  // Uses local package
    "react": "^18.2.0"
  }
}
```

**Update all workspaces:**

```bash
# Update specific package across all workspaces
npm update lodash --workspaces

# Update all packages in specific workspace
npm update --workspace=packages/shared

# Run audit across all workspaces
npm audit --workspaces
```

### Private Package Registry

```bash
# .npmrc
registry=https://registry.npmjs.org/

# Private packages from custom registry
@myorg:registry=https://npm.myorg.com/
//npm.myorg.com/:_authToken=${NPM_TOKEN}

# Don't publish accidentally
publish-config.registry=https://npm.myorg.com/
```

## Troubleshooting

### Problem: Dependency conflict (peer dependency)

```
npm ERR! peer dep missing: react@^17.0.0, required by some-ui-lib@1.0.0
```

**Solution:**
```bash
# Check peer dependencies
npm info some-ui-lib peerDependencies

# Option 1: Update to compatible version
npm install some-ui-lib@2.0.0  # Supports React 18

# Option 2: Force install (risky)
npm install --legacy-peer-deps

# Option 3: Use overrides (NPM 8.3+)
# package.json
{
  "overrides": {
    "some-ui-lib": {
      "react": "$react"  # Use our React version
    }
  }
}
```

### Problem: Transitive dependency vulnerability

```
lodash@4.17.15 (via some-package > another-package > lodash)
```

**Solution:**
```bash
# Option 1: Update parent package
npm update some-package

# Option 2: Use overrides/resolutions
# package.json
{
  "overrides": {
    "lodash": "^4.17.21"  # Force all lodash versions to this
  }
}

# Yarn equivalent
{
  "resolutions": {
    "**/lodash": "^4.17.21"
  }
}

# Option 3: Contact package maintainer
# Create issue asking them to update
```

### Problem: Breaking changes after update

```
TypeError: Cannot read property 'xxx' of undefined
```

**Solution:**
```bash
# Check changelog
npm info package-name

# Check breaking changes
open https://github.com/org/package/blob/main/CHANGELOG.md

# Revert to previous version
npm install package-name@1.2.3

# Gradually update with tests
npm install package-name@1.3.0  # Minor version
npm test
npm install package-name@2.0.0  # Major version
npm test
```

### Problem: Corrupted node_modules

```
Error: Module not found
```

**Solution:**
```bash
# Nuclear option (works 99% of time)
rm -rf node_modules package-lock.json
npm install

# Clear npm cache if still failing
npm cache clean --force
rm -rf node_modules package-lock.json
npm install

# Check for disk space
df -h

# Check for file permissions
ls -la node_modules/
```

## Integration with Workflows

### Link to Security

```markdown
# Security vulnerabilities → Hotfix workflow
- Critical CVE → `.kilocode/workflows/hotfix-emergency.md`
- Security patterns → `.kilocode/patterns/security/security.md`
```

### Link to Testing

```markdown
# Test dependency updates thoroughly
- Testing patterns → `.kilocode/patterns/testing.md`
- Test analyzer agent → `.kilocode/agents/testing/test-analyzer/`
```

### Link to Agent Orchestration

```markdown
# Use agents for complex dependency updates
- Security auditor → `.kilocode/agents/quality/security-auditor/`
- Code reviewer → `.kilocode/agents/quality/code-reviewer/`
```

## Automation Best Practices

```yaml
# Automated dependency updates with testing

name: Auto Dependency Update

on:
  schedule:
    - cron: '0 9 * * 1'  # Monday 9 AM

jobs:
  update-dependencies:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Update dependencies
        run: |
          npm update
          npm audit fix

      - name: Run tests
        run: |
          npm test
          npm run typecheck
          npm run lint

      - name: Check bundle size
        run: |
          npm run build
          npx bundlesize

      - name: Create PR if changes
        if: success()
        run: |
          if git diff --quiet package.json; then
            echo "No updates"
            exit 0
          fi

          git config user.name "Dependency Bot"
          git config user.email "bot@example.com"
          git checkout -b auto-deps-$(date +%Y%m%d)
          git add package.json package-lock.json
          git commit -m "chore(deps): auto update dependencies"
          git push origin auto-deps-$(date +%Y%m%d)

          gh pr create \
            --title "chore(deps): auto dependency updates" \
            --body "Automated dependency updates. All tests passed." \
            --label "dependencies,automated"
```

## References

- Security Patterns: `.kilocode/patterns/security/security.md`
- Hotfix Workflow: `.kilocode/workflows/hotfix-emergency.md`
- Testing Patterns: `.kilocode/patterns/testing.md`
- Agent Orchestration: `.kilocode/workflows/agent-orchestration.md`

---

**Key Principle:** Dependencies are your attack surface and technical debt source. Keep them updated, tested, and minimal.
