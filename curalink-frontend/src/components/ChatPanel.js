import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

const QUICK_PROMPTS = [
  'Latest treatment options',
  'Clinical trials near me',
  'Recent research breakthroughs',
  'Drug interactions to avoid',
];

export default function ChatPanel({ messages, loading, onSend, onViewSources }) {
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = () => {
    if (!input.trim()) return;
    onSend(input.trim());
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = '42px';
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e) => {
    setInput(e.target.value);
    e.target.style.height = '42px';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <span className="chat-header-title">Research chat</span>
        <span className="chat-header-sub">
          {messages.length - 1} message{messages.length !== 2 ? 's' : ''}
        </span>
      </div>

      <div className="chat-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`msg-row ${msg.role}`}>
            <div className={`msg-avatar ${msg.role === 'assistant' ? 'bot' : 'user'}`}>
              {msg.role === 'assistant' ? 'AI' : 'You'}
            </div>
            <div className={`msg-bubble ${msg.role === 'assistant' ? 'bot' : 'user'}`}>
              {msg.role === 'assistant' ? (
                <>
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                  {msg.sources && (
                    <button
                      className="sources-btn"
                      onClick={() => onViewSources(msg.sources)}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                      </svg>
                      View {(msg.sources.publications?.length || 0) + (msg.sources.clinicalTrials?.length || 0)} sources
                    </button>
                  )}
                </>
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="msg-row">
            <div className="msg-avatar bot">AI</div>
            <div className="msg-bubble bot" style={{ padding: '10px 16px' }}>
              <div className="typing-indicator">
                <div className="typing-dot" />
                <div className="typing-dot" />
                <div className="typing-dot" />
              </div>
              <div className="retrieval-status">
                Searching PubMed · OpenAlex · ClinicalTrials.gov
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {messages.length === 1 && (
        <div className="quick-prompts">
          {QUICK_PROMPTS.map((p) => (
            <button key={p} className="quick-chip" onClick={() => onSend(p)}>
              {p}
            </button>
          ))}
        </div>
      )}

      <div className="chat-input-area">
        <div className="chat-input-row">
          <textarea
            ref={textareaRef}
            placeholder="Ask about treatments, trials, or research..."
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            rows={1}
          />
          <button className="send-btn" onClick={handleSend} disabled={loading || !input.trim()}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
        <p className="input-hint">Press Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}