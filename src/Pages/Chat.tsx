import React from 'react';

export default function Chat() {
  const API_BASE = (import.meta as any)?.env?.VITE_API_BASE || (import.meta as any)?.env?.VITE_API_URL || '';
  const [tab, setTab] = React.useState<'general' | 'workers'>('general');
  const [message, setMessage] = React.useState('');
  const [messages, setMessages] = React.useState<{
    id: number;
    group: 'general' | 'workers';
    user_id: number | null;
    message: string;
    created_at: string;
    client_username?: string | null;
    client_name?: { first?: string; last?: string } | null;
    client_phone?: string | null;
    client_avatar?: string | null;
    user_username?: string | null;
  }[]>([]);
  const [replyTo, setReplyTo] = React.useState<null | { id: number; name: string; snippet: string }>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  let role: string | null = null;
  let userId: number | null = null;
  try {
    const stored = localStorage.getItem('user');
    const parsed = stored ? JSON.parse(stored) : null;
    role = parsed?.role ?? null;
    userId = parsed?.id ?? null;
  } catch {}
  const canSeeWorkers = role !== 'client';
  const isClient = role === 'client';

  // For deep-link scroll to message by id
  const msgRefs = React.useRef<Record<number, HTMLDivElement | null>>({});
  const scrollToMsg = (id: number) => {
    const el = msgRefs.current[id];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2','ring-amber-400');
      setTimeout(() => el.classList.remove('ring-2','ring-amber-400'), 1000);
    }
  };

  async function loadMessages(target: 'general' | 'workers') {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/chat/messages?group=${encodeURIComponent(target)}&limit=100`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || `Failed to load messages (${res.status})`);
      }
      const data = await res.json();
      // Server returns newest first; reverse to show oldest first
      const list = Array.isArray(data?.messages) ? [...data.messages].reverse() : [];
      setMessages(list);
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    loadMessages(tab);
  }, [tab]);

  async function send() {
    const text = message.trim();
    if (!text) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/chat/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ group: tab, message: text, reply_to_id: replyTo?.id ?? null })
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || `Failed to send message (${res.status})`);
      }
      setMessage('');
      setReplyTo(null);
      // Reload list to include the new message
      await loadMessages(tab);
    } catch (e) {
      alert(String((e as any)?.message || e));
    }
  }

  const filtered = messages.filter((m) => m.group === tab);

  return (
    <div className="p-4 sm:p-6">
      <div className="max-w-5xl mx-auto bg-white/95 backdrop-blur rounded-2xl shadow-xl border border-amber-200 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-amber-200 bg-gradient-to-r from-amber-600 to-amber-500 text-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm opacity-90">{tab === 'general' ? 'All Users Group' : 'Workers Group'}</div>
              <div className="text-xs opacity-90">{tab === 'general' ? 'Community chat for all users' : 'Chat for workers (hidden from clients)'}</div>
            </div>
            {!isClient && (
            <div className="bg-white/15 border border-white/20 rounded-xl p-1">
              <div className="flex text-xs">
                <button
                  className={`${tab === 'general' ? 'bg-white text-amber-700' : 'text-white/90'} px-3 py-1 rounded-lg transition`}
                  onClick={() => setTab('general')}
                >
                  All Users
                </button>
                {canSeeWorkers && (
                  <button
                    className={`${tab === 'workers' ? 'bg-white text-amber-700' : 'text-white/90'} px-3 py-1 rounded-lg transition`}
                    onClick={() => setTab('workers')}
                  >
                    Workers
                  </button>
                )}
              </div>
            </div>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="h-[68vh] flex flex-col">
          {/* Timeline */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-gradient-to-b from-white to-amber-50/40">
            {loading && <div className="text-center text-amber-800/70 text-sm">Loading…</div>}
            {error && <div className="text-center text-red-600 text-sm">{error}</div>}
            {!loading && !error && filtered.length === 0 && (
              <div className="text-center text-amber-800/70 text-sm">No messages yet.</div>
            )}
            {!loading && !error && filtered.map((m) => {
              const mine = userId != null && m.user_id === userId;
              const displayName = mine
                ? 'You'
                : (m.client_name && (m.client_name.first || m.client_name.last))
                  ? `${m.client_name.first ?? ''} ${m.client_name.last ?? ''}`.trim()
                  : (m.client_username || m.user_username || 'User');
              const avatarUrl = m.client_avatar || '';
              const snippet = (m.message || '').slice(0, 80);
              const replyName = (m as any).reply_client_name && (((m as any).reply_client_name.first) || ((m as any).reply_client_name.last))
                ? `${(m as any).reply_client_name.first ?? ''} ${(m as any).reply_client_name.last ?? ''}`.trim()
                : ((m as any).reply_client_username || (m as any).reply_user_username || null);
              const replyMessage = (m as any).reply_message as string | undefined;
              return (
                <div key={m.id} className={`w-full flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex items-end gap-2 ${mine ? 'flex-row-reverse' : ''}`}>
                    {!mine && (
                      <div className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-amber-200 bg-amber-50 flex items-center justify-center text-[11px] text-amber-700 font-semibold">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                        ) : (
                          (displayName?.[0] || 'U')
                        )}
                      </div>
                    )}
                    <div
                      ref={(el) => { msgRefs.current[m.id] = el; }}
                      className={`group relative max-w-[78%] px-4 py-2.5 rounded-2xl border shadow-sm transition ${
                        mine ? 'bg-amber-600 text-white border-amber-500' : 'bg-white text-amber-900 border-amber-200 hover:border-amber-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3 mb-1">
                        <div className={`text-[12px] font-semibold ${mine ? 'text-white' : 'text-amber-800'}`}>{displayName}</div>
                        <div className={`text-[11px] ${mine ? 'text-white/80' : 'text-amber-700/70'}`}>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                      {/* Reply icon on hover */}
                      <button
                        title="Reply"
                        onClick={() => setReplyTo({ id: m.id, name: displayName, snippet })}
                        className={`hidden group-hover:flex absolute ${mine ? 'left-2' : 'right-2'} -top-3 items-center justify-center w-6 h-6 rounded-full shadow bg-white text-amber-700 border border-amber-200`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                          <path d="M10 8.5V6l-6 6 6 6v-2.5l4-.5a6 6 0 004.5-3.5l.5-1-1 .2A17 17 0 0010 8.5z" />
                        </svg>
                      </button>
                      {replyMessage && (
                        <div className={`mb-2 rounded-xl border ${mine ? 'border-white/30 bg-white/10' : 'border-amber-200 bg-amber-50'}`}>
                          <div
                            className={`text-[12px] font-semibold px-3 pt-2 ${mine ? 'text-white' : 'text-amber-800'} cursor-pointer`}
                            onClick={() => (m as any).reply_id && scrollToMsg((m as any).reply_id)}
                          >
                            {replyName || 'Replied message'}
                          </div>
                          <div
                            className={`text-xs px-3 pb-2 ${mine ? 'text-white/85' : 'text-amber-800/80'} cursor-pointer`}
                            onClick={() => (m as any).reply_id && scrollToMsg((m as any).reply_id)}
                          >
                            {replyMessage}
                          </div>
                        </div>
                      )}
                      <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">{m.message}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Composer */}
          <div className="border-t border-amber-200 bg-white/90 p-3 space-y-2">
            {replyTo && (
              <div className="flex items-start justify-between gap-3 p-2 rounded-lg border border-amber-200 bg-amber-50">
                <div>
                  <div className="text-xs font-semibold text-amber-800">Replying to {replyTo.name}</div>
                  <div className="text-xs text-amber-700/80 line-clamp-2">{replyTo.snippet}</div>
                </div>
                <button
                  onClick={() => setReplyTo(null)}
                  className="text-amber-700/70 hover:text-amber-800 text-xs font-medium"
                >
                  Cancel
                </button>
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
                className="flex-1 px-4 py-2.5 rounded-xl border border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white text-amber-900 placeholder-amber-700/50"
                placeholder={tab === 'general' ? 'Message everyone…' : 'Message workers…'}
              />
              <button
                onClick={send}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 text-white font-medium hover:from-amber-700 hover:to-amber-600 shadow-sm"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .text-charcoal {
          color: #1E1E1E;
        }
        .bg-amber-600 {
          background-color: #D97706;
        }
        .bg-amber-700 {
          background-color: #B45309;
        }
        .bg-green-600 {
          background-color: #15803D;
        }
        .bg-green-100 {
          background-color: #DCFCE7;
        }
      `}</style>
    </div>
  );
}