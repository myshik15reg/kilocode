# Hotfix Emergency Workflow

> **КРИТИЧНЫЙ WORKFLOW:** Процесс срочных исправлений production issues с минимальным временем до деплоя.

## Обзор

Hotfix workflow предназначен для критических багов в production, которые требуют немедленного исправления. Он оптимизирован для скорости без потери качества и безопасности.

## Когда использовать Hotfix

**ОБЯЗАТЕЛЬНО** для:
- Production down или критическая функциональность не работает
- Security vulnerabilities (CVE, data leak, XSS, injection)
- Data corruption или loss risk
- Регуляторные нарушения (GDPR, compliance)
- Финансовые потери (payment failures, billing issues)

**НЕ НУЖНО** для:
- Minor UI bugs (используй обычный workflow)
- Performance optimization (планируй через sprint)
- Feature requests (создавай protocol)
- Cosmetic issues (backlog)

## Severity Classification

```
P0 (Critical - Immediate)
├─ Production completely down
├─ Data loss in progress
├─ Active security breach
└─ Revenue-blocking bug
   Time to fix: < 2 hours

P1 (High - Urgent)
├─ Major feature broken
├─ Security vulnerability disclosed
├─ Compliance violation
└─ Significant user impact
   Time to fix: < 4 hours

P2 (Medium - Important)
├─ Workaround available
├─ Affects subset of users
└─ Degraded performance
   Time to fix: < 24 hours
```

## Step-by-Step Process

### Step 1: Incident Declaration

**Действия:**
1. Оцени severity (P0/P1/P2)
2. Создай incident ticket с таймстампом
3. Уведоми stakeholders (для P0/P1)
4. Запиши начало incident timeline

**Template для Incident Ticket:**
```markdown
# HOTFIX-YYYYMMDD-NNN: [Brief Title]

**Severity:** P0 / P1 / P2
**Reported:** YYYY-MM-DD HH:MM:SS UTC
**Reporter:** [Name/System]
**Impact:** [User impact description]

## Symptoms
- [Observable issue 1]
- [Observable issue 2]

## Affected Systems
- Service: [name]
- Environment: production
- Region: [if applicable]
- Users affected: [estimate]

## Initial Assessment
[Quick analysis of the issue]

## Timeline
- [HH:MM] Issue reported
- [HH:MM] Investigation started
```

**Пример:**
```markdown
# HOTFIX-20251230-001: Payment API Returning 500 Errors

**Severity:** P0
**Reported:** 2025-12-30 14:23:15 UTC
**Reporter:** Monitoring System
**Impact:** All payment transactions failing, 100% error rate

## Symptoms
- GET /api/payments returns 500 Internal Server Error
- Error logs show "Database connection timeout"
- Started at ~14:20 UTC

## Affected Systems
- Service: payment-api (v2.3.1)
- Environment: production
- Region: all
- Users affected: ~5000 active users

## Timeline
- 14:20 First errors in logs
- 14:23 Monitoring alert triggered
- 14:25 Investigation started
```

### Step 2: Quick Investigation

**Цель:** Найти root cause за 15-30 минут максимум.

**Действия:**
1. **Check Monitoring**
   ```bash
   # Logs (последние 30 минут)
   kubectl logs -n production deployment/service-name --since=30m --tail=500

   # Metrics dashboard
   # - CPU, Memory, Network
   # - Error rates, latency
   # - Database connections
   ```

2. **Review Recent Changes**
   ```bash
   # Последние деплои
   git log --since="2 hours ago" --oneline

   # Pull requests merged
   gh pr list --state merged --limit 5

   # Deployment history
   kubectl rollout history deployment/service-name -n production
   ```

3. **Database Health**
   ```sql
   -- Connection count
   SELECT count(*) FROM pg_stat_activity;

   -- Long-running queries
   SELECT pid, now() - query_start as duration, query
   FROM pg_stat_activity
   WHERE state = 'active'
   ORDER BY duration DESC;

   -- Locks
   SELECT * FROM pg_locks WHERE granted = false;
   ```

4. **External Dependencies**
   ```bash
   # Check third-party APIs
   curl -I https://api.external-service.com/health

   # Check DNS
   nslookup database.internal.com

   # Check network
   ping -c 3 redis.internal.com
   ```

