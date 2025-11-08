import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useI18n } from 'src/lib/i18n';

type ZoneOption = { id: string; name: string };

const apiBase = import.meta.env.VITE_API_URL as string;

const RegisterClient = () => {
  const { t } = useI18n();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [monthlyAmount, setMonthlyAmount] = useState('');

  const [zones, setZones] = useState<ZoneOption[]>([]);
  const [selectedZone, setSelectedZone] = useState<string>('');
  const location = useLocation();

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(`${apiBase}/api/zones`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(async r => {
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || 'Failed to load zones');
        const opts: ZoneOption[] = (data.zones || []).map((z: any) => ({ id: String(z.id), name: z.zone_name }));
        setZones(opts);
        const params = new URLSearchParams(location.search);
        const qZoneId = params.get('zoneId');
        if (qZoneId && opts.some(o => o.id === String(qZoneId))) {
          setSelectedZone(String(qZoneId));
        }
      })
      .catch(err => console.error('Load zones error:', err));
  }, [location.search]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    if (!firstName.trim() || !lastName.trim() || !username.trim() || !phone.trim() || !selectedZone || !monthlyAmount.trim()) {
      setError('All fields are required.');
      setLoading(false);
      return;
    }

    const amount = Number(monthlyAmount);
    if (Number.isNaN(amount) || amount <= 0) {
      setError('Monthly amount must be a positive number.');
      setLoading(false);
      return;
    }

    const payload = {
      firstName,
      lastName,
      username,
      phone,
      zoneId: selectedZone,
      monthlyAmount: amount
    };

    const token = localStorage.getItem('token');
    if (!token) {
      setError('You must be logged in as manager or supervisor to register a client.');
      setLoading(false);
      return;
    }

    fetch(`${apiBase}/api/clients`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    })
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Failed to register client');
        setSuccess(`Client registered with id ${data?.client?.id || ''}`.trim());
        setFirstName('');
        setLastName('');
        setUsername('');
        setPhone('');
        setMonthlyAmount('');
        setSelectedZone('');
      })
      .catch((err: any) => setError(err?.message || 'Failed to register client'))
      .finally(() => setLoading(false));
  }

  return (
    <div className="max-w-2xl space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-500 to-amber-600 bg-clip-text text-transparent">{t('register.client.title')}</h1>
        <p className="text-neutral-600 mt-1">{t('register.client.subtitle')}</p>
      </div>

      <div className="rounded-2xl shadow-sm border p-6 bg-white" style={{ borderColor: '#E5E7EB' }}>
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>
          )}
          {success && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-700">{success}</div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-800 mb-1">{t('register.common.firstName')}</label>
              <input className="w-full px-3 py-2 bg-white border rounded-lg focus:outline-none focus:ring-2" style={{ borderColor: '#E5E7EB' }} value={firstName} onChange={e => setFirstName(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-800 mb-1">{t('register.common.lastName')}</label>
              <input className="w-full px-3 py-2 bg-white border rounded-lg focus:outline-none focus:ring-2" style={{ borderColor: '#E5E7EB' }} value={lastName} onChange={e => setLastName(e.target.value)} required />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-800 mb-1">{t('register.common.usernameOrEmail')}</label>
            <input className="w-full px-3 py-2 bg-white border rounded-lg focus:outline-none focus:ring-2" style={{ borderColor: '#E5E7EB' }} value={username} onChange={e => setUsername(e.target.value)} required />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-800 mb-1">{t('register.common.phoneNumber')}</label>
            <input className="w-full px-3 py-2 bg-white border rounded-lg focus:outline-none focus:ring-2" style={{ borderColor: '#E5E7EB' }} value={phone} onChange={e => setPhone(e.target.value)} required />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-800 mb-1">{t('register.common.assignZone')}</label>
            <select value={selectedZone} onChange={e => setSelectedZone(e.target.value)} className="w-full px-3 py-2 bg-white border rounded-lg focus:outline-none focus:ring-2" style={{ borderColor: '#E5E7EB' }} required>
              <option value="">{t('register.common.selectZone')}</option>
              {zones.map(z => (
                <option key={z.id} value={z.id}>{z.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-800 mb-1">{t('register.client.amountPerMonth')}</label>
            <input type="number" min="0" step="0.01" className="w-full px-3 py-2 bg-white border rounded-lg focus:outline-none focus:ring-2" style={{ borderColor: '#E5E7EB' }} value={monthlyAmount} onChange={e => setMonthlyAmount(e.target.value)} required />
          </div>

          <div className="pt-2">
            <button type="submit" disabled={loading} className={`inline-flex items-center justify-center px-5 py-2.5 rounded-lg font-semibold text-white shadow-sm transition-colors ${loading ? 'bg-amber-400 cursor-not-allowed' : 'bg-amber-600 hover:bg-amber-700'}`}>
              {loading ? '…' : t('register.client.button')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterClient;
