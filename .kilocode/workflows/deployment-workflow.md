# Workflow: Deployment (deployment-workflow)

## Описание
Workflow для безопасного развертывания приложений в production. Покрывает CI/CD pipeline, стратегии deployment, мониторинг и rollback procedures.

## Когда использовать
- Deployment новой версии в production
- Hotfix deployment
- Rollback после проблемного deployment
- Infrastructure changes
- Configuration updates

---

## Принципы Deployment

### Automation First
- Полностью автоматизированный CI/CD pipeline
- Reproducible deployments
- No manual steps в production

### Safety & Reliability
- Zero-downtime deployments
- Automated rollback capability
- Health checks перед traffic routing
- Gradual rollout с canary/blue-green

### Observability
- Comprehensive monitoring
- Automated alerts
- Deployment tracking
- Audit logs

---

## Phase 1: Pre-Deployment

### Шаг 1.1: Code Freeze & Preparation
**Агент:** orchestrator

**Действия:**
1. Verify все фичи merged и ready:
   ```bash
   git checkout main
   git pull origin main
   git log --oneline -10
   ```

2. Check CI/CD status:
   ```bash
   # GitHub Actions
   gh run list --limit 5

   # All checks must pass
   gh pr checks
   ```

3. Review changelog:
   ```markdown
   ## Version 2.5.0 - 2024-01-15

   ### Features
   - Add email verification (#123)
   - Implement rate limiting (#124)

   ### Bug Fixes
   - Fix memory leak in worker (#125)

   ### Breaking Changes
   - None

   ### Migration Required
   - Run database migration for email_verified column
   ```

**Checklist:**
- [ ] All PRs merged to main
- [ ] CI/CD pipeline green
- [ ] Changelog updated
- [ ] Version bumped
- [ ] Release notes prepared

### Шаг 1.2: Deployment Plan
**Агент:** devops-engineer

**Deployment Plan Template:**
```markdown
# Deployment Plan: v2.5.0

## Metadata
- Version: 2.5.0
- Date: 2024-01-15 10:00 UTC
- Duration: ~30 minutes
- Deployment Window: 10:00-10:30 UTC (low traffic)
- On-Call: @engineer1, @engineer2

## Pre-Deployment
- [ ] Database backup created
- [ ] Database migration tested on staging
- [ ] Rollback plan prepared
- [ ] Team notified in Slack

## Deployment Strategy
**Blue-Green Deployment**
- Deploy to green environment
- Run health checks
- Route 10% traffic (canary)
- Monitor for 10 minutes
- Route 100% traffic if healthy
- Keep blue environment for 1 hour

## Database Migration
- Migration: 20240115_add_email_verified
- Duration: ~30 seconds
- Downtime: zero (online migration)
- Rollback: available

## Monitoring
- Error rate: < 1%
- Latency p95: < 500ms
- CPU usage: < 80%
- Memory usage: < 85%

## Rollback Criteria
- Error rate > 5%
- Latency p95 > 1000ms
- Critical bug discovered
- Manual decision by team lead

## Post-Deployment
- [ ] Smoke tests passed
- [ ] Monitoring dashboards checked
- [ ] Performance metrics validated
- [ ] Team notified of completion
```

### Шаг 1.3: Staging Deployment
**Агент:** devops-engineer

**Действия:**
```bash
# Deploy to staging
npm run deploy:staging

# Wait for deployment
kubectl rollout status deployment/app -n staging

# Run smoke tests
npm run test:smoke --env=staging

# Run integration tests
npm run test:integration --env=staging

# Load testing (optional)
npm run test:load --env=staging
```

**Acceptance Criteria:**
- [ ] Deployment successful
- [ ] All tests passing
- [ ] No errors in logs
- [ ] Performance acceptable

---

## Phase 2: CI/CD Pipeline

### Шаг 2.1: Build & Test
**Automated Pipeline (GitHub Actions example):**

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]
    tags: ['v*']

