import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const apiBase = 'http://localhost:4000';

const RegisterVehicle = () => {
  const navigate = useNavigate();
  const [plate, setPlate] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [assignDriver, setAssignDriver] = useState(false);
  const [assignMode, setAssignMode] = useState<'existing'|'new'>('existing');
  const [drivers, setDrivers] = useState<{ id: string; username: string }[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [newDriverFirst, setNewDriverFirst] = useState('');
  const [newDriverLast, setNewDriverLast] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(`${apiBase}/api/manager/users?role=driver`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async r => {
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || 'Failed to load drivers');
        setDrivers((data.users || []).map((u: any) => ({ id: String(u.id), username: u.username })));
      })
      .catch(() => {})
  }, []);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!plate.trim()) {
      setError('Plate is required');
      return;
    }
    const token = localStorage.getItem('token');
    if (!token) {
      setError('You must be logged in as manager to register vehicles.');
      return;
    }
    setLoading(true);
    fetch(`${apiBase}/api/manager/vehicles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ plate: plate.trim(), make: make || undefined, model: model || undefined })
    })
      .then(async r => {
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || 'Failed to register vehicle');
        const vehicleId = data.vehicle.id;

        // optionally assign driver
        if (assignDriver) {
          if (assignMode === 'existing') {
            if (!selectedDriverId) throw new Error('Please select a driver to assign');
            const res = await fetch(`${apiBase}/api/manager/drivers/${selectedDriverId}/vehicle`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ vehicleId })
            });
            const rd = await res.json();
            if (!res.ok) throw new Error(rd?.error || 'Failed to assign vehicle to driver');
          } else {
            if (!newDriverFirst.trim() || !newDriverLast.trim()) throw new Error('Driver first and last name are required');
            // create driver then assign
            const cd = await fetch(`${apiBase}/api/manager/drivers`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ firstName: newDriverFirst.trim(), lastName: newDriverLast.trim() })
            });
            const cjson = await cd.json();
            if (!cd.ok) throw new Error(cjson?.error || 'Failed to create driver');
            const driverId = cjson?.driver?.id;
            if (!driverId) throw new Error('Driver created but id missing');
            const ad = await fetch(`${apiBase}/api/manager/drivers/${driverId}/vehicle`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ vehicleId })
            });
            const adj = await ad.json();
            if (!ad.ok) throw new Error(adj?.error || 'Failed to assign vehicle to new driver');
          }
        }

        setSuccess(`Vehicle ${data.vehicle.plate} created${assignDriver ? ' and assigned' : ''}.`);
        setPlate('');
        setMake('');
        setModel('');
        setAssignDriver(false);
        setAssignMode('existing');
        setSelectedDriverId('');
        setNewDriverFirst('');
        setNewDriverLast('');
      })
      .catch((e: any) => setError(e?.message || 'Failed to register vehicle'))
      .finally(() => setLoading(false));
  }

  return (
    <div className="p-6 max-w-xl">
      <div className="mb-2">
        <button onClick={() => navigate(-1)} className="text-blue-600 underline text-sm">← Back</button>
      </div>
      <h2 className="text-2xl font-bold mb-4">Register Vehicle</h2>
      {error && <div className="text-red-600 mb-2">{error}</div>}
      {success && <div className="text-green-600 mb-2">{success}</div>}
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-700">Plate</label>
          <input className="mt-1 w-full border rounded px-3 py-2" value={plate} onChange={e => setPlate(e.target.value)} required />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-700">Make</label>
            <input className="mt-1 w-full border rounded px-3 py-2" value={make} onChange={e => setMake(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm text-gray-700">Model</label>
            <input className="mt-1 w-full border rounded px-3 py-2" value={model} onChange={e => setModel(e.target.value)} />
          </div>
        </div>

        <div className="pt-2">
          <label className="inline-flex items-center">
            <input type="checkbox" className="mr-2" checked={assignDriver} onChange={e => setAssignDriver(e.target.checked)} />
            <span>Assign Driver (optional)</span>
          </label>
        </div>

        {assignDriver && (
          <div className="p-4 border rounded">
            <div className="space-x-4 mb-3">
              <label className="inline-flex items-center">
                <input type="radio" name="assignMode" value="existing" checked={assignMode==='existing'} onChange={() => setAssignMode('existing')} className="mr-2" />
                <span>Assign to existing driver</span>
              </label>
              <label className="inline-flex items-center ml-4">
                <input type="radio" name="assignMode" value="new" checked={assignMode==='new'} onChange={() => setAssignMode('new')} className="mr-2" />
                <span>Create new driver</span>
              </label>
            </div>

            {assignMode === 'existing' ? (
              <div>
                <label className="block text-sm text-gray-700">Select Driver</label>
                <select value={selectedDriverId} onChange={e => setSelectedDriverId(e.target.value)} className="mt-1 w-full border rounded px-2 py-2">
                  <option value="">-- Select driver --</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>{d.username}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700">Driver First Name</label>
                  <input className="mt-1 w-full border rounded px-3 py-2" value={newDriverFirst} onChange={e => setNewDriverFirst(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm text-gray-700">Driver Last Name</label>
                  <input className="mt-1 w-full border rounded px-3 py-2" value={newDriverLast} onChange={e => setNewDriverLast(e.target.value)} />
                </div>
              </div>
            )}
          </div>
        )}

        <button type="submit" disabled={loading} className={`px-4 py-2 text-white rounded ${loading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'}`}>{loading ? 'Saving…' : 'Save Vehicle'}</button>
      </form>
    </div>
  );
};

export default RegisterVehicle;
