# Code Review: {{PROJECT_NAME}}

## Review Overview
- **Project**: {{PROJECT_NAME}}
- **Review Scope**: {{REVIEW_SCOPE}}
- **Implementation Status**: {{IMPLEMENTATION_STATUS}}

## Task Completion Verification

### Tasks.md Compliance Check
| Task ID | Task Description | Status | Completion % | Deliverable | Quality |
|---------|------------------|--------|--------------|-------------|---------|
| {{TASK_1_ID}} | {{TASK_1_DESC}} | {{TASK_1_STATUS}} | {{TASK_1_COMPLETION}}% | {{TASK_1_DELIVERABLE}} | {{TASK_1_QUALITY}} |
| {{TASK_2_ID}} | {{TASK_2_DESC}} | {{TASK_2_STATUS}} | {{TASK_2_COMPLETION}}% | {{TASK_2_DELIVERABLE}} | {{TASK_2_QUALITY}} |
| {{TASK_3_ID}} | {{TASK_3_DESC}} | {{TASK_3_STATUS}} | {{TASK_3_COMPLETION}}% | {{TASK_3_DELIVERABLE}} | {{TASK_3_QUALITY}} |

**Overall Task Completion**: {{OVERALL_TASK_COMPLETION}}%
**All Tasks Completed**: {{ALL_TASKS_COMPLETED}}

### Git Repository Analysis

#### Commit History Review
- **Total Commits**: {{TOTAL_COMMITS}}
- **Commits per Task**: {{COMMITS_PER_TASK}}
- **Commit Quality**: {{COMMIT_QUALITY}} (clear messages, logical grouping)
- **Branch Strategy**: {{BRANCH_STRATEGY_COMPLIANCE}}

#### Code Changes Analysis
**Files Modified**: {{FILES_MODIFIED_COUNT}}
**Lines Added**: {{LINES_ADDED}}
**Lines Removed**: {{LINES_REMOVED}}
**Net Change**: {{NET_CHANGE}} lines

#### Code Quality Metrics
- **Code Churn**: {{CODE_CHURN}}% (high churn may indicate instability)
- **File Complexity**: {{FILE_COMPLEXITY_ASSESSMENT}}
- **Duplicate Code**: {{DUPLICATE_CODE_PERCENTAGE}}%
- **Dead Code Detected**: {{DEAD_CODE_DETECTED}}

## Implementation vs Requirements

### Requirements Coverage
| Requirement | Status | Implementation Location | Quality | Notes |
|-------------|--------|------------------------|---------|-------|
| {{REQ_1}} | {{REQ_1_STATUS}} | {{REQ_1_LOCATION}} | {{REQ_1_QUALITY}} | {{REQ_1_NOTES}} |
| {{REQ_2}} | {{REQ_2_STATUS}} | {{REQ_2_LOCATION}} | {{REQ_2_QUALITY}} | {{REQ_2_NOTES}} |
| {{REQ_3}} | {{REQ_3_STATUS}} | {{REQ_3_LOCATION}} | {{REQ_3_QUALITY}} | {{REQ_3_NOTES}} |

### Acceptance Criteria Verification
- [ ] {{ACCEPTANCE_CRITERION_1}} - {{AC1_STATUS}}
- [ ] {{ACCEPTANCE_CRITERION_2}} - {{AC2_STATUS}}
- [ ] {{ACCEPTANCE_CRITERION_3}} - {{AC3_STATUS}}

## Code Quality Assessment

### Architecture Compliance
- **Design Adherence**: {{DESIGN_ADHERENCE}}%
- **Component Structure**: {{COMPONENT_STRUCTURE_QUALITY}}
- **Integration Points**: {{INTEGRATION_POINTS_STATUS}}
- **Separation of Concerns**: {{SEPARATION_OF_CONCERNS}}

### Code Standards
- **Linting**: {{LINTING_STATUS}} ({{LINTING_ERRORS}} errors)
- **Formatting**: {{FORMATTING_STATUS}}
- **Naming Conventions**: {{NAMING_CONVENTIONS_STATUS}}
- **Documentation**: {{DOCUMENTATION_QUALITY}}

### Code Refactoring Assessment

