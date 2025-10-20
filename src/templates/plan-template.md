# Implementation Plan: {{PROJECT_NAME}}

{{DESCRIPTION}}

## Architecture Overview
### System Design
```mermaid
graph TB
    A[Frontend] -→ B[API Gateway]
    B -→ C[Backend Services]
    C -→ D[Database]
    C -→ E[External APIs]
    C -→ F[Cache]
```

### Component Architecture
#### Frontend Components
- **{{FRONTEND_COMP_1}}**: {{FRONTEND_COMP_1_DESC}}
- **{{FRONTEND_COMP_2}}**: {{FRONTEND_COMP_2_DESC}}
- **{{FRONTEND_COMP_3}}**: {{FRONTEND_COMP_3_DESC}}

#### Backend Services
- **{{BACKEND_SVC_1}}**: {{BACKEND_SVC_1_DESC}}
- **{{BACKEND_SVC_2}}**: {{BACKEND_SVC_2_DESC}}
- **{{BACKEND_SVC_3}}**: {{BACKEND_SVC_3_DESC}}

#### Data Layer
- **Primary DB**: {{PRIMARY_DB_DESC}}
- **Cache Layer**: {{CACHE_DESC}}
- **File Storage**: {{STORAGE_DESC}}

## Implementation Roadmap

### Development Phases
#### Phase 1: Foundation
- **Infrastructure Setup**: {{FOUNDATION_PHASE_1}}
- **Core Architecture**: {{FOUNDATION_PHASE_2}}
- **Database Design**: {{FOUNDATION_PHASE_3}}

#### Phase 2: Core Features
- **Feature Module 1**: {{CORE_FEATURE_1}}
- **Feature Module 2**: {{CORE_FEATURE_2}}
- **Feature Module 3**: {{CORE_FEATURE_3}}

#### Phase 3: Integration & Enhancement
- **System Integration**: {{INTEGRATION_PHASE}}
- **Performance Optimization**: {{OPTIMIZATION_PHASE}}
- **Security Hardening**: {{SECURITY_PHASE}}

## Integration Strategy

### System Integration
#### Internal Integrations
- **Component Communication**: {{INTERNAL_INTEGRATION}}
- **Data Flow**: {{DATA_FLOW_STRATEGY}}
- **Service Coordination**: {{SERVICE_COORDINATION}}

#### External Integrations
- **Third-party APIs**: {{EXTERNAL_APIS}}
- **Payment Gateways**: {{PAYMENT_INTEGRATION}}
- **Authentication Services**: {{AUTH_INTEGRATION}}

### Deployment Strategy
- **Staging Environment**: {{STAGING_STRATEGY}}
- **Production Rollout**: {{PRODUCTION_STRATEGY}}
- **Monitoring & Alerting**: {{MONITORING_STRATEGY}}

## Technical Decisions

### Architecture Decisions
| Decision | Rationale | Alternatives | Trade-offs |
|----------|-----------|--------------|------------|
| {{ARCH_DECISION_1}} | {{ARCH_DECISION_1_RATIONALE}} | {{ARCH_DECISION_1_ALTERNATIVES}} | {{ARCH_DECISION_1_TRADEOFFS}} |
| {{ARCH_DECISION_2}} | {{ARCH_DECISION_2_RATIONALE}} | {{ARCH_DECISION_2_ALTERNATIVES}} | {{ARCH_DECISION_2_TRADEOFFS}} |

### Technology Choices
- **Frontend**: {{FRONTEND_TECH}} - {{FRONTEND_RATIONALE}}
- **Backend**: {{BACKEND_TECH}} - {{BACKEND_RATIONALE}}
- **Database**: {{DATABASE_TECH}} - {{DATABASE_RATIONALE}}
- **Infrastructure**: {{INFRA_TECH}} - {{INFRA_RATIONALE}}

## Testing Strategy

### Test-Driven Development (TDD)
#### Unit Tests
- **Target Coverage**: {{UNIT_TEST_COVERAGE}}%
- **Framework**: {{UNIT_TEST_FRAMEWORK}}
- **Key Areas**: {{UNIT_TEST_AREAS}}

#### Integration Tests
- **Scope**: {{INTEGRATION_TEST_SCOPE}}
- **Framework**: {{INTEGRATION_TEST_FRAMEWORK}}
- **Test Scenarios**: {{INTEGRATION_TEST_SCENARIOS}}

#### End-to-End Tests
- **Scenarios**: {{E2E_TEST_SCENARIOS}}
- **Framework**: {{E2E_TEST_FRAMEWORK}}
- **Environment**: {{E2E_TEST_ENV}}

### Quality Gates
- **Code Coverage**: ≥ {{TEST_COVERAGE_TARGET}}%
- **Performance**: < {{PERF_TARGET}}ms response time
- **Security**: No critical vulnerabilities
- **Documentation**: 100% API coverage

## Risk Management

### Failure Scenarios
#### Scenario 1: {{FAILURE_SCENARIO_1}}
- **Trigger**: {{FAILURE_1_TRIGGER}}
- **Impact**: {{FAILURE_1_IMPACT}}
- **Recovery**: {{FAILURE_1_RECOVERY}}
- **Prevention**: {{FAILURE_1_PREVENTION}}

#### Scenario 2: {{FAILURE_SCENARIO_2}}
- **Trigger**: {{FAILURE_2_TRIGGER}}
- **Impact**: {{FAILURE_2_IMPACT}}
- **Recovery**: {{FAILURE_2_RECOVERY}}
- **Prevention**: {{FAILURE_2_PREVENTION}}

## Success Metrics
### Technical Metrics
- **Performance**: {{PERFORMANCE_METRICS}}
- **Reliability**: {{RELIABILITY_METRICS}}
- **Security**: {{SECURITY_METRICS}}
- **Maintainability**: {{MAINTAINABILITY_METRICS}}

### Quality Metrics
- **Code Quality**: {{CODE_QUALITY_METRICS}}
- **Test Coverage**: {{COVERAGE_METRICS}}
- **Documentation**: {{DOC_METRICS}}

---

**Last Updated**: {{LAST_UPDATED}}
**Phase**: 3: PLAN & DESIGN