import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from 'src/lib/i18n';

const apiBase = import.meta.env.VITE_API_URL as string;

const RegisterVehicle = () => {
  const { t } = useI18n();
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
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string>('');

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

  async function onSubmit(e: React.FormEvent) {
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
    try {
      let finalImageUrl = imageUrl;
      if (imageDataUrl) {
        const up = await fetch(`${apiBase}/api/manager/vehicles/upload-base64`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ dataUrl: imageDataUrl })
        });
        const upj = await up.json();
        if (!up.ok) throw new Error(upj?.error || 'Failed to upload image');
        finalImageUrl = upj.image_url || finalImageUrl;
        setImageUrl(finalImageUrl);
      }

      const r = await fetch(`${apiBase}/api/manager/vehicles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plate: plate.trim(), make: make || undefined, model: model || undefined, imageUrl: finalImageUrl || undefined })
      });
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
      setImageDataUrl(null);
      setImageUrl('');
    } catch (e: any) {
      setError(e?.message || 'Failed to register vehicle');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-xl">
      <div className="mb-2">
        <button onClick={() => navigate(-1)} className="text-amber-600 underline text-sm">← {t('register.common.back')}</button>
      </div>
      <h2 className="text-2xl font-bold mb-4">{t('register.vehicle.title')}</h2>
      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-700 mb-2">{error}</div>}
      {success && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-700 mb-2">{success}</div>}
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-neutral-800">{t('register.vehicle.plate')}</label>
          <input className="mt-1 w-full border rounded px-3 py-2" style={{ borderColor: '#E5E7EB' }} value={plate} onChange={e => setPlate(e.target.value)} required />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-neutral-800">{t('register.vehicle.make')}</label>
            <input className="mt-1 w-full border rounded px-3 py-2" style={{ borderColor: '#E5E7EB' }} value={make} onChange={e => setMake(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm text-neutral-800">{t('register.vehicle.model')}</label>
            <input className="mt-1 w-full border rounded px-3 py-2" style={{ borderColor: '#E5E7EB' }} value={model} onChange={e => setModel(e.target.value)} />
          </div>
        </div>

        <div>
          <label className="block text-sm text-neutral-800">{t('register.vehicle.imageOptional')}</label>
          <div className="mt-1 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <input 
              type="file" 
              accept="image/*" 
              onChange={e => {
                const f = e.target.files?.[0];
                if (!f) { setImageDataUrl(null); return; }
                const reader = new FileReader();
                reader.onload = () => setImageDataUrl(String(reader.result || ''));
                reader.readAsDataURL(f);
              }}
              className="block"
            />
            <input 
              type="url" 
              placeholder={t('register.vehicle.imageUrlPlaceholder')}
              value={imageUrl}
              onChange={e => setImageUrl(e.target.value)}
              className="w-full sm:w-72 border rounded px-3 py-2"
            />
          </div>
          {(imageDataUrl || imageUrl) && (
            <div className="mt-3">
              <img src={imageDataUrl || imageUrl} alt="Vehicle preview" className="max-h-40 rounded border" />
            </div>
          )}
        </div>

        <div className="pt-2">
          <label className="inline-flex items-center">
            <input type="checkbox" className="mr-2" checked={assignDriver} onChange={e => setAssignDriver(e.target.checked)} />
            <span>{t('register.vehicle.assignDriverOptional')}</span>
          </label>
        </div>

        {assignDriver && (
          <div className="p-4 border rounded">
            <div className="space-x-4 mb-3">
              <label className="inline-flex items-center">
                <input type="radio" name="assignMode" value="existing" checked={assignMode==='existing'} onChange={() => setAssignMode('existing')} className="mr-2" />
                <span>{t('register.vehicle.assignExistingDriver')}</span>
              </label>
              <label className="inline-flex items-center ml-4">
                <input type="radio" name="assignMode" value="new" checked={assignMode==='new'} onChange={() => setAssignMode('new')} className="mr-2" />
                <span>{t('register.vehicle.createNewDriver')}</span>
              </label>
            </div>

            {assignMode === 'existing' ? (
              <div>
                <label className="block text-sm text-neutral-800">{t('register.vehicle.selectDriver')}</label>
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
                  <label className="block text-sm text-neutral-800">{t('register.vehicle.driverFirstName')}</label>
                  <input className="mt-1 w-full border rounded px-3 py-2" style={{ borderColor: '#E5E7EB' }} value={newDriverFirst} onChange={e => setNewDriverFirst(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm text-neutral-800">{t('register.vehicle.driverLastName')}</label>
                  <input className="mt-1 w-full border rounded px-3 py-2" style={{ borderColor: '#E5E7EB' }} value={newDriverLast} onChange={e => setNewDriverLast(e.target.value)} />
                </div>
              </div>
            )}
          </div>
        )}

        <button type="submit" disabled={loading} className={`px-4 py-2 text-white rounded ${loading ? 'bg-amber-400' : 'bg-amber-600 hover:bg-amber-700'}`}>{loading ? '…' : t('register.vehicle.button')}</button>
      </form>
    </div>
  );
};

export default RegisterVehicle;
