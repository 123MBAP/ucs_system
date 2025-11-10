import { useEffect, useState } from 'react';
import { useI18n } from '@/lib/i18n';

const apiBase = import.meta.env.VITE_API_URL as string;

type Summary = { users: number; clients: number; total: number };

export default function Superuser() {
  const { t } = useI18n();
  const [sum, setSum] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<'mgr' | 'sup' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true); setError(null);
    try {
      const r = await fetch(`${apiBase}/api/superuser/summary`);
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || 'Failed');
      setSum(j);
    } catch (e: any) {
      setError(e?.message || 'Failed to load');
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function reset(which: 'mgr' | 'sup') {
    setBusy(which); setError(null);
    try {
      const path = which === 'mgr' ? 'reset-manager' : 'reset-supervisors';
      const r = await fetch(`${apiBase}/api/superuser/${path}`, { method: 'POST' });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || 'Failed');
    } catch (e: any) {
      setError(e?.message || 'Failed');
    } finally { setBusy(null); }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-zinc-800 to-amber-600 bg-clip-text text-transparent">{t('superuser.title')}</h1>
        <p className="text-zinc-600 mt-2">{t('superuser.subtitle')}</p>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
        {loading || !sum ? (
          <div className="text-zinc-600">Loading…</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-amber-100 p-4 bg-amber-50/40">
              <div className="text-sm text-zinc-600">{t('superuser.users')}</div>
              <div className="text-2xl font-bold text-zinc-900">{sum.users}</div>
            </div>
            <div className="rounded-xl border border-amber-100 p-4 bg-amber-50/40">
              <div className="text-sm text-zinc-600">{t('superuser.clients')}</div>
              <div className="text-2xl font-bold text-zinc-900">{sum.clients}</div>
            </div>
            <div className="rounded-xl border border-amber-100 p-4 bg-amber-50/40">
              <div className="text-sm text-zinc-600">{t('superuser.total')}</div>
              <div className="text-2xl font-bold text-zinc-900">{sum.total}</div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 space-y-3">
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => reset('mgr')}
            disabled={busy === 'mgr'}
            className={`px-4 py-2 rounded-lg text-sm font-medium text-white ${busy === 'mgr' ? 'bg-gray-400' : 'bg-neutral-900 hover:bg-neutral-800'}`}
          >
            {busy === 'mgr' ? t('superuser.resetting') : t('superuser.resetManager')}
          </button>
          <button
            onClick={() => reset('sup')}
            disabled={busy === 'sup'}
            className={`px-4 py-2 rounded-lg text-sm font-medium text-white ${busy === 'sup' ? 'bg-gray-400' : 'bg-neutral-900 hover:bg-neutral-800'}`}
          >
            {busy === 'sup' ? t('superuser.resetting') : t('superuser.resetSupervisors')}
          </button>
          <button
            onClick={load}
            className="px-4 py-2 rounded-lg text-sm font-medium text-amber-700 bg-white border border-amber-200 hover:bg-amber-50"
          >
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}
