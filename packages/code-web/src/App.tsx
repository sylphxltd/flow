/**
 * Sylphx Flow Web UI
 * Modern, borderless, full-screen design with Toast notifications
 */

import { useState } from 'react';
import Sidebar from './components/Sidebar';
import ChatContainer from './components/ChatContainer';
import Settings from './components/Settings';
import { ToastContainer, useToast } from './components/Toast';

export default function App() {
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const toast = useToast();

  return (
    <div className="flex w-full h-full bg-gray-950">
      {/* Sidebar - Session List */}
      <Sidebar
        currentSessionId={currentSessionId}
        onSelectSession={setCurrentSessionId}
        onOpenSettings={() => setShowSettings(true)}
        toast={toast}
      />

      {/* Main Chat Area */}
      <ChatContainer sessionId={currentSessionId} toast={toast} />

      {/* Settings Modal */}
      {showSettings && <Settings onClose={() => setShowSettings(false)} />}

      {/* Toast Notifications */}
      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />
    </div>
  );
}
