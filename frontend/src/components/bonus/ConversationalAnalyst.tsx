import React, { useState } from 'react';
import { api } from '../../services/api';
import { Sparkles, Send, Bot, User, CheckCircle2, BookOpen } from 'lucide-react';

export const ConversationalAnalyst: React.FC = () => {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'assistant'; text: string; citations?: string[] }>>([
    {
      sender: 'assistant',
      text: "Hello Karthik! I am your **Savomart Expansion Intelligence Analyst**.\n\nI have complete visibility into Chennai's area fitness analyses, scouted properties, and catchment surveys.\n\nAsk me anything like:\n- *'Compare Velachery and Tambaram for our next store'*\n- *'Summarize our current pipeline and best rent bargains'*\n- *'What are the latest catchment study findings?'*"
    }
  ]);
  const [loading, setLoading] = useState(false);

  const handleSend = async (textToSend?: string) => {
    const q = textToSend || query;
    if (!q.trim() || loading) return;

    setMessages(prev => [...prev, { sender: 'user', text: q }]);
    setQuery('');
    setLoading(true);

    try {
      const res = await api.askAnalyst(q);
      setMessages(prev => [
        ...prev,
        { sender: 'assistant', text: res.response, citations: res.citations }
      ]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        { sender: 'assistant', text: `Sorry, I encountered an issue: ${err.message}` }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const samplePrompts = [
    "Compare Velachery and Tambaram for our next store",
    "Summarize our current property pipeline",
    "What are the latest catchment survey findings?"
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-savo-purple to-purple-900 text-white p-5 rounded-3xl shadow-lg border-2 border-savo-yellow flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-savo-yellow flex items-center justify-center text-savo-purple">
            <Sparkles className="w-6 h-6 fill-current" />
          </div>
          <div>
            <h2 className="text-base font-black tracking-tight">
              Conversational Expansion Analyst
            </h2>
            <p className="text-xs text-purple-200">
              Grounded AI assistant referencing live Chennai GIS & platform data
            </p>
          </div>
        </div>
      </div>

      {/* Suggested Prompts */}
      <div className="flex flex-wrap gap-2">
        {samplePrompts.map((p, i) => (
          <button
            key={i}
            onClick={() => handleSend(p)}
            className="text-xs font-semibold px-3 py-1.5 bg-purple-50 text-savo-purple hover:bg-purple-100 rounded-xl border border-purple-200 transition text-left"
          >
            💬 {p}
          </button>
        ))}
      </div>

      {/* Chat Messages Log */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm min-h-[400px] max-h-[550px] overflow-y-auto space-y-4">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex items-start space-x-3 ${
              m.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''
            }`}
          >
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs flex-shrink-0 ${
                m.sender === 'user'
                  ? 'bg-slate-900 text-white'
                  : 'bg-savo-purple text-savo-yellow font-black'
              }`}
            >
              {m.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            <div
              className={`p-4 rounded-2xl text-xs max-w-[85%] leading-relaxed ${
                m.sender === 'user'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-50 text-slate-800 border border-slate-200/80'
              }`}
            >
              <div className="whitespace-pre-line prose-sm">{m.text}</div>

              {m.citations && m.citations.length > 0 && (
                <div className="mt-3 pt-2 border-t border-slate-200/60 text-[10px] text-slate-500">
                  <span className="font-bold flex items-center mb-0.5">
                    <BookOpen className="w-3 h-3 mr-1" /> Data Citations:
                  </span>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {m.citations.map((c, ci) => (
                      <li key={ci}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center space-x-2 text-xs text-slate-400 py-2">
            <Sparkles className="w-4 h-4 text-savo-purple animate-spin" />
            <span>Consulting Chennai spatial indices & pipeline metrics...</span>
          </div>
        )}
      </div>

      {/* Input Field */}
      <form
        onSubmit={e => {
          e.preventDefault();
          handleSend();
        }}
        className="flex items-center space-x-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm"
      >
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Ask about Chennai areas, properties, or survey insights..."
          className="flex-1 px-4 py-2 text-xs font-medium text-slate-800 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!query.trim() || loading}
          className="p-2.5 bg-savo-purple hover:bg-savo-purple-dark text-white rounded-xl shadow transition disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