env:
  DOCKER_REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  # ============================================================
  # Job 1: Build & Test
  # ============================================================
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Type check
        run: npm run typecheck

      - name: Unit tests
        run: npm run test:unit

      - name: Integration tests
        run: npm run test:integration

      - name: Build
        run: npm run build

      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: build
          path: dist/

  # ============================================================
  # Job 2: Security Scan
  # ============================================================
  security-scan:
    runs-on: ubuntu-latest
    needs: build-and-test
    steps:
      - uses: actions/checkout@v3

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
          format: 'sarif'
          output: 'trivy-results.sarif'

      - name: Upload Trivy results to GitHub Security
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: 'trivy-results.sarif'

      - name: Check for critical vulnerabilities
        run: |
          trivy fs --severity CRITICAL --exit-code 1 .

  # ============================================================
  # Job 3: Build Docker Image
  # ============================================================
  build-image:
    runs-on: ubuntu-latest
    needs: [build-and-test, security-scan]
    outputs:
      image-tag: ${{ steps.meta.outputs.tags }}
    steps:
      - uses: actions/checkout@v3

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2

      - name: Log in to Container Registry
        uses: docker/login-action@v2
        with:
          registry: ${{ env.DOCKER_REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v4
        with:
          images: ${{ env.DOCKER_REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=sha,prefix={{branch}}-

      - name: Build and push Docker image
        uses: docker/build-push-action@v4
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  # ============================================================
  # Job 4: Deploy to Staging
  # ============================================================
  deploy-staging:
    runs-on: ubuntu-latest
    needs: build-image
    environment:
      name: staging
      url: https://staging.example.com
    steps:
      - uses: actions/checkout@v3

      - name: Configure kubectl
        uses: azure/k8s-set-context@v3
        with:
          method: kubeconfig
          kubeconfig: ${{ secrets.KUBE_CONFIG_STAGING }}

      - name: Deploy to staging
        run: |
          kubectl set image deployment/app \
            app=${{ needs.build-image.outputs.image-tag }} \
            -n staging

          kubectl rollout status deployment/app -n staging

      - name: Run smoke tests
        run: |
          npm run test:smoke --env=staging

  # ============================================================
  # Job 5: Deploy to Production
  # ============================================================
  deploy-production:
    runs-on: ubuntu-latest
    needs: [build-image, deploy-staging]
    environment:
      name: production
      url: https://example.com
    steps:
      - uses: actions/checkout@v3

      - name: Configure kubectl
        uses: azure/k8s-set-context@v3
        with:
          method: kubeconfig
          kubeconfig: ${{ secrets.KUBE_CONFIG_PROD }}

      - name: Database Backup
        run: |
          # Trigger backup job
          kubectl create job backup-$(date +%Y%m%d-%H%M%S) \
            --from=cronjob/database-backup \
            -n production

      - name: Run Database Migration
        run: |
          kubectl run migration-$(date +%s) \
            --image=${{ needs.build-image.outputs.image-tag }} \
            --rm -i --restart=Never \
            -n production \
            -- npm run migrate:up

      - name: Deploy to Production (Blue-Green)
        run: |
          # Deploy to green environment
          kubectl apply -f k8s/deployment-green.yaml

          # Wait for rollout
          kubectl rollout status deployment/app-green -n production

          # Run health checks
          kubectl wait --for=condition=ready pod \
            -l app=app,version=green \
            -n production \
            --timeout=300s

      - name: Canary Release (10% traffic)
        run: |
          # Route 10% traffic to green
          kubectl apply -f k8s/service-canary-10.yaml

          # Wait 5 minutes for metrics
          sleep 300

      - name: Check Canary Metrics
        id: canary-check
        run: |
          # Check error rate, latency from monitoring
          ERROR_RATE=$(curl -s "https://prometheus.example.com/api/v1/query?query=rate(http_errors[5m])" | jq -r '.data.result[0].value[1]')

          if (( $(echo "$ERROR_RATE > 0.05" | bc -l) )); then
            echo "Error rate too high: $ERROR_RATE"
            exit 1
          fi

      - name: Full Traffic Switch
        if: success()
        run: |
          # Route 100% traffic to green
          kubectl apply -f k8s/service-green.yaml

          # Label blue as old
          kubectl label deployment/app-blue version=old --overwrite

      - name: Cleanup Blue Environment
        if: success()
        run: |
          # Wait 1 hour before cleanup
          sleep 3600

          # Scale down blue
          kubectl scale deployment/app-blue --replicas=0 -n production

  # ============================================================
  # Job 6: Post-Deployment Verification
  # ============================================================
  verify-deployment:
    runs-on: ubuntu-latest
    needs: deploy-production
    steps:
      - uses: actions/checkout@v3

      - name: Run smoke tests
        run: npm run test:smoke --env=production

      - name: Check monitoring dashboards
        run: |
          # Check error rate
          # Check latency
          # Check throughput
          npm run monitoring:check

      - name: Notify team
        uses: slackapi/slack-github-action@v1
        with:
          webhook-url: ${{ secrets.SLACK_WEBHOOK }}
          payload: |
            {
              "text": "✅ Production deployment v${{ github.ref_name }} completed successfully",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Deployment Successful*\nVersion: ${{ github.ref_name }}\nEnvironment: Production"
                  }
                }
              ]
            }
```

### Шаг 2.2: Dockerfile Optimization
**Агент:** devops-engineer

**Multi-stage Dockerfile:**
```dockerfile
# ============================================================
# Stage 1: Dependencies
# ============================================================
FROM node:18-alpine AS deps

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# ============================================================
# Stage 2: Builder
# ============================================================
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install all dependencies (including dev)
RUN npm ci

# Copy source
COPY . .

# Build application
RUN npm run build && \
    npm run test:unit

# ============================================================
# Stage 3: Runner
# ============================================================
FROM node:18-alpine AS runner

# Security: Run as non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy build from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start application
CMD ["node", "dist/main.js"]
```

---

## Phase 3: Deployment Strategies

### Strategy 1: Blue-Green Deployment
**Агент:** devops-engineer

**Описание:**
- Две идентичные среды: Blue (current) и Green (new)
- Deploy на Green, тестирование
- Instant switch traffic с Blue на Green
- Blue остается для rollback

**Kubernetes Implementation:**
```yaml
# deployment-blue.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-blue
  labels:
    app: app
    version: blue
spec:
  replicas: 3
  selector:
    matchLabels:
      app: app
      version: blue
  template:
    metadata:
      labels:
        app: app
        version: blue
    spec:
      containers:
      - name: app
        image: app:v1.0.0
        ports:
        - containerPort: 3000
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
        resources:
          requests:
            cpu: "500m"
            memory: "512Mi"
          limits:
            cpu: "1000m"
            memory: "1Gi"

---
# deployment-green.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-green
  labels:
    app: app
    version: green
spec:
  replicas: 3
  selector:
    matchLabels:
      app: app
      version: green
  template:
    metadata:
      labels:
        app: app
        version: green
    spec:
      containers:
      - name: app
        image: app:v2.0.0  # New version
        # ... same as blue

---
# service.yaml - Initially points to blue
apiVersion: v1
kind: Service
metadata:
  name: app
spec:
  selector:
    app: app
    version: blue  # Switch to green after verification
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer
```

**Deployment Steps:**
```bash
# 1. Deploy green
kubectl apply -f deployment-green.yaml

# 2. Wait for ready
kubectl wait --for=condition=available deployment/app-green --timeout=300s

# 3. Test green internally
kubectl port-forward deployment/app-green 8080:3000
curl http://localhost:8080/health

# 4. Switch traffic to green
kubectl patch service app -p '{"spec":{"selector":{"version":"green"}}}'

# 5. Monitor for issues
kubectl logs -f deployment/app-green

# 6. If issues: Rollback to blue
kubectl patch service app -p '{"spec":{"selector":{"version":"blue"}}}'
```

### Strategy 2: Canary Deployment
**Агент:** devops-engineer

**Описание:**
- Gradual rollout: 10% → 25% → 50% → 100%
- Monitor metrics на каждом шаге
- Rollback если проблемы

**Istio/Service Mesh Implementation:**
```yaml
# virtualservice-canary.yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: app
spec:
  hosts:
  - app.example.com
  http:
  - match:
    - headers:
        user-agent:
          regex: ".*canary.*"  # Canary users
    route:
    - destination:
        host: app
        subset: v2
  - route:
    - destination:
        host: app
        subset: v1
      weight: 90  # 90% to old version
    - destination:
        host: app
        subset: v2
      weight: 10  # 10% to new version (canary)

---
# destinationrule.yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: app
spec:
  host: app
  subsets:
  - name: v1
    labels:
      version: v1
  - name: v2
    labels:
      version: v2
```

**Gradual Rollout Script:**
```bash
#!/bin/bash
# canary-rollout.sh

WEIGHTS=("10" "25" "50" "75" "100")

for WEIGHT in "${WEIGHTS[@]}"; do
  echo "Deploying canary with ${WEIGHT}% traffic..."

  # Update traffic split
  kubectl patch virtualservice app --type merge -p "{
    \"spec\": {
      \"http\": [{
        \"route\": [
          {\"destination\": {\"host\": \"app\", \"subset\": \"v1\"}, \"weight\": $((100 - WEIGHT))},
          {\"destination\": {\"host\": \"app\", \"subset\": \"v2\"}, \"weight\": ${WEIGHT}}
        ]
      }]
    }
  }"

  # Wait and monitor
  sleep 300  # 5 minutes

  # Check metrics
  ERROR_RATE=$(get_error_rate)
  if (( $(echo "$ERROR_RATE > 0.05" | bc -l) )); then
    echo "Error rate too high! Rolling back..."
    kubectl patch virtualservice app --type merge -p "{
      \"spec\": {
        \"http\": [{
          \"route\": [
            {\"destination\": {\"host\": \"app\", \"subset\": \"v1\"}, \"weight\": 100}
          ]
        }]
      }
    }"
    exit 1
  fi

  echo "Canary at ${WEIGHT}% successful"
