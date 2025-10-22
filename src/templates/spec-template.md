# Specification: {{PROJECT_NAME}}

{{DESCRIPTION}}

## Requirements Analysis (Phase 1)
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

## Clarification & Research (Phase 2)
### Q&A and Clarifications
#### Questions Asked
{{#each QUESTIONS}}
- **Q**: {{this.question}}
  - **A**: {{this.answer}}
  - **Impact**: {{this.impact}}
{{/each}}

### Research Findings
#### Technical Approaches
{{#each TECHNICAL_APPROACHES}}
- [ ] {{this.approach}} - {{this.rationale}} - {{this.feasibility}}
{{/each}}

#### Existing Solutions
{{#each EXISTING_SOLUTIONS}}
- [ ] {{this.solution}} - {{this.analysis}} - {{this.relevance}}
{{/each}}

#### Risks and Constraints
{{#each RISKS_CONSTRAINTS}}
- [ ] {{this.item}} - {{this.type}} - {{this.mitigation}}
{{/each}}

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
- [ ] Requirements clear, measurable, and complete
- [ ] All ambiguities resolved and documented
- [ ] Research comprehensive and documented
- [ ] Technical feasibility validated
- [ ] Integration points identified

## Sign-off
- **Status**: {{COMPLETION_STATUS}}
- **Next Phase**: {{NEXT_PHASE}}