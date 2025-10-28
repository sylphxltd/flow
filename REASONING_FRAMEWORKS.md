# Sylphx Flow Reasoning Frameworks

## Overview
Comprehensive collection of **9 reasoning frameworks** designed to guide structured thinking across various domains and problem types. Each framework is fully integrated with the reasoning tools system.

## Framework Categories

### 🎯 **Strategic Frameworks**
- **SWOT Analysis** - Strategic planning and market positioning
- **Risk Assessment** - Risk identification and mitigation planning

### 🔍 **Analytical Frameworks**
- **First Principles Thinking** - Break down problems to fundamental truths
- **Root Cause Analysis (5 Whys)** - Find underlying causes of problems
- **Cause & Effect Analysis (Fishbone)** - Systematic multi-factor problem analysis
- **Systems Thinking** - Understand complex system dynamics

### 🛠️ **Technical Frameworks**
- **Decision Matrix** - Multi-criteria technical decision making

### 🎨 **Creative Frameworks**
- **Six Thinking Hats** - Structured brainstorming and perspective-taking
- **Design Thinking** - User-centered innovation and problem solving

## Usage Workflow

### 1. Discovery
```bash
# Browse all available frameworks
reasoning_frameworks

# Filter by category or search
reasoning_frameworks category="strategic"
reasoning_frameworks search="risk"
```

### 2. Selection
Choose framework based on problem type:
- **Strategic decisions** → SWOT, Risk Assessment
- **Problem analysis** → Root Cause, First Principles, Systems Thinking
- **Complex decisions** → Decision Matrix
- **Innovation** → Design Thinking, Six Thinking Hats
- **Multi-factor issues** → Cause & Effect Analysis

### 3. Application
```bash
# Start reasoning session
reasoning_start title="Problem Analysis" framework="root-cause-analysis" problem_description="..."

# Work through framework sections
reasoning_analyze reasoning_id="[ID]" section="Problem Definition" analysis="..."

# Conclude with actionable insights
reasoning_conclude reasoning_id="[ID]" conclusions="..." recommendations="..."
```

## Framework Validation

All frameworks have been validated for:
- ✅ **JSON Schema Compliance**
- ✅ **Tool Integration** (reasoning_start, reasoning_analyze, reasoning_conclude)
- ✅ **Complete Metadata** (usage guidelines, examples, difficulty levels)
- ✅ **Industry Validation** (based on established methodologies)

## Quality Levels
- **Core (7 frameworks)**: Essential, widely-used methodologies
- **Extended (2 frameworks)**: Specialized but valuable approaches
- **Experimental**: Future additions for testing

## Adding New Frameworks

To add new frameworks (developer action):
1. Create JSON file in `src/frameworks/definitions/[category]/` (source code)
2. Follow schema defined in `framework.schema.json`
3. Include all required fields and metadata
4. System automatically loads and validates frameworks at runtime

**Important:** Framework definitions are static source files managed by developers, not auto-created runtime files.

## Built-in Features

- **Dynamic Loading**: Frameworks loaded automatically from source
- **Search & Filter**: Find frameworks by category, difficulty, or keywords
- **Quality Control**: Tiered quality levels and validation status
- **Usage Analytics**: Track framework effectiveness over time
- **Extensible Design**: Easy to add new frameworks without code changes

Each framework provides:
- Clear structure and guided prompts
- When to use/not use guidelines
- Real-world examples
- Difficulty and time estimates
- Integration with workspace persistence