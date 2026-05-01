'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Terminal, Activity } from 'lucide-react'
import ToolCallCard from '@/components/ToolCallCard'

interface ToolCall {
  tool: string
  input: Record<string, unknown>
  output: string
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  toolCalls?: ToolCall[]
  loading?: boolean
}

const SUGGESTED = [
  'Why is broken-app crashing?',
  'Give me a full cluster health check',
  'What pods are running?',
  'How much memory is demo-app using?',
]

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hey! I am Argus — your AI DevOps copilot. I have access to your Kubernetes cluster, logs, and Prometheus metrics. Ask me anything about your infrastructure.',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(text?: string) {
    const msg = text || input.trim()
    if (!msg || loading) return
    setInput('')

    const history = messages
      .filter(m => !m.loading)
      .map(m => ({ role: m.role, content: m.content }))

    setMessages(prev => [
      ...prev,
      { role: 'user', content: msg },
      { role: 'assistant', content: '', loading: true },
    ])
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, history }),
      })
      const data = await res.json()
      setMessages(prev => [
        ...prev.slice(0, -1),
        {
          role: 'assistant',
          content: data.answer || data.error || 'No response',
          toolCalls: data.tool_calls || [],
        },
      ])
    } catch {
      setMessages(prev => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: 'Error connecting to Argus backend. Is it running?' },
      ])
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-col h-screen bg-[#0F0E2E] text-white">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-white/10">
        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center">
          <Activity size={16} />
        </div>
        <div>
          <h1 className="font-semibold text-white">Argus</h1>
          <p className="text-xs text-white/40">AI DevOps Copilot · 10 tools active</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#0DD3A5] animate-pulse" />
          <span className="text-xs text-white/40">Connected</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] ${msg.role === 'user' ? 'order-2' : 'order-1'}`}>
              {msg.role === 'assistant' && (
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center">
                    <Terminal size={10} />
                  </div>
                  <span className="text-xs text-white/40">Argus</span>
                </div>
              )}
              {msg.toolCalls && msg.toolCalls.length > 0 && (
                <div className="mb-3">
                  {msg.toolCalls.map((tc, j) => (
                    <ToolCallCard key={j} toolCall={tc} />
                  ))}
                </div>
              )}
              <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-tr-sm'
                  : 'bg-white/5 text-white/90 rounded-tl-sm border border-white/10'
              }`}>
                {msg.loading ? (
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-[#0DD3A5] rounded-full animate-bounce" style={{animationDelay:'0ms'}}/>
                      <div className="w-1.5 h-1.5 bg-[#0DD3A5] rounded-full animate-bounce" style={{animationDelay:'150ms'}}/>
                      <div className="w-1.5 h-1.5 bg-[#0DD3A5] rounded-full animate-bounce" style={{animationDelay:'300ms'}}/>
                    </div>
                    <span className="text-xs text-white/40">Calling tools...</span>
                  </div>
                ) : (
                  <pre className="whitespace-pre-wrap font-sans">{msg.content}</pre>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {messages.length <= 1 && (
        <div className="px-4 pb-3 flex gap-2 flex-wrap">
          {SUGGESTED.map((q, i) => (
            <button
              key={i}
              onClick={() => sendMessage(q)}
              className="text-xs px-3 py-2 rounded-full border border-white/10 text-white/60 hover:border-indigo-500 hover:text-white transition-all"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      <div className="px-4 pb-6 pt-2">
        <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 focus-within:border-indigo-500 transition-colors">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Ask about your cluster..."
            className="flex-1 bg-transparent text-sm text-white placeholder-white/30 outline-none"
            disabled={loading}
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center disabled:opacity-30 hover:bg-indigo-500 transition-colors"
          >
            <Send size={14} />
          </button>
        </div>
        <p className="text-center text-xs text-white/20 mt-2">Press Enter to send</p>
      </div>
    </div>
  )
}
