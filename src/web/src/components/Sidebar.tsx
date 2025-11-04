/**
 * Sidebar - Session List
 * Borderless, modern design with glass effect
 */

import { trpc } from '../trpc';

interface SidebarProps {
  currentSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onOpenSettings: () => void;
  toast: any;
}

export default function Sidebar({
  currentSessionId,
  onSelectSession,
  onOpenSettings,
  toast,
}: SidebarProps) {
  // Load sessions from backend
  const { data: sessions, isLoading } = trpc.session.getRecent.useQuery({ limit: 50 });

  // Load config to get default provider/model
  const { data: configData } = trpc.config.load.useQuery({});

  // Create new session mutation
  const createSessionMutation = trpc.session.create.useMutation({
    onSuccess: (data) => {
      onSelectSession(data.id);
      toast.success('New chat created!');
    },
    onError: (error) => {
      toast.error(`Failed to create chat: ${error.message}`);
    },
  });

  const handleNewChat = async () => {
    const config = configData?.config;
    const provider = config?.defaultProvider || 'anthropic';
    const providerConfig = config?.providers?.[provider];

    // Check if provider is configured
    if (!providerConfig?.apiKey && provider !== 'zai') {
      toast.warning(
        `${provider.charAt(0).toUpperCase() + provider.slice(1)} is not configured. Please add your API key in Settings.`
      );
      onOpenSettings();
      return;
    }

    const model =
      providerConfig?.defaultModel ||
      (provider === 'anthropic'
        ? 'claude-3-5-sonnet-20241022'
        : provider === 'openai'
        ? 'gpt-4o'
        : provider === 'google'
        ? 'gemini-2.0-flash-exp'
        : 'claude-3-5-sonnet-20241022');

    try {
      await createSessionMutation.mutateAsync({
        provider: provider as any,
        model,
      });
    } catch (error) {
      // Error already handled by onError
    }
  };

  return (
    <div className="w-80 h-full bg-gray-900/50 backdrop-blur-xl flex flex-col">
      {/* Header */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-100">Sylphx Flow</h1>
          <button
            onClick={onOpenSettings}
            className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition-colors"
            title="Settings"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>
        </div>

        {/* New Chat Button */}
        <button
          onClick={handleNewChat}
          disabled={createSessionMutation.isPending}
          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {createSessionMutation.isPending ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              New Chat
            </>
          )}
        </button>
      </div>

      {/* Session List */}
      <div className="flex-1 overflow-y-auto px-3">
        {isLoading && (
          <div className="text-center text-gray-500 py-8">Loading sessions...</div>
        )}

        {sessions && sessions.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            No sessions yet.
            <br />
            Create a new chat to get started!
          </div>
        )}

        {sessions?.map((session) => (
          <button
            key={session.id}
            onClick={() => onSelectSession(session.id)}
            className={`
              w-full text-left p-4 mb-2 rounded-lg transition-all duration-200
              ${
                currentSessionId === session.id
                  ? 'bg-white/10 text-white'
                  : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
              }
            `}
          >
            <div className="font-medium truncate">{session.title || 'New Chat'}</div>
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