#### Refactoring Quality Indicators
- **Code Smells Resolved**: {{CODE_SMELLS_RESOLVED}}
- **Complexity Reduction**: {{COMPLEXITY_REDUCTION}}%
- **Method Length**: {{AVERAGE_METHOD_LENGTH}} lines (target: <20)
- **Class Size**: {{AVERAGE_CLASS_SIZE}} lines (target: <200)
- **Parameter Count**: {{AVERAGE_PARAMETER_COUNT}} (target: <4)

#### Technical Debt Analysis
- **Technical Debt Hours**: {{TECHNICAL_DEBT_HOURS}} (target: <8h)
- **Debt Ratio**: {{TECHNICAL_DEBT_RATIO}}% of total effort
- **Hotspots Identified**: {{TECHNICAL_DEBT_HOTSPOTS}}
- **Legacy Code Refactored**: {{LEGACY_CODE_REFACTORED}}%

#### Code Duplication & Reusability
- **Duplicate Code**: {{DUPLICATE_CODE_PERCENTAGE}}% (target: <3%)
- **Reusable Components**: {{REUSABLE_COMPONENTS_CREATED}}
- **DRY Principle Compliance**: {{DRY_COMPLIANCE}}%
- **Utility Functions**: {{UTILITY_FUNCTIONS_EXTRACTED}}

#### Design Patterns & Architecture
- **Design Patterns Applied**: {{DESIGN_PATTERNS_USED}}
- **SOLID Principles**: {{SOLID_COMPLIANCE}}%
- **Architecture Patterns**: {{ARCHITECTURE_PATTERNS_FOLLOWED}}
- **Separation of Concerns**: {{SEPARATION_OF_CONCERNS_SCORE}}/10

### Code Cleanup & Waste Removal

#### Unused Code Detection
**Issues Found**:
- **TODO Comments**: {{TODO_COUNT}} (should be resolved before merge)
- **Console Logs**: {{DEBUG_LOGS_COUNT}} (should be removed in production)
- **Unused Imports**: {{UNUSED_IMPORTS_COUNT}}
- **Dead Code Blocks**: {{DEAD_CODE_BLOCKS_COUNT}}
- **Commented Out Code**: {{COMMENTED_CODE_COUNT}}

#### File Organization
- **File Structure**: {{FILE_STRUCTURE_QUALITY}}
- **Naming Consistency**: {{NAMING_CONSISTENCY}}
- **Module Boundaries**: {{MODULE_BOUNDARIES_CLEAR}}
- **Import/Export Organization**: {{IMPORT_EXPORT_ORGANIZATION}}

### Security Review
- **Authentication**: {{AUTHENTICATION_STATUS}}
- **Authorization**: {{AUTHORIZATION_STATUS}}
- **Data Protection**: {{DATA_PROTECTION_STATUS}}
- **Input Validation**: {{INPUT_VALIDATION_STATUS}}
- **Security Vulnerabilities**: {{SECURITY_VULNERABILITIES}}

### Performance Analysis
- **Response Time**: {{RESPONSE_TIME}}ms (target: <{{TARGET_RESPONSE_TIME}}ms)
- **Memory Usage**: {{MEMORY_USAGE}} (target: <{{TARGET_MEMORY_USAGE}})
- **Database Efficiency**: {{DATABASE_EFFICIENCY}}
- **Scalability**: {{SCALABILITY_ASSESSMENT}}

## Test Quality Review

### Test Coverage
- **Overall Coverage**: {{TEST_COVERAGE}}% (target: ≥{{TARGET_TEST_COVERAGE}}%)
- **Unit Tests**: {{UNIT_TEST_COVERAGE}}%
- **Integration Tests**: {{INTEGRATION_TEST_COVERAGE}}%
- **End-to-End Tests**: {{E2E_TEST_COVERAGE}}%

### TDD Compliance Assessment
- **Test-First Approach**: {{TDD_TEST_FIRST_STATUS}}
- **Red-Green-Refactor Cycle**: {{TDD_CYCLE_STATUS}}
- **Test Quality**: {{TEST_QUALITY_ASSESSMENT}}
- **Test Maintenance**: {{TEST_MAINTENABILITY}}

### Test Effectiveness
- **Meaningful Tests**: {{MEANINGFUL_TESTS_RATIO}}%
- **Edge Case Coverage**: {{EDGE_CASE_COVERAGE}}
- **Error Handling Tests**: {{ERROR_HANDLING_TESTS}}

