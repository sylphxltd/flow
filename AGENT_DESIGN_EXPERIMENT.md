# Agent Design Experiment: Craftsman vs Practitioner

## 🎯 Experiment Purpose

To explore how different identity approaches and methodologies impact LLM-generated code quality through A/B testing of four agent versions.

## 🏗️ Design Architecture

### Dimension 1: Identity
- **Craftsman**: Idealistic, pursuing craftsmanship perfection, long-term value, artistic quality
- **Practitioner**: Pragmatic, focusing on business value, realistic trade-offs, rapid delivery

### Dimension 2: Methodology
- **Principles**: Clear rules and standards, direct instructions, consistent execution
- **Reflective**: Question-guided, contextual judgment, self-reflection, adaptive decision-making

## 📋 Four Versions

### 1. craftsman.md (600 lines)
**Identity**: Idealistic Craftsman
**Methodology**: Principles-based
**Characteristics**:
- Complete idealistic philosophy
- Detailed technical standards and implementation guidelines
- Emphasizes craftsmanship spirit and perfectionism
- "Build software that matters"
- "Leave everything better than you found it"

### 2. craftsman-reflective.md (242 lines)
**Identity**: Idealistic Craftsman
**Methodology**: Reflective-based
**Characteristics**:
- Same idealistic philosophy
- Decision-making through guided questions
- "Ask yourself about functional elegance"
- "Would I be proud to show this work?"
- Context-based quality judgment

### 3. practitioner.md (333 lines)
**Identity**: Pragmatic Practitioner
**Methodology**: Principles-based
**Characteristics**:
- Business value-first mindset
- Risk-proportional standard application
- Clear rules and decision frameworks
- "Perfect solutions that don't ship are worthless"
- Risk-based quality thresholds

### 4. practitioner-reflective.md (256 lines)
**Identity**: Pragmatic Practitioner
**Methodology**: Reflective-based
**Characteristics**:
- Same pragmatic philosophy
- Trade-off analysis through questions
- "Is this investment justified by the value it creates?"
- Business impact-based decision frameworks

## 🧪 Core Hypotheses

### Hypothesis 1: Identity Impact
- **Craftsman versions** will produce more elegant, maintainable code
- **Practitioner versions** will focus more on business value and practicality

### Hypothesis 2: Methodology Impact
- **Principles versions** will be more consistent and predictable
- **Reflective versions** will better adapt to different contexts

### Hypothesis 3: Length Impact
- Longer versions may provide more detailed guidance
- Shorter versions may help LLM focus on core principles

### Hypothesis 4: Combination Effects
- Certain combinations may be particularly suitable for specific task types
- Craftsman-Principles may suit complex systems
- Practitioner-Reflective may suit rapid prototyping

## 📊 Testing Matrix

| | Principles | Reflective |
|---|---|---|
| **Craftsman** | Idealistic + Standards-driven | Idealistic + Reflection-driven |
| **Practitioner** | Pragmatic + Standards-driven | Pragmatic + Reflection-driven |

## 🎯 Testing Strategy

### Suggested Test Scenarios
1. **Same Task** - Give all four agents identical requirements, compare code differences
2. **Different Complexity** - Simple CRUD vs complex business logic
3. **Different Timeframes** - Rapid prototype vs long-term project
4. **Different Domains** - Web API vs data processing vs UI components

### Evaluation Dimensions
1. **Code Quality**: Readability, maintainability, architecture design
2. **Completeness**: Feature coverage, error handling, test coverage
3. **Business Value**: Whether it solves real problems
4. **Efficiency**: Response time, token usage
5. **Consistency**: Result stability across multiple runs

## 🔍 Design Highlights

### Identity Design
- **Craftsman**: Emphasizes craftsmanship spirit, artistic pursuit, long-term value
- **Practitioner**: Emphasizes business impact, pragmatism, rapid delivery

### Methodology Design
- **Principles**: Provides clear standards and rules, ensures consistency
- **Reflective**: Guides thinking through questions, cultivates judgment

### Content Symmetry
- All versions contain the same technical principles (FP, DDD, Type Safety, Security, etc.)
- Only expression and application strategies differ
- Ensures testing fairness

## 🚀 Expected Outcomes

### Understanding LLM Behavior
- How different identities affect output style
- Which is more effective: directive vs reflective
- Impact of detail level on result quality

### Best Practice Discovery
- What types of tasks suit which agent
- How to choose appropriate prompts for different scenarios
- Best practices in prompt engineering

### Future Improvement Directions
- Optimize design based on test results
- Explore other dimensions (like domain-specific focus)
- Build agent selection frameworks

## 📝 Design Process Record

### Version Evolution
1. **Initial Version**: Single builder.md (466 lines)
2. **First Optimization**: Added functional programming principles
3. **Structure Reorganization**: Organized by functional domains, eliminated redundancy
4. **Deep Thinking**: Identified missing elements like business value
5. **Dual Version Creation**: Distinguished idealistic vs pragmatic
6. **Four-Version Matrix**: Added methodology dimension
7. **Content Alignment**: Ensured all versions have complete technical principles

### Key Insights
- **Identity first**: LLM is very sensitive to identity
- **Context adaptation**: No one-size-fits-all rules
- **Progressive detail**: Hierarchical structure from philosophy to implementation
- **Self-reflection mechanisms**: Making LLM "ask itself questions" is more effective than direct instructions

---

*This experiment aims to explore best practices in LLM prompt design, understanding the impact of different design choices through systematic A/B testing.*