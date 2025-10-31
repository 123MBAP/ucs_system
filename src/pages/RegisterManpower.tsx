import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

type ZoneOption = { id: string; name: string };

const apiBase = import.meta.env.VITE_API_URL as string;

const RegisterManpower = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [salary, setSalary] = useState('');

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

    if (!firstName.trim() || !lastName.trim() || !username.trim() || !salary.trim() || !selectedZone) {
      setError('All fields are required.');
      setLoading(false);
      return;
    }

    const salaryNum = Number(salary);
    if (Number.isNaN(salaryNum) || salaryNum < 0) {
      setError('Salary must be a non-negative number.');
      setLoading(false);
      return;
    }

    const payload = {
      firstName,
      lastName,
      username,
      salary: salaryNum,
      zoneId: selectedZone
    };

    const token = localStorage.getItem('token');
    if (!token) {
      setError('You must be logged in as manager to register manpower.');
      setLoading(false);
      return;
    }

    fetch(`${apiBase}/api/manager/manpower`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    })
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Failed to register manpower');
        setSuccess(`Manpower created. Temporary password: ${data?.tempPassword || ''}`.trim());
        setFirstName('');
        setLastName('');
        setUsername('');
        setSalary('');
        setSelectedZone('');
      })
      .catch((err: any) => setError(err?.message || 'Failed to register manpower'))
      .finally(() => setLoading(false));
  }

  return (
    <div className="p-6 max-w-2xl">
      <h2 className="text-2xl font-bold mb-4">Register Manpower</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="text-red-600">{error}</div>}
        {success && <div className="text-green-600">{success}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">First Name</label>
            <input className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" value={firstName} onChange={e => setFirstName(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Last Name</label>
            <input className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" value={lastName} onChange={e => setLastName(e.target.value)} required />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Username</label>
          <input className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" value={username} onChange={e => setUsername(e.target.value)} required />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Salary</label>
          <input type="number" min="0" step="0.01" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" value={salary} onChange={e => setSalary(e.target.value)} required />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Assign Zone</label>
          <select value={selectedZone} onChange={e => setSelectedZone(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required>
            <option value="">-- Select zone --</option>
            {zones.map(z => (
              <option key={z.id} value={z.id}>{z.name}</option>
            ))}
          </select>
        </div>

        <div>
          <button type="submit" disabled={loading} className={`px-4 py-2 text-white rounded-md ${loading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'}`}>{loading ? 'Registering…' : 'Register Manpower'}</button>
        </div>
      </form>
    </div>
  );
};

export default RegisterManpower;
