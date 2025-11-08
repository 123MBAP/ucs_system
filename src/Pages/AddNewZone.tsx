import { useState } from 'react';
import { useI18n } from 'src/lib/i18n';

type ChiefOption = { id: string; name: string };

const mockChiefs: ChiefOption[] = [
  { id: 'c1', name: 'Chief A' },
  { id: 'c2', name: 'Chief B' },
  { id: 'c3', name: 'Chief C' },
];

const AddNewZone = () => {
  const { t } = useI18n();
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
      const apiBase = import.meta.env.VITE_API_URL as string;
      const res = await fetch(`${apiBase}/api/zones`, {
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
      <h2 className="text-2xl font-bold mb-4">{t('sidebar.addNewZone')}</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="text-red-600">{error}</div>}
        {success && <div className="text-green-600">{success}</div>}

        <div>
          <label className="block text-sm font-medium text-neutral-800">{t('register.chief.zoneName')}</label>
          <input
            value={zoneName}
            onChange={e => setZoneName(e.target.value)}
            className="mt-1 block w-full rounded-md border"
            style={{ borderColor: '#E5E7EB' }}
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-800">{t('register.chief.cell')}</label>
            <input
              value={cell}
              onChange={e => setCell(e.target.value)}
              className="mt-1 block w-full rounded-md border"
              style={{ borderColor: '#E5E7EB' }}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-800">{t('register.chief.village')}</label>
            <input
              value={village}
              onChange={e => setVillage(e.target.value)}
              className="mt-1 block w-full rounded-md border"
              style={{ borderColor: '#E5E7EB' }}
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-800">{t('register.chief.locationDescription')}</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="mt-1 block w-full rounded-md border"
            style={{ borderColor: '#E5E7EB' }}
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
          <button type="submit" disabled={loading} className={`px-4 py-2 text-white rounded-md ${loading ? 'bg-amber-400' : 'bg-amber-600 hover:bg-amber-700'}`}>{loading ? '…' : t('register.common.save')}</button>
        </div>
      </form>
    </div>
  );
};

export default AddNewZone;
