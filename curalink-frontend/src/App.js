import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthPage from './pages/AuthPage';
import Sidebar from './components/Sidebar';
import ChatPanel from './components/ChatPanel';
import SourcesPanel from './components/SourcesPanel';

const SESSION_ID = uuidv4();

function MainApp() {
  const { user, token, logout } = useAuth();
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hello ${user?.name || ''}! I'm Curalink, your AI medical research assistant. Fill in your details on the left, then ask me anything.`,
      sources: null,
    },
  ]);
  const [context, setContext] = useState({
    disease: '',
    patientName: user?.name || '',
    location: '',
  });
  const [loading, setLoading] = useState(false);
  const [activeSources, setActiveSources] = useState(null);

  const sendMessage = useCallback(async (message) => {
    if (!message.trim() || loading) return;
    setMessages((prev) => [...prev, { role: 'user', content: message }]);
    setLoading(true);
    try {
      const res = await fetch('https://curalink-ai-tagr.onrender.com/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sessionId: SESSION_ID, message, context }),
      });
      const data = await res.json();
      if (res.status === 401) { logout(); return; }
      const assistantMsg = {
        role: 'assistant',
        content: data.response || 'No response received.',
        sources: data.sources || null,
      };
      setMessages((prev) => [...prev, assistantMsg]);
      if (data.sources) setActiveSources(data.sources);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Connection error.', sources: null }]);
    } finally {
      setLoading(false);
    }
  }, [loading, context, token, logout]);

  return (
    <div className="grid grid-cols-[270px_1fr_320px] h-screen overflow-hidden bg-[#0a0e1a]">
      <Sidebar
        context={context}
        setContext={setContext}
        user={user}
        onLogout={logout}
      />
      <ChatPanel
        messages={messages}
        loading={loading}
        onSend={sendMessage}
        onViewSources={setActiveSources}
      />
      <SourcesPanel sources={activeSources} />
    </div>
  );
}

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen bg-[#0a0e1a] flex items-center justify-center text-blue-400 text-base">
        Loading...
      </div>
    );
  }

  return user ? <MainApp /> : <AuthPage />;
}

export default function Root() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}