done

echo "Canary rollout complete!"
```

### Strategy 3: Rolling Update
**Агент:** devops-engineer

**Описание:**
- Постепенная замена pods один за другим
- Default strategy в Kubernetes
- Suitable для stateless applications

**Configuration:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
spec:
  replicas: 10
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 2        # Max 2 extra pods during update
      maxUnavailable: 1  # Max 1 pod unavailable
  template:
    # ... pod spec
```

**Commands:**
```bash
# Update image
kubectl set image deployment/app app=app:v2.0.0

# Monitor rollout
kubectl rollout status deployment/app

# Pause rollout (if issues detected)
kubectl rollout pause deployment/app

# Resume rollout
kubectl rollout resume deployment/app

# Rollback
kubectl rollout undo deployment/app
```

---

## Phase 4: Monitoring & Alerts

### Шаг 4.1: Deployment Monitoring
**Агент:** devops-engineer

**Key Metrics:**
```yaml
# prometheus-rules.yaml
groups:
- name: deployment
  interval: 10s
  rules:
  # Error rate
  - alert: HighErrorRate
    expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
    for: 2m
    labels:
      severity: critical
    annotations:
      summary: "High error rate detected"
      description: "Error rate is {{ $value }} (threshold: 0.05)"

  # Latency
  - alert: HighLatency
    expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High latency detected"
      description: "P95 latency is {{ $value }}s (threshold: 1s)"

  # Pod restarts
  - alert: PodRestarting
    expr: rate(kube_pod_container_status_restarts_total[15m]) > 0
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Pod is restarting"

  # Memory usage
  - alert: HighMemoryUsage
    expr: container_memory_usage_bytes / container_spec_memory_limit_bytes > 0.9
    for: 5m
    labels:
      severity: warning
```