**Результат:** Root cause identified или decision to rollback

### Step 3: Hotfix Strategy Decision

**Выбери стратегию:**

#### Strategy A: Rollback (Fastest - 5-10 min)
```bash
# Когда использовать:
# - Причина в недавнем деплое
# - Previous version stable
# - No data migration issues

# Rollback deployment
kubectl rollout undo deployment/service-name -n production

# Verify
kubectl rollout status deployment/service-name -n production

# Monitor
kubectl logs -f deployment/service-name -n production
```

#### Strategy B: Quick Fix (Fast - 30-60 min)
```javascript
// Когда использовать:
// - Simple code fix (1-2 lines)
// - Configuration change
// - Feature flag toggle

// Example: Fix timeout
const timeout = parseInt(process.env.DB_TIMEOUT) || 5000; // was: 500

// Example: Disable broken feature
const FEATURE_ENABLED = process.env.ENABLE_NEW_FEATURE !== 'true'; // was: true
```

#### Strategy C: Workaround (Medium - 1-2 hours)
```yaml
# Когда использовать:
# - Root cause complex
# - Need temporary solution
# - Full fix requires testing

# Example: Route around broken service
apiVersion: v1
kind: Service
metadata:
  name: payment-api
spec:
  selector:
    app: payment-api-v2  # was: payment-api-v3 (broken)
```

#### Strategy D: Emergency Maintenance (Last Resort)
```markdown
# Когда использовать:
# - Data corruption risk
# - Security breach active
# - No quick fix available

# Actions:
1. Enable maintenance mode
2. Stop affected services
3. Fix issue properly
4. Test thoroughly
5. Re-enable services
```

**Decision Matrix:**
```
Issue Type               → Recommended Strategy
────────────────────────────────────────────────
Recent deploy bug        → A: Rollback
Simple code error        → B: Quick Fix
Config issue             → B: Quick Fix
External dependency      → C: Workaround
Data corruption          → D: Maintenance
Security breach          → D: Maintenance
Complex logic bug        → C: Workaround + Plan full fix
```

### Step 4: Implement Fix

**Для Quick Fix (Strategy B):**

1. **Create Hotfix Branch**
   ```bash
   # Branch from production tag
   git checkout -b hotfix/YYYYMMDD-issue-name production-v2.3.1
   ```

2. **Minimal Code Change**
   ```javascript
   // ONLY fix the immediate issue
   // DO NOT refactor
   // DO NOT add features
   // DO NOT change unrelated code

   // Before:
   const result = await fetchData(url, { timeout: 500 });

   // After:
   const result = await fetchData(url, { timeout: 30000 }); // HOTFIX: increase timeout
   ```

3. **Add Regression Test**
   ```javascript
   // Add test that would catch this bug
   describe('fetchData timeout', () => {
     it('should handle slow responses', async () => {
       // Mock slow response
       jest.useFakeTimers();
       const promise = fetchData(url, { timeout: 30000 });
       jest.advanceTimersByTime(5000);

       await expect(promise).resolves.toBeDefined();
     });
   });
   ```

4. **Quick Quality Gates**
   ```bash
   # Run ONLY affected tests (not full suite)
   npm test -- path/to/affected.test.ts

   # TypeScript check
   npm run typecheck

   # Lint ONLY changed files
   npm run lint -- path/to/changed-file.ts

   # Build
   npm run build
   ```

**Checklist для Hotfix Code:**
- [ ] Минимальное изменение (< 10 lines if possible)
- [ ] Комментарий `// HOTFIX: [reason]`
- [ ] Regression test добавлен
- [ ] No refactoring or cleanup
- [ ] No new dependencies
- [ ] TypeScript/lint pass
- [ ] Тесты проходят

### Step 5: Fast-Track Review

**Hotfix Review Process (10-15 min):**

```markdown
## Hotfix Review Checklist

### Code Review
- [ ] Changes minimal and focused
- [ ] No unrelated changes
- [ ] HOTFIX comment present
- [ ] Regression test included
- [ ] No new dependencies
- [ ] Follows security patterns (`.kilocode/patterns/security/`)

### Testing
- [ ] Unit tests pass
- [ ] Integration tests pass (if applicable)
- [ ] Manual smoke test done

### Deployment Safety
- [ ] Rollback plan documented
- [ ] Monitoring alerts configured
- [ ] Stakeholders notified

### Approvals (P0/P1)
- [ ] Tech Lead approval
- [ ] On-call engineer approval
- [ ] Security review (for security fixes)
```

