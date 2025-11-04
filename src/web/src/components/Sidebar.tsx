/**
 * Sidebar - Session List
 * Borderless, modern design with glass effect
 */

import { trpc } from '../trpc';

interface SidebarProps {
  currentSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
}

export default function Sidebar({ currentSessionId, onSelectSession }: SidebarProps) {
  // Load sessions from backend
  const { data: sessions, isLoading } = trpc.session.getRecent.useQuery({ limit: 50 });

  // Create new session mutation
  const createSessionMutation = trpc.session.create.useMutation({
    onSuccess: (data) => {
      onSelectSession(data.id);
    },
  });

  const handleNewChat = async () => {
    try {
      await createSessionMutation.mutateAsync({
        provider: 'anthropic', // TODO: Get from config
        model: 'claude-3-5-sonnet-20241022',
      });
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  return (
    <div className="w-80 h-full bg-gray-900/50 backdrop-blur-xl flex flex-col">
      {/* Header */}
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-100 mb-6">
          Sylphx Flow
        </h1>

        {/* New Chat Button */}
        <button
          onClick={handleNewChat}
          disabled={createSessionMutation.isPending}
          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {createSessionMutation.isPending ? 'Creating...' : '+ New Chat'}
        </button>
      </div>

      {/* Session List */}
      <div className="flex-1 overflow-y-auto px-3">
        {isLoading && (
          <div className="text-center text-gray-500 py-8">
            Loading sessions...
          </div>
        )}

        {sessions && sessions.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            No sessions yet.<br />
            Create a new chat to get started!
          </div>
        )}

        {sessions?.map((session) => (
          <button
            key={session.id}
            onClick={() => onSelectSession(session.id)}
            className={`
              w-full text-left p-4 mb-2 rounded-lg transition-all duration-200
              ${currentSessionId === session.id
                ? 'bg-white/10 text-white'
                : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
              }
            `}
          >
            <div className="font-medium truncate">
              {session.title || 'New Chat'}
            </div>
            <div className="text-sm text-gray-500 mt-1 truncate">
              {session.messages.length} messages
            </div>
          </button>
        ))}
      </div>

      {/* Footer */}
      <div className="p-4 text-xs text-gray-600 text-center border-t border-gray-800/50">
        <div>Sylphx Flow Web</div>
        <div className="mt-1">Powered by tRPC + SSE</div>
      </div>
    </div>
  );
}
