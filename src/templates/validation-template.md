# Validation Report: {{PROJECT_NAME}}

{{DESCRIPTION}}

## Validation Summary
- **Project**: {{PROJECT_NAME}}
- **Type**: {{PROJECT_TYPE}}
- **Validation Date**: {{VALIDATION_DATE}}
- **Overall Status**: {{OVERALL_STATUS}}
- **Go/No-Go**: {{GO_NO_GO_DECISION}}

## Requirements Coverage Validation

### Functional Requirements Coverage
| Requirement ID | Requirement | Task Mapping | Status | Verification |
|----------------|-------------|--------------|--------|--------------|
| {{FUNC_REQ_1_ID}} | {{FUNC_REQ_1_DESC}} | {{FUNC_REQ_1_TASKS}} | {{FUNC_REQ_1_STATUS}} | {{FUNC_REQ_1_VERIFICATION}} |
| {{FUNC_REQ_2_ID}} | {{FUNC_REQ_2_DESC}} | {{FUNC_REQ_2_TASKS}} | {{FUNC_REQ_2_STATUS}} | {{FUNC_REQ_2_VERIFICATION}} |
| {{FUNC_REQ_3_ID}} | {{FUNC_REQ_3_DESC}} | {{FUNC_REQ_3_TASKS}} | {{FUNC_REQ_3_STATUS}} | {{FUNC_REQ_3_VERIFICATION}} |

### Non-Functional Requirements Coverage
| Requirement | Target | Current | Status | Notes |
|-------------|--------|---------|--------|-------|
| Performance | < {{PERF_TARGET}}ms | {{PERF_CURRENT}}ms | {{PERF_STATUS}} | {{PERF_NOTES}} |
| Security | No critical vulns | {{SECURITY_VULNS}} | {{SECURITY_STATUS}} | {{SECURITY_NOTES}} |
| Test Coverage | ≥ {{COVERAGE_TARGET}}% | {{COVERAGE_CURRENT}}% | {{COVERAGE_STATUS}} | {{COVERAGE_NOTES}} |
| Availability | {{AVAILABILITY_TARGET}}% | {{AVAILABILITY_CURRENT}}% | {{AVAILABILITY_STATUS}} | {{AVAILABILITY_NOTES}} |

## Parallel Execution Validation

### Phase 2: Research & Analysis Validation
| Specialist | Research Task | Completeness | Quality | Integration |
|------------|---------------|--------------|---------|-------------|
| Backend | TASK-R-B-001 | {{RESEARCH_BACKEND_COMPLETE}} | {{RESEARCH_BACKEND_QUALITY}} | {{RESEARCH_BACKEND_INTEGRATION}} |
| Frontend | TASK-R-F-001 | {{RESEARCH_FRONTEND_COMPLETE}} | {{RESEARCH_FRONTEND_QUALITY}} | {{RESEARCH_FRONTEND_INTEGRATION}} |
| Database | TASK-R-D-001 | {{RESEARCH_DATABASE_COMPLETE}} | {{RESEARCH_DATABASE_QUALITY}} | {{RESEARCH_DATABASE_INTEGRATION}} |
| Security | TASK-R-S-001 | {{RESEARCH_SECURITY_COMPLETE}} | {{RESEARCH_SECURITY_QUALITY}} | {{RESEARCH_SECURITY_INTEGRATION}} |
| Performance | TASK-R-P-001 | {{RESEARCH_PERF_COMPLETE}} | {{RESEARCH_PERF_QUALITY}} | {{RESEARCH_PERF_INTEGRATION}} |

**Phase 2 Validation Result**: {{PHASE_2_VALIDATION_RESULT}}
**Issues Found**: {{PHASE_2_ISSUES_COUNT}}
**Critical Issues**: {{PHASE_2_CRITICAL_ISSUES}}

