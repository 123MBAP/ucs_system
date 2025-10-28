import { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';

type ZoneOption = { id: string; name: string };
type UserOption = { id: string; username: string };

const apiBase = 'http://localhost:4000';

const RegisterChiefOfZone = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');

  const [assignZone, setAssignZone] = useState(false);
  const [assignMode, setAssignMode] = useState<'existing' | 'new'>('existing');
  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [zones, setZones] = useState<ZoneOption[]>([]);
  const [chiefs, setChiefs] = useState<UserOption[]>([]);
  const [selectedChief, setSelectedChief] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  // New zone fields (if creating inline)
  const [newZoneName, setNewZoneName] = useState('');
  const [newCell, setNewCell] = useState('');
  const [newVillage, setNewVillage] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const [error, setError] = useState<string | null>(null);
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const isReassign = params.get('reassign') === '1';
  const zoneParam = params.get('zoneId');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    // Load zones
    fetch(`${apiBase}/api/zones`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(async r => {
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || 'Failed to load zones');
        const opts: ZoneOption[] = (data.zones || []).map((z: any) => ({ id: String(z.id), name: z.zone_name }));
        setZones(opts);
        const qZoneId = zoneParam;
        if (qZoneId && opts.some(o => o.id === String(qZoneId))) {
          setAssignZone(true);
          setAssignMode('existing');
          setSelectedZone(String(qZoneId));
        }
      })
      .catch(err => {
        console.error('Load zones error:', err);
      });
    // Load chiefs list for reassign
    fetch(`${apiBase}/api/manager/users?role=chief`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(async r => {
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || 'Failed to load chiefs');
        const opts: UserOption[] = (data.users || []).map((u: any) => ({ id: String(u.id), username: u.username }));
        setChiefs(opts);
      })
      .catch(err => console.error('Load chiefs error:', err));
  }, [location.search]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    if (isReassign && mode === 'existing') {
      // Reassign existing chief to the provided zone
      const token = localStorage.getItem('token');
      if (!token) {
        setError('You must be logged in as manager to reassign a chief.');
        setLoading(false);
        return;
      }
      if (!zoneParam) {
        setError('Missing zoneId to reassign.');
        setLoading(false);
        return;
      }
      if (!selectedChief) {
        setError('Select a chief to assign.');
        setLoading(false);
        return;
      }
      fetch(`${apiBase}/api/manager/zones/${zoneParam}/reassign-chief`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ chiefUserId: Number(selectedChief) })
      })
        .then(async res => {
          const data = await res.json();
          if (!res.ok) throw new Error(data?.error || 'Failed to reassign chief');
          setSuccess('Chief reassigned successfully.');
        })
        .catch((err: any) => setError(err.message || 'Failed to reassign chief'))
        .finally(() => setLoading(false));
      return;
    }

    if (!firstName.trim() || !lastName.trim() || !username.trim()) {
      setError('First name, last name, and username/email are required.');
      setLoading(false);
      return;
    }

    let assigned: any = null;
    if (assignZone) {
      if (assignMode === 'existing') {
        if (!selectedZone) {
          setError('Please select an existing zone to assign.');
          setLoading(false);
          return;
        }
        assigned = { type: 'existing', zoneId: selectedZone };
      } else {
        // new zone - validate fields
        if (!newZoneName.trim() || !newCell.trim() || !newVillage.trim() || !newDescription.trim()) {
          setError('All new zone fields are required when creating a new zone.');
          setLoading(false);
          return;
        }
        assigned = {
          type: 'new',
          zone: { name: newZoneName, cell: newCell, village: newVillage, description: newDescription }
        };
      }
    }

    const payload = { username, assigned };
    const token = localStorage.getItem('token');
    if (!token) {
      setError('You must be logged in as manager to create a chief.');
      setLoading(false);
      return;
    }
    fetch(`${apiBase}/api/manager/chiefs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    })
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Failed to create chief');
        setSuccess(`Chief created. Temporary password: ${data.tempPassword}`);
        // reset
        setFirstName(''); setLastName(''); setUsername('');
        setAssignZone(false); setAssignMode('existing'); setSelectedZone(null);
        setNewZoneName(''); setNewCell(''); setNewVillage(''); setNewDescription('');
      })
      .catch((err: any) => setError(err.message || 'Failed to create chief'))
      .finally(() => setLoading(false));
  }

  return (
    <div className="p-6 max-w-2xl">
      {isReassign && zoneParam && (
        <div className="mb-2">
          <Link to={`/zones/${zoneParam}`} className="text-blue-600 underline text-sm">← Back to Zone</Link>
        </div>
      )}
      <h2 className="text-2xl font-bold mb-4">{isReassign ? 'Reassign Chief of the Zone' : 'Register Chief of Zone'}</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="text-red-600">{error}</div>}
        {success && <div className="text-green-600">{success}</div>}

        {!(isReassign && mode === 'existing') && (
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
        )}

        {!isReassign && (
          <div>
            <label className="block text-sm font-medium text-gray-700">Username or Email</label>
            <input className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" value={username} onChange={e => setUsername(e.target.value)} required />
          </div>
        )}

        {isReassign && (
          <div className="p-4 border rounded-md">
            <div className="mb-3">
              <label className="inline-flex items-center">
                <input type="radio" name="mode" value="existing" checked={mode === 'existing'} onChange={() => setMode('existing')} className="mr-2" />
                <span>Assign to an existing chief</span>
              </label>
              <label className="inline-flex items-center ml-6">
                <input type="radio" name="mode" value="new" checked={mode === 'new'} onChange={() => setMode('new')} className="mr-2" />
                <span>Create a new chief</span>
              </label>
            </div>
            {mode === 'existing' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700">Select Chief</label>
                <select value={selectedChief} onChange={e => setSelectedChief(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                  <option value="">-- Select chief --</option>
                  {chiefs.map(c => <option key={c.id} value={c.id}>{c.username}</option>)}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700">Username or Email</label>
                <input className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" value={username} onChange={e => setUsername(e.target.value)} />
              </div>
            )}
          </div>
        )}

        <div className="pt-2">
          <label className="inline-flex items-center">
            <input type="checkbox" checked={assignZone} onChange={e => setAssignZone(e.target.checked)} className="mr-2" />
            <span>Assign Zone (optional)</span>
          </label>
        </div>

        {assignZone && (
          <div className="p-4 border rounded-md">
            <div className="space-x-4 mb-3">
              <label className="inline-flex items-center">
                <input type="radio" name="assignMode" value="existing" checked={assignMode === 'existing'} onChange={() => setAssignMode('existing')} className="mr-2" />
                <span>Assign to existing zone</span>
              </label>
              <label className="inline-flex items-center ml-4">
                <input type="radio" name="assignMode" value="new" checked={assignMode === 'new'} onChange={() => setAssignMode('new')} className="mr-2" />
                <span>Assign to new zone</span>
              </label>
            </div>

            {assignMode === 'existing' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700">Select Zone</label>
                <select value={selectedZone ?? ''} onChange={e => setSelectedZone(e.target.value || null)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                  <option value="">-- Select zone --</option>
                  {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                </select>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Zone Name</label>
                  <input className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" value={newZoneName} onChange={e => setNewZoneName(e.target.value)} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Cell</label>
                    <input className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" value={newCell} onChange={e => setNewCell(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Village</label>
                    <input className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" value={newVillage} onChange={e => setNewVillage(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Location Description</label>
                  <textarea rows={3} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" value={newDescription} onChange={e => setNewDescription(e.target.value)} />
                </div>
              </div>
            )}
          </div>
        )}

        <div>
          <button type="submit" disabled={loading} className={`px-4 py-2 text-white rounded-md ${loading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'}`}>{loading ? 'Creating…' : 'Create Chief'}</button>
        </div>
      </form>
    </div>
  );
};

export default RegisterChiefOfZone;
