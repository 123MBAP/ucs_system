import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Briefcase, Wallet, Calculator, CheckCircle2, Hourglass, CalendarDays } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

const apiBase = import.meta.env.VITE_API_URL as string;

type ChiefSummary = {
  chiefName: string | null;
  zoneName: string | null;
  zones: { id: number; name: string }[];
  clientsTotal: number;
  amountTotal: number;
  amountPaid: number;
  amountRemaining: number;
  clientsPaid: number;
  clientsRemaining: number;
  todayPayments: number;
  period: { year: number; month: number };
};
type ResetRequest = { id: number; clientId: number; username: string; emailHint: string | null; zoneId: number; createdAt: string };

const ChiefDashboard = () => {
  const { t } = useI18n();
  const [data, setData] = useState<ChiefSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetReqs, setResetReqs] = useState<ResetRequest[]>([]);
  const [resetBusy, setResetBusy] = useState<number | null>(null);

  function load() {
    const token = localStorage.getItem('token');
    if (!token) return;
    setLoading(true);
    setError(null);
    fetch(`${apiBase}/api/chief/dashboard`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async r => {
        const d = await r.json();
        if (!r.ok) throw new Error(d?.error || 'Failed to load');
        setData(d);
      })
      .catch((e: any) => setError(e?.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // Load password reset requests
    (async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        const r = await fetch(`${apiBase}/api/password/chief/requests`, { headers: { Authorization: `Bearer ${token}` } });
        const d = await r.json();
        if (!r.ok) throw new Error(d?.error || 'Failed');
        setResetReqs(Array.isArray(d?.requests) ? d.requests : []);
      } catch (e: any) {
        // keep silent on errors to not block dashboard
      }
    })();
    function onPaymentsUpdated() {
      load();
    }
    window.addEventListener('payments-updated', onPaymentsUpdated as any);
    return () => {
      window.removeEventListener('payments-updated', onPaymentsUpdated as any);
    };
  }, []);

  const chiefName = data?.chiefName || '-';
  const zoneName = data?.zoneName || (data?.zones?.length ? t('common.multipleZones') : '-');
  const clientsTotal = data?.clientsTotal || 0;
  const amountTotal = data?.amountTotal || 0;
  const amountPaid = data?.amountPaid || 0;
  const amountRemaining = data?.amountRemaining ?? Math.max(0, amountTotal - amountPaid);
  const clientsPaid = data?.clientsPaid || 0;
  const clientsRemaining = data?.clientsRemaining ?? Math.max(0, clientsTotal - clientsPaid);
  const todayPayments = data?.todayPayments || 0;

  return (
    <div className="space-y-8">
      {/* Password Reset Requests */}
      {resetReqs.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 border border-amber-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-[#1E1E1E]">Client Password Reset Requests</h2>
            <button
              onClick={async () => {
                const token = localStorage.getItem('token');
                if (!token) return;
                try {
                  const r = await fetch(`${apiBase}/api/password/chief/requests`, { headers: { Authorization: `Bearer ${token}` } });
                  const d = await r.json();
                  if (!r.ok) throw new Error(d?.error || 'Failed');
                  setResetReqs(Array.isArray(d?.requests) ? d.requests : []);
                } catch {}
              }}
              className="text-[#D97706] hover:text-[#B45309] underline text-sm"
            >
              {t('common.refresh')}
            </button>
          </div>
          <div className="space-y-2">
            {resetReqs.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border border-amber-100 bg-amber-50/40">
                <div>
                  <div className="text-sm font-medium text-[#1E1E1E]">{r.username}</div>
                  {r.emailHint && (
                    <div className="text-xs text-gray-600">Email: {r.emailHint}</div>
                  )}
                  <div className="text-xs text-gray-500">Requested at: {new Date(r.createdAt).toLocaleString()}</div>
                </div>
                <button
                  disabled={resetBusy === r.id}
                  onClick={async () => {
                    const token = localStorage.getItem('token');
                    if (!token) return;
                    setResetBusy(r.id);
                    try {
                      const resp = await fetch(`${apiBase}/api/password/chief/requests/${r.id}/reset`, {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                      });
                      const d = await resp.json();
                      if (!resp.ok) throw new Error(d?.error || 'Failed');
                      setResetReqs(prev => prev.filter(x => x.id !== r.id));
                    } catch (e: any) {
                      alert(e?.message || 'Failed to reset');
                    } finally {
                      setResetBusy(null);
                    }
                  }}
                  className={`px-3 py-1.5 rounded-md text-white text-sm ${resetBusy === r.id ? 'bg-gray-400' : 'bg-neutral-900 hover:bg-neutral-800'}`}
                >
                  {resetBusy === r.id ? 'Resetting...' : 'Reset to 123'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1E1E1E]">{t('chief.title')}</h1>
          <p className="text-sm text-gray-600 mt-1">{t('chief.subtitle')}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">{t('chief.label.chief')}</p>
          <p className="text-lg font-semibold text-[#1E1E1E]">{chiefName}</p>
          <p className="text-sm text-gray-500 mt-2">{t('chief.label.zone')}</p>
          <p className="text-lg font-semibold text-[#1E1E1E]">{zoneName}</p>
          <div className="mt-2">
            <button
              onClick={load}
              className="text-[#D97706] hover:text-[#B45309] underline text-sm transition-colors"
            >
              {t('common.refresh')}
            </button>
          </div>
        </div>
      </div>

      {error && <div className="text-red-600">{error}</div>}
      {loading ? (
        <div>{t('common.loading')}</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {/* Number of Clients */}
          <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 border border-amber-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t('chief.cards.clientsTotal')}</p>
                <p className="text-2xl font-bold text-[#1E1E1E] mt-2">{clientsTotal.toLocaleString()}</p>
                <div className="mt-2">
                  <Link
                    to="/clients?scope=chief&filter=all"
                    className="text-[#D97706] hover:text-[#B45309] underline text-sm transition-colors"
                  >
                    {t('common.view')}
                  </Link>
                </div>
              </div>
              <div className="shrink-0 p-2 rounded-lg bg-amber-50 text-[#D97706]">
                <Users className="h-8 w-8" />
              </div>
            </div>
          </div>

          {/* Total Amount To Be Paid */}
          <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 border border-amber-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t('chief.cards.amountTotal')}</p>
                <p className="text-2xl font-bold text-[#1E1E1E] mt-2">{amountTotal.toLocaleString()}</p>
              </div>
              <div className="shrink-0 p-2 rounded-lg bg-amber-100 text-[#B45309]">
                <Briefcase className="h-8 w-8" />
              </div>
            </div>
          </div>

          {/* Amount Paid */}
          <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 border border-green-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t('chief.cards.amountPaid')}</p>
                <p className="text-2xl font-bold text-[#1E1E1E] mt-2">{amountPaid.toLocaleString()}</p>
                <div className="mt-2">
                  <Link
                    to="/clients?scope=chief&filter=paid"
                    className="text-[#15803D] hover:text-[#166534] underline text-sm transition-colors"
                  >
                    {t('common.view')}
                  </Link>
                </div>
              </div>
              <div className="shrink-0 p-2 rounded-lg bg-green-50 text-[#15803D]">
                <Wallet className="h-8 w-8" />
              </div>
            </div>
          </div>

          {/* Remaining Amount */}
          <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t('chief.cards.amountRemaining')}</p>
                <p className="text-2xl font-bold text-[#1E1E1E] mt-2">{amountRemaining.toLocaleString()}</p>
              </div>
              <div className="shrink-0 p-2 rounded-lg bg-amber-50 text-[#D97706]">
                <Calculator className="h-8 w-8" />
              </div>
            </div>
          </div>

          {/* Clients Paid */}
          <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 border border-green-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t('chief.cards.clientsPaid')}</p>
                <p className="text-2xl font-bold text-[#1E1E1E] mt-2">{clientsPaid.toLocaleString()}</p>
                <div className="mt-2">
                  <Link
                    to="/clients?scope=chief&filter=paid"
                    className="text-[#15803D] hover:text-[#166534] underline text-sm transition-colors"
                  >
                    {t('common.view')}
                  </Link>
                </div>
              </div>
              <div className="shrink-0 p-2 rounded-lg bg-green-50 text-[#15803D]">
                <CheckCircle2 className="h-8 w-8" />
              </div>
            </div>
          </div>

          {/* Clients Remaining */}
          <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 border border-amber-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t('chief.cards.clientsRemaining')}</p>
                <p className="text-2xl font-bold text-[#1E1E1E] mt-2">{clientsRemaining.toLocaleString()}</p>
                <div className="mt-2">
                  <Link
                    to="/clients?scope=chief&filter=remaining"
                    className="text-[#D97706] hover:text-[#B45309] underline text-sm transition-colors"
                  >
                    {t('common.view')}
                  </Link>
                </div>
              </div>
              <div className="shrink-0 p-2 rounded-lg bg-amber-50 text-[#D97706]">
                <Hourglass className="h-8 w-8" />
              </div>
            </div>
          </div>

          {/* Today's Payments */}
          <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 border border-green-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t('chief.cards.todayPayments')}</p>
                <p className="text-2xl font-bold text-[#1E1E1E] mt-2">{todayPayments.toLocaleString()}</p>
                <p className="text-sm text-gray-500 mt-1">{t('chief.cards.todayPaymentsDesc')}</p>
                <div className="mt-2">
                  <Link
                    to="/payments?scope=chief&filter=today"
                    className="text-[#15803D] hover:text-[#166534] underline text-sm transition-colors"
                  >
                    {t('common.view')}
                  </Link>
                </div>
              </div>
              <div className="shrink-0 p-2 rounded-lg bg-green-50 text-[#15803D]">
                <CalendarDays className="h-8 w-8" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChiefDashboard;
