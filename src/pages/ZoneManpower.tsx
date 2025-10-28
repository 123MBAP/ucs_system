import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

const apiBase = 'http://localhost:4000';

type Mp = { id: number; username: string };
type ZoneOpt = { id: string; name: string };

type ZoneDetail = { id: number; zone_name: string };

const ZoneManpower = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [zone, setZone] = useState<ZoneDetail | null>(null);
  const [rows, setRows] = useState<Mp[]>([]);
  const [zones, setZones] = useState<ZoneOpt[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [targetZone, setTargetZone] = useState('');

  function load() {
    const token = localStorage.getItem('token');
    if (!token || !id) return;
    setLoading(true);
    setError(null);
    Promise.all([
      fetch(`${apiBase}/api/zones/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${apiBase}/api/manager/manpower/by-zone/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${apiBase}/api/zones`, { headers: { Authorization: `Bearer ${token}` } })
    ])
      .then(async ([zr, mr, allz]) => {
        const zdata = await zr.json();
        const mdata = await mr.json();
        const zlist = await allz.json();
        if (!zr.ok) throw new Error(zdata?.error || 'Failed to load zone');
        if (!mr.ok) throw new Error(mdata?.error || 'Failed to load manpower');
        if (!allz.ok) throw new Error(zlist?.error || 'Failed to load zones');
        setZone({ id: zdata.zone.id, zone_name: zdata.zone.zone_name });
        setRows(Array.isArray(mdata.manpower) ? mdata.manpower : []);
        setZones((zlist.zones || []).map((z: any) => ({ id: String(z.id), name: z.zone_name })));
      })
      .catch((e: any) => setError(e?.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function toggleSelectMode() {
    setSelectMode(v => !v);
    setSelectedIds([]);
  }
  function toggleSelected(userId: number) {
    setSelectedIds(prev => (prev.includes(userId) ? prev.filter(x => x !== userId) : [...prev, userId]));
  }

  function moveSelected() {
    const token = localStorage.getItem('token');
    if (!token || !selectedIds.length || !targetZone) return;
    Promise.all(
      selectedIds.map(uid => fetch(`${apiBase}/api/manager/manpower/${uid}/zone`, {
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
        setSelectMode(false);
        load();
      })
      .catch((e: any) => setError(e?.message || 'Failed to move manpower'));
  }

  function unassignSelected() {
    const token = localStorage.getItem('token');
    if (!token || !selectedIds.length) return;
    const ok = window.confirm(`Unassign ${selectedIds.length} selected manpower from any zone?`);
    if (!ok) return;
    Promise.all(
      selectedIds.map(uid => fetch(`${apiBase}/api/manager/manpower/${uid}/zone`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      }))
    )
      .then(async resps => {
        const bad = await Promise.all(resps.map(async r => (r.ok ? null : (await r.json())?.error || 'error')));
        const firstErr = bad.find(b => b);
        if (firstErr) throw new Error(firstErr);
        setSelectedIds([]);
        setSelectMode(false);
        load();
      })
      .catch((e: any) => setError(e?.message || 'Failed to unassign manpower'));
  }

  return (
    <div className="p-6">
      <div className="mb-2 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="text-blue-600 underline text-sm">← Back</button>
        {id && (
          <Link to={`/register-manpower?zoneId=${id}`} className="text-blue-600 underline text-sm">Add Manpower</Link>
        )}
      </div>
      <h2 className="text-2xl font-bold mb-4">Manpower in {zone ? zone.zone_name : 'Zone'}</h2>
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
                <button disabled={!selectedIds.length} onClick={unassignSelected} className="px-3 py-1 bg-red-600 text-white rounded text-sm disabled:opacity-50">Unassign</button>
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
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rows.map(r => (
                  <tr key={r.id}>
                    {selectMode && (
                      <td className="px-3 py-2">
                        <input type="checkbox" checked={selectedIds.includes(r.id)} onChange={() => toggleSelected(r.id)} />
                      </td>
                    )}
                    <td className="px-3 py-2">{r.username}</td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr>
                    <td className="px-3 py-4 text-gray-600" colSpan={selectMode ? 2 : 1}>No manpower in this zone.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default ZoneManpower;