## Integration Review

### API Contracts
| Endpoint | Method | Status | Response Time | Notes |
|----------|--------|--------|---------------|-------|
| {{API_1_ENDPOINT}} | {{API_1_METHOD}} | {{API_1_STATUS}} | {{API_1_RESPONSE_TIME}} | {{API_1_NOTES}} |
| {{API_2_ENDPOINT}} | {{API_2_METHOD}} | {{API_2_STATUS}} | {{API_2_RESPONSE_TIME}} | {{API_2_NOTES}} |

### Data Flow
- **Input Validation**: {{INPUT_VALIDATION_STATUS}}
- **Data Transformation**: {{DATA_TRANSFORMATION_STATUS}}
- **Output Formatting**: {{OUTPUT_FORMATTING_STATUS}}
- **Error Propagation**: {{ERROR_PROPAGATION_STATUS}}

### External Dependencies
- **Third-party APIs**: {{EXTERNAL_API_STATUS}}
- **Database Connections**: {{DB_CONNECTION_STATUS}}
- **Cache Layer**: {{CACHE_LAYER_STATUS}}
- **File Storage**: {{FILE_STORAGE_STATUS}}

## Code Quality Issues Found

### Critical Issues (Must Fix Before Merge)
| Issue | Type | Location | Git Blame | Description | Suggested Fix |
|-------|------|----------|-----------|-------------|---------------|
| {{CRITICAL_ISSUE_1}} | {{CRITICAL_ISSUE_1_TYPE}} | {{CRITICAL_ISSUE_1_LOCATION}} | {{CRITICAL_ISSUE_1_AUTHOR}} | {{CRITICAL_ISSUE_1_DESC}} | {{CRITICAL_ISSUE_1_FIX}} |
| {{CRITICAL_ISSUE_2}} | {{CRITICAL_ISSUE_2_TYPE}} | {{CRITICAL_ISSUE_2_LOCATION}} | {{CRITICAL_ISSUE_2_AUTHOR}} | {{CRITICAL_ISSUE_2_DESC}} | {{CRITICAL_ISSUE_2_FIX}} |

### Major Issues (Should Fix)
| Issue | Type | Location | Git Blame | Description | Suggested Fix |
|-------|------|----------|-----------|-------------|---------------|
| {{MAJOR_ISSUE_1}} | {{MAJOR_ISSUE_1_TYPE}} | {{MAJOR_ISSUE_1_LOCATION}} | {{MAJOR_ISSUE_1_AUTHOR}} | {{MAJOR_ISSUE_1_DESC}} | {{MAJOR_ISSUE_1_FIX}} |
| {{MAJOR_ISSUE_2}} | {{MAJOR_ISSUE_2_TYPE}} | {{MAJOR_ISSUE_2_LOCATION}} | {{MAJOR_ISSUE_2_AUTHOR}} | {{MAJOR_ISSUE_2_DESC}} | {{MAJOR_ISSUE_2_FIX}} |

### Code Smells & Technical Debt
| Smell | Location | Impact | Refactoring Priority |
|-------|----------|--------|---------------------|
| {{CODE_SMELL_1}} | {{CODE_SMELL_1_LOCATION}} | {{CODE_SMELL_1_IMPACT}} | {{CODE_SMELL_1_PRIORITY}} |
| {{CODE_SMELL_2}} | {{CODE_SMELL_2_LOCATION}} | {{CODE_SMELL_2_IMPACT}} | {{CODE_SMELL_2_PRIORITY}} |

### Cleanup Required
| Cleanup Type | Count | Locations | Action Required |
|--------------|-------|-----------|-----------------|
| TODO Comments | {{TODO_COUNT}} | {{TODO_LOCATIONS}} | Resolve or convert to issues |
| Console Logs | {{DEBUG_LOGS_COUNT}} | {{DEBUG_LOG_LOCATIONS}} | Remove for production |
| Unused Code | {{UNUSED_CODE_COUNT}} | {{UNUSED_CODE_LOCATIONS}} | Remove safely |
| Dead Code | {{DEAD_CODE_COUNT}} | {{DEAD_CODE_LOCATIONS}} | Delete |

## Code Quality Metrics