**Fast Review Commands:**
```bash
# Create PR
gh pr create --title "HOTFIX: [Issue]" --body "Fixes HOTFIX-YYYYMMDD-NNN" --label hotfix

# Request review
gh pr review --approve PR_NUMBER  # From tech lead

# Merge (bypass normal checks if needed)
gh pr merge --merge --delete-branch
```

### Step 6: Production Deployment

**Pre-Deploy Checklist:**
- [ ] Fix verified in staging/QA
- [ ] Rollback plan ready
- [ ] Monitoring dashboard open
- [ ] Incident channel active
- [ ] Deploy window announced

**Deploy Process:**

1. **Tag Release**
   ```bash
   # Hotfix version (patch increment)
   git tag -a v2.3.2-hotfix.1 -m "HOTFIX: Fix payment timeout"
   git push origin v2.3.2-hotfix.1
   ```

2. **Deploy to Production**
   ```bash
   # Build and push
   docker build -t service:v2.3.2-hotfix.1 .
   docker push service:v2.3.2-hotfix.1

   # Update deployment
   kubectl set image deployment/service-name \
     service=service:v2.3.2-hotfix.1 \
     -n production

   # Watch rollout
   kubectl rollout status deployment/service-name -n production
   ```

3. **Immediate Verification**
   ```bash
   # Health check
   curl https://api.production.com/health

   # Smoke test critical path
   curl -X POST https://api.production.com/api/payments \
     -H "Content-Type: application/json" \
     -d '{"amount": 100, "currency": "USD"}'

   # Check logs (no errors)
   kubectl logs -f deployment/service-name -n production --tail=100

   # Check metrics (error rate drops)
   # → Open monitoring dashboard
   ```

4. **Monitor for 30 Minutes**
   ```markdown
   ## Post-Deploy Monitoring Checklist

   - [ ] Error rate back to normal (< 0.1%)
   - [ ] Response time acceptable (p95 < 500ms)
   - [ ] No new errors in logs
   - [ ] CPU/Memory usage normal
   - [ ] Database connections stable
   - [ ] Customer reports stopped
   - [ ] Business metrics recovering
   ```

### Step 7: Post-Incident Process

**Immediate (Within 1 hour of fix):**

1. **Update Incident Ticket**
   ```markdown
   ## Resolution
   - **Fixed at:** YYYY-MM-DD HH:MM:SS UTC
   - **Resolution:** [Description]
   - **Deployed version:** v2.3.2-hotfix.1
   - **Verification:** All systems operational

   ## Timeline
   - 14:20 Issue started
   - 14:23 Investigation began
   - 14:45 Root cause identified
   - 15:10 Fix deployed
   - 15:15 Verified working
   - **Total incident duration:** 55 minutes
   ```

2. **Notify Stakeholders**
   ```markdown
   Subject: [RESOLVED] Payment API Incident

   The payment API incident has been resolved at 15:15 UTC.

   - Root cause: Database connection timeout (500ms → 30s)
   - Fix: Configuration update deployed in v2.3.2-hotfix.1
   - Impact: ~55 minutes of payment failures
   - Current status: All systems operational

   Post-mortem will be conducted within 48 hours.
   ```

**Follow-Up (Within 48 hours):**

