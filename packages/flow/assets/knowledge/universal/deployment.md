---
name: Deployment & DevOps
description: Docker, CI/CD, monitoring, scaling, infrastructure
---

# Deployment & DevOps

## Deployment Strategies

**Blue-Green**: Two environments (blue=current, green=new) → test → switch. Zero downtime, instant rollback, 2x cost.

**Rolling**: Replace gradually (10% at a time). No extra infrastructure, lower risk, slower.

**Canary**: Route small % to new version. Test in production, minimal risk, complex routing.

**Feature Flags**: Deploy code disabled, enable via config. Decouple deploy from release, A/B testing, kill switches.

## CI/CD Pipeline

### Continuous Integration (On Every Commit)
1. Run linter
2. Run tests (unit, integration)
3. Build application
4. Security scanning
5. Code quality checks

**Best practices**: Fast feedback (< 10min), fail fast, keep builds green

### Continuous Deployment
**Stages**: CI passes → deploy staging → E2E tests → deploy production → health checks → rollback if failed

**Tools**: GitHub Actions, GitLab CI, Jenkins, CircleCI

## Containerization (Docker)

### Best Practices
- Multi-stage builds (build → slim runtime)
- Slim/alpine images
- Layer caching (deps before code)
- .dockerignore
- Don't run as root

## Orchestration (Kubernetes)

**Core**: Pod (containers), Deployment (replicas), Service (load balancer), Ingress (routing), ConfigMap (config), Secret (sensitive)

**Scaling**:
- Horizontal Pod Autoscaler: Scale based on CPU/memory, min/max replicas
- Cluster Autoscaler: Add/remove nodes

## Monitoring & Observability

### Logs
**Structured logging**: JSON format with level, timestamp, message, context (user_id, trace_id)

**Centralized**: ELK, Datadog, CloudWatch
**Best practices**: Log errors with context, trace IDs, don't log secrets, set retention

### Metrics
**Track**: Request rate, error rate, response time (latency), resource usage (CPU, memory, disk)
**Tools**: Prometheus, Grafana, Datadog

### Tracing
**Distributed tracing**: Track requests across services, identify bottlenecks
**Tools**: Jaeger, Zipkin, Datadog APM

### Alerting
**Alert on**: Error rate > threshold, response time > SLA, resource exhaustion, service down
**Best practices**: Actionable only, include runbooks, escalation policies, on-call rotation

## High Availability

### Load Balancing
**Algorithms**: Round robin (equal), least connections (least busy), IP hash (consistent)
**Health checks**: HTTP (/_health), TCP, check every 10-30s, remove unhealthy

### Database Replication
**Primary-Replica**: Writes to primary, reads from replicas, async (eventual consistency)
**Multi-Primary**: Write to any, conflict resolution needed, complex but highly available

### Backup & Disaster Recovery
**Backups**: Automated daily, retention (7 days, 4 weeks, 12 months), test restores, offsite/cross-region
**RTO/RPO**: RTO (recovery time), RPO (data loss acceptable)

## Security

**Network**: Firewall (whitelist), private subnets for DBs, VPN for internal, DDoS protection
**Secrets**: Never commit to git, use secret managers (AWS Secrets Manager, Vault), rotate regularly, least privilege
**SSL/TLS**: HTTPS everywhere, auto-renewal (Let's Encrypt), strong ciphers, HSTS headers
**Compliance**: Encryption at rest, encryption in transit, access logs, security audits

## Cost Optimization

**Right-sizing**: Monitor usage, scale down over-provisioned, spot/preemptible for non-critical
**Auto-scaling**: Scale down off-peak, scale up peak
**Reserved Instances**: 1-3 year commit for 30-70% discount (predictable workloads)
**Storage**: Lifecycle policies (move old to cheaper), delete unused, compress backups

## Common Patterns

**Immutable Infrastructure**: Never modify servers, deploy new, terminate old
**Infrastructure as Code**: Terraform, CloudFormation, Pulumi → version controlled, reproducible
**GitOps**: Git as truth, auto-deploy on merge, drift detection (ArgoCD, Flux)

## Best Practices

**Documentation**: Runbooks, architecture diagrams, incident response, on-call guides
**Change Management**: Review process, deployment windows, rollback procedures, communication
**Incident Response**: Detect → Triage → Mitigate → Resolve → Post-mortem