**Grafana Dashboard:**
```json
{
  "dashboard": {
    "title": "Deployment Monitoring",
    "panels": [
      {
        "title": "Request Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])"
          }
        ]
      },
      {
        "title": "Error Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~\"5..\"}[5m])"
          }
        ]
      },
      {
        "title": "Latency (P95)",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))"
          }
        ]
      },
      {
        "title": "Pod Status",
        "targets": [
          {
            "expr": "kube_pod_status_phase{namespace=\"production\"}"
          }
        ]
      }
    ]
  }
}
```

### Шаг 4.2: Log Aggregation
**Агент:** devops-engineer

**Centralized Logging (ELK/Loki):**
```yaml
# promtail-config.yaml (for Loki)
server:
  http_listen_port: 9080

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
- job_name: kubernetes-pods
  kubernetes_sd_configs:
  - role: pod
  relabel_configs:
  - source_labels: [__meta_kubernetes_pod_label_app]
    target_label: app
  - source_labels: [__meta_kubernetes_pod_name]
    target_label: pod
  - source_labels: [__meta_kubernetes_namespace]
    target_label: namespace
```

**Query Logs:**
```bash
# Recent errors
kubectl logs deployment/app -n production | grep ERROR

# Aggregated logs (Loki)
logcli query '{app="app", namespace="production"} |= "ERROR"' --limit=100 --since=10m
```