3. **Post-Mortem Document**
   ```markdown
   # Post-Mortem: HOTFIX-20251230-001

   ## Summary
   Payment API experienced 100% failure rate for 55 minutes due to
   database connection timeout.

   ## Timeline
   [Detailed timeline from incident ticket]

   ## Root Cause Analysis
   ### What Happened
   - Database connection pool was exhausted
   - Timeout set too low (500ms vs required 5000ms)
   - Introduced in PR #1234 deployed 2 hours before incident

   ### Why It Happened
   - PR review missed timeout change
   - Load testing didn't catch it (lower traffic)
   - No monitoring alert for connection pool

   ## Impact
   - Users affected: ~5000
   - Failed transactions: ~1200
   - Revenue impact: $45,000 estimated
   - Duration: 55 minutes

   ## What Went Well
   - Fast detection (3 minutes)
   - Quick root cause identification (22 minutes)
   - Rapid deployment (25 minutes)
   - Good communication

   ## What Went Wrong
   - Timeout change not caught in review
   - Missing load tests
   - No alerts for connection pool

   ## Action Items

   ### Prevent
   - [ ] Add connection pool monitoring alerts
   - [ ] Review all timeout configurations
   - [ ] Add load testing to CI/CD
   - [ ] Create timeout configuration checklist

   ### Detect
   - [ ] Add alert for high connection count
   - [ ] Dashboard for database metrics
   - [ ] Synthetic monitoring for critical paths

   ### Respond
   - [ ] Document hotfix process (done)
   - [ ] Train team on incident response
   - [ ] Create runbook for database issues

   **Owner:** [Name]
   **Due:** [Date]
   ```

4. **Backport to Main**
   ```bash
   # Create PR to merge hotfix back to main branch
   git checkout main
   git merge hotfix/YYYYMMDD-issue-name

   # Or cherry-pick if needed
   git cherry-pick <hotfix-commit-sha>

   # Update changelog
   echo "## [2.3.2-hotfix.1] - 2025-12-30
   ### Fixed
   - Payment API timeout causing 500 errors (HOTFIX-20251230-001)" >> CHANGELOG.md

   # Commit and push
   git commit -m "chore: backport hotfix HOTFIX-20251230-001 to main"
   git push origin main
   ```

## Hotfix Best Practices

### DO:
- ✅ Move fast but verify each step
- ✅ Keep changes minimal (< 10 lines ideal)
- ✅ Add regression test immediately
- ✅ Document everything in incident ticket
- ✅ Communicate status every 15-30 minutes
- ✅ Monitor closely after deploy (30+ min)
- ✅ Write post-mortem within 48 hours
- ✅ Follow up on action items

### DON'T:
- ❌ Refactor code during hotfix
- ❌ Add features "while you're there"
- ❌ Skip testing to save time
- ❌ Deploy without rollback plan
- ❌ Forget to update documentation
- ❌ Skip post-mortem
- ❌ Blame individuals in post-mortem
- ❌ Let action items go stale

## Security Hotfixes

**Special Considerations:**

```markdown
## Security Hotfix Process

### Pre-Disclosure
- [ ] Assess severity (CVSS score)
- [ ] Create private security advisory
- [ ] Limit information sharing (need-to-know)
- [ ] Coordinate with security team

### Fix Development
- [ ] Develop in private branch
- [ ] Security-focused code review
- [ ] Test extensively (no shortcuts)
- [ ] Prepare security bulletin

### Deployment
- [ ] Deploy off-hours if possible
- [ ] Coordinate with infrastructure team
- [ ] Monitor for exploitation attempts
- [ ] Update WAF/IDS rules if applicable

### Post-Deployment
- [ ] Publish security advisory (coordinated disclosure)
- [ ] Notify affected customers
- [ ] Report to security organizations (CVE, etc.)
- [ ] Update security documentation
```

**Security Fix Template:**
```javascript
// SECURITY HOTFIX: [CVE-YYYY-NNNNN or internal ID]
// Issue: [Brief description]
// Severity: Critical/High/Medium/Low
// Reporter: [Name or organization]
// Fix: [What changed]

// Before (vulnerable):
const userId = req.params.id; // Direct use without validation
const user = await db.query(`SELECT * FROM users WHERE id = ${userId}`);

// After (fixed):
const userId = parseInt(req.params.id, 10);
if (!userId || userId < 1) {
  throw new ValidationError('Invalid user ID');
}
const user = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
```

## Troubleshooting Hotfix Process

### Problem: Can't reproduce issue in staging
**Solution:**
```bash
# Check production vs staging differences
# - Data volume
# - Traffic patterns
# - External dependencies
# - Configuration

# Capture production traffic
kubectl port-forward -n production service/service-name 8080:8080
tcpdump -i any -w production-traffic.pcap port 8080

# Replay in staging
tcpreplay --intf1=eth0 production-traffic.pcap
```

