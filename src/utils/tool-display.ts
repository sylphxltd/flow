export function formatToolDisplay(toolName: string, params: any): string {
  let paramString = '';

  switch (toolName) {
    case 'Write':
      paramString = params.file_path ? params.file_path.split('/').pop() || '' : '';
      if (params.content && params.content.length < 50) {
        paramString += `: "${params.content.substring(0, 50)}${params.content.length > 50 ? '...' : ''}"`;
      }
      break;
    case 'Read':
      paramString = params.file_path ? params.file_path.split('/').pop() || '' : '';
      break;
    case 'Edit':
      paramString = params.file_path ? params.file_path.split('/').pop() || '' : '';
      break;
    case 'Bash':
      paramString = params.command || '';
      // Limit bash command display length
      if (paramString.length > 60) {
        paramString = `${paramString.substring(0, 57)}...`;
      }
      break;
    case 'Grep':
      paramString = params.pattern || '';
      if (params.file_path) {
        paramString += ` in ${params.file_path.split('/').pop() || ''}`;
      }
      break;
    case 'Glob':
      paramString = params.pattern || '';
      break;
    case 'TodoWrite': {
      const todoCount = params.todos ? params.todos.length : 0;
      const completedCount = params.todos
        ? params.todos.filter((t: any) => t.status === 'completed').length
        : 0;
      paramString = `${todoCount} todos (${completedCount} completed)`;
      break;
    }
    default:
      // Generic parameter display for other tools
      if (params.file_path) {
        paramString = params.file_path.split('/').pop() || '';
      } else if (params.query) {
        paramString = params.query.substring(0, 40);
        if (params.query.length > 40) {
          paramString += '...';
        }
      } else if (params.command) {
        paramString = params.command.substring(0, 40);
        if (params.command.length > 40) {
          paramString += '...';
        }
      } else {
        paramString = JSON.stringify(params).substring(0, 40);
      }
  }

  return `${toolName}(${paramString})`;
}