### Phase 3: Design & Planning Validation
| Specialist | Design Task | Completeness | Quality | Integration |
|------------|-------------|--------------|---------|-------------|
| Architect | TASK-D-A-001 | {{DESIGN_ARCH_COMPLETE}} | {{DESIGN_ARCH_QUALITY}} | {{DESIGN_ARCH_INTEGRATION}} |
| Frontend | TASK-D-F-001 | {{DESIGN_FRONTEND_COMPLETE}} | {{DESIGN_FRONTEND_QUALITY}} | {{DESIGN_FRONTEND_INTEGRATION}} |
| Backend | TASK-D-B-001 | {{DESIGN_BACKEND_COMPLETE}} | {{DESIGN_BACKEND_QUALITY}} | {{DESIGN_BACKEND_INTEGRATION}} |
| Database | TASK-D-D-001 | {{DESIGN_DATABASE_COMPLETE}} | {{DESIGN_DATABASE_QUALITY}} | {{DESIGN_DATABASE_INTEGRATION}} |
| Security | TASK-D-S-001 | {{DESIGN_SECURITY_COMPLETE}} | {{DESIGN_SECURITY_QUALITY}} | {{DESIGN_SECURITY_INTEGRATION}} |

**Phase 3 Validation Result**: {{PHASE_3_VALIDATION_RESULT}}
**Design Conflicts Resolved**: {{DESIGN_CONFLICTS_RESOLVED}}
**Integration Points Defined**: {{INTEGRATION_POINTS_DEFINED}}

### Phase 6: Implementation Validation
#### Wave 1: Foundation Validation
| Task | Owner | Status | Deliverable | Quality |
|------|-------|--------|-------------|---------|
| TASK-I-F-001 | Frontend | {{WAVE1_FRONTEND_STATUS}} | {{WAVE1_FRONTEND_DELIVERABLE}} | {{WAVE1_FRONTEND_QUALITY}} |
| TASK-I-B-001 | Backend | {{WAVE1_BACKEND_STATUS}} | {{WAVE1_BACKEND_DELIVERABLE}} | {{WAVE1_BACKEND_QUALITY}} |
| TASK-I-D-001 | Database | {{WAVE1_DATABASE_STATUS}} | {{WAVE1_DATABASE_DELIVERABLE}} | {{WAVE1_DATABASE_QUALITY}} |

#### Wave 2: Core Features Validation
| Task | Owner | Status | Deliverable | Quality |
|------|-------|--------|-------------|---------|
| TASK-I-F-002 | Frontend | {{WAVE2_FRONTEND_STATUS}} | {{WAVE2_FRONTEND_DELIVERABLE}} | {{WAVE2_FRONTEND_QUALITY}} |
| TASK-I-B-002 | Backend | {{WAVE2_BACKEND_STATUS}} | {{WAVE2_BACKEND_DELIVERABLE}} | {{WAVE2_BACKEND_QUALITY}} |
| TASK-I-D-002 | Database | {{WAVE2_DATABASE_STATUS}} | {{WAVE2_DATABASE_DELIVERABLE}} | {{WAVE2_DATABASE_QUALITY}} |

#### Wave 3: Integration Validation
| Task | Owner | Status | Deliverable | Quality |
|------|-------|--------|-------------|---------|
| TASK-I-I-001 | Integration | {{WAVE3_INTEGRATION_STATUS}} | {{WAVE3_INTEGRATION_DELIVERABLE}} | {{WAVE3_INTEGRATION_QUALITY}} |
| TASK-I-I-002 | Testing | {{WAVE3_TESTING_STATUS}} | {{WAVE3_TESTING_DELIVERABLE}} | {{WAVE3_TESTING_QUALITY}} |

**Phase 6 Validation Result**: {{PHASE_6_VALIDATION_RESULT}}
**Parallel Execution Success**: {{PARALLEL_EXECUTION_SUCCESS}}
**Integration Issues**: {{INTEGRATION_ISSUES_COUNT}}

### Phase 7: Testing & Review Validation
| Specialist | Testing Task | Coverage | Quality | Issues Found |
|------------|--------------|----------|---------|--------------|
| Tester | TASK-Q-T-001 | {{TEST_FUNCTIONAL_COVERAGE}} | {{TEST_FUNCTIONAL_QUALITY}} | {{TEST_FUNCTIONAL_ISSUES}} |
| Security | TASK-Q-S-001 | {{TEST_SECURITY_COVERAGE}} | {{TEST_SECURITY_QUALITY}} | {{TEST_SECURITY_ISSUES}} |
| Performance | TASK-Q-P-001 | {{TEST_PERF_COVERAGE}} | {{TEST_PERF_QUALITY}} | {{TEST_PERF_ISSUES}} |
| Frontend | TASK-Q-F-001 | {{TEST_UI_COVERAGE}} | {{TEST_UI_QUALITY}} | {{TEST_UI_ISSUES}} |
| Backend | TASK-Q-B-001 | {{TEST_API_COVERAGE}} | {{TEST_API_QUALITY}} | {{TEST_API_ISSUES}} |

