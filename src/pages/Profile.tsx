import { useEffect, useState } from 'react';

const apiBase = 'http://localhost:4000';

const Profile = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(`${apiBase}/api/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async r => {
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || 'Failed to load profile');
        const u = data.user || {};
        setUsername(u.username || '');
        // If username looks like an email, prefill email
        if (typeof u.username === 'string' && u.username.includes('@')) setEmail(u.username);
      })
      .catch(err => setError(err.message || 'Failed to load profile'));
  }, []);

  function onImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    setImageFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
    }
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!username.trim()) {
      setError('Username is required.');
      return;
    }

    // Mock save for now
    setSuccess('Profile saved (mock).');
  }

  return (
    <div className="p-6 max-w-3xl">
      <h2 className="text-2xl font-bold mb-4">My Profile</h2>

      <form onSubmit={handleSave} className="space-y-6">
        {error && <div className="text-red-600">{error}</div>}
        {success && <div className="text-green-600">{success}</div>}

        <div className="flex items-start space-x-6">
          <div>
            <div className="w-24 h-24 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center">
              {imagePreview ? (
                <img src={imagePreview} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-gray-500">No image</span>
              )}
            </div>
            <label className="mt-3 block text-sm font-medium text-gray-700">Profile Image</label>
            <input type="file" accept="image/*" onChange={onImageChange} className="mt-1 block" />
          </div>

          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">First Name</label>
              <input className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" value={firstName} onChange={e => setFirstName(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Last Name</label>
              <input className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" value={lastName} onChange={e => setLastName(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Username</label>
              <input className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" value={username} onChange={e => setUsername(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input type="email" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Phone Number</label>
              <input className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
          </div>
        </div>

        <div>
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md">Save</button>
        </div>
      </form>
    </div>
  );
};

export default Profile;
