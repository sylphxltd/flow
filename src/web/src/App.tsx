/**
 * Sylphx Flow Web UI
 * Modern, borderless, full-screen design
 */

import { useState } from 'react';
import Sidebar from './components/Sidebar';
import ChatContainer from './components/ChatContainer';

export default function App() {
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  return (
    <div className="flex w-full h-full bg-gray-950">
      {/* Sidebar - Session List */}
      <Sidebar
        currentSessionId={currentSessionId}
        onSelectSession={setCurrentSessionId}
      />

      {/* Main Chat Area */}
      <ChatContainer sessionId={currentSessionId} />
    </div>
  );
}
