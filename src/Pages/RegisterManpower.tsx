import { useEffect, useState } from 'react';
import { useI18n } from 'src/lib/i18n';
import { useLocation } from 'react-router-dom';

type VehicleOption = { id: string; plate: string };
type SupervisorOption = { id: string; username: string };

const apiBase = import.meta.env.VITE_API_URL as string;

const RegisterManpower = () => {
  const { t } = useI18n();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [salary, setSalary] = useState('');

  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');
  const [supervisors, setSupervisors] = useState<SupervisorOption[]>([]);
  const [selectedSupervisor, setSelectedSupervisor] = useState<string>('');
  const location = useLocation();

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    Promise.all([
      fetch(`${apiBase}/api/manager/vehicles`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${apiBase}/api/manager/users?role=supervisor`, { headers: { Authorization: `Bearer ${token}` } })
    ])
      .then(async ([vr, sr]) => {
        const vdata = await vr.json();
        const sdata = await sr.json();
        if (!vr.ok) throw new Error(vdata?.error || 'Failed to load vehicles');
        if (!sr.ok) throw new Error(sdata?.error || 'Failed to load supervisors');
        const vopts: VehicleOption[] = (vdata.vehicles || []).map((v: any) => ({ id: String(v.id), plate: String(v.plate) }));
        const sopts: SupervisorOption[] = (sdata.users || []).map((u: any) => ({ id: String(u.id), username: String(u.username) }));
        setVehicles(vopts);
        setSupervisors(sopts);
      })
      .catch(err => console.error('Load vehicles/supervisors error:', err));
  }, [location.search]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    if (!firstName.trim() || !lastName.trim() || !username.trim() || !salary.trim()) {
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

    const payload: any = {
      firstName,
      lastName,
      username,
      salary: salaryNum,
    };
    if (!selectedVehicle) {
      setError('Please select a vehicle to assign.');
      setLoading(false);
      return;
    }
    payload.vehicleId = Number(selectedVehicle);
    if (selectedSupervisor) {
      payload.supervisorUserId = Number(selectedSupervisor);
    }

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
        setSelectedVehicle('');
        setSelectedSupervisor('');
      })
      .catch((err: any) => setError(err?.message || 'Failed to register manpower'))
      .finally(() => setLoading(false));
  }

  return (
    <div className="p-6 max-w-2xl">
      <h2 className="text-2xl font-bold mb-4">{t('register.manpower.title')}</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>}
        {success && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-700">{success}</div>}

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

        <div>
          <label className="block text-sm font-medium text-neutral-800">{t('register.common.username')}</label>
          <input className="mt-1 block w-full rounded-md border" style={{ borderColor: '#E5E7EB' }} value={username} onChange={e => setUsername(e.target.value)} required />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-800">{t('register.common.salary')}</label>
          <input type="number" min="0" step="0.01" className="mt-1 block w-full rounded-md border" style={{ borderColor: '#E5E7EB' }} value={salary} onChange={e => setSalary(e.target.value)} required />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-800">{t('register.common.assignVehicle')}</label>
          <select value={selectedVehicle} onChange={e => setSelectedVehicle(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
            <option value="">{t('register.common.selectVehicle')}</option>
            {vehicles.map(v => (
              <option key={v.id} value={v.id}>{v.plate}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-800">{t('register.manpower.assignSupervisorOptional')}</label>
          <select value={selectedSupervisor} onChange={e => setSelectedSupervisor(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
            <option value="">{t('register.common.selectSupervisor')}</option>
            {supervisors.map(s => (
              <option key={s.id} value={s.id}>{s.username}</option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">{t('register.manpower.hintUseVehicleSupervisor')}</p>
        </div>

        <div>
          <button type="submit" disabled={loading} className={`px-4 py-2 text-white rounded-md ${loading ? 'bg-amber-400' : 'bg-amber-600 hover:bg-amber-700'}`}>{loading ? '…' : t('register.manpower.button')}</button>
        </div>
      </form>
    </div>
  );
};

export default RegisterManpower;