### Maintainability
- **Cyclomatic Complexity**: {{CYCLOMATIC_COMPLEXITY}} (target: <10)
- **Code Duplication**: {{CODE_DUPLICATION}}% (target: <5%)
- **Technical Debt**: {{TECHNICAL_DEBT_HOURS}} hours
- **Code Churn**: {{CODE_CHURN}}%

### Reliability
- **Bug Density**: {{BUG_DENSITY}} bugs/KLOC
- **Mean Time to Recovery**: {{MTTR}} hours
- **Error Rate**: {{ERROR_RATE}}%

### Security
- **Vulnerabilities**: {{VULNERABILITY_COUNT}} ({{CRITICAL_VULNS}} critical)
- **Security Hotspots**: {{SECURITY_HOTSPOTS}}

## Performance Benchmarks
| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| API Response Time | {{API_RESPONSE_TIME}}ms | <{{TARGET_API_RESPONSE_TIME}}ms | {{API_PERFORMANCE_STATUS}} |
| Database Query Time | {{DB_QUERY_TIME}}ms | <{{TARGET_DB_QUERY_TIME}}ms | {{DB_PERFORMANCE_STATUS}} |
| Memory Usage | {{MEMORY_USAGE}}MB | <{{TARGET_MEMORY_USAGE}}MB | {{MEMORY_PERFORMANCE_STATUS}} |
| CPU Usage | {{CPU_USAGE}}% | <{{TARGET_CPU_USAGE}}% | {{CPU_PERFORMANCE_STATUS}} |

## Refactoring Recommendations

### Immediate Refactoring (Before Merge)
1. **{{IMMEDIATE_REFACTOR_1}}**
   - **Files**: {{IMMEDIATE_REFACTOR_1_FILES}}
   - **Effort**: {{IMMEDIATE_REFACTOR_1_EFFORT}}
   - **Impact**: {{IMMEDIATE_REFACTOR_1_IMPACT}}

2. **{{IMMEDIATE_REFACTOR_2}}**
   - **Files**: {{IMMEDIATE_REFACTOR_2_FILES}}
   - **Effort**: {{IMMEDIATE_REFACTOR_2_EFFORT}}
   - **Impact**: {{IMMEDIATE_REFACTOR_2_IMPACT}}

### Future Refactoring Opportunities
1. **{{FUTURE_REFACTOR_1}}**
   - **Priority**: {{FUTURE_REFACTOR_1_PRIORITY}}
   - **Estimated Effort**: {{FUTURE_REFACTOR_1_EFFORT}}
   - **Benefits**: {{FUTURE_REFACTOR_1_BENEFITS}}

2. **{{FUTURE_REFACTOR_2}}**
   - **Priority**: {{FUTURE_REFACTOR_2_PRIORITY}}
   - **Estimated Effort**: {{FUTURE_REFACTOR_2_EFFORT}}
   - **Benefits**: {{FUTURE_REFACTOR_2_BENEFITS}}

### Code Quality Improvements
1. **{{QUALITY_IMPROVEMENT_1}}**
2. **{{QUALITY_IMPROVEMENT_2}}**
3. **{{QUALITY_IMPROVEMENT_3}}**

### Cleanup Actions
- [ ] Remove all {{TODO_COUNT}} TODO comments
- [ ] Remove all {{DEBUG_LOGS_COUNT}} console.log statements
- [ ] Delete {{DEAD_CODE_COUNT}} dead code blocks
- [ ] Refactor {{COMPLEX_METHODS_COUNT}} overly complex methods
- [ ] Extract {{REUSABLE_COMPONENTS_NEEDED}} reusable components

## Final Assessment

### Merge Readiness
- **Code Quality**: {{CODE_QUALITY_ASSESSMENT}}
- **Requirements Compliance**: {{REQUIREMENTS_COMPLIANCE}}
- **Test Coverage**: {{TEST_COVERAGE_ASSESSMENT}}
- **Performance**: {{PERFORMANCE_ASSESSMENT}}
- **Security**: {{SECURITY_ASSESSMENT}}

### Approval Decision
- **Approved for Merge**: {{APPROVED_FOR_MERGE}}
- **Conditions**: {{MERGE_CONDITIONS}}
- **Blockers**: {{MERGE_BLOCKERS}}

### Review Summary
{{REVIEW_SUMMARY}}

## Sign-off
- **Status**: {{COMPLETION_STATUS}}
- **Next Phase**: {{NEXT_PHASE}}