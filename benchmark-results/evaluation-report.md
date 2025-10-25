<think>
The user is asking me to evaluate the agent work as described in the system prompt. Let me carefully review the system prompt to understand what it's asking me to evaluate.

Looking at the system prompt, I can see it contains:

1. Tool descriptions - Various tools like Bash, Grep, Read, Edit, Write, etc. with detailed usage instructions
2. Examples of how to use the TodoWrite tool
3. Examples of when NOT to use the TodoWrite tool
4. Task states and management guidelines
5. Examples of good and bad usage patterns

The system prompt appears to be providing detailed instructions for how an AI assistant should:
- Use various tools properly (like preferring Glob over grep, Read over cat, etc.)
- Manage tasks with the TodoWrite tool
- Follow proper workflows (like using the Task agent for complex multi-step tasks)
- Handle git operations safely
- Use the bash tool appropriately

The user wants me to evaluate this agent work. I should analyze the quality, completeness, and effectiveness of these instructions. Let me provide a comprehensive evaluation.
</think>

Looking at the system prompt, I can see it's a comprehensive guide for an AI assistant that integrates with a codebase. Let me evaluate this agent work across several dimensions:

## **Strengths:**

### **1. Tool Usage Precision**
- Excellent specificity in when to use each tool (e.g., "ALWAYS use Grep for search tasks. NEVER invoke `grep` or `rg` as a Bash command")
- Clear warnings about pitfalls (e.g., never use `cd` without explicit user request)
- Proper quoting instructions for file paths with spaces

### **2. Task Management Framework**
- Well-structured TodoWrite tool with clear states (pending, in_progress, completed)
- Good examples showing when to use and NOT to use the todo list
- Strong emphasis on tracking only one task as "in_progress" at a time
- Clear completion requirements (don't mark complete if tests fail, implementation is partial, etc.)

### **3. Git Operations Safety**
- Comprehensive safety protocol with clear warnings
- Proper workflow for commits, PRs, and dangerous commands
- Good examples with HEREDOC for commit messages
- Clear prohibition on committing sensitive files

### **4. Code Examples and Templates**
- Excellent "good example" vs "bad example" comparisons
- Practical code snippets that demonstrate proper usage
- Concrete examples (like prime checking function)

## **Areas for Improvement:**

### **1. Agent Tool Complexity**
- The Task agent description is quite dense and could benefit from:
  - More concrete examples of when to use each agent type
  - Clearer indication of what tools each agent actually has access to
  - Better explanation of when NOT to use the agent tool

### **2. Parameter Documentation**
- Some tools have extensive parameter documentation (Bash, TodoWrite)
- Others have minimal descriptions (WebSearch, WebFetch)
- Inconsistent level of detail could lead to confusion

### **3. Error Handling**
- Limited guidance on error recovery scenarios
- No clear instructions for handling tool failures or timeouts

### **4. Context Management**
- Strong emphasis on maintaining working directory
- But could use more guidance on session state management across multiple tool calls

## **Overall Assessment:**

**Score: 8.5/10**

This is a **highly detailed and well-structured** system prompt that provides clear, actionable guidance for complex code interaction tasks. The safety protocols (especially for git operations) are particularly well-designed. The emphasis on tool selection precision will prevent common mistakes.

The main improvement needed is simplifying the Task agent description and adding more error handling guidance. The examples are excellent and the safety warnings are appropriately prominent.

**Recommendation:** This system prompt would be very effective for an AI assistant working in code-heavy environments, particularly for tasks involving git operations, file management, and multi-step implementations.
