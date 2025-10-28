import { useEffect, useState } from 'react';

type ZoneOption = { id: string; name: string };
type VehicleOption = { id: string; plate: string };

const apiBase = 'http://localhost:4000';

const RegisterDriver = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');

  const [assignVehicle, setAssignVehicle] = useState(false);
  const [assignVehicleMode, setAssignVehicleMode] = useState<'existing' | 'new'>('existing');
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [newVehiclePlate, setNewVehiclePlate] = useState('');

  const [assignedZones, setAssignedZones] = useState<string[]>([]);
  const [zones, setZones] = useState<ZoneOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      })
      .catch(err => console.error('Load zones error:', err));
    // Load vehicles for assignment
    fetch(`${apiBase}/api/manager/vehicles`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(async r => {
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || 'Failed to load vehicles');
        const vopts: VehicleOption[] = (data.vehicles || []).map((v: any) => ({ id: String(v.id), plate: v.plate }));
        setVehicles(vopts);
      })
      .catch(err => console.error('Load vehicles error:', err));
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    if (!firstName.trim() || !lastName.trim() || !username.trim()) {
      setError('First name, last name and username/email are required.');
      setLoading(false);
      return;
    }

    const payload = { firstName, lastName, username };
    const token = localStorage.getItem('token');
    if (!token) {
      setError('You must be logged in as manager to create a driver.');
      setLoading(false);
      return;
    }
    fetch(`${apiBase}/api/manager/drivers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    })
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Failed to create driver');
        const driverId = data?.driver?.id;
        if (!driverId) throw new Error('Driver created but id missing');

        // Optional vehicle assignment
        if (assignVehicle) {
          if (assignVehicleMode === 'existing') {
            if (!selectedVehicle) throw new Error('Please select a vehicle to assign.');
            const rv = await fetch(`${apiBase}/api/manager/drivers/${driverId}/vehicle`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ vehicleId: Number(selectedVehicle) })
            });
            const rvj = await rv.json();
            if (!rv.ok) throw new Error(rvj?.error || 'Failed to assign vehicle');
          } else {
            if (!newVehiclePlate.trim()) throw new Error('Please provide the new vehicle plate');
            const ins = await fetch(`${apiBase}/api/manager/vehicles`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ plate: newVehiclePlate.trim() })
            });
            const vin = await ins.json();
            if (!ins.ok) throw new Error(vin?.error || 'Failed to create vehicle');
            const vid = vin?.vehicle?.id;
            if (!vid) throw new Error('Vehicle created but id missing');
            const rv2 = await fetch(`${apiBase}/api/manager/drivers/${driverId}/vehicle`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ vehicleId: vid })
            });
            const rv2j = await rv2.json();
            if (!rv2.ok) throw new Error(rv2j?.error || 'Failed to assign new vehicle');
          }
        }

        // Optional zones assignment
        if (assignedZones.length) {
          const rz = await fetch(`${apiBase}/api/manager/drivers/${driverId}/zones`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ zoneIds: assignedZones.map(z => Number(z)) })
          });
          const rzj = await rz.json();
          if (!rz.ok) throw new Error(rzj?.error || 'Failed to set driver zones');
        }

        setSuccess(`Driver created. Temporary password: ${data.tempPassword}`);
        // reset
        setFirstName(''); setLastName(''); setUsername('');
        setAssignVehicle(false); setAssignVehicleMode('existing'); setSelectedVehicle(null); setNewVehiclePlate('');
        setAssignedZones([]);
      })
      .catch((err: any) => setError(err.message || 'Failed to create driver'))
      .finally(() => setLoading(false));
  }

  return (
    <div className="p-6 max-w-2xl">
      <h2 className="text-2xl font-bold mb-4">Register Driver</h2>

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
          <label className="block text-sm font-medium text-gray-700">Username or Email</label>
          <input className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" value={username} onChange={e => setUsername(e.target.value)} required />
        </div>

        <div className="pt-2">
          <label className="inline-flex items-center">
            <input type="checkbox" checked={assignVehicle} onChange={e => setAssignVehicle(e.target.checked)} className="mr-2" />
            <span>Assign Vehicle (optional)</span>
          </label>
        </div>

        {assignVehicle && (
          <div className="p-4 border rounded-md">
            <div className="space-x-4 mb-3">
              <label className="inline-flex items-center">
                <input type="radio" name="vehicleMode" value="existing" checked={assignVehicleMode === 'existing'} onChange={() => setAssignVehicleMode('existing')} className="mr-2" />
                <span>Assign existing vehicle</span>
              </label>
              <label className="inline-flex items-center ml-4">
                <input type="radio" name="vehicleMode" value="new" checked={assignVehicleMode === 'new'} onChange={() => setAssignVehicleMode('new')} className="mr-2" />
                <span>Assign new vehicle</span>
              </label>
            </div>

            {assignVehicleMode === 'existing' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700">Select Vehicle</label>
                <select value={selectedVehicle ?? ''} onChange={e => setSelectedVehicle(e.target.value || null)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                  <option value="">-- Select vehicle --</option>
                  {vehicles.map(v => <option key={v.id} value={v.id}>{v.plate}</option>)}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700">New Vehicle Plate</label>
                <input className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" value={newVehiclePlate} onChange={e => setNewVehiclePlate(e.target.value)} />
              </div>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700">Assign Zones (optional)</label>
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
          <button type="submit" disabled={loading} className={`px-4 py-2 text-white rounded-md ${loading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'}`}>{loading ? 'Creating…' : 'Create Driver'}</button>
        </div>
      </form>
    </div>
  );
};

export default RegisterDriver;
