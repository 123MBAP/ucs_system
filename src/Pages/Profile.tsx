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
  const [viewerOpen, setViewerOpen] = useState(false);

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
      setSuccess('Profile saved successfully!');
      // reset edit flags
      setEditFirst(false); setEditLast(false); setEditUsername(false); setEditPhone(false); setEditImage(false); setImageDataUrl(null);
    } catch (e: any) {
      setError(e?.message || 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  }

  const hasEdits = editFirst || editLast || editUsername || editPhone || editImage;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setViewerOpen(false);
    }
    if (viewerOpen) {
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }
  }, [viewerOpen]);

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-charcoal">Profile Settings</h1>
          <p className="text-gray-600 mt-2">Manage your personal information and account details</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <form onSubmit={handleSave} className="p-6 sm:p-8">
            {/* Status Messages */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center space-x-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}
            
            {success && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 flex items-center space-x-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>{success}</span>
              </div>
            )}

            <div className="flex flex-col lg:flex-row gap-8">
              {/* Profile Image Section */}
              <div className="lg:w-1/3">
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                  <h3 className="text-lg font-semibold text-charcoal mb-4">Profile Photo</h3>
                  
                  <div className="flex flex-col items-center space-y-4">
                    <div className="w-32 h-32 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center border-4 border-white shadow-lg">
                      {(imageDataUrl || imageUrl) ? (
                        <button
                          type="button"
                          onClick={() => setViewerOpen(true)}
                          className="block w-full h-full focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-zoom-in"
                          aria-label="View profile image"
                          title="Click to view"
                        >
                          <img 
                            src={imageDataUrl || imageUrl} 
                            alt="Profile" 
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ) : (
                        <div className="text-gray-400 flex flex-col items-center">
                          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span className="text-xs mt-1">No image</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col space-y-3 w-full">
                      {!editImage ? (
                        <button 
                          type="button" 
                          onClick={() => setEditImage(true)}
                          className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium text-sm"
                        >
                          Change Photo
                        </button>
                      ) : (
                        <>
                          <button 
                            type="button" 
                            onClick={onPickFile}
                            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium text-sm"
                          >
                            Choose File
                          </button>
                          <input ref={fileRef} type="file" accept="image/*" onChange={onFileChange} className="hidden" />
                          
                          <div className="mt-3">
                            <label className="block text-sm font-medium text-charcoal mb-2">Or enter image URL</label>
                            <input 
                              type="url" 
                              value={imageUrl} 
                              onChange={onImageUrlChange} 
                              placeholder="https://example.com/image.jpg"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                            />
                          </div>

                          <button 
                            type="button" 
                            onClick={() => { setEditImage(false); setImageDataUrl(null); }}
                            className="px-4 py-2 bg-gray-100 text-charcoal rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm mt-2"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Profile Details Section */}
            <div className="lg:w-2/3">
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-charcoal mb-6">Personal Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* First Name */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-medium text-charcoal">First Name</label>
                      <button 
                        type="button" 
                        onClick={() => setEditFirst(v => !v)}
                        className="text-xs text-amber-600 hover:text-amber-700 font-medium"
                      >
                        {editFirst ? 'Cancel' : 'Edit'}
                      </button>
                    </div>
                    {editFirst ? (
                      <input
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        value={firstName}
                        onChange={e => setFirstName(e.target.value)}
                        placeholder="Enter first name"
                      />
                    ) : (
                      <div className="w-full px-3 py-2 rounded-lg text-charcoal">
                        {firstName || '-'}
                      </div>
                    )}
                  </div>

                  {/* Last Name */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-medium text-charcoal">Last Name</label>
                      <button 
                        type="button" 
                        onClick={() => setEditLast(v => !v)}
                        className="text-xs text-amber-600 hover:text-amber-700 font-medium"
                      >
                        {editLast ? 'Cancel' : 'Edit'}
                      </button>
                    </div>
                    {editLast ? (
                      <input
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        value={lastName}
                        onChange={e => setLastName(e.target.value)}
                        placeholder="Enter last name"
                      />
                    ) : (
                      <div className="w-full px-3 py-2 rounded-lg text-charcoal">
                        {lastName || '-'}
                      </div>
                    )}
                  </div>

                  {/* Username */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-medium text-charcoal">Username</label>
                      <button 
                        type="button" 
                        onClick={() => setEditUsername(v => !v)}
                        className="text-xs text-amber-600 hover:text-amber-700 font-medium"
                      >
                        {editUsername ? 'Cancel' : 'Edit'}
                      </button>
                    </div>
                    {editUsername ? (
                      <input
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        placeholder="Enter username"
                      />
                    ) : (
                      <div className="w-full px-3 py-2 rounded-lg text-charcoal">
                        {username || '-'}
                      </div>
                    )}
                  </div>

                  {/* Phone Number */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-medium text-charcoal">Phone Number</label>
                      <button 
                        type="button" 
                        onClick={() => setEditPhone(v => !v)}
                        className="text-xs text-amber-600 hover:text-amber-700 font-medium"
                      >
                        {editPhone ? 'Cancel' : 'Edit'}
                      </button>
                    </div>
                    {editPhone ? (
                      <input
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="Enter phone number"
                      />
                    ) : (
                      <div className="w-full px-3 py-2 rounded-lg text-charcoal">
                        {phone || '-'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
              {hasEdits && (
                <div className="mt-8 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setEditFirst(false);
                      setEditLast(false);
                      setEditUsername(false);
                      setEditPhone(false);
                      setEditImage(false);
                      setImageDataUrl(null);
                      setSuccess(null);
                      setError(null);
                    }}
                    className="px-6 py-2 bg-gray-100 text-charcoal rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={loading}
                    className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                      loading 
                        ? 'bg-amber-400 cursor-not-allowed text-white' 
                        : 'bg-amber-600 hover:bg-amber-700 text-white'
                    }`}
                  >
                    {loading ? (
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2v4m0 12v4m8-10h-4M6 12H2" />
                        </svg>
                        <span>Saving...</span>
                      </div>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </div>
              )}
          </form>
        </div>
      </div>

      {viewerOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setViewerOpen(false)}
          aria-modal="true"
          role="dialog"
        >
          <div className="relative max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
            <img 
              src={imageDataUrl || imageUrl} 
              alt="Profile full"
              className="w-full h-auto rounded-lg shadow-lg"
            />
            <button
              type="button"
              onClick={() => setViewerOpen(false)}
              className="absolute top-2 right-2 inline-flex items-center justify-center rounded-full bg-black/60 text-white w-9 h-9 hover:bg-black/80 focus:outline-none focus:ring-2 focus:ring-amber-500"
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <style>{`
        .text-charcoal {
          color: #1E1E1E;
        }
        .bg-amber-600 {
          background-color: #D97706;
        }
        .bg-amber-700 {
          background-color: #B45309;
        }
        .text-amber-600 {
          color: #D97706;
        }
        .text-amber-700 {
          color: #B45309;
        }
        .focus\\:ring-amber-500:focus {
          --tw-ring-color: #D97706;
        }
      `}</style>
    </div>
  );
};

export default Profile;