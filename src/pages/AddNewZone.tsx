import { useState } from 'react';

type ChiefOption = { id: string; name: string };

const mockChiefs: ChiefOption[] = [
  { id: 'c1', name: 'Chief A' },
  { id: 'c2', name: 'Chief B' },
  { id: 'c3', name: 'Chief C' },
];

const AddNewZone = () => {
  const [zoneName, setZoneName] = useState('');
  const [cell, setCell] = useState('');
  const [village, setVillage] = useState('');
  const [description, setDescription] = useState('');
  const [assignedChief, setAssignedChief] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!zoneName.trim() || !cell.trim() || !village.trim() || !description.trim()) {
      setError('All fields except chief assignment are required.');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setError('You must be logged in to create a zone.');
      return;
    }

    const chiefId = assignedChief && /^\d+$/.test(assignedChief) ? Number(assignedChief) : null;

    const payload = {
      zoneName,
      cell,
      village,
      description,
      assignedChief: chiefId,
    };

    try {
      setLoading(true);
      const res = await fetch('http://localhost:4000/api/zones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to create zone');
      }
      setSuccess('Zone created successfully.');
      setZoneName('');
      setCell('');
      setVillage('');
      setDescription('');
      setAssignedChief(null);
    } catch (err: any) {
      setError(err.message || 'Failed to create zone');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-3xl">
      <h2 className="text-2xl font-bold mb-4">Create a new one</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="text-red-600">{error}</div>}
        {success && <div className="text-green-600">{success}</div>}

        <div>
          <label className="block text-sm font-medium text-gray-700">Zone Name</label>
          <input
            value={zoneName}
            onChange={e => setZoneName(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Cell</label>
            <input
              value={cell}
              onChange={e => setCell(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Village</label>
            <input
              value={village}
              onChange={e => setVillage(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Location Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            rows={4}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Assign Chief (optional)</label>
          <select
            value={assignedChief ?? ''}
            onChange={e => setAssignedChief(e.target.value || null)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          >
            <option value="">-- None --</option>
            {mockChiefs.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="pt-4">
          <button type="submit" disabled={loading} className={`px-4 py-2 text-white rounded-md ${loading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'}`}>{loading ? 'Creating…' : 'Create Zone'}</button>
        </div>
      </form>
    </div>
  );
};

export default AddNewZone;
