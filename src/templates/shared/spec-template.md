# Specification: {{PROJECT_NAME}}

{{DESCRIPTION}}

## Primary Objective
{{OBJECTIVE}}

## Success Criteria
- [ ] {{SUCCESS_CRITERION_1}}
- [ ] {{SUCCESS_CRITERION_2}}
- [ ] {{SUCCESS_CRITERION_3}}

## Functional Requirements
{{#each REQUIREMENTS}}
- [ ] **FR-{{@index}}**: {{this}}
{{/each}}

## Non-Functional Requirements

### Performance
- [ ] Response time: < {{RESPONSE_TIME}}ms for critical operations
- [ ] Throughput: Support {{THROUGHPUT}} concurrent users

### Security
- [ ] Authentication: {{AUTH_METHOD}}
- [ ] Authorization: Role-based access control
- [ ] Data protection: Encryption at rest and in transit

### Quality
- [ ] Test coverage: ≥ {{TEST_COVERAGE}}%
- [ ] Code quality: Pass linting and formatting
- [ ] Documentation: Complete API and code docs

## Clarifications & Research

### Questions & Answers
{{#each QUESTIONS}}
- **Q**: {{this.question}}
  - **A**: {{this.answer}}
{{/each}}

### Technical Approaches
{{#each TECHNICAL_APPROACHES}}
- {{this.approach}} - {{this.rationale}}
{{/each}}

### Risks & Constraints
{{#each RISKS_CONSTRAINTS}}
- {{this.item}} - {{this.mitigation}}
{{/each}}

## Technology Stack
- **Frontend**: {{FRONTEND_TECH}}
- **Backend**: {{BACKEND_TECH}}
- **Database**: {{DATABASE_TECH}}
- **Infrastructure**: {{INFRA_TECH}}

## Dependencies

### External
{{#each EXTERNAL_DEPS}}
- {{this.name}} ({{this.version}}) - {{this.purpose}}
{{/each}}

### Internal
{{#each INTERNAL_DEPS}}
- {{this.component}} - {{this.description}}
{{/each}}

## Integration Points

### External
{{#each EXTERNAL_INTEGRATIONS}}
- {{this.system}} - {{this.description}}
{{/each}}

### Internal
{{#each INTERNAL_INTEGRATIONS}}
- {{this.component}} - {{this.interface}}
{{/each}}

## Completion Status
- [ ] Requirements clear and complete
- [ ] Ambiguities resolved
- [ ] Research complete
- [ ] Technical feasibility validated
- [ ] Integration points identified

**Status**: {{COMPLETION_STATUS}}
