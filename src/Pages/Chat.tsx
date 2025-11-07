import React from 'react';
import { useI18n } from 'src/lib/i18n';

export default function Chat() {
  const API_BASE = import.meta.env.VITE_API_URL as string;
  const { t } = useI18n();
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
  const [unreadCounts, setUnreadCounts] = React.useState<{ general: number; workers: number }>(() => ({ general: 0, workers: 0 }));

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

  function autoLogout() {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } catch {}
    try { window.dispatchEvent(new Event('auth-changed')); } catch {}
    window.location.href = '/login';
  }

  // For deep-link scroll to message by id
  const msgRefs = React.useRef<Record<number, HTMLDivElement | null>>({});
  const scrollToMsg = (id: number) => {
    const el = msgRefs.current[id];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-gray-300', 'ring-opacity-50');
      setTimeout(() => el.classList.remove('ring-2', 'ring-gray-300', 'ring-opacity-50'), 1000);
    }
  };

  async function loadMessages(target: 'general' | 'workers') {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      if (!token) { autoLogout(); return; }
      const res = await fetch(`${API_BASE}/api/chat/messages?group=${encodeURIComponent(target)}&limit=100`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });
      if (res.status === 401) { autoLogout(); return; }
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || `Failed to load messages (${res.status})`);
      }
      const data = await res.json();
      // Server returns newest first; reverse to show oldest first
      const list = Array.isArray(data?.messages) ? [...data.messages].reverse() : [];
      setMessages(list);
      // Mark as read: store the latest timestamp for this group
      try {
        const latest = list.length ? list[list.length - 1].created_at : new Date().toISOString();
        localStorage.setItem(`chat_last_read_${target}`, latest);
        window.dispatchEvent(new Event('chat-read'));
      } catch {}
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  // Compute unread counts for both tabs using local last_read timestamps and message lists
  async function computeUnreadCounts() {
    try {
      // Fetch lists with small limit and compare with lastRead
      const meId = (() => { try { const u = localStorage.getItem('user'); return u ? (JSON.parse(u)?.id ?? null) : null; } catch { return null; }})();
      const doCount = async (g: 'general' | 'workers') => {
        const token = localStorage.getItem('token');
        if (!token) { autoLogout(); return 0; }
        const res = await fetch(`${API_BASE}/api/chat/messages?group=${encodeURIComponent(g)}&limit=50`, {
          headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
        });
        if (res.status === 401) { autoLogout(); return 0; }
        const data = await res.json().catch(() => ({}));
        const list: any[] = Array.isArray(data?.messages) ? data.messages : [];
        const lastReadRaw = localStorage.getItem(`chat_last_read_${g}`);
        const lastRead = lastReadRaw ? new Date(lastReadRaw).getTime() : 0;
        let cnt = 0;
        for (const m of list) {
          const ts = new Date(m?.created_at || 0).getTime();
          const fromMe = meId != null && Number(m?.user_id) === Number(meId);
          if (ts > lastRead && !fromMe) cnt++;
        }
        return cnt;
      };
      const gCount = await doCount('general');
      const wCount = canSeeWorkers ? await doCount('workers') : 0;
      setUnreadCounts({ general: gCount, workers: wCount });
    } catch {
      setUnreadCounts((p) => p);
    }
  }

  React.useEffect(() => {
    (async () => {
      await loadMessages(tab); // ensures last_read for current tab is set
      await computeUnreadCounts();
    })();
  }, [tab]);

  // Initial unread
  React.useEffect(() => { computeUnreadCounts(); }, []);

  // Realtime updates via SSE (progressive enhancement)
  React.useEffect(() => {
    if (!API_BASE) return;
    const token = localStorage.getItem('token');
    if (!token) { autoLogout(); return; }
    // Put token in query since EventSource cannot set headers
    const url = `${API_BASE}/api/chat/stream?token=${encodeURIComponent(token)}`;
    let es: EventSource | null = null;
    try {
      es = new EventSource(url);
      es.onmessage = async () => {
        // New message - refresh counts and current tab messages
        await loadMessages(tab);
        await computeUnreadCounts();
      };
      es.onerror = () => {
        // If stream fails, we keep UI but let periodic polling continue; no auto-logout since we can't read status.
      };
    } catch {}
    return () => { try { es && es.close(); } catch {} };
  }, [API_BASE, tab, canSeeWorkers]);

  async function send() {
    const text = message.trim();
    if (!text) return;
    try {
      const token = localStorage.getItem('token');
      if (!token) { autoLogout(); return; }
      const res = await fetch(`${API_BASE}/api/chat/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ group: tab, message: text, reply_to_id: replyTo?.id ?? null })
      });
      if (res.status === 401) { autoLogout(); return; }
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
    <div className="p-3 sm:p-4 md:p-6 bg-gradient-to-br from-gray-50 to-white min-h-screen">
      <div className="max-w-5xl w-full mx-auto bg-white rounded-xl sm:rounded-2xl shadow-md border border-neutral-200 overflow-hidden">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-neutral-200 bg-white text-neutral-900">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg sm:text-xl font-bold">{t('chat.title')}</h1>
              <div className="text-xs sm:text-sm text-neutral-600 mt-1">
                {tab === 'general' ? t('chat.subtitleGeneral') : t('chat.subtitleWorkers')}
              </div>
            </div>
            {!isClient && (
              <div className="bg-neutral-100 border border-neutral-200 rounded-lg p-1">
                <div className="flex text-xs sm:text-sm font-medium">
                  <button
                    className={`${tab === 'general' ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-700 hover:text-neutral-900'} px-3 sm:px-4 py-1.5 sm:py-2 rounded-md transition-all duration-200`}
                    onClick={() => setTab('general')}
                  >
                    <span className="inline-flex items-center gap-2">
                      {t('chat.tab.allUsers')}
                      {unreadCounts.general > 0 && (
                        <span className="text-[10px] bg-red-500 text-white rounded-full px-1.5 py-0.5">
                          {unreadCounts.general > 99 ? '99+' : unreadCounts.general}
                        </span>
                      )}
                    </span>
                  </button>
                  {canSeeWorkers && (
                    <button
                      className={`${tab === 'workers' ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-700 hover:text-neutral-900'} px-3 sm:px-4 py-1.5 sm:py-2 rounded-md transition-all duration-200`}
                      onClick={() => setTab('workers')}
                    >
                      <span className="inline-flex items-center gap-2">
                        {t('chat.tab.workers')}
                        {unreadCounts.workers > 0 && (
                          <span className="text-[10px] bg-red-500 text-white rounded-full px-1.5 py-0.5">
                            {unreadCounts.workers > 99 ? '99+' : unreadCounts.workers}
                          </span>
                        )}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-col h-[64vh] sm:h-[66vh] md:h-[70vh]">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-white">
            {loading && (
              <div className="flex justify-center">
                <div className="animate-pulse text-gray-500 text-sm">{t('chat.loading')}</div>
              </div>
            )}
            {error && (
              <div className="text-center text-red-600 text-sm bg-red-50 py-2 rounded-lg border border-red-200">
                {error}
              </div>
            )}
            {!loading && !error && filtered.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                <div className="text-lg font-medium mb-2">{t('chat.noMessagesTitle')}</div>
                <div className="text-sm">{t('chat.noMessagesDesc')}</div>
              </div>
            )}
            {!loading && !error && filtered.map((m) => {
              const mine = userId != null && m.user_id === userId;
              const displayName = mine
                ? t('chat.you')
                : (m.client_name && (m.client_name.first || m.client_name.last))
                  ? `${m.client_name.first ?? ''} ${m.client_name.last ?? ''}`.trim()
                  : (m.client_username || m.user_username || t('chat.user'));
              const avatarUrl = m.client_avatar || '';
              const snippet = (m.message || '').slice(0, 80);
              const replyName = (m as any).reply_client_name && (((m as any).reply_client_name.first) || ((m as any).reply_client_name.last))
                ? `${(m as any).reply_client_name.first ?? ''} ${(m as any).reply_client_name.last ?? ''}`.trim()
                : ((m as any).reply_client_username || (m as any).reply_user_username || null);
              const replyMessage = (m as any).reply_message as string | undefined;

              return (
                <div 
                  key={m.id} 
                  className={`flex ${mine ? 'justify-end' : 'justify-start'} group`}
                  ref={(el) => { msgRefs.current[m.id] = el; }}
                >
                  <div className={`flex gap-3 max-w-[85%] ${mine ? 'flex-row-reverse' : ''}`}>
                    {/* Avatar */}
                    <div className={`flex flex-col items-center ${mine ? 'order-2' : ''}`}>
                      <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-white shadow-sm bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-sm font-semibold text-gray-700">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                        ) : (
                          (displayName?.[0] || 'U').toUpperCase()
                        )}
                      </div>
                    </div>

                    {/* Message Bubble */}
                    <div className={`flex-1 ${mine ? 'text-right' : ''}`}>
                      {/* Sender Name and Time */}
                      <div className={`flex items-center gap-2 mb-1 ${mine ? 'justify-end' : 'justify-start'}`}>
                        <span className="text-sm font-semibold text-slate-700">{displayName}</span>
                        <span className="text-xs text-slate-500">
                          {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {/* Message Content */}
                      <div className="relative">
                        {/* Reply Preview */}
                        {replyMessage && (
                          <div 
                            className={`mb-2 rounded-lg border-l-4 cursor-pointer transition-all hover:shadow-sm ${
                              mine 
                                ? 'border-l-neutral-400 bg-neutral-50 text-neutral-800' 
                                : 'border-l-gray-300 bg-gray-50 text-neutral-800'
                            }`}
                            onClick={() => (m as any).reply_id && scrollToMsg((m as any).reply_id)}
                          >
                            <div className="p-2">
                              <div className="text-xs font-semibold mb-1">
                                {t('chat.replyingTo', { name: replyName || t('chat.user') })}
                              </div>
                              <div className="text-xs text-gray-600 line-clamp-2">
                                {replyMessage}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Message Bubble */}
                        <div className={`relative inline-block max-w-full px-4 py-3 rounded-2xl shadow-sm transition-all ${
                          mine 
                            ? 'bg-neutral-800 text-white rounded-br-md' 
                            : 'bg-white text-neutral-800 border border-neutral-200 rounded-bl-md hover:border-neutral-300'
                        }`}>
                          {/* Reply Button on Hover */}
                          <button
                            title={t('chat.replyButtonTitle')}
                            onClick={() => setReplyTo({ id: m.id, name: displayName, snippet })}
                            className={`absolute top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 ${
                              mine 
                                ? '-left-12 bg-white text-neutral-800 hover:bg-gray-50' 
                                : '-right-12 bg-gray-100 text-gray-600 hover:bg-gray-200'
                            } w-8 h-8 rounded-full flex items-center justify-center shadow-md border`}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                              <path d="M10 8.5V6l-6 6 6 6v-2.5l4-.5a6 6 0 004.5-3.5l.5-1-1 .2A17 17 0 0010 8.5z" />
                            </svg>
                          </button>

                          {/* Message Text */}
                          <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                            {m.message}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Message Input Area */}
          <div className="border-t border-neutral-200 bg-white/95 backdrop-blur-sm p-4 space-y-3">
            {/* Reply Preview */}
            {replyTo && (
              <div className="flex items-center justify-between p-3 rounded-lg border border-neutral-200 bg-neutral-50">
                <div className="flex-1">
                  <div className="text-sm font-semibold text-neutral-800 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                      <path d="M10 8.5V6l-6 6 6 6v-2.5l4-.5a6 6 0 004.5-3.5l.5-1-1 .2A17 17 0 0010 8.5z" />
                    </svg>
                    {t('chat.replyingTo', { name: replyTo.name })}
                  </div>
                  <div className="text-sm text-gray-700 mt-1 line-clamp-2">{replyTo.snippet}</div>
                </div>
                <button
                  onClick={() => setReplyTo(null)}
                  className="text-neutral-700 hover:text-neutral-900 text-sm font-medium px-3 py-1 rounded-md hover:bg-gray-100 transition-colors"
                >
                  {t('chat.cancel')}
                </button>
              </div>
            )}

            {/* Input and Send Button */}
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-700 focus:border-transparent bg-white text-neutral-900 placeholder-gray-500 resize-none"
                  placeholder={tab === 'general' ? t('chat.placeholder.general') : t('chat.placeholder.workers')}
                  rows={1}
                  style={{ minHeight: '44px', maxHeight: '120px' }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = Math.min(target.scrollHeight, 120) + 'px';
                  }}
                />
              </div>
              <button
                onClick={send}
                disabled={!message.trim()}
                className="px-6 py-3 rounded-xl bg-neutral-900 text-white font-medium hover:bg-neutral-800 shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                  <path d="M3.478 2.404a.75.75 0 00-.926.941l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.404z" />
                </svg>
                {t('chat.send')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}