**Phase 7 Validation Result**: {{PHASE_7_VALIDATION_RESULT}}
**Overall Test Coverage**: {{OVERALL_TEST_COVERAGE}}%
**Critical Issues Found**: {{CRITICAL_ISSUES_FOUND}}

### Phase 8: Cleanup & Refactor Validation
| Specialist | Cleanup Task | Code Quality | Performance | Security |
|------------|--------------|--------------|-------------|---------|
| Frontend | TASK-C-F-001 | {{CLEANUP_FRONTEND_QUALITY}} | {{CLEANUP_FRONTEND_PERF}} | {{CLEANUP_FRONTEND_SECURITY}} |
| Backend | TASK-C-B-001 | {{CLEANUP_BACKEND_QUALITY}} | {{CLEANUP_BACKEND_PERF}} | {{CLEANUP_BACKEND_SECURITY}} |
| Database | TASK-C-D-001 | {{CLEANUP_DATABASE_QUALITY}} | {{CLEANUP_DATABASE_PERF}} | {{CLEANUP_DATABASE_SECURITY}} |
| Performance | TASK-C-P-001 | {{CLEANUP_PERF_QUALITY}} | {{CLEANUP_PERF_PERF}} | {{CLEANUP_PERF_SECURITY}} |
| Security | TASK-C-S-001 | {{CLEANUP_SECURITY_QUALITY}} | {{CLEANUP_SECURITY_PERF}} | {{CLEANUP_SECURITY_SECURITY}} |

**Phase 8 Validation Result**: {{PHASE_8_VALIDATION_RESULT}}
**Code Quality Improvement**: {{CODE_QUALITY_IMPROVEMENT}}
**Performance Improvement**: {{PERFORMANCE_IMPROVEMENT}}

## Conflict Resolution Validation

### Resource Conflicts Resolved
| Conflict Type | Original Conflict | Resolution | Status |
|---------------|-------------------|------------|--------|
| File Conflicts | {{FILE_CONFLICT_ORIGINAL}} | {{FILE_CONFLICT_RESOLUTION}} | {{FILE_CONFLICT_STATUS}} |
| Database Conflicts | {{DB_CONFLICT_ORIGINAL}} | {{DB_CONFLICT_RESOLUTION}} | {{DB_CONFLICT_STATUS}} |
| API Conflicts | {{API_CONFLICT_ORIGINAL}} | {{API_CONFLICT_RESOLUTION}} | {{API_CONFLICT_STATUS}} |

### Timing Dependencies Validated
| Dependency | Required | Actual | Status |
|------------|----------|--------|--------|
| {{DEPENDENCY_1}} | {{DEP_1_REQUIRED}} | {{DEP_1_ACTUAL}} | {{DEP_1_STATUS}} |
| {{DEPENDENCY_2}} | {{DEP_2_REQUIRED}} | {{DEP_2_ACTUAL}} | {{DEP_2_STATUS}} |

## Quality Gates Validation

### Test-Driven Development (TDD) Validation
| Test Type | Target | Actual | Status | Notes |
|-----------|--------|--------|--------|-------|
| Unit Tests | {{UNIT_TARGET}}% | {{UNIT_ACTUAL}}% | {{UNIT_STATUS}} | {{UNIT_NOTES}} |
| Integration Tests | {{INTEGRATION_TARGET}}% | {{INTEGRATION_ACTUAL}}% | {{INTEGRATION_STATUS}} | {{INTEGRATION_NOTES}} |
| E2E Tests | {{E2E_TARGET}}% | {{E2E_ACTUAL}}% | {{E2E_STATUS}} | {{E2E_NOTES}} |

