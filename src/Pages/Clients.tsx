import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useI18n } from '../lib/i18n';

const apiBase = import.meta.env.VITE_API_URL as string;

type ZoneRow = {
  id: number;
  zone_name: string;
  cell: string;
  village: string;
  chief_username: string | null;
  client_count: number;
};

type ClientRow = {
  id: number;
  username: string;
  name: { first?: string; last?: string } | null;
  zone_id: number;
  phone_number: string;
  monthly_amount?: number | null;
  created_at: string;
  profile_image_url?: string | null;
};

const Clients = () => {
  const { t, lang, setLang } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const [role, setRole] = useState<string | null>(null);
  const [zones, setZones] = useState<ZoneRow[]>([]);
  const [clients, setClients] = useState<ClientRow[]>([]); // chief-flat list
  const [zoneClients, setZoneClients] = useState<Record<number, ClientRow[]>>({}); // per-zone clients
  const [selectedClient, setSelectedClient] = useState<ClientRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [supervisors, setSupervisors] = useState<Array<{ id: number; username: string }>>([]);
  const [supervisorId, setSupervisorId] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [moveTargetZone, setMoveTargetZone] = useState<string>('');
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [lastSelectedId, setLastSelectedId] = useState<number | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(`${apiBase}/api/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async r => {
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || 'Failed to load user');
        setRole(data?.user?.role ?? null);
      })
      .catch(() => {});
  }, []);

  // load supervisors list for manager filter
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || role !== 'manager') return;
    fetch(`${apiBase}/api/report/supervisors`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async r => {
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || 'Failed to load supervisors');
        setSupervisors(Array.isArray(data.supervisors) ? data.supervisors : []);
      })
      .catch(() => {});
  }, [role]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setLoading(true);
    setError(null);
    // query params not used here
    // Decide scope based on role
    if (role === 'chief') {
      fetch(`${apiBase}/api/chief/clients`, { headers: { Authorization: `Bearer ${token}` } })
        .then(async r => {
          const data = await r.json();
          if (!r.ok) throw new Error(data?.error || 'Failed to load clients');
          setClients(Array.isArray(data.clients) ? data.clients : []);
        })
        .catch((e: any) => setError(e?.message || 'Failed to load'))
        .finally(() => setLoading(false));
      return;
    }

    const qs = role === 'supervisor' ? '?scope=supervisor' : '';
    fetch(`${apiBase}/api/zones${qs}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async r => {
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || 'Failed to load zones');
        let mapped: ZoneRow[] = (data.zones || []).map((z: any) => ({
          id: z.id,
          zone_name: z.zone_name,
          cell: z.cell,
          village: z.village,
          chief_username: z.chief_username ?? null,
          client_count: Number(z.client_count || 0)
        }));
        // Manager supervisor filter (frontend) if selected
        if (role === 'manager' && supervisorId) {
          mapped = (data.zones || []).filter((z: any) => String(z.supervisor_id || '') === supervisorId).map((z: any) => ({
            id: z.id,
            zone_name: z.zone_name,
            cell: z.cell,
            village: z.village,
            chief_username: z.chief_username ?? null,
            client_count: Number(z.client_count || 0)
          }));
        }
        setZones(mapped);
        return mapped;
      })
      .then(async (zs) => {
        // fetch clients for each zone
        const token2 = localStorage.getItem('token');
        if (!token2) return;
        const perZone: Record<number, ClientRow[]> = {};
        for (const z of zs) {
          try {
            const r = await fetch(`${apiBase}/api/clients/by-zone/${z.id}`, { headers: { Authorization: `Bearer ${token2}` } });
            const data = await r.json();
            if (r.ok) perZone[z.id] = Array.isArray(data.clients) ? data.clients : [];
          } catch {}
        }
        setZoneClients(perZone);
      })
      .catch((e: any) => setError(e?.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }, [location.search, role, supervisorId]);

  const filteredChiefClients = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return clients;
    return clients.filter(c =>
      (c.username || '').toLowerCase().includes(q) ||
      (c.phone_number || '').toLowerCase().includes(q) ||
      (`${c.name?.first || ''} ${c.name?.last || ''}`.trim()).toLowerCase().includes(q)
    );
  }, [clients, search]);

  const filteredZoneClients = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return zoneClients;
    const out: Record<number, ClientRow[]> = {};
    for (const [zid, list] of Object.entries(zoneClients)) {
      out[Number(zid)] = list.filter(c =>
        (c.username || '').toLowerCase().includes(q) ||
        (c.phone_number || '').toLowerCase().includes(q) ||
        (`${c.name?.first || ''} ${c.name?.last || ''}`.trim()).toLowerCase().includes(q)
      );
    }
    return out;
  }, [zoneClients, search]);

  function toggleSelect(id: number) {
    setSelectedIds(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
    setLastSelectedId(id);
  }

  async function bulkDelete() {
    const token = localStorage.getItem('token');
    if (!token || !selectedIds.size) return;
    if (!confirm(`Delete ${selectedIds.size} client(s)?`)) return;
    setLoading(true);
    try {
      await Promise.all(Array.from(selectedIds).map(async (id) => {
        await fetch(`${apiBase}/api/clients/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      }));
      // refresh
      setSelectedIds(new Set());
      navigate(0);
    } finally { setLoading(false); }
  }

  async function bulkMove() {
    const token = localStorage.getItem('token');
    const target = Number(moveTargetZone);
    if (!token || !selectedIds.size || !Number.isFinite(target)) return;
    setLoading(true);
    try {
      await Promise.all(Array.from(selectedIds).map(async (id) => {
        await fetch(`${apiBase}/api/clients/${id}/zone`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ zoneId: target }) });
      }));
      setSelectedIds(new Set());
      navigate(0);
    } finally { setLoading(false); }
  }

  return (
    <div className="p-6 min-h-screen" style={{ backgroundColor: '#F9FAFB' }}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <button onClick={() => navigate(-1)} className="text-amber-600 underline text-sm">← {t('clients.back')}</button>
        <div className="flex items-center gap-2">
          <label className="text-sm" style={{ color: '#1E1E1E' }}>{t('common.language')}</label>
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value as any)}
            className="border rounded px-2 py-1 text-sm"
            style={{ borderColor: '#E2E8F0' }}
          >
            <option value="en">{t('lang.english')}</option>
            <option value="rw">{t('lang.kinyarwanda')}</option>
          </select>
        </div>
      </div>
      <h2 className="text-2xl font-bold mb-4" style={{ color: '#1E1E1E' }}>{t('clients.title')}</h2>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-sm" style={{ color: '#1E1E1E' }}>{t('clients.search.label')}</label>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="mt-1 border rounded px-3 py-2 focus:outline-none focus:ring-2"
            style={{ borderColor: '#E2E8F0' }}
            placeholder={t('clients.search.placeholder')}
          />
        </div>
        {role === 'manager' && (
          <div>
            <label className="block text-sm" style={{ color: '#1E1E1E' }}>{t('clients.manager.supervisor')}</label>
            <select
              className="mt-1 border rounded px-2 py-2 focus:outline-none focus:ring-2"
              style={{ borderColor: '#E2E8F0' }}
              value={supervisorId}
              onChange={e => setSupervisorId(e.target.value)}
            >
              <option value="">{t('clients.allSupervisors')}</option>
              {supervisors.map(s => (
                <option key={s.id} value={s.id}>{s.username}</option>
              ))}
            </select>
          </div>
        )}
      </div>
      {error && <div className="text-red-600 mb-3">{error}</div>}
      {loading ? (
        <div>{t('clients.loading')}</div>
      ) : (
        <>
          {role === 'chief' ? (
            <div className="overflow-x-auto bg-white border rounded shadow">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('clients.table.photo')}</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('clients.table.name')}</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('clients.table.username')}</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('clients.table.phone')}</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('clients.table.amountToPay')}</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('clients.table.actions')}</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredChiefClients.map(c => {
                    const fullName = c.name ? `${c.name.first || ''} ${c.name.last || ''}`.trim() : '';
                    return (
                      <tr key={c.id}>
                        <td className="px-3 py-2">
                          {c.profile_image_url ? (
                            <button onClick={() => setPreviewPhoto(c.profile_image_url!)} className="block">
                              <img src={c.profile_image_url} alt="" className="w-10 h-10 rounded-full object-cover cursor-zoom-in" />
                            </button>
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-200"></div>
                          )}
                        </td>
                        <td className="px-3 py-2">{fullName || c.username}</td>
                        <td className="px-3 py-2">{c.username}</td>
                        <td className="px-3 py-2">{c.phone_number}</td>
                        <td className="px-3 py-2">{c.monthly_amount != null ? Number(c.monthly_amount).toLocaleString() : '-'}</td>
                        <td className="px-3 py-2">
                          {/* Only chiefs can pay */}
                          <Link
                            to={`/payments?scope=chief&clientId=${encodeURIComponent(String(c.id))}&clientName=${encodeURIComponent(((c.name ? `${c.name.first || ''} ${c.name.last || ''}`.trim() : '') || c.username))}`}
                            className="px-2 py-1 text-sm rounded"
                            style={{ backgroundColor: '#D97706', color: '#1E1E1E' }}
                          >{t('clients.pay')}</Link>
                        </td>
                      </tr>
                    );
                  })}
                  {!filteredChiefClients.length && (
                    <tr><td className="px-3 py-4 text-gray-600" colSpan={5}>{t('clients.noClients')}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto bg-white border rounded shadow">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">{t('clients.table.sel')}</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('clients.table.photo')}</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('clients.table.name')}</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('clients.table.username')}</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('clients.table.phone')}</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('clients.table.amountToPay')}</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('clients.table.zone')}</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {zones.flatMap(z => {
                    const list = filteredZoneClients[z.id] || [];
                    // zone header row
                    const headerRow = (
                      <tr key={`zone-${z.id}`} className="bg-gray-50">
                        <td className="px-3 py-2 text-gray-600" colSpan={6}>
                          <div className="flex items-center justify-between">
                            <div className="font-semibold">{z.zone_name} <span className="text-xs text-gray-500">(#{z.id})</span></div>
                            <div className="text-sm text-gray-600">{t('clients.zones.header', { count: list.length })}</div>
                          </div>
                        </td>
                      </tr>
                    );
                    const rows = list.flatMap(c => {
                      const fullName = c.name ? `${c.name.first || ''} ${c.name.last || ''}`.trim() : '';
                      const row = (
                        <tr key={c.id}>
                          <td className="px-3 py-2">
                            <input type="checkbox" checked={selectedIds.has(c.id)} onChange={() => toggleSelect(c.id)} />
                          </td>
                          <td className="px-3 py-2">
                            {c.profile_image_url ? (
                              <button onClick={() => setPreviewPhoto(c.profile_image_url!)} className="block">
                                <img src={c.profile_image_url} alt="" className="w-10 h-10 rounded-full object-cover cursor-zoom-in" />
                              </button>
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gray-200"></div>
                            )}
                          </td>
                          <td className="px-3 py-2">{fullName || c.username}</td>
                          <td className="px-3 py-2">{c.username}</td>
                          <td className="px-3 py-2">{c.phone_number}</td>
                          <td className="px-3 py-2">{c.monthly_amount != null ? Number(c.monthly_amount).toLocaleString() : '-'}</td>
                          <td className="px-3 py-2">{z.zone_name}</td>
                        </tr>
                      );
                      const inline = (lastSelectedId === c.id && selectedIds.size > 0) ? (
                        <tr key={`actions-${c.id}`} className="bg-gray-50">
                          <td className="px-3 py-2" colSpan={7}>
                            <div className="flex flex-wrap items-center gap-3">
                              <button disabled={!selectedIds.size} onClick={bulkDelete} className={`px-3 py-2 rounded text-white ${selectedIds.size ? 'bg-red-600' : 'bg-gray-300 cursor-not-allowed'}`}>{t('clients.deleteSelected')}</button>
                              <div className="flex items-center gap-2">
                                <select className="border rounded px-2 py-2 focus:outline-none focus:ring-2" style={{ borderColor: '#E2E8F0' }} value={moveTargetZone} onChange={e => setMoveTargetZone(e.target.value)}>
                                  <option value="">{t('clients.moveToZone')}</option>
                                  {zones.map(z2 => (
                                    <option key={z2.id} value={z2.id}>{z2.zone_name}</option>
                                  ))}
                                </select>
                                <button disabled={!selectedIds.size || !moveTargetZone} onClick={bulkMove} className={`px-3 py-2 rounded text-white ${selectedIds.size && moveTargetZone ? 'bg-amber-600' : 'bg-gray-300 cursor-not-allowed'}`}>{t('clients.moveSelected')}</button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null;
                      return inline ? [row, inline] : [row];
                    });
                    return [headerRow, ...rows];
                  })}
                  {!zones.length && (
                    <tr><td className="px-3 py-4 text-gray-600" colSpan={6}>{t('clients.noZones')}</td></tr>
                  )}
                </tbody>
              </table>
              {(role === 'manager' || role === 'supervisor') && !(selectedIds.size > 0 && lastSelectedId !== null) && (
                <div className="p-3 border-t flex items-center gap-3">
                  <button disabled={!selectedIds.size} onClick={bulkDelete} className={`px-3 py-2 rounded text-white ${selectedIds.size ? 'bg-red-600' : 'bg-gray-300 cursor-not-allowed'}`}>{t('clients.deleteSelected')}</button>
                  <div className="flex items-center gap-2">
                    <select className="border rounded px-2 py-2 focus:outline-none focus:ring-2" style={{ borderColor: '#E2E8F0' }} value={moveTargetZone} onChange={e => setMoveTargetZone(e.target.value)}>
                      <option value="">{t('clients.moveToZone')}</option>
                      {zones.map(z => (
                        <option key={z.id} value={z.id}>{z.zone_name}</option>
                      ))}
                    </select>
                    <button disabled={!selectedIds.size || !moveTargetZone} onClick={bulkMove} className={`px-3 py-2 rounded text-white ${selectedIds.size && moveTargetZone ? 'bg-amber-600' : 'bg-gray-300 cursor-not-allowed'}`}>{t('clients.moveSelected')}</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Make Payment card when a client is selected */}
          {selectedClient && role === 'chief' && (
            <div className="mt-4 bg-white border rounded shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{t('clients.makePayment')}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {t('clients.forClient')} <span className="font-medium">{(selectedClient.name ? `${selectedClient.name.first || ''} ${selectedClient.name.last || ''}`.trim() : '') || selectedClient.username}</span>
                  </p>
                </div>
                <button
                  onClick={() => setSelectedClient(null)}
                  className="text-sm text-gray-600 hover:text-gray-800"
                >{t('clients.clear')}</button>
              </div>
              <div className="mt-3">
                <Link
                  to={`/payments?scope=chief&clientId=${encodeURIComponent(String(selectedClient.id))}&clientName=${encodeURIComponent(((selectedClient.name ? `${selectedClient.name.first || ''} ${selectedClient.name.last || ''}`.trim() : '') || selectedClient.username))}`}
                  className="inline-flex items-center px-4 py-2 rounded font-semibold"
                  style={{ backgroundColor: '#D97706', color: '#1E1E1E' }}
                >
                  {t('clients.proceedToPayment')}
                </Link>
              </div>
            </div>
          )}

          {/* Photo Lightbox */}
          {previewPhoto && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/60" onClick={() => setPreviewPhoto(null)}></div>
              <div className="relative z-10 max-w-3xl w-full">
                <img src={previewPhoto} alt="Client" className="max-h-[80vh] w-full object-contain rounded-lg shadow-2xl bg-white" />
                <div className="absolute top-2 right-2">
                  <button
                    onClick={() => setPreviewPhoto(null)}
                    className="px-3 py-1 rounded-md text-white bg-black/60 hover:bg-black/80 text-sm"
                  >{t('clients.close')}</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Clients;
