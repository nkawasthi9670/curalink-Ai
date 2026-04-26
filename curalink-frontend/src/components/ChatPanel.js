import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { generatePDF } from '../utils/generatePDF';

const QUICK_PROMPTS = [
  'Latest treatment options',
  'Clinical trials near me',
  'Recent research breakthroughs',
  'Drug interactions to avoid',
];

export default function ChatPanel({ messages, loading, onSend, onViewSources, sources, context }) {
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
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleInput = (e) => {
    setInput(e.target.value);
    e.target.style.height = '42px';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  return (
    <div className="flex flex-col overflow-hidden border-r border-blue-900/20">

      {/* Header */}
      
      <div className="px-6 py-4 border-b border-blue-900/20 flex items-center gap-2.5 bg-[#111827] flex-shrink-0">
  <svg className="w-4 h-4 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
  <span className="text-sm font-medium text-white">Research chat</span>
  <span className="ml-auto text-xs text-slate-500 mr-3">
    {messages.length - 1} message{messages.length !== 2 ? 's' : ''}
  </span>

  {/* Download Button */}
  {messages.length > 1 && (
    <button
      onClick={() => generatePDF({ messages, sources, context })}
      className="flex items-center gap-1.5 text-xs text-teal-400 border border-teal-400/20 bg-teal-400/5 hover:bg-teal-400/15 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
    >
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
      Download PDF
    </button>
  )}
</div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 items-start ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>

            <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-semibold
              ${msg.role === 'assistant'
                ? 'bg-gradient-to-br from-blue-500 to-teal-400 text-white'
                : 'bg-[#1e2d45] text-slate-400'}`}>
              {msg.role === 'assistant' ? 'AI' : 'You'}
            </div>

            <div className={`max-w-[78%] px-4 py-3.5 rounded-2xl text-sm leading-relaxed
              ${msg.role === 'assistant'
                ? 'bg-[#1a2235] border border-blue-900/20 text-white rounded-tl-sm'
                : 'bg-blue-500 text-white rounded-tr-sm'}`}>

              {msg.role === 'assistant' ? (
                <>
                  <div className="prose prose-invert prose-sm max-w-none
                    prose-headings:text-blue-400 prose-headings:text-xs prose-headings:uppercase prose-headings:tracking-wider prose-headings:font-semibold prose-headings:mt-3 prose-headings:mb-1.5
                    prose-p:text-slate-200 prose-p:mb-2
                    prose-li:text-slate-200
                    prose-strong:text-white prose-strong:font-medium
                    prose-code:bg-blue-500/20 prose-code:text-blue-300 prose-code:px-1 prose-code:rounded prose-code:text-xs">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                  {msg.sources && (
                    <button
                      onClick={() => onViewSources(msg.sources)}
                      className="mt-3 inline-flex items-center gap-1.5 text-xs text-blue-300 bg-blue-500/10 border border-blue-500/25 px-3 py-1.5 rounded-full hover:bg-blue-500/20 transition-colors cursor-pointer"
                    >
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                      </svg>
                      View {(msg.sources.publications?.length || 0) + (msg.sources.clinicalTrials?.length || 0)} sources
                    </button>
                  )}
                </>
              ) : msg.content}
            </div>
          </div>
        ))}

        {/* Loading */}
        {loading && (
          <div className="flex gap-3 items-start">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-teal-400 flex items-center justify-center text-xs font-semibold text-white flex-shrink-0">
              AI
            </div>
            <div className="bg-[#1a2235] border border-blue-900/20 rounded-2xl rounded-tl-sm px-4 py-3.5">
              <div className="flex gap-1.5 items-center mb-2">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse inline-block"/>
                Searching PubMed · OpenAlex · ClinicalTrials.gov
              </p>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick prompts */}
      {messages.length === 1 && (
        <div className="flex flex-wrap gap-2 px-6 pb-4">
          {QUICK_PROMPTS.map((p) => (
            <button
              key={p}
              onClick={() => onSend(p)}
              className="text-xs text-slate-400 border border-blue-900/20 bg-[#1a2235] hover:border-blue-500/50 hover:text-blue-300 px-3 py-1.5 rounded-full transition-colors cursor-pointer"
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="px-6 py-4 border-t border-blue-900/20 bg-[#111827] flex-shrink-0">
        <div className="flex gap-2.5 items-end">
          <textarea
            ref={textareaRef}
            placeholder="Ask about treatments, trials, or research..."
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            rows={1}
            className="flex-1 bg-[#1a2235] border border-blue-900/20 rounded-lg px-3.5 py-2.5 text-sm text-white outline-none focus:border-blue-500 placeholder-slate-600 resize-none min-h-[42px] max-h-[120px] transition-colors font-sans"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="w-10 h-10 bg-blue-500 hover:bg-blue-400 disabled:bg-[#1e2d45] rounded-lg flex items-center justify-center flex-shrink-0 transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
        <p className="text-xs text-slate-600 mt-2">Press Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}