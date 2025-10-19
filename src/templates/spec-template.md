# Specification: {{PROJECT_NAME}}

{{DESCRIPTION}}

## Core Requirements
### Primary Objective
{{OBJECTIVE}}

### Success Criteria
- [ ] {{SUCCESS_CRITERION_1}}
- [ ] {{SUCCESS_CRITERION_2}}
- [ ] {{SUCCESS_CRITERION_3}}

### Functional Requirements
{{#each REQUIREMENTS}}
- [ ] **FR-{{@index}}**: {{this}}
  - **Verification**: [How to verify this requirement]
  - **Priority**: [High/Medium/Low]
{{/each}}

### Non-Functional Requirements
#### Performance
- [ ] Response time: < {{RESPONSE_TIME}}ms for critical operations
- [ ] Throughput: Support {{THROUGHPUT}} concurrent users

#### Security
- [ ] Authentication: {{AUTH_METHOD}} implementation
- [ ] Authorization: Role-based access control
- [ ] Data protection: Encryption at rest and in transit

#### Quality
- [ ] Test coverage: ≥ {{TEST_COVERAGE}}%
- [ ] Code quality: Pass linting and formatting checks
- [ ] Documentation: API and code documentation complete

## Acceptance Criteria
### Project Completion Checklist
- [ ] All functional requirements implemented
- [ ] All non-functional requirements met
- [ ] Performance benchmarks achieved
- [ ] Security requirements satisfied
- [ ] Test coverage target met
- [ ] Documentation complete
- [ ] Code review passed
- [ ] Integration tests passing

## Technical Constraints
### Technology Stack
- **Frontend**: {{FRONTEND_TECH}}
- **Backend**: {{BACKEND_TECH}}
- **Database**: {{DATABASE_TECH}}
- **Infrastructure**: {{INFRA_TECH}}

### Dependencies
#### External Dependencies
{{#each EXTERNAL_DEPS}}
- [ ] {{this.name}} ({{this.version}}) - {{this.purpose}}
{{/each}}

#### Internal Dependencies
{{#each INTERNAL_DEPS}}
- [ ] {{this.component}} - {{this.description}}
{{/each}}

## Risk Assessment
### High-Risk Areas
- [ ] {{HIGH_RISK_1}} - Mitigation: {{RISK_1_MITIGATION}}
- [ ] {{HIGH_RISK_2}} - Mitigation: {{RISK_2_MITIGATION}}

### Technical Risks
- [ ] {{TECH_RISK_1}} - Impact: {{TECH_RISK_1_IMPACT}}
- [ ] {{TECH_RISK_2}} - Impact: {{TECH_RISK_2_IMPACT}}

## Integration Points
### External Integrations
{{#each EXTERNAL_INTEGRATIONS}}
- [ ] {{this.system}} - {{this.description}} - {{this.protocol}}
{{/each}}

### Internal Integrations
{{#each INTERNAL_INTEGRATIONS}}
- [ ] {{this.component}} - {{this.interface}} - {{this.data_flow}}
{{/each}}

## Quality Gates
### Definition of Done
- [ ] Code implemented and tested
- [ ] Unit test coverage ≥ {{TEST_COVERAGE}}%
- [ ] Integration tests pass
- [ ] Code review completed
- [ ] Documentation updated
- [ ] Security scan passes
- [ ] Performance tests meet requirements

### Exit Criteria
- [ ] All acceptance criteria met
- [ ] No critical or high-severity issues
- [ ] Performance benchmarks achieved
- [ ] Security requirements satisfied
- [ ] Stakeholder approval received

---

**Last Updated**: {{LAST_UPDATED}}
**Phase**: 1: SPECIFY & CLARIFY