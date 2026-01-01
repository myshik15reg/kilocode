# Workflows Quick Reference

> Краткая справка по всем workflows для быстрого доступа.

## Emergency Workflows

### Hotfix Emergency (hotfix-emergency.md)
**Когда:** Production down, security breach, critical bug

**Быстрый старт:**
```bash
# 1. Assess severity (P0/P1/P2)
# 2. Create incident ticket HOTFIX-YYYYMMDD-NNN
# 3. Investigate (logs, metrics, recent changes)
# 4. Choose strategy: Rollback / Quick Fix / Workaround
# 5. Deploy fix
# 6. Monitor 30+ minutes
# 7. Post-mortem within 48h
```

**Time targets:**
- P0 (Critical): < 2 hours
- P1 (High): < 4 hours
- P2 (Medium): < 24 hours

**Key principle:** Speed without sacrificing safety.

---

## Development Workflows

### Protocol New (protocol-new.md)
**Когда:** Новая feature, сложная задача (> 3 шагов)

**Быстрый старт:**
```bash
# 1. Check environment (git status, main branch)
# 2. Create worktree
git worktree add --checkout -b NNNN-task-name ../worktrees/NNNN-task-name origin/main

# 3. Create protocol structure in .protocols/NNNN-task-name/
# 4. Write plan.md (ADR-style, detailed steps)
# 5. Create PR (draft)
# 6. Execute steps incrementally
```

**Key principle:** Баланс и простота, никакого легаси.

### Protocol Resume (protocol-resume.md)
**Когда:** Продолжить работу над существующим протоколом

**Быстрый старт:**
```bash
# 1. Read context.md (current step, status)
# 2. Switch to worktree
cd ../worktrees/NNNN-task-name

# 3. Read current step file XX-step-name.md
# 4. Execute sub-tasks
# 5. Test → Update log.md + context.md → Commit → Push
```

### Protocol Review Merge (protocol-review-merge.md)
**Когда:** Протокол завершен, готов к merge

**Быстрый старт:**
```bash
# 1. Final checks (all tests, lint, typecheck)
# 2. Update PR to Ready for Review
# 3. Code review
# 4. Merge to main
# 5. Clean up worktree
# 6. Archive protocol
```

### Agent Orchestration (agent-orchestration.md)
**Когда:** Сложная задача требующая разной экспертизы

**Быстрый старт:**
```yaml
# 1. Orchestrator analyzes task
# 2. Decomposer breaks into subtasks
# 3. Select agents by:
#    - Language/framework
#    - Task type (API design, testing, etc.)
#    - Database
# 4. Sequential execution with context passing
# 5. Quality gates at each phase
# 6. Aggregation & integration
```

**Agent selection examples:**
- Python REST API → `fastapi-async-dev`
- Node.js REST API → `nestjs-dev`
- Code review → `code-reviewer`
- Security audit → `security-auditor`
- 1C development → `1c-developer`

---

## Maintenance Workflows

### Refactoring (refactoring-workflow.md)
**Когда:** Technical debt, code duplication, complexity > 15

**Быстрый старт:**
```bash
# 1. Identify target (metrics, code smells)
# 2. Create refactoring plan
# 3. Write comprehensive tests FIRST
# 4. Incremental refactoring (small steps)
# 5. Test after EACH change
# 6. Update documentation
# 7. Performance validation
# 8. Code review
```

**Refactoring patterns:**
- Extract Method
- Extract Class
- Replace Conditional with Polymorphism
- Introduce Parameter Object
- Replace Magic Numbers with Constants

**Key principle:** Tests are your safety net.

### Dependency Management (dependency-management.md)
**Когда:** Security vulnerabilities, quarterly health check, outdated deps

**Быстрый старт:**
```bash
# 1. Dependency audit
npm audit
npm audit --json > audit-report.json

# 2. Prioritize updates (P0/P1/P2/P3)
# 3. Create update plan
# 4. Update dependencies incrementally
npm update package-name
# or
npm install package-name@latest

# 5. Test thoroughly
npm test
npm run typecheck
npm run lint

# 6. Canary deployment (for critical updates)
# 7. Post-update validation (24h monitoring)
# 8. Update documentation
```

**Update policy:**
- Security Critical: < 24 hours
- Medium: < 1 week
- Low: Next sprint

**Key principle:** Dependencies are attack surface.

---

## Analysis Workflows

### Deep Analysis (deep-analysis.md)
**Когда:** Глубокий анализ кода, архитектуры, performance

**Быстрый старт:**
```bash
# 1. Define analysis scope
# 2. Collect data (metrics, profiling, code analysis)
# 3. Analyze patterns and anti-patterns
# 4. Document findings
# 5. Create action plan
```

### Vibe Coding (vibe-coding.md)
**Когда:** Быстрый прототип, эксперимент, исследование

**Быстрый старт:**
```bash
# Свободное программирование без жестких правил
# Быстрая итерация, креативный подход
# Можно пропускать некоторые best practices для скорости
```

---

## Utility Workflows