---

## Phase 5: Rollback

### Шаг 5.1: Automated Rollback
**Агент:** devops-engineer

**Rollback Triggers:**
```yaml
# flagger-canary.yaml (Automated canary + rollback)
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: app
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: app
  service:
    port: 80
  analysis:
    interval: 1m
    threshold: 5
    maxWeight: 50
    stepWeight: 10
    metrics:
    - name: request-success-rate
      thresholdRange:
        min: 99
      interval: 1m
    - name: request-duration
      thresholdRange:
        max: 500
      interval: 1m
    webhooks:
    - name: load-test
      url: http://flagger-loadtester/
      timeout: 5s
      metadata:
        cmd: "hey -z 1m -q 10 -c 2 http://app/"
```

### Шаг 5.2: Manual Rollback
**Агент:** devops-engineer

**Kubernetes Rollback:**
```bash
# View rollout history
kubectl rollout history deployment/app

# Rollback to previous version
kubectl rollout undo deployment/app

# Rollback to specific revision
kubectl rollout undo deployment/app --to-revision=3

# Verify rollback
kubectl rollout status deployment/app
kubectl get pods -l app=app
```

**Docker Image Rollback:**
```bash
# Rollback to previous image
kubectl set image deployment/app app=app:v1.9.0

# Verify
kubectl describe deployment app | grep Image
```

### Шаг 5.3: Database Rollback
**Агент:** database-specialist

**See:** [migration-workflow.md](migration-workflow.md) for database rollback procedures

---

## Phase 6: Post-Deployment

### Шаг 6.1: Verification
**Агент:** qa-engineer

**Smoke Tests:**
```typescript
// tests/smoke/production.test.ts
describe('Production Smoke Tests', () => {
  const BASE_URL = 'https://api.example.com';

  test('Health check returns 200', async () => {
    const response = await fetch(`${BASE_URL}/health`);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.status).toBe('healthy');
  });

  test('API endpoint returns expected data', async () => {
    const response = await fetch(`${BASE_URL}/api/users/me`, {
      headers: { Authorization: `Bearer ${process.env.TEST_TOKEN}` }
    });
    expect(response.status).toBe(200);
  });

  test('Database connection is healthy', async () => {
    const response = await fetch(`${BASE_URL}/health/db`);
    const body = await response.json();
    expect(body.database).toBe('connected');
  });
});
```

### Шаг 6.2: Performance Validation
**Агент:** performance-tester

