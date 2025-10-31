import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

const apiBase = import.meta.env.VITE_API_URL as string;

type Client = {
  id: number;
  username: string;
  name: { first?: string; last?: string } | null;
  zone_id: number;
  phone_number: string;
  monthly_amount?: number | null;
  created_at: string;
};

type ZoneOpt = { id: string; name: string };

type ZoneDetail = {
  id: number;
  zone_name: string;
};

const ZoneClients = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [zone, setZone] = useState<ZoneDetail | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [zones, setZones] = useState<ZoneOpt[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [targetZone, setTargetZone] = useState<string>('');
  const [selectMode, setSelectMode] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [editId, setEditId] = useState<number | null>(null);
  const [editFirst, setEditFirst] = useState('');
  const [editLast, setEditLast] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editAmount, setEditAmount] = useState<string>('');

  function load() {
    const token = localStorage.getItem('token');
    if (!token || !id) return;
    setLoading(true);
    setError(null);

    Promise.all([
      fetch(`${apiBase}/api/zones/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${apiBase}/api/clients/by-zone/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${apiBase}/api/zones`, { headers: { Authorization: `Bearer ${token}` } })
    ])
      .then(async ([zr, cr, allz]) => {
        const zdata = await zr.json();
        const cdata = await cr.json();
        const zlist = await allz.json();
        if (!zr.ok) throw new Error(zdata?.error || 'Failed to load zone');
        if (!cr.ok) throw new Error(cdata?.error || 'Failed to load clients');
        if (!allz.ok) throw new Error(zlist?.error || 'Failed to load zones');
        setZone({ id: zdata.zone.id, zone_name: zdata.zone.zone_name });
        setClients(Array.isArray(cdata.clients) ? cdata.clients : []);
        setZones((zlist.zones || []).map((z: any) => ({ id: String(z.id), name: z.zone_name })));
      })
      .catch((e: any) => setError(e?.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }

  function openEdit() {
    if (selectedIds.length !== 1) return;
    const id = selectedIds[0];
    const c = clients.find(x => x.id === id);
    if (!c) return;
    setEditId(id);
    setEditFirst(c.name?.first || '');
    setEditLast(c.name?.last || '');
    setEditUsername(c.username || '');
    setEditAmount(
      c.monthly_amount != null ? String(Number(c.monthly_amount).toFixed(2)).replace(/\.00$/, '') : ''
    );
  }

  function cancelEdit() {
    setEditId(null);
  }

  function saveEdit() {
    if (!editId) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    const payload: any = {
      username: editUsername.trim() || undefined,
      firstName: editFirst.trim(),
      lastName: editLast.trim(),
    };
    if (editAmount !== '') payload.monthlyAmount = Number(editAmount);
    fetch(`${apiBase}/api/clients/${editId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload)
    })
      .then(async r => {
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || 'Failed to update client');
        setEditId(null);
        setSelectedIds([]); // uncheck any selected rows after successful edit
        load();
      })
      .catch((e: any) => setError(e?.message || 'Failed to update client'));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // per-row move helpers removed in favor of bulk actions

  function toggleSelectMode() {
    setSelectMode(v => !v);
    setSelectedIds([]);
  }

  function toggleSelected(id: number) {
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  }

  function moveSelected() {
    const token = localStorage.getItem('token');
    if (!token || !targetZone || !selectedIds.length) return;
    Promise.all(
      selectedIds.map(cid => fetch(`${apiBase}/api/clients/${cid}/zone`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ zoneId: Number(targetZone) })
      }))
    )
      .then(async resps => {
        const bad = await Promise.all(resps.map(async r => (r.ok ? null : (await r.json())?.error || 'error')));
        const firstErr = bad.find(b => b);
        if (firstErr) throw new Error(firstErr);
        setSelectedIds([]);
        setTargetZone('');
        load();
      })
      .catch((e: any) => setError(e?.message || 'Failed to move selected'));
  }

  function deleteSelected() {
    const token = localStorage.getItem('token');
    if (!token || !selectedIds.length) return;
    const ok = window.confirm(`Delete ${selectedIds.length} selected client(s)? This cannot be undone.`);
    if (!ok) return;
    Promise.all(
      selectedIds.map(cid => fetch(`${apiBase}/api/clients/${cid}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      }))
    )
      .then(async resps => {
        const bad = await Promise.all(resps.map(async r => (r.ok ? null : (await r.json())?.error || 'error')));
        const firstErr = bad.find(b => b);
        if (firstErr) throw new Error(firstErr);
        setSelectedIds([]);
        load();
      })
      .catch((e: any) => setError(e?.message || 'Failed to delete selected'));
  }

  return (
    <div className="p-6">
      <div className="mb-2 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="text-blue-600 underline text-sm">← Back</button>
        {id && (
          <Link to={`/register-client?zoneId=${id}`} className="text-blue-600 underline text-sm">Add Client</Link>
        )}
      </div>
      <h2 className="text-2xl font-bold mb-4">Clients in {zone ? zone.zone_name : 'Zone'}</h2>
      {error && <div className="text-red-600 mb-3">{error}</div>}
      {loading ? (
        <div>Loading…</div>
      ) : (
        <>
          <div className="mb-3 flex items-center justify-between">
            <button onClick={toggleSelectMode} className="px-3 py-1 border rounded text-sm">{selectMode ? 'Cancel select' : 'Select'}</button>
            {selectMode && (
              <div className="flex items-center gap-2">
                <select value={targetZone} onChange={e => setTargetZone(e.target.value)} className="border rounded px-2 py-1 text-sm">
                  <option value="">-- Move to zone --</option>
                  {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                </select>
                <button disabled={!selectedIds.length || !targetZone} onClick={moveSelected} className="px-3 py-1 bg-blue-600 text-white rounded text-sm disabled:opacity-50">Move</button>
                <button disabled={!selectedIds.length} onClick={deleteSelected} className="px-3 py-1 bg-red-600 text-white rounded text-sm disabled:opacity-50">Delete</button>
                <span className="mx-2 text-gray-300">|</span>
                <button onClick={() => { setSelectMode(false); setSelectedIds([]); }} className="px-3 py-1 border rounded text-sm">Save</button>
                <button onClick={() => { setSelectMode(false); setSelectedIds([]); setTargetZone(''); }} className="px-3 py-1 border rounded text-sm">Cancel</button>
              </div>
            )}
          </div>

          <div className="overflow-x-auto bg-white border rounded shadow">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {selectMode && <th className="px-3 py-2"></th>}
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone Number</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount to Pay</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {clients.map(c => {
                  const fullName = c.name ? `${c.name.first || ''} ${c.name.last || ''}`.trim() : '';
                  return (
                    <tr key={c.id}>
                      {selectMode && (
                        <td className="px-3 py-2">
                          <input type="checkbox" checked={selectedIds.includes(c.id)} onChange={() => toggleSelected(c.id)} />
                        </td>
                      )}
                      <td className="px-3 py-2">{fullName || c.username}</td>
                      <td className="px-3 py-2">{c.username}</td>
                      <td className="px-3 py-2">{c.phone_number}</td>
                      <td className="px-3 py-2">{c.monthly_amount != null ? Number(c.monthly_amount).toLocaleString() : '-'}</td>
                    </tr>
                  );
                })}
                {!clients.length && (
                  <tr>
                    <td className="px-3 py-4 text-gray-600" colSpan={selectMode ? 5 : 4}>No clients in this zone.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {selectMode && selectedIds.length === 1 && (
            <div className="mt-4 p-4 border rounded bg-white shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="font-semibold">Edit selected client</div>
                <div className="flex items-center gap-2">
                  <button onClick={openEdit} className="px-3 py-1 border rounded text-sm">Edit</button>
                </div>
              </div>
              {editId && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-sm text-gray-700">First Name</label>
                    <input className="mt-1 w-full border rounded px-2 py-1" value={editFirst} onChange={e => setEditFirst(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700">Last Name</label>
                    <input className="mt-1 w-full border rounded px-2 py-1" value={editLast} onChange={e => setEditLast(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700">Username</label>
                    <input className="mt-1 w-full border rounded px-2 py-1" value={editUsername} onChange={e => setEditUsername(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700">Amount to Pay</label>
                    <input type="number" step="0.01" className="mt-1 w-full border rounded px-2 py-1" value={editAmount} onChange={e => setEditAmount(e.target.value)} />
                  </div>
                  <div className="md:col-span-4 flex items-center gap-2 mt-2">
                    <button onClick={saveEdit} className="px-3 py-1 bg-blue-600 text-white rounded text-sm">Save</button>
                    <button onClick={cancelEdit} className="px-3 py-1 border rounded text-sm">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ZoneClients;