### Create New Skill (create-new-skill.md)
**Когда:** Повторяющаяся задача требует автоматизации

**Быстрый старт:**
```bash
# 1. Identify repetitive task
# 2. Create skill file in .kilocode/skills/
# 3. Define trigger pattern
# 4. Write instructions
# 5. Test skill
# 6. Update skills index
```

### Update Indexes (update-indexes.md)
**Когда:** Добавлены новые файлы, нужно обновить index.md

**Быстрый старт:**
```bash
# 1. Find all index.md files
# 2. Scan directory for files
# 3. Update index.md with new entries
# 4. Commit changes
```

---

## Decision Matrix

```
Ситуация                                  → Workflow
─────────────────────────────────────────────────────────────────────
🔴 Production DOWN                        → hotfix-emergency.md
🔴 Security breach active                 → hotfix-emergency.md
🔴 Data loss risk                         → hotfix-emergency.md

🟠 CVE обнаружена (Critical/High)         → dependency-management.md
🟠 Major feature needed                   → protocol-new.md
🟠 Legacy code causes issues              → refactoring-workflow.md

🟡 Quarterly dependency check             → dependency-management.md
🟡 Code complexity too high               → refactoring-workflow.md
🟡 Continue existing protocol             → protocol-resume.md

🟢 Quick experiment                       → vibe-coding.md
🟢 Create automation                      → create-new-skill.md
🟢 Update documentation                   → update-indexes.md
```

---

## Workflow Integration

### Workflows работают вместе:

```mermaid
protocol-new.md
    ↓
agent-orchestration.md (if complex)
    ↓
refactoring-workflow.md (if needed)
    ↓
dependency-management.md (update deps)
    ↓
protocol-review-merge.md
    ↓
[In production]
    ↓
hotfix-emergency.md (if issues)
```

---

## Checklist Mapping

### Перед production deploy:
- [ ] All tests pass (refactoring-workflow)
- [ ] Security scan clean (dependency-management)
- [ ] Code review done (protocol-review-merge)
- [ ] Performance validated (refactoring-workflow)
- [ ] Rollback plan ready (hotfix-emergency)
- [ ] Monitoring configured (hotfix-emergency)

### После production deploy:
- [ ] Monitor 30+ minutes (hotfix-emergency)
- [ ] Check error rates (hotfix-emergency)
- [ ] Verify business metrics (hotfix-emergency)
- [ ] Update documentation (all workflows)

### Quarterly maintenance:
- [ ] Dependency audit (dependency-management)
- [ ] Code quality review (refactoring-workflow)
- [ ] Security scan (dependency-management)
- [ ] Technical debt assessment (refactoring-workflow)
- [ ] Agent effectiveness review (agent-orchestration)

---

## Common Commands

### Git
```bash
# Create worktree (protocol-new)
git worktree add --checkout -b NNNN-name ../worktrees/NNNN-name origin/main

# Hotfix branch
git checkout -b hotfix/YYYYMMDD-issue-name production-tag

# Check status
git status

# Commit with protocol marker
git commit -m "type(scope): subject [protocol-NNNN/XX]"
```

### Testing
```bash
# Run all tests
npm test

# Run specific test
npm test -- path/to/test.ts

# With coverage
npm test -- --coverage

# Typecheck
npm run typecheck

# Lint
npm run lint
```

### Dependencies
```bash
# Audit
npm audit

# Update specific package
npm update package-name

# Install exact version
npm install package-name@1.2.3

# Clean install
rm -rf node_modules package-lock.json && npm install
```

### Deployment
```bash
# Rollback (Kubernetes)
kubectl rollout undo deployment/service-name

# Check status
kubectl rollout status deployment/service-name

# Logs
kubectl logs -f deployment/service-name
```

---

## Emergency Contacts

### P0 Incident Response:
1. Check `hotfix-emergency.md`
2. Notify on-call engineer
3. Create incident ticket
4. Start incident timeline
5. Choose: Rollback / Quick Fix / Workaround
6. Monitor closely after fix

### Security Incident:
1. Assess severity (CVSS score)
2. Follow `hotfix-emergency.md` → Security Hotfixes section
3. Coordinate with security team
4. Deploy off-hours if possible
5. Publish security advisory after fix

---

## References

**Full Workflows:**
- `.kilocode/workflows/hotfix-emergency.md`
- `.kilocode/workflows/refactoring-workflow.md`
- `.kilocode/workflows/dependency-management.md`
- `.kilocode/workflows/agent-orchestration.md`
- `.kilocode/workflows/protocol-new.md`
- `.kilocode/workflows/protocol-resume.md`
- `.kilocode/workflows/protocol-review-merge.md`

**Supporting Documentation:**
- `.kilocode/rules/` - Project rules and safety
- `.kilocode/patterns/` - Code patterns and standards
- `.kilocode/agents/` - 104+ specialized agents
- `.kilocode/skills/` - Reusable automation skills

---

**Принцип:** Правильный workflow для правильной задачи = Maximum efficiency.