### Problem: Fix works in staging, fails in production
**Solution:**
```markdown
1. Check environment variables
   - Database URLs
   - API keys
   - Feature flags
   - Timeouts

2. Verify deployment
   - Correct image version deployed
   - All replicas updated
   - ConfigMaps/Secrets applied

3. Test production directly (careful!)
   - Use test account
   - Low-traffic endpoint
   - Verbose logging enabled
```

### Problem: Rollback not working
**Solution:**
```bash
# Force rollback to specific revision
kubectl rollout undo deployment/service-name \
  --to-revision=5 -n production

# If still failing, scale down and up
kubectl scale deployment/service-name --replicas=0 -n production
kubectl scale deployment/service-name --replicas=3 -n production

# Nuclear option: delete and recreate
kubectl delete deployment service-name -n production
kubectl apply -f deployment.yaml
```

### Problem: Multiple issues happening simultaneously
**Solution:**
```markdown
1. Prioritize by severity
   - P0 first (production down)
   - P1 next (major degradation)
   - P2 can wait

2. Split team if possible
   - Team A: Critical issue
   - Team B: Secondary issue

3. Consider maintenance mode
   - If too many issues
   - Stop bleeding before fixing
```

## Integration with Workflows

### Link to Agent Orchestration
```markdown
# When hotfix is complex:

1. Use security-auditor agent for security fixes
   → .kilocode/agents/quality/security-auditor/

2. Use code-reviewer for fast review
   → .kilocode/agents/quality/code-reviewer/

3. Use performance-analyst for performance issues
   → .kilocode/agents/analysis/performance-analyst/
```

### Link to Patterns
```markdown
# Follow security patterns for security fixes
→ .kilocode/patterns/security/security.md

# Follow code standards even in hotfix
→ .kilocode/patterns/code-standards.md

# Language-specific patterns
→ .kilocode/patterns/languages/{language}.md
```

### Link to Rules
```markdown
# Safety rules still apply
→ .kilocode/rules/safety.md

# Project rules may be relaxed (document exceptions)
→ .kilocode/rules/project-rules.md
```

## Metrics and KPIs

**Track Hotfix Effectiveness:**

```markdown
## Hotfix Metrics

### Speed
- Time to detect: [target: < 5 min]
- Time to identify: [target: < 30 min]
- Time to fix: [target: < 2 hours for P0]
- Total incident duration: [target: < 3 hours for P0]

### Quality
- Hotfix success rate: [target: > 95%]
- Rollback rate: [target: < 5%]
- Secondary incidents: [target: 0]

### Prevention
- Regression tests added: [target: 100%]
- Post-mortems completed: [target: 100%]
- Action items completed: [target: > 80% in 30 days]
```

## Automation Opportunities

**Future Improvements:**

```javascript
// Automated incident detection
const monitor = new IncidentMonitor({
  errorRateThreshold: 0.05,  // 5%
  latencyThreshold: 1000,    // 1s
  checkInterval: 60,         // 1 minute

  onIncident: async (metrics) => {
    // Auto-create incident ticket
    await createIncidentTicket({
      severity: determineSeverity(metrics),
      affectedService: metrics.service,
      symptoms: metrics.errors,
    });

    // Auto-notify on-call
    await notifyOnCall({
      message: `P0 Incident: ${metrics.service} error rate at ${metrics.errorRate}%`,
    });
  },
});

// Automated rollback on failure
const autoRollback = new AutoRollback({
  errorRateThreshold: 0.10,
  checkDuration: 300,  // 5 minutes

  onFailure: async (deployment) => {
    console.log(`Auto-rolling back ${deployment.name}`);
    await kubectl.rollout.undo(deployment.name);
    await notifyTeam(`Auto-rollback triggered for ${deployment.name}`);
  },
});
```

## References

- Security Patterns: `.kilocode/patterns/security/security.md`
- Code Standards: `.kilocode/patterns/code-standards.md`
- Safety Rules: `.kilocode/rules/safety.md`
- Agent Orchestration: `.kilocode/workflows/agent-orchestration.md`
- Testing Patterns: `.kilocode/patterns/testing.md`

---

**Key Principle:** Speed without sacrificing safety. Every minute counts in production incidents, but quality gates prevent making things worse.
