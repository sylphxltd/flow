/**
 * Todo Formatters
 * Centralized todo display logic - single source of truth
 */
/**
 * Get icon for todo status
 */
export const getTodoIcon = (status) => {
    switch (status) {
        case 'in_progress':
            return '▶';
        case 'pending':
            return '○';
        case 'completed':
            return '✓';
        case 'removed':
            return '✗';
    }
};
/**
 * Get color for todo status
 */
export const getTodoColor = (status) => {
    switch (status) {
        case 'in_progress':
            return '#00FF88';
        case 'pending':
            return 'gray';
        case 'completed':
            return 'green';
        case 'removed':
            return 'red';
    }
};
/**
 * Get display text for todo (activeForm for in_progress, content otherwise)
 */
export const getTodoDisplayText = (todo) => {
    return todo.status === 'in_progress' ? todo.activeForm : todo.content;
};
/**
 * Check if todo text should be dimmed
 */
export const isTodoDimmed = (status) => {
    return status === 'pending' || status === 'completed';
};
/**
 * Check if todo text should be bold
 */
export const isTodoBold = (status) => {
    return status === 'in_progress';
};
/**
 * Check if todo text should have strikethrough
 */
export const isTodoStrikethrough = (status) => {
    return status === 'completed';
};
/**
 * Format todo for tool result display
 */
export const formatTodoChange = (type, todo, beforeStatus, reorderType) => {
    if (type === 'added') {
        return `+ ${todo.content}`;
    }
    if (type === 'reordered' && reorderType) {
        return `[${todo.id}] reordered to ${reorderType}`;
    }
    if (type === 'updated' && beforeStatus && beforeStatus !== todo.status) {
        return `[${todo.id}] ${beforeStatus} → ${todo.status}`;
    }
    return `[${todo.id}] updated`;
};
/**
 * Format todo count for summary
 */
export const formatTodoCount = (todos) => {
    const active = todos.filter((t) => t.status !== 'removed');
    const completed = todos.filter((t) => t.status === 'completed');
    const inProgress = todos.filter((t) => t.status === 'in_progress');
    const pending = todos.filter((t) => t.status === 'pending');
    return `${completed.length}/${active.length} (${inProgress.length} in progress, ${pending.length} pending)`;
};
//# sourceMappingURL=todo-formatters.js.map