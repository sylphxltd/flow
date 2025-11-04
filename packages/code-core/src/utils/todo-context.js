/**
 * Todo Context Builder
 * Builds todo reminder context for LLM messages
 */
/**
 * Build todo context string from todos
 */
export function buildTodoContext(todos) {
    // Filter active todos (exclude completed and removed)
    const activeTodos = todos.filter((t) => t.status !== 'completed' && t.status !== 'removed');
    // If no active todos, return minimal reminder
    if (activeTodos.length === 0) {
        return '<todo_reminder>For multi-step tasks, use updateTodos tool</todo_reminder>';
    }
    // Sort by ordering ASC, id ASC (first added = first to do)
    const sortedTodos = [...activeTodos].sort((a, b) => {
        if (a.ordering !== b.ordering) {
            return a.ordering - b.ordering;
        }
        return a.id - b.id;
    });
    const pendingTodos = sortedTodos.filter((t) => t.status === 'pending');
    const inProgressTodos = sortedTodos.filter((t) => t.status === 'in_progress');
    const todoLines = ['<pending_tasks>'];
    if (inProgressTodos.length > 0) {
        todoLines.push('In Progress:');
        inProgressTodos.forEach((t) => todoLines.push(`  - [${t.id}] ${t.activeForm}`));
    }
    if (pendingTodos.length > 0) {
        todoLines.push('Pending:');
        pendingTodos.forEach((t) => todoLines.push(`  - [${t.id}] ${t.content}`));
    }
    todoLines.push('</pending_tasks>');
    return todoLines.join('\n');
}
//# sourceMappingURL=todo-context.js.map