**Load Testing:**
```bash
# Run load test against production
k6 run --vus 100 --duration 5m load-test.js

# Check results
# - Error rate < 1%
# - P95 latency < 500ms
# - Throughput >= baseline
```

### Шаг 6.3: Documentation Update
**Агент:** technical-writer

**Update Documentation:**
1. **CHANGELOG.md:**
   ```markdown
   ## [2.5.0] - 2024-01-15

   ### Added
   - Email verification feature
   - Rate limiting for API endpoints

   ### Changed
   - Improved database query performance

   ### Fixed
   - Memory leak in background worker

   ### Deployment Notes
   - Database migration required: 20240115_add_email_verified
   - New environment variable: EMAIL_VERIFICATION_ENABLED
   ```

2. **Memory Bank:**
   - Update `.kilocode/rules/memory-bank/context.md`
   - Update `.kilocode/rules/memory-bank/tech.md` (versions)

---

## Checklist: Deployment Complete

### Pre-Deployment
- [ ] All tests passing in CI/CD
- [ ] Code reviewed and approved
- [ ] Changelog updated
- [ ] Version bumped
- [ ] Deployment plan documented
- [ ] Team notified
- [ ] Staging deployment successful

### Deployment
- [ ] Database backup created
- [ ] Database migration applied
- [ ] Application deployed
- [ ] Health checks passing
- [ ] Smoke tests passing
- [ ] Monitoring dashboards green

### Post-Deployment
- [ ] Performance metrics validated
- [ ] Error rate within SLA
- [ ] No alerts triggered
- [ ] Documentation updated
- [ ] Team notified of completion
- [ ] Post-mortem scheduled (if issues)

---

## Common Issues & Solutions

### Issue 1: Pod CrashLoopBackOff
**Symptoms:**
```bash
kubectl get pods
# NAME                   READY   STATUS             RESTARTS   AGE
# app-5d4f6b7c9d-abc12   0/1     CrashLoopBackOff   5          5m
```

**Debug:**
```bash
# Check logs
kubectl logs app-5d4f6b7c9d-abc12

# Check events
kubectl describe pod app-5d4f6b7c9d-abc12

# Common causes:
# - Missing environment variables
# - Database connection failed
# - Port already in use
# - Out of memory
```

### Issue 2: High Memory Usage
**Solution:**
```yaml
# Increase memory limits
resources:
  requests:
    memory: "512Mi"
  limits:
    memory: "2Gi"  # Increased from 1Gi

# Enable horizontal pod autoscaling
kubectl autoscale deployment app --cpu-percent=80 --min=3 --max=10
```

### Issue 3: Database Migration Failed
**Solution:**
```bash
# Check migration status
npm run migrate:status

# Rollback migration
npm run migrate:down

# Fix migration script
# Re-test on staging
# Re-apply to production
```

---

## Reference Materials

### CI/CD Tools
- **GitHub Actions**: https://docs.github.com/en/actions
- **GitLab CI**: https://docs.gitlab.com/ee/ci/
- **Jenkins**: https://www.jenkins.io/doc/
- **CircleCI**: https://circleci.com/docs/

### Container Orchestration
- **Kubernetes**: https://kubernetes.io/docs/
- **Docker Swarm**: https://docs.docker.com/engine/swarm/
- **AWS ECS**: https://docs.aws.amazon.com/ecs/

### Monitoring
- **Prometheus**: https://prometheus.io/docs/
- **Grafana**: https://grafana.com/docs/
- **Datadog**: https://docs.datadoghq.com/

### Related Workflows
- [migration-workflow.md](migration-workflow.md) - database migrations
- [protocol-new.md](protocol-new.md) - feature development

### Related Agents
- **devops-engineer** - `.kilocode/agents/infrastructure/devops-engineer/`
- **cloud-architect** - `.kilocode/agents/architecture/cloud-architect/`
- **qa-engineer** - `.kilocode/agents/testing/qa-engineer/`
