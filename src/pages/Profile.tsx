import { useEffect, useRef, useState } from 'react';

const apiBase = import.meta.env.VITE_API_URL as string;

const Profile = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [editFirst, setEditFirst] = useState(false);
  const [editLast, setEditLast] = useState(false);
  const [editUsername, setEditUsername] = useState(false);
  const [editPhone, setEditPhone] = useState(false);
  const [editImage, setEditImage] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(`${apiBase}/api/profile`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async r => {
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || 'Failed to load profile');
        const p = data.profile || {};
        setUsername(p.username || '');
        setFirstName(p.first_name || '');
        setLastName(p.last_name || '');
        setPhone(p.phone_number || '');
        setImageUrl(p.profile_image_url || '');
      })
      .catch(err => setError(err.message || 'Failed to load profile'));
  }, []);

  function onImageUrlChange(e: React.ChangeEvent<HTMLInputElement>) {
    setImageUrl(e.target.value);
  }

  function onPickFile() {
    fileRef.current?.click();
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const d = String(reader.result || '');
      setImageDataUrl(d);
      setEditImage(true);
    };
    reader.readAsDataURL(f);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!username.trim()) {
      setError('Username is required.');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) { setError('Not authenticated'); return; }
    setLoading(true);
    try {
      let finalImageUrl = imageUrl;
      if (imageDataUrl) {
        const up = await fetch(`${apiBase}/api/profile/upload-base64`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ dataUrl: imageDataUrl })
        });
        const upj = await up.json();
        if (!up.ok) throw new Error(upj?.error || 'Failed to upload image');
        finalImageUrl = upj.profile_image_url || finalImageUrl;
        setImageUrl(finalImageUrl);
      }

      const r = await fetch(`${apiBase}/api/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ firstName, lastName, username, phone, profileImageUrl: finalImageUrl })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || 'Failed to save profile');
      setSuccess('Profile saved.');
      // reset edit flags
      setEditFirst(false); setEditLast(false); setEditUsername(false); setEditPhone(false); setEditImage(false); setImageDataUrl(null);
    } catch (e: any) {
      setError(e?.message || 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  }

  const hasEdits = editFirst || editLast || editUsername || editPhone || editImage;

  return (
    <div className="p-6 max-w-3xl">
      <h2 className="text-2xl font-bold mb-4">My Profile</h2>

      <form onSubmit={handleSave} className="space-y-6">
        {error && <div className="text-red-600">{error}</div>}
        {success && <div className="text-green-600">{success}</div>}

        <div className="flex items-start space-x-6">
          <div>
            <div className="w-24 h-24 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center">
              {(imageDataUrl || imageUrl) ? (
                <img src={imageDataUrl || imageUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-gray-500">No image</span>
              )}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <button type="button" className="text-sm px-3 py-1 rounded bg-gray-100" onClick={() => setEditImage(true)}>Edit</button>
              {editImage && (
                <>
                  <button type="button" className="text-sm px-3 py-1 rounded bg-blue-600 text-white" onClick={onPickFile}>Choose File</button>
                  <input ref={fileRef} type="file" accept="image/*" onChange={onFileChange} className="hidden" />
                </>
              )}
            </div>
            {editImage && (
              <div className="mt-2">
                <label className="block text-sm font-medium text-gray-700">Or Image URL</label>
                <input type="url" value={imageUrl} onChange={onImageUrlChange} placeholder="https://.../image.jpg" className="mt-1 block w-64 rounded-md border-gray-300 shadow-sm" />
              </div>
            )}
          </div>

          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">First Name</label>
                <button type="button" className="text-xs text-blue-600" onClick={() => setEditFirst(v => !v)}>{editFirst ? 'Cancel' : 'Edit'}</button>
              </div>
              <input
                className={`mt-1 block w-full rounded-md ${editFirst ? 'border-gray-300 shadow-sm' : 'border-transparent bg-transparent p-0 outline-none focus:outline-none focus:ring-0 focus:border-transparent'}`}
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                readOnly={!editFirst}
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">Last Name</label>
                <button type="button" className="text-xs text-blue-600" onClick={() => setEditLast(v => !v)}>{editLast ? 'Cancel' : 'Edit'}</button>
              </div>
              <input
                className={`mt-1 block w-full rounded-md ${editLast ? 'border-gray-300 shadow-sm' : 'border-transparent bg-transparent p-0 outline-none focus:outline-none focus:ring-0 focus:border-transparent'}`}
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                readOnly={!editLast}
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">Username</label>
                <button type="button" className="text-xs text-blue-600" onClick={() => setEditUsername(v => !v)}>{editUsername ? 'Cancel' : 'Edit'}</button>
              </div>
              <input
                className={`mt-1 block w-full rounded-md ${editUsername ? 'border-gray-300 shadow-sm' : 'border-transparent bg-transparent p-0 outline-none focus:outline-none focus:ring-0 focus:border-transparent'}`}
                value={username}
                onChange={e => setUsername(e.target.value)}
                readOnly={!editUsername}
              />
            </div>
            <div className="md:col-span-2">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                <button type="button" className="text-xs text-blue-600" onClick={() => setEditPhone(v => !v)}>{editPhone ? 'Cancel' : 'Edit'}</button>
              </div>
              <input
                className={`mt-1 block w-full rounded-md ${editPhone ? 'border-gray-300 shadow-sm' : 'border-transparent bg-transparent p-0 outline-none focus:outline-none focus:ring-0 focus:border-transparent'}`}
                value={phone}
                onChange={e => setPhone(e.target.value)}
                readOnly={!editPhone}
              />
            </div>
          </div>
        </div>

        {hasEdits && (
          <div className="flex items-center gap-3">
            <button type="submit" disabled={loading} className={`px-4 py-2 rounded-md text-white ${loading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'}`}>Save</button>
            <button type="button" className="px-4 py-2 rounded-md bg-gray-100" onClick={() => { setEditFirst(false); setEditLast(false); setEditUsername(false); setEditPhone(false); setEditImage(false); setImageDataUrl(null); setSuccess(null); setError(null); }}>Cancel</button>
          </div>
        )}
      </form>
    </div>
  );
}
;

export default Profile;
