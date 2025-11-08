import { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useI18n } from 'src/lib/i18n';

type ZoneOption = { id: string; name: string };
type UserOption = { id: string; username: string };

const apiBase = import.meta.env.VITE_API_URL as string;

const RegisterSupervisor = () => {
  const { t } = useI18n();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [assignedZones, setAssignedZones] = useState<string[]>([]);
  const [zones, setZones] = useState<ZoneOption[]>([]);
  const [supervisors, setSupervisors] = useState<UserOption[]>([]);
  const [selectedSupervisor, setSelectedSupervisor] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const isReassign = params.get('reassign') === '1';
  const [mode, setMode] = useState<'existing' | 'new'>('existing');

  function toggleZone(zoneId: string) {
    setAssignedZones(prev => (prev.includes(zoneId) ? prev.filter(z => z !== zoneId) : [...prev, zoneId]));
  }

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
          setAssignedZones([String(qZoneId)]);
        }
      })
      .catch(err => console.error('Load zones error:', err));
    // Load supervisors for reassignment
    fetch(`${apiBase}/api/manager/users?role=supervisor`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(async r => {
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || 'Failed to load supervisors');
        const opts: UserOption[] = (data.users || []).map((u: any) => ({ id: String(u.id), username: u.username }));
        setSupervisors(opts);
      })
      .catch(err => console.error('Load supervisors error:', err));
  }, [location.search]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    if (isReassign && mode === 'existing') {
      if (!assignedZones.length) {
        setError('Select a zone to assign.');
        setLoading(false);
        return;
      }
      if (!selectedSupervisor) {
        setError('Select a supervisor to assign.');
        setLoading(false);
        return;
      }
      const token = localStorage.getItem('token');
      if (!token) {
        setError('You must be logged in as manager to reassign a supervisor.');
        setLoading(false);
        return;
      }
      // Use the first assigned zone for reassignment (single-zone reassignment UI)
      const zoneId = assignedZones[0];
      fetch(`${apiBase}/api/manager/zones/${zoneId}/reassign-supervisor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ supervisorUserId: Number(selectedSupervisor) })
      })
        .then(async res => {
          const data = await res.json();
          if (!res.ok) throw new Error(data?.error || 'Failed to reassign supervisor');
          setSuccess('Supervisor reassigned successfully.');
        })
        .catch((err: any) => setError(err?.message || 'Failed to reassign supervisor'))
        .finally(() => setLoading(false));
      return;
    }
    if (!firstName.trim() || !lastName.trim() || !username.trim()) {
      setError('First name, last name and username/email are required.');
      setLoading(false);
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setError('You must be logged in as manager to create a supervisor.');
      setLoading(false);
      return;
    }

    // Currently backend accepts only username. We keep assignedZones UI for future extension.
    fetch(`${apiBase}/api/manager/supervisors`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ username })
    })
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Failed to create supervisor');
        setSuccess(`Supervisor created. Temporary password: ${data.tempPassword}`);
        // clear
        setFirstName('');
        setLastName('');
        setUsername('');
        setAssignedZones([]);
      })
      .catch((err: any) => setError(err.message || 'Failed to create supervisor'))
      .finally(() => setLoading(false));
  }

  return (
    <div className="p-6 max-w-2xl">
      {isReassign && params.get('zoneId') && (
        <div className="mb-2">
          <Link to={`/zones/${params.get('zoneId')}`} className="text-amber-600 underline text-sm">← {t('register.common.back')}</Link>
        </div>
      )}
      <h2 className="text-2xl font-bold mb-4">{isReassign ? t('register.supervisor.reassignTitle') : t('register.supervisor.title')}</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-700">{error}</div>}
        {success && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-700">{success}</div>}

        {!(isReassign && mode === 'existing') && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-800">{t('register.common.firstName')}</label>
              <input className="mt-1 block w-full rounded-md border" style={{ borderColor: '#E5E7EB' }} value={firstName} onChange={e => setFirstName(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-800">{t('register.common.lastName')}</label>
              <input className="mt-1 block w-full rounded-md border" style={{ borderColor: '#E5E7EB' }} value={lastName} onChange={e => setLastName(e.target.value)} required />
            </div>
          </div>
        )}

        {!isReassign && (
          <div>
            <label className="block text-sm font-medium text-neutral-800">{t('register.common.usernameOrEmail')}</label>
            <input className="mt-1 block w-full rounded-md border" style={{ borderColor: '#E5E7EB' }} value={username} onChange={e => setUsername(e.target.value)} required />
          </div>
        )}

        {isReassign && (
          <div className="p-4 border rounded-md">
            <div className="mb-3">
              <label className="inline-flex items-center">
                <input type="radio" name="mode" value="existing" checked={mode === 'existing'} onChange={() => setMode('existing')} className="mr-2" />
                <span>{'Assign to an existing supervisor'}</span>
              </label>
              <label className="inline-flex items-center ml-6">
                <input type="radio" name="mode" value="new" checked={mode === 'new'} onChange={() => setMode('new')} className="mr-2" />
                <span>{'Create a new supervisor'}</span>
              </label>
            </div>
            {mode === 'existing' ? (
              <div>
                <label className="block text-sm font-medium text-neutral-800">{t('register.vehicle.selectDriver').replace('Driver','Supervisor')}</label>
                <select value={selectedSupervisor} onChange={e => setSelectedSupervisor(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                  <option value="">-- Select supervisor --</option>
                  {supervisors.map(s => <option key={s.id} value={s.id}>{s.username}</option>)}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-neutral-800">{t('register.common.usernameOrEmail')}</label>
                <input className="mt-1 block w-full rounded-md border" style={{ borderColor: '#E5E7EB' }} value={username} onChange={e => setUsername(e.target.value)} />
              </div>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-neutral-800">{t('register.supervisor.assignZonesOptional')}</label>
          <div className="mt-2 space-y-2">
            {zones.map(z => (
              <label key={z.id} className="flex items-center space-x-2">
                <input type="checkbox" checked={assignedZones.includes(z.id)} onChange={() => toggleZone(z.id)} />
                <span>{z.name}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <button type="submit" disabled={loading} className={`px-4 py-2 text-white rounded-md ${loading ? 'bg-amber-400' : 'bg-amber-600 hover:bg-amber-700'}`}>{loading ? '…' : t('register.supervisor.button')}</button>
        </div>
      </form>
    </div>
  );
};

export default RegisterSupervisor;
