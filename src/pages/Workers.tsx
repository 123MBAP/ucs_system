import { useEffect, useMemo, useState } from 'react';
import LoadingSpinner from '@/Components/LoadingSpinner';

const apiBase = import.meta.env.VITE_API_URL as string;

type Supervisor = {
  id: number;
  username: string;
  salary?: number | null;
  zones: Array<{ id: number; name: string }>;
  first_name?: string | null;
  last_name?: string | null;
};

type Chief = {
  id: number;
  username: string;
  zones: Array<{ id: number; name: string }>;
  first_name?: string | null;
  last_name?: string | null;
};

type WorkerWithSalary = {
  id: number;
  username: string;
  salary?: number | null;
  first_name?: string | null;
  last_name?: string | null;
};

type Vehicle = { id: number; plate: string; make?: string | null; model?: string | null; supervisor_id?: number | null };

const Workers = () => {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [chiefs, setChiefs] = useState<Chief[]>([]);
  const [manpower, setManpower] = useState<WorkerWithSalary[]>([]);
  const [drivers, setDrivers] = useState<WorkerWithSalary[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  const [editingSalary, setEditingSalary] = useState<{ userId: number; amount: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(`${apiBase}/api/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async r => {
        const me = await r.json();
        setRole(me?.user?.role ?? null);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || role !== 'manager') return;
    setLoading(true);
    setError(null);
    fetch(`${apiBase}/api/manager/workers-summary`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async r => {
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || 'Failed to load workers');
        setSupervisors(Array.isArray(data.supervisors) ? data.supervisors.map((s:any)=>({ id: s.id, username: s.username, first_name: s.first_name ?? null, last_name: s.last_name ?? null, salary: s.salary!=null?Number(s.salary):null, zones: Array.isArray(s.zones)?s.zones:[] })) : []);
        setChiefs(Array.isArray(data.chiefs) ? data.chiefs.map((c:any)=>({ id: c.id, username: c.username, first_name: c.first_name ?? null, last_name: c.last_name ?? null, zones: Array.isArray(c.zones)?c.zones:[] })) : []);
        setManpower(Array.isArray(data.manpower) ? data.manpower.map((m:any)=>({ id: m.id, username: m.username, first_name: m.first_name ?? null, last_name: m.last_name ?? null, salary: m.salary!=null?Number(m.salary):null })) : []);
        setDrivers(Array.isArray(data.drivers) ? data.drivers.map((d:any)=>({ id: d.id, username: d.username, first_name: d.first_name ?? null, last_name: d.last_name ?? null, salary: d.salary!=null?Number(d.salary):null })) : []);
        setVehicles(Array.isArray(data.vehicles) ? data.vehicles : []);
      })
      .catch((e:any) => setError(e?.message || 'Failed to load workers'))
      .finally(() => setLoading(false));
  }, [role]);

  const q = search.toLowerCase().trim();
  const filteredSupervisors = useMemo(() => !q ? supervisors : supervisors.filter(s => s.username.toLowerCase().includes(q)), [q, supervisors]);
  const filteredChiefs = useMemo(() => !q ? chiefs : chiefs.filter(c => c.username.toLowerCase().includes(q)), [q, chiefs]);
  const filteredManpower = useMemo(() => !q ? manpower : manpower.filter(m => m.username.toLowerCase().includes(q)), [q, manpower]);
  const filteredDrivers = useMemo(() => !q ? drivers : drivers.filter(d => d.username.toLowerCase().includes(q)), [q, drivers]);
  const filteredVehicles = useMemo(() => !q ? vehicles : vehicles.filter(v => (v.plate||'').toLowerCase().includes(q)), [q, vehicles]);

  async function saveSalary(userId: number, amountStr: string) {
    const token = localStorage.getItem('token');
    if (!token) return;
    const amount = Number(amountStr);
    if (!Number.isFinite(amount)) return;
    setSaving(true);
    try {
      const r = await fetch(`${apiBase}/api/manager/salaries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId, amount })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || 'Failed to save salary');
      // update in memory
      const apply = (list: WorkerWithSalary[]) => list.map(w => w.id === userId ? { ...w, salary: amount } : w);
      setManpower(prev => apply(prev));
      setDrivers(prev => apply(prev));
      setSupervisors(prev => prev.map(s => s.id === userId ? { ...s, salary: amount } as Supervisor : s));
      setEditingSalary(null);
    } catch (e:any) {
      setError(e?.message || 'Failed to save salary');
    } finally {
      setSaving(false);
    }
  }

  const QuickLink = ({ label, target }: { label: string; target: string }) => (
    <a href={target} className="px-3 py-1 rounded bg-amber-100 text-amber-800 hover:bg-amber-200 text-sm">{label}</a>
  );

  if (role !== 'manager') {
    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-4">Workers</h2>
        <div className="text-red-600">Only managers can view this page.</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Workers</h2>
        <div className="flex items-center gap-2">
          <QuickLink label="Supervisors" target="#supervisors" />
          <QuickLink label="Chiefs" target="#chiefs" />
          <QuickLink label="Manpower" target="#manpower" />
          <QuickLink label="Drivers" target="#drivers" />
          <QuickLink label="Vehicles" target="#vehicles" />
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm text-gray-700">Search</label>
        <input value={search} onChange={e => setSearch(e.target.value)} className="mt-1 border rounded px-3 py-2 w-full max-w-md" placeholder="Search by username or plate" />
      </div>

      {error && <div className="text-red-600 mb-3">{error}</div>}
      {loading ? (
        <div className="py-12 flex items-center gap-3 text-amber-700"><LoadingSpinner size={24} /><span>Loading…</span></div>
      ) : (
        <div className="space-y-8">
          {/* Supervisors */}
          <section id="supervisors" className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-4 py-3 font-semibold border-b">Supervisors</div>
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Username</th>
                  <th className="px-4 py-3 text-left">Zones</th>
                  <th className="px-4 py-3 text-right">Salary</th>
                  <th className="px-4 py-3 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredSupervisors.map(s => (
                  <tr key={s.id} className="border-t">
                    <td className="px-4 py-3">{[s.first_name,s.last_name].filter(Boolean).join(' ') || '-'}</td>
                    <td className="px-4 py-3">{s.username}</td>
                    <td className="px-4 py-3">{s.zones?.length ? s.zones.map(z => z.name).join(', ') : '-'}</td>
                    <td className="px-4 py-3 text-right">{s.salary != null ? Number(s.salary).toLocaleString() : '-'}</td>
                    <td className="px-4 py-3">
                      {editingSalary?.userId === s.id ? (
                        <div className="flex items-center gap-2">
                          <input type="number" className="border rounded px-2 py-1 w-32" value={editingSalary.amount} onChange={e => setEditingSalary({ userId: s.id, amount: e.target.value })} />
                          <button disabled={saving} onClick={() => saveSalary(s.id, editingSalary.amount)} className="px-3 py-1 rounded bg-green-600 text-white">Save</button>
                          <button disabled={saving} onClick={() => setEditingSalary(null)} className="px-3 py-1 rounded bg-gray-200">Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => setEditingSalary({ userId: s.id, amount: s.salary != null ? String(s.salary) : '' })} className="px-3 py-1 rounded bg-amber-500 text-black">Edit Salary</button>
                      )}
                    </td>
                  </tr>
                ))}
                {!filteredSupervisors.length && (
                  <tr><td className="px-4 py-6 text-gray-500" colSpan={4}>No supervisors found.</td></tr>
                )}
              </tbody>
            </table>
          </section>

          {/* Chiefs */}
          <section id="chiefs" className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-4 py-3 font-semibold border-b">Chiefs</div>
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Username</th>
                  <th className="px-4 py-3 text-left">Zones</th>
                </tr>
              </thead>
              <tbody>
                {filteredChiefs.map(c => (
                  <tr key={c.id} className="border-t">
                    <td className="px-4 py-3">{[c.first_name,c.last_name].filter(Boolean).join(' ') || '-'}</td>
                    <td className="px-4 py-3">{c.username}</td>
                    <td className="px-4 py-3">{c.zones?.length ? c.zones.map(z => z.name).join(', ') : '-'}</td>
                  </tr>
                ))}
                {!filteredChiefs.length && (
                  <tr><td className="px-4 py-6 text-gray-500" colSpan={2}>No chiefs found.</td></tr>
                )}
              </tbody>
            </table>
          </section>

          {/* Manpower */}
          <section id="manpower" className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-4 py-3 font-semibold border-b">Manpower</div>
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Username</th>
                  <th className="px-4 py-3 text-right">Salary</th>
                  <th className="px-4 py-3 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredManpower.map(m => (
                  <tr key={m.id} className="border-t">
                    <td className="px-4 py-3">{[m.first_name,m.last_name].filter(Boolean).join(' ') || '-'}</td>
                    <td className="px-4 py-3">{m.username}</td>
                    <td className="px-4 py-3 text-right">{m.salary != null ? Number(m.salary).toLocaleString() : '-'}</td>
                    <td className="px-4 py-3">
                      {editingSalary?.userId === m.id ? (
                        <div className="flex items-center gap-2">
                          <input type="number" className="border rounded px-2 py-1 w-32" value={editingSalary.amount} onChange={e => setEditingSalary({ userId: m.id, amount: e.target.value })} />
                          <button disabled={saving} onClick={() => saveSalary(m.id, editingSalary.amount)} className="px-3 py-1 rounded bg-green-600 text-white">Save</button>
                          <button disabled={saving} onClick={() => setEditingSalary(null)} className="px-3 py-1 rounded bg-gray-200">Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => setEditingSalary({ userId: m.id, amount: m.salary != null ? String(m.salary) : '' })} className="px-3 py-1 rounded bg-amber-500 text-black">Edit Salary</button>
                      )}
                    </td>
                  </tr>
                ))}
                {!filteredManpower.length && (
                  <tr><td className="px-4 py-6 text-gray-500" colSpan={3}>No manpower found.</td></tr>
                )}
              </tbody>
            </table>
          </section>

          {/* Drivers */}
          <section id="drivers" className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-4 py-3 font-semibold border-b">Drivers</div>
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Username</th>
                  <th className="px-4 py-3 text-right">Salary</th>
                  <th className="px-4 py-3 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredDrivers.map(d => (
                  <tr key={d.id} className="border-t">
                    <td className="px-4 py-3">{[d.first_name,d.last_name].filter(Boolean).join(' ') || '-'}</td>
                    <td className="px-4 py-3">{d.username}</td>
                    <td className="px-4 py-3 text-right">{d.salary != null ? Number(d.salary).toLocaleString() : '-'}</td>
                    <td className="px-4 py-3">
                      {editingSalary?.userId === d.id ? (
                        <div className="flex items-center gap-2">
                          <input type="number" className="border rounded px-2 py-1 w-32" value={editingSalary.amount} onChange={e => setEditingSalary({ userId: d.id, amount: e.target.value })} />
                          <button disabled={saving} onClick={() => saveSalary(d.id, editingSalary.amount)} className="px-3 py-1 rounded bg-green-600 text-white">Save</button>
                          <button disabled={saving} onClick={() => setEditingSalary(null)} className="px-3 py-1 rounded bg-gray-200">Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => setEditingSalary({ userId: d.id, amount: d.salary != null ? String(d.salary) : '' })} className="px-3 py-1 rounded bg-amber-500 text-black">Edit Salary</button>
                      )}
                    </td>
                  </tr>
                ))}
                {!filteredDrivers.length && (
                  <tr><td className="px-4 py-6 text-gray-500" colSpan={3}>No drivers found.</td></tr>
                )}
              </tbody>
            </table>
          </section>

          {/* Vehicles */}
          <section id="vehicles" className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-4 py-3 font-semibold border-b">Vehicles</div>
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">Plate</th>
                  <th className="px-4 py-3 text-left">Make</th>
                  <th className="px-4 py-3 text-left">Model</th>
                  <th className="px-4 py-3 text-left">Supervisor ID</th>
                </tr>
              </thead>
              <tbody>
                {filteredVehicles.map(v => (
                  <tr key={v.id} className="border-t">
                    <td className="px-4 py-3">{v.plate}</td>
                    <td className="px-4 py-3">{v.make || ''}</td>
                    <td className="px-4 py-3">{v.model || ''}</td>
                    <td className="px-4 py-3">{v.supervisor_id ?? ''}</td>
                  </tr>
                ))}
                {!filteredVehicles.length && (
                  <tr><td className="px-4 py-6 text-gray-500" colSpan={4}>No vehicles found.</td></tr>
                )}
              </tbody>
            </table>
          </section>
        </div>
      )}
    </div>
  );
};

export default Workers;
