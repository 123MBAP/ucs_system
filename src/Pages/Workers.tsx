import { useEffect, useMemo, useState } from 'react';
import LoadingSpinner from '@/Components/LoadingSpinner';
import { useI18n } from 'src/lib/i18n';

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

type Vehicle = { id: number; plate: string; make?: string | null; model?: string | null; supervisor_id?: number | null; image_url?: string | null };

const Workers = () => {
  const { t } = useI18n();
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [chiefs, setChiefs] = useState<Chief[]>([]);
  const [manpower, setManpower] = useState<WorkerWithSalary[]>([]);
  const [drivers, setDrivers] = useState<WorkerWithSalary[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [editVehImgOpen, setEditVehImgOpen] = useState<Record<number, boolean>>({});
  const [vehImgDataUrl, setVehImgDataUrl] = useState<Record<number, string | null>>({});
  const [vehImgUrl, setVehImgUrl] = useState<Record<number, string>>({});
  const [vehImgSaving, setVehImgSaving] = useState<Record<number, boolean>>({});
  const [vehImgError, setVehImgError] = useState<Record<number, string | null>>({});
  const [vehViewerOpen, setVehViewerOpen] = useState(false);
  const [vehViewerSrc, setVehViewerSrc] = useState<string>('');

  const [editingSalary, setEditingSalary] = useState<{ userId: number; amount: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteLoadingManpower, setDeleteLoadingManpower] = useState<Record<number, boolean>>({});
  const [deleteLoadingSupervisor, setDeleteLoadingSupervisor] = useState<Record<number, boolean>>({});
  const [deleteLoadingDriver, setDeleteLoadingDriver] = useState<Record<number, boolean>>({});
  const [deleteLoadingChief, setDeleteLoadingChief] = useState<Record<number, boolean>>({});
  const [vehicleDeleting, setVehicleDeleting] = useState<Record<number, boolean>>({});
  const [confirmDel, setConfirmDel] = useState<{ type: 'supervisor'|'driver'|'chief'|'manpower'|'vehicle'|'veh_image'; id: number } | null>(null);

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
  const nameIncludes = (first?: string|null, last?: string|null) => {
    const fn = (first || '').toLowerCase().trim();
    const ln = (last || '').toLowerCase().trim();
    const full = [fn, ln].filter(Boolean).join(' ').trim();
    return !!full && full.includes(q);
  };
  const filteredSupervisors = useMemo(() => !q ? supervisors : supervisors.filter(s => s.username.toLowerCase().includes(q) || nameIncludes(s.first_name, s.last_name)), [q, supervisors]);
  const filteredChiefs = useMemo(() => !q ? chiefs : chiefs.filter(c => c.username.toLowerCase().includes(q) || nameIncludes(c.first_name, c.last_name)), [q, chiefs]);
  const filteredManpower = useMemo(() => !q ? manpower : manpower.filter(m => m.username.toLowerCase().includes(q) || nameIncludes(m.first_name, m.last_name)), [q, manpower]);
  const filteredDrivers = useMemo(() => !q ? drivers : drivers.filter(d => d.username.toLowerCase().includes(q) || nameIncludes(d.first_name, d.last_name)), [q, drivers]);
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

  async function deleteSupervisorUser(userId: number) {
    const token = localStorage.getItem('token');
    if (!token) return;
    setDeleteLoadingSupervisor(prev => ({ ...prev, [userId]: true }));
    try {
      const r = await fetch(`${apiBase}/api/manageworkers/supervisors/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d?.error || 'Failed to delete');
      setSupervisors(prev => prev.filter(x => x.id !== userId));
      // also clear from vehicles/zones in UI
      setVehicles(prev => prev.map(v => v.supervisor_id === userId ? { ...v, supervisor_id: null } : v));
    } catch (e: any) {
      setError(e?.message || 'Failed to delete supervisor');
    } finally {
      setDeleteLoadingSupervisor(prev => ({ ...prev, [userId]: false }));
    }
  }

  async function deleteDriverUser(userId: number) {
    const token = localStorage.getItem('token');
    if (!token) return;
    setDeleteLoadingDriver(prev => ({ ...prev, [userId]: true }));
    try {
      const r = await fetch(`${apiBase}/api/manageworkers/drivers/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d?.error || 'Failed to delete');
      setDrivers(prev => prev.filter(x => x.id !== userId));
    } catch (e: any) {
      setError(e?.message || 'Failed to delete driver');
    } finally {
      setDeleteLoadingDriver(prev => ({ ...prev, [userId]: false }));
    }
  }

  async function deleteChiefUser(userId: number) {
    const token = localStorage.getItem('token');
    if (!token) return;
    setDeleteLoadingChief(prev => ({ ...prev, [userId]: true }));
    try {
      const r = await fetch(`${apiBase}/api/manageworkers/chiefs/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d?.error || 'Failed to delete');
      setChiefs(prev => prev.filter(x => x.id !== userId));
      // zones UI will reflect assigned_chief cleared on next load; we only remove chief row here
    } catch (e: any) {
      setError(e?.message || 'Failed to delete chief');
    } finally {
      setDeleteLoadingChief(prev => ({ ...prev, [userId]: false }));
    }
  }

  async function deleteVehicleRecord(vehicleId: number) {
    const token = localStorage.getItem('token');
    if (!token) return;
    setVehicleDeleting(prev => ({ ...prev, [vehicleId]: true }));
    try {
      const r = await fetch(`${apiBase}/api/manageworkers/vehicles/${vehicleId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d?.error || 'Failed to delete');
      setVehicles(prev => prev.filter(v => v.id !== vehicleId));
      setEditVehImgOpen(prev => ({ ...prev, [vehicleId]: false }));
    } catch (e: any) {
      setError(e?.message || 'Failed to delete vehicle');
    } finally {
      setVehicleDeleting(prev => ({ ...prev, [vehicleId]: false }));
    }
  }

  async function deleteManpowerUser(userId: number) {
    const token = localStorage.getItem('token');
    if (!token) return;
    setDeleteLoadingManpower(prev => ({ ...prev, [userId]: true }));
    try {
      const r = await fetch(`${apiBase}/api/manageworkers/manpower/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d?.error || 'Failed to delete');
      setManpower(prev => prev.filter(x => x.id !== userId));
    } catch (e: any) {
      setError(e?.message || 'Failed to delete manpower');
    } finally {
      setDeleteLoadingManpower(prev => ({ ...prev, [userId]: false }));
    }
  }

  function handleConfirmDelete() {
    if (!confirmDel) return;
    const { type, id } = confirmDel;
    setConfirmDel(null);
    switch (type) {
      case 'supervisor':
        deleteSupervisorUser(id);
        break;
      case 'driver':
        deleteDriverUser(id);
        break;
      case 'chief':
        deleteChiefUser(id);
        break;
      case 'manpower':
        deleteManpowerUser(id);
        break;
      case 'vehicle':
        deleteVehicleRecord(id);
        break;
      case 'veh_image':
        deleteVehicleImage(id);
        break;
      default:
        break;
    }
  }

  async function saveVehicleImage(vehicleId: number) {
    const token = localStorage.getItem('token');
    if (!token) return;
    setVehImgError(prev => ({ ...prev, [vehicleId]: null }));
    setVehImgSaving(prev => ({ ...prev, [vehicleId]: true }));
    try {
      let finalUrl = vehImgUrl[vehicleId] || '';
      const dataUrl = vehImgDataUrl[vehicleId] || null;
      if (dataUrl) {
        const up = await fetch(`${apiBase}/api/manager/vehicles/upload-base64`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ dataUrl })
        });
        const upj = await up.json();
        if (!up.ok) throw new Error(upj?.error || 'Failed to upload image');
        finalUrl = upj.image_url || finalUrl;
      }
      if (!finalUrl) throw new Error('Please choose a file or paste an image URL');
      const r = await fetch(`${apiBase}/api/manager/vehicles/${vehicleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ imageUrl: finalUrl })
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || 'Failed to update vehicle');
      // update in-memory vehicles list
      setVehicles(prev => prev.map(v => v.id === vehicleId ? { ...v, image_url: j.vehicle?.image_url ?? finalUrl } : v));
      setEditVehImgOpen(prev => ({ ...prev, [vehicleId]: false }));
      setVehImgDataUrl(prev => ({ ...prev, [vehicleId]: null }));
      setVehImgUrl(prev => ({ ...prev, [vehicleId]: '' }));
    } catch (e: any) {
      setVehImgError(prev => ({ ...prev, [vehicleId]: e?.message || 'Failed to save image' }));
    } finally {
      setVehImgSaving(prev => ({ ...prev, [vehicleId]: false }));
    }
  }
  
  async function deleteVehicleImage(vehicleId: number) {
    const token = localStorage.getItem('token');
    if (!token) return;
    setVehImgError(prev => ({ ...prev, [vehicleId]: null }));
    setVehImgSaving(prev => ({ ...prev, [vehicleId]: true }));
    try {
      const r = await fetch(`${apiBase}/api/manager/vehicles/${vehicleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ imageUrl: null })
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || 'Failed to delete image');
      setVehicles(prev => prev.map(v => v.id === vehicleId ? { ...v, image_url: null } : v));
      setEditVehImgOpen(prev => ({ ...prev, [vehicleId]: false }));
      setVehImgDataUrl(prev => ({ ...prev, [vehicleId]: null }));
      setVehImgUrl(prev => ({ ...prev, [vehicleId]: '' }));
    } catch (e: any) {
      setVehImgError(prev => ({ ...prev, [vehicleId]: e?.message || 'Failed to delete image' }));
    } finally {
      setVehImgSaving(prev => ({ ...prev, [vehicleId]: false }));
    }
  
  }

  const QuickLink = ({ label, target }: { label: string; target: string }) => (
    <a href={target} className="px-2 py-1 sm:px-3 rounded bg-amber-100 text-amber-800 hover:bg-amber-200 text-xs sm:text-sm whitespace-nowrap">{label}</a>
  );

  if (role !== 'manager') {
    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-4">{t('workers.title')}</h2>
        <div className="text-red-600">{t('workers.onlyManagers')}</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">{t('workers.title')}</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <QuickLink label={t('workers.quick.supervisors')} target="#supervisors" />
          <QuickLink label={t('workers.quick.chiefs')} target="#chiefs" />
          <QuickLink label={t('workers.quick.manpower')} target="#manpower" />
          <QuickLink label={t('workers.quick.drivers')} target="#drivers" />
          <QuickLink label={t('workers.quick.vehicles')} target="#vehicles" />
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm text-gray-700">{t('workers.search')}</label>
        <input value={search} onChange={e => setSearch(e.target.value)} className="mt-1 border rounded px-3 py-2 w-full max-w-md" placeholder={t('workers.search.placeholder')} />
      </div>

      {error && <div className="text-red-600 mb-3">{error}</div>}
      {loading ? (
        <div className="py-12 flex items-center gap-3 text-amber-700"><LoadingSpinner size={24} /><span>{t('workers.loading')}</span></div>
      ) : (
        <div className="space-y-8">
          {/* Supervisors */}
          <section id="supervisors" className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-4 py-3 font-semibold border-b">{t('workers.section.supervisors')}</div>
            <div className="overflow-x-auto">
            <table className="min-w-[720px] sm:min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">{t('workers.col.name')}</th>
                  <th className="px-4 py-3 text-left">{t('workers.col.username')}</th>
                  <th className="px-4 py-3 text-left">{t('workers.col.zones')}</th>
                  <th className="px-4 py-3 text-right">{t('workers.col.salary')}</th>
                  <th className="px-4 py-3 text-left">{t('workers.col.action')}</th>
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
                          <button disabled={saving} onClick={() => saveSalary(s.id, editingSalary.amount)} className="px-2 sm:px-3 py-1 rounded bg-green-600 text-white text-xs sm:text-sm whitespace-nowrap flex items-center gap-2">
                            {saving && <LoadingSpinner size={14} className="border-white/40 border-t-white" />}
                            <span>{t('workers.btn.save')}</span>
                          </button>
                          <button disabled={saving} onClick={() => setEditingSalary(null)} className="px-2 sm:px-3 py-1 rounded bg-gray-200 text-xs sm:text-sm whitespace-nowrap">{t('workers.btn.cancel')}</button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button onClick={() => setEditingSalary({ userId: s.id, amount: s.salary != null ? String(s.salary) : '' })} className="px-2 sm:px-3 py-1 rounded bg-amber-500 text-black text-xs sm:text-sm whitespace-nowrap">{t('workers.btn.editSalary')}</button>
                          <button disabled={!!deleteLoadingSupervisor[s.id]} onClick={() => setConfirmDel({ type: 'supervisor', id: s.id })} className="px-2 sm:px-3 py-1 rounded bg-red-600 text-white text-xs sm:text-sm whitespace-nowrap flex items-center gap-2">
                            {deleteLoadingSupervisor[s.id] && <LoadingSpinner size={14} className="border-white/40 border-t-white" />}
                            <span>{t('workers.btn.delete')}</span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {!filteredSupervisors.length && (
                  <tr><td className="px-4 py-6 text-gray-500" colSpan={4}>{t('workers.empty.supervisors')}</td></tr>
                )}
              </tbody>
            </table>
            </div>
          </section>

          {vehViewerOpen && (
            <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" role="dialog" aria-modal="true" onClick={() => setVehViewerOpen(false)}>
              <div className="relative max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
                <img src={vehViewerSrc} alt={t('workers.viewer.alt')} className="w-full h-auto rounded-lg shadow-lg" />
                <button
                  type="button"
                  onClick={() => setVehViewerOpen(false)}
                  className="absolute top-2 right-2 inline-flex items-center justify-center rounded-full bg-black/60 text-white w-9 h-9 hover:bg-black/80 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  aria-label={t('workers.viewer.close')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Chiefs */}
          <section id="chiefs" className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-4 py-3 font-semibold border-b">{t('workers.section.chiefs')}</div>
            <div className="overflow-x-auto">
            <table className="min-w-[720px] sm:min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">{t('workers.col.name')}</th>
                  <th className="px-4 py-3 text-left">{t('workers.col.username')}</th>
                  <th className="px-4 py-3 text-left">{t('workers.col.zones')}</th>
                  <th className="px-4 py-3 text-left">{t('workers.col.action')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredChiefs.map(c => (
                  <tr key={c.id} className="border-t">
                    <td className="px-4 py-3">{[c.first_name,c.last_name].filter(Boolean).join(' ') || '-'}</td>
                    <td className="px-4 py-3">{c.username}</td>
                    <td className="px-4 py-3">{c.zones?.length ? c.zones.map(z => z.name).join(', ') : '-'}</td>
                    <td className="px-4 py-3">
                      <button disabled={!!deleteLoadingChief[c.id]} onClick={() => setConfirmDel({ type: 'chief', id: c.id })} className="px-2 sm:px-3 py-1 rounded bg-red-600 text-white text-xs sm:text-sm whitespace-nowrap flex items-center gap-2">
                        {deleteLoadingChief[c.id] && <LoadingSpinner size={14} className="border-white/40 border-t-white" />}
                        <span>{t('workers.btn.delete')}</span>
                      </button>
                    </td>
                  </tr>
                ))}
                {!filteredChiefs.length && (
                  <tr><td className="px-4 py-6 text-gray-500" colSpan={2}>{t('workers.empty.chiefs')}</td></tr>
                )}
              </tbody>
            </table>
            </div>
          </section>

          {/* Manpower */}
          <section id="manpower" className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-4 py-3 font-semibold border-b">{t('workers.section.manpower')}</div>
            <div className="overflow-x-auto">
            <table className="min-w-[720px] sm:min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">{t('workers.col.name')}</th>
                  <th className="px-4 py-3 text-left">{t('workers.col.username')}</th>
                  <th className="px-4 py-3 text-right">{t('workers.col.salary')}</th>
                  <th className="px-4 py-3 text-left">{t('workers.col.action')}</th>
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
                          <button disabled={saving} onClick={() => saveSalary(m.id, editingSalary.amount)} className="px-2 sm:px-3 py-1 rounded bg-green-600 text-white text-xs sm:text-sm whitespace-nowrap flex items-center gap-2">
                            {saving && <LoadingSpinner size={14} className="border-white/40 border-t-white" />}
                            <span>{t('workers.btn.save')}</span>
                          </button>
                          <button disabled={saving} onClick={() => setEditingSalary(null)} className="px-2 sm:px-3 py-1 rounded bg-gray-200 text-xs sm:text-sm whitespace-nowrap">{t('workers.btn.cancel')}</button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button onClick={() => setEditingSalary({ userId: m.id, amount: m.salary != null ? String(m.salary) : '' })} className="px-2 sm:px-3 py-1 rounded bg-amber-500 text-black text-xs sm:text-sm whitespace-nowrap">{t('workers.btn.editSalary')}</button>
                          <button disabled={!!deleteLoadingManpower[m.id]} onClick={() => setConfirmDel({ type: 'manpower', id: m.id })} className="px-2 sm:px-3 py-1 rounded bg-red-600 text-white text-xs sm:text-sm whitespace-nowrap flex items-center gap-2">
                            {deleteLoadingManpower[m.id] && <LoadingSpinner size={14} className="border-white/40 border-t-white" />}
                            <span>{t('workers.btn.delete')}</span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {!filteredManpower.length && (
                  <tr><td className="px-4 py-6 text-gray-500" colSpan={3}>{t('workers.empty.manpower')}</td></tr>
                )}
              </tbody>
            </table>
            </div>
          </section>

          {/* Drivers */}
          <section id="drivers" className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-4 py-3 font-semibold border-b">{t('workers.section.drivers')}</div>
            <div className="overflow-x-auto">
            <table className="min-w-[720px] sm:min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">{t('workers.col.name')}</th>
                  <th className="px-4 py-3 text-left">{t('workers.col.username')}</th>
                  <th className="px-4 py-3 text-right">{t('workers.col.salary')}</th>
                  <th className="px-4 py-3 text-left">{t('workers.col.action')}</th>
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
                          <button disabled={saving} onClick={() => saveSalary(d.id, editingSalary.amount)} className="px-2 sm:px-3 py-1 rounded bg-green-600 text-white text-xs sm:text-sm whitespace-nowrap flex items-center gap-2">
                            {saving && <LoadingSpinner size={14} className="border-white/40 border-t-white" />}
                            <span>{t('workers.btn.save')}</span>
                          </button>
                          <button disabled={saving} onClick={() => setEditingSalary(null)} className="px-2 sm:px-3 py-1 rounded bg-gray-200 text-xs sm:text-sm whitespace-nowrap">{t('workers.btn.cancel')}</button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button onClick={() => setEditingSalary({ userId: d.id, amount: d.salary != null ? String(d.salary) : '' })} className="px-2 sm:px-3 py-1 rounded bg-amber-500 text-black text-xs sm:text-sm whitespace-nowrap">{t('workers.btn.editSalary')}</button>
                          <button disabled={!!deleteLoadingDriver[d.id]} onClick={() => setConfirmDel({ type: 'driver', id: d.id })} className="px-2 sm:px-3 py-1 rounded bg-red-600 text-white text-xs sm:text-sm whitespace-nowrap flex items-center gap-2">
                            {deleteLoadingDriver[d.id] && <LoadingSpinner size={14} className="border-white/40 border-t-white" />}
                            <span>{t('workers.btn.delete')}</span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {!filteredDrivers.length && (
                  <tr><td className="px-4 py-6 text-gray-500" colSpan={3}>{t('workers.empty.drivers')}</td></tr>
                )}
              </tbody>
            </table>
            </div>
          </section>

          {/* Vehicles */}
          <section id="vehicles" className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-4 py-3 font-semibold border-b">{t('workers.section.vehicles')}</div>
            <div className="overflow-x-auto">
              <table className="min-w-[720px] sm:min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left">{t('workers.col.image')}</th>
                    <th className="px-4 py-3 text-left">{t('workers.col.plate')}</th>
                    <th className="px-4 py-3 text-left">{t('workers.col.make')}</th>
                    <th className="px-4 py-3 text-left">{t('workers.col.model')}</th>
                    <th className="px-4 py-3 text-left">{t('workers.col.supervisorId')}</th>
                    <th className="px-4 py-3 text-left">{t('workers.col.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVehicles.map(v => (
                    <tr key={v.id} className="border-t">
                      <td className="px-4 py-3">
                        {v.image_url ? (
                          <button type="button" onClick={() => { setVehViewerSrc(v.image_url!); setVehViewerOpen(true); }} title={t('workers.viewer.title')}>
                            <img src={v.image_url} alt={v.plate} className="w-20 h-12 object-cover rounded border" />
                          </button>
                        ) : (
                          <span className="text-gray-400">{t('workers.noImage')}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">{v.plate}</td>
                      <td className="px-4 py-3">{v.make || ''}</td>
                      <td className="px-4 py-3">{v.model || ''}</td>
                      <td className="px-4 py-3">{v.supervisor_id ?? ''}</td>
                      <td className="px-4 py-3 flex flex-wrap gap-2">
                        <button
                          className="px-2 sm:px-3 py-1 rounded bg-amber-500 text-black text-xs sm:text-sm whitespace-nowrap"
                          onClick={() => setEditVehImgOpen(prev => ({ ...prev, [v.id]: !prev[v.id] }))}
                        >
                          {editVehImgOpen[v.id] ? t('workers.btn.close') : t('workers.btn.editImage')}
                        </button>
                        {v.image_url && (
                          <button
                            className="px-2 sm:px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700 text-xs sm:text-sm whitespace-nowrap flex items-center gap-2"
                            disabled={!!vehImgSaving[v.id]}
                            onClick={() => setConfirmDel({ type: 'veh_image', id: v.id })}
                          >
                            {vehImgSaving[v.id] && <LoadingSpinner size={14} className="border-white/40 border-t-white" />}
                            <span>{t('workers.btn.deleteImage')}</span>
                          </button>
                        )}
                        <button
                          className="px-2 sm:px-3 py-1 rounded bg-red-700 text-white hover:bg-red-800 text-xs sm:text-sm whitespace-nowrap flex items-center gap-2"
                          disabled={!!vehicleDeleting[v.id]}
                          onClick={() => setConfirmDel({ type: 'vehicle', id: v.id })}
                        >
                          {vehicleDeleting[v.id] && <LoadingSpinner size={14} className="border-white/40 border-t-white" />}
                          <span>{t('workers.btn.deleteVehicle')}</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!filteredVehicles.length && (
                    <tr><td className="px-4 py-6 text-gray-500" colSpan={6}>{t('workers.empty.vehicles')}</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Inline editors */}
            <div className="divide-y">
              {filteredVehicles.map(v => (
                editVehImgOpen[v.id] ? (
                  <div key={`edit-${v.id}`} className="p-4">
                    {vehImgError[v.id] && <div className="text-red-600 mb-2 text-sm">{vehImgError[v.id]}</div>}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={e => {
                          const f = e.target.files?.[0];
                          if (!f) { setVehImgDataUrl(prev => ({ ...prev, [v.id]: null })); return; }
                          const reader = new FileReader();
                          reader.onload = () => setVehImgDataUrl(prev => ({ ...prev, [v.id]: String(reader.result || '') }));
                          reader.readAsDataURL(f);
                        }}
                      />
                      <input
                        type="url"
                        placeholder="Or paste image URL"
                        value={vehImgUrl[v.id] ?? ''}
                        onChange={e => setVehImgUrl(prev => ({ ...prev, [v.id]: e.target.value }))}
                        className="w-full sm:w-80 border rounded px-3 py-2"
                      />
                      <button
                        className={`px-2 sm:px-3 py-1 rounded text-white ${vehImgSaving[v.id] ? 'bg-amber-400' : 'bg-amber-600 hover:bg-amber-700'}`}
                        disabled={!!vehImgSaving[v.id]}
                        onClick={() => saveVehicleImage(v.id)}
                      >
                        {vehImgSaving[v.id] ? 'Saving…' : 'Save Image'}
                      </button>
                    </div>
                    {(vehImgDataUrl[v.id] || vehImgUrl[v.id]) && (
                      <div className="mt-3">
                        <img src={vehImgDataUrl[v.id] || vehImgUrl[v.id]} alt="Preview" className="max-h-40 rounded border" />
                      </div>
                    )}
                  </div>
                ) : null
              ))}
            </div>
          </section>
        </div>
      )}
      {confirmDel && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" role="dialog" aria-modal="true" onClick={() => setConfirmDel(null)}>
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-5" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-2">{t('workers.modal.title')}</h3>
            <p className="text-sm text-gray-700 mb-4">
              {confirmDel.type === 'supervisor' && t('workers.modal.msg.supervisor')}
              {confirmDel.type === 'driver' && t('workers.modal.msg.driver')}
              {confirmDel.type === 'chief' && t('workers.modal.msg.chief')}
              {confirmDel.type === 'manpower' && t('workers.modal.msg.manpower')}
              {confirmDel.type === 'vehicle' && t('workers.modal.msg.vehicle')}
              {confirmDel.type === 'veh_image' && t('workers.modal.msg.veh_image')}
            </p>
            <div className="flex items-center justify-end gap-2">
              <button type="button" onClick={() => setConfirmDel(null)} className="px-3 py-1.5 rounded bg-gray-200 text-sm">{t('workers.btn.cancel')}</button>
              <button type="button" onClick={handleConfirmDelete} className="px-3 py-1.5 rounded bg-red-600 text-white text-sm">{t('workers.btn.delete')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Workers;
