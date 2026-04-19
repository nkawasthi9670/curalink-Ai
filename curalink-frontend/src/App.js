import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Sidebar from './components/Sidebar';
import ChatPanel from './components/ChatPanel';
import SourcesPanel from './components/SourcesPanel';
import './App.css';

export default function App() {

  // ✅ FIX: correct variable
  const [sessionId] = useState(uuidv4());

  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        "Hello! I'm Curalink, your AI medical research assistant. Fill in your details on the left, then ask me anything about your condition — I'll search thousands of publications and clinical trials to give you research-backed answers.",
      sources: null,
    },
  ]);

  const [context, setContext] = useState({
    disease: '',
    patientName: '',
    location: '',
  });

  const [loading, setLoading] = useState(false);
  const [activeSources, setActiveSources] = useState(null);

  const sendMessage = useCallback(async (message) => {
    if (!message.trim() || loading) return;

    const userMsg = { role: 'user', content: message };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch(
        'https://curalink-ai-tagr.onrender.com/api/chat',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          // ✅ FIX: SESSION_ID ❌ → sessionId ✅
          body: JSON.stringify({
            sessionId: sessionId,
            message,
            context,
          }),
        }
      );

      const data = await res.json();

      const assistantMsg = {
        role: 'assistant',
        content: data.response || 'No response received.',
        sources: data.sources || null,
      };

      setMessages((prev) => [...prev, assistantMsg]);

      if (data.sources) {
        setActiveSources(data.sources);
      }

    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            'Connection error. Make sure the backend is running properly.',
          sources: null,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [loading, context, sessionId]);

  return (
    <div className="app-shell">
      <Sidebar context={context} setContext={setContext} />
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