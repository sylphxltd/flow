---
name: Deployment & DevOps
description: Docker, CI/CD, monitoring, scaling, infrastructure
category: universal
---

# Infrastructure & DevOps

## Deployment Strategies

### Blue-Green Deployment
**How:** Two identical environments (blue=current, green=new)
**Process:** Deploy to green, test, switch traffic
**Benefits:** Zero downtime, instant rollback
**Drawback:** Doubles infrastructure cost

### Rolling Deployment
**How:** Gradually replace instances (10% at a time)
**Benefits:** No extra infrastructure, lower risk
**Drawback:** Slower, mixed versions during rollout

### Canary Deployment
**How:** Route small % of traffic to new version
**Benefits:** Test in production with minimal risk
**Drawback:** Complex routing, requires monitoring

### Feature Flags
**How:** Deploy code disabled, enable via config
**Benefits:** Decouple deploy from release
**Use:** A/B testing, gradual rollouts, kill switches

## CI/CD Pipeline

### Continuous Integration
**On every commit:**
1. Run linter
2. Run tests (unit, integration)
3. Build application
4. Security scanning
5. Code quality checks

**Best practices:**
- Fast feedback (< 10min)
- Fail fast (stop on first failure)
- Keep builds green (fix breaks immediately)

### Continuous Deployment
**Pipeline stages:**
1. CI passes
2. Deploy to staging
3. Run E2E tests
4. Deploy to production
5. Health checks
6. Rollback if failed

**Tools:** GitHub Actions, GitLab CI, Jenkins, CircleCI

## Containerization (Docker)

### Dockerfile Best Practices
```dockerfile
# Multi-stage build (smaller image)
FROM node:18 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-slim
COPY --from=builder /app/dist ./dist
CMD ["node", "dist/index.js"]
```

**Optimization:**
- Use slim/alpine base images
- Multi-stage builds
- Layer caching (COPY deps before code)
- .dockerignore (exclude node_modules, .git)
- Don't run as root (USER directive)

### Docker Compose
**Development environment:**
- App + database + cache in one command
- Consistent across team
- Version-controlled configuration

## Orchestration (Kubernetes)

### Core Concepts
- **Pod:** Group of containers
- **Deployment:** Manages pod replicas
- **Service:** Load balancer for pods
- **Ingress:** External routing
- **ConfigMap:** Configuration
- **Secret:** Sensitive data

### Scaling
**Horizontal Pod Autoscaler:**
- Scale based on CPU/memory
- Min/max replicas
- Target utilization

**Cluster Autoscaler:**
- Add/remove nodes based on demand

## Monitoring & Observability

### Logs
**Structured logging:**
```json
{
  "level": "error",
  "timestamp": "2024-01-01T00:00:00Z",
  "message": "Database connection failed",
  "error": "Connection timeout",
  "user_id": "123"
}
```

**Centralized:** ELK Stack, Datadog, CloudWatch
**Best practices:**
- Log errors with context
- Trace IDs for request correlation
- Don't log secrets
- Set retention policies

### Metrics
**What to track:**
- Request rate (throughput)
- Error rate
- Response time (latency)
- Resource usage (CPU, memory, disk)

**Tools:** Prometheus, Grafana, Datadog

### Tracing
**Distributed tracing:**
- Track requests across services
- Identify bottlenecks
- Tools: Jaeger, Zipkin, Datadog APM

### Alerting
**Alert on:**
- Error rate > threshold
- Response time > SLA
- Resource exhaustion
- Service down

**Best practices:**
- Actionable alerts only
- Include runbook links
- Escalation policies
- On-call rotation

## High Availability

### Load Balancing
**Algorithms:**
- Round robin: Equal distribution
- Least connections: Send to least busy
- IP hash: Consistent routing per client

**Health checks:**
- HTTP endpoints (/_health)
- TCP connection tests
- Check every 10-30s
- Remove unhealthy instances

### Database Replication
**Primary-Replica:**
- Writes to primary
- Reads from replicas
- Async replication (eventual consistency)

**Multi-Primary:**
- Write to any instance
- Conflict resolution needed
- Complex but highly available

### Backup & Disaster Recovery
**Backups:**
- Automated daily backups
- Retention policy (7 days, 4 weeks, 12 months)
- Test restores regularly
- Offsite/cross-region storage

**RTO/RPO:**
- RTO (Recovery Time Objective): How long to restore
- RPO (Recovery Point Objective): How much data loss acceptable

## Security

### Network Security
- Firewall rules (whitelist approach)
- Private subnets for databases
- VPN for internal access
- DDoS protection (Cloudflare, AWS Shield)

### Secrets Management
- Never commit secrets to git
- Use secret managers (AWS Secrets Manager, Vault)
- Rotate credentials regularly
- Least privilege access

### SSL/TLS
- HTTPS everywhere
- Auto-renewal (Let's Encrypt, cert-manager)
- Strong cipher suites
- HSTS headers

### Compliance
- Encryption at rest
- Encryption in transit
- Access logs
- Regular security audits

## Cost Optimization

### Right-sizing
- Monitor resource usage
- Scale down over-provisioned instances
- Use spot/preemptible instances for non-critical

### Auto-scaling
- Scale down during off-peak
- Scale up during peak
- Set appropriate thresholds

### Reserved Instances
- Commit to 1-3 years for discount (30-70%)
- For predictable, steady workloads

### Storage Optimization
- Lifecycle policies (move old data to cheaper storage)
- Delete unused snapshots/volumes
- Compress backups

## Common Patterns

### Immutable Infrastructure
- Never modify running servers
- Deploy new instances, terminate old
- Consistent, repeatable deployments

### Infrastructure as Code
- Terraform, CloudFormation, Pulumi
- Version controlled
- Reproducible environments
- Disaster recovery

### GitOps
- Git as single source of truth
- Automated deployment on merge
- Drift detection and reconciliation
- Tools: ArgoCD, Flux

## Best Practices

### Documentation
- Runbooks for common tasks
- Architecture diagrams
- Incident response procedures
- On-call guides

### Change Management
- Change review process
- Deployment windows
- Rollback procedures
- Communication plan

### Incident Response
1. Detect (monitoring)
2. Triage (assess impact)
3. Mitigate (stop bleeding)
4. Resolve (fix root cause)
5. Post-mortem (learn, prevent)
