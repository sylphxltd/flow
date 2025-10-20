# Implementation Plan: {{PROJECT_NAME}}

{{DESCRIPTION}}

## Design (Phase 3)
### Architecture Overview
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

### Integration Points
#### Internal Integrations
- **Component Communication**: {{INTERNAL_INTEGRATION}}
- **Data Flow**: {{DATA_FLOW_STRATEGY}}
- **Service Coordination**: {{SERVICE_COORDINATION}}

#### External Integrations
- **Third-party APIs**: {{EXTERNAL_APIS}}
- **Payment Gateways**: {{PAYMENT_INTEGRATION}}
- **Authentication Services**: {{AUTH_INTEGRATION}}

### Conflict Resolution
#### Design Conflicts Identified
{{#each DESIGN_CONFLICTS}}
- [ ] **Conflict**: {{this.conflict}}
  - **Resolution**: {{this.resolution}}
  - **Impact**: {{this.impact}}
{{/each}}

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

## Implementation Strategy

### Task Breakdown (Phase 4)
#### Task Categories
{{#each TASK_CATEGORIES}}
- **{{this.category}}**: {{this.description}}
  - **Dependencies**: {{this.dependencies}}
{{/each}}

#### Critical Path
{{#each CRITICAL_PATH}}
- [ ] **{{this.task}}**
  - **Dependencies**: {{this.prerequisites}}
  - **Risks**: {{this.risks}}
{{/each}}

### Deployment Strategy
- **Staging Environment**: {{STAGING_STRATEGY}}
- **Production Rollout**: {{PRODUCTION_STRATEGY}}
- **Monitoring & Alerting**: {{MONITORING_STRATEGY}}

## Quality Gates

### Design Completion Criteria
- [ ] Design conflicts resolved
- [ ] Integration points identified
- [ ] Architecture decisions documented
- [ ] Technical feasibility validated
- [ ] Task dependencies mapped

---

**Last Updated**: {{LAST_UPDATED}}
**Current Phase**: {{CURRENT_PHASE}}
**Status**: {{STATUS}}