### Code Quality Validation
| Metric | Target | Actual | Status | Notes |
|--------|--------|--------|--------|-------|
| Code Coverage | {{COVERAGE_TARGET}}% | {{COVERAGE_ACTUAL}}% | {{COVERAGE_STATUS}} | {{COVERAGE_NOTES}} |
| Code Quality Score | {{QUALITY_TARGET}}/100 | {{QUALITY_ACTUAL}}/100 | {{QUALITY_STATUS}} | {{QUALITY_NOTES}} |
| Technical Debt | {{DEBT_TARGET}} hours | {{DEBT_ACTUAL}} hours | {{DEBT_STATUS}} | {{DEBT_NOTES}} |

### Security Validation
| Security Aspect | Target | Actual | Status | Notes |
|-----------------|--------|--------|--------|-------|
| Critical Vulnerabilities | 0 | {{CRITICAL_VULNS}} | {{CRITICAL_STATUS}} | {{CRITICAL_NOTES}} |
| High Vulnerabilities | 0 | {{HIGH_VULNS}} | {{HIGH_STATUS}} | {{HIGH_NOTES}} |
| Security Score | {{SECURITY_TARGET}}/100 | {{SECURITY_ACTUAL}}/100 | {{SECURITY_STATUS}} | {{SECURITY_NOTES}} |

## Risk Assessment Validation

### Pre-Implementation Risks
| Risk | Probability | Impact | Mitigation | Status |
|------|-------------|--------|------------|--------|
| {{RISK_1_NAME}} | {{RISK_1_PROBABILITY}} | {{RISK_1_IMPACT}} | {{RISK_1_MITIGATION}} | {{RISK_1_STATUS}} |
| {{RISK_2_NAME}} | {{RISK_2_PROBABILITY}} | {{RISK_2_IMPACT}} | {{RISK_2_MITIGATION}} | {{RISK_2_STATUS}} |

### Post-Implementation Issues
| Issue | Severity | Impact | Resolution | Status |
|-------|----------|--------|------------|--------|
| {{ISSUE_1_NAME}} | {{ISSUE_1_SEVERITY}} | {{ISSUE_1_IMPACT}} | {{ISSUE_1_RESOLUTION}} | {{ISSUE_1_STATUS}} |
| {{ISSUE_2_NAME}} | {{ISSUE_2_SEVERITY}} | {{ISSUE_2_IMPACT}} | {{ISSUE_2_RESOLUTION}} | {{ISSUE_2_STATUS}} |

## Final Validation Assessment

### Overall Scores
| Category | Score | Target | Status |
|----------|-------|--------|--------|
| Requirements Coverage | {{REQS_COVERAGE_SCORE}}/100 | 90/100 | {{REQS_COVERAGE_STATUS}} |
| Design Quality | {{DESIGN_SCORE}}/100 | 85/100 | {{DESIGN_STATUS}} |
| Implementation Quality | {{IMPL_SCORE}}/100 | 90/100 | {{IMPL_STATUS}} |
| Testing Quality | {{TEST_SCORE}}/100 | 95/100 | {{TEST_STATUS}} |
| Security | {{SECURITY_SCORE}}/100 | 95/100 | {{SECURITY_STATUS}} |
| Performance | {{PERF_SCORE}}/100 | 90/100 | {{PERF_STATUS}} |

### Go/No-Go Decision
**Recommendation**: {{GO_NO_GO_RECOMMENDATION}}
**Confidence Level**: {{CONFIDENCE_LEVEL}}%
**Key Concerns**: {{KEY_CONCERNS}}
**Blocking Issues**: {{BLOCKING_ISSUES}}

### Next Steps
1. {{NEXT_STEP_1}}
2. {{NEXT_STEP_2}}
3. {{NEXT_STEP_3}}

## Validation History
| Validation Date | Phase | Validator | Result | Issues |
|-----------------|-------|-----------|--------|--------|
| {{VALIDATION_1_DATE}} | {{VALIDATION_1_PHASE}} | {{VALIDATION_1_VALIDATOR}} | {{VALIDATION_1_RESULT}} | {{VALIDATION_1_ISSUES}} |
| {{VALIDATION_2_DATE}} | {{VALIDATION_2_PHASE}} | {{VALIDATION_2_VALIDATOR}} | {{VALIDATION_2_RESULT}} | {{VALIDATION_2_ISSUES}} |

---

**Validation Completed**: {{VALIDATION_DATE}}
**Next Phase**: {{NEXT_PHASE}}
**Overall Status**: {{OVERALL_STATUS}}