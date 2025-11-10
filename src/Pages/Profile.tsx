import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useI18n } from '../lib/i18n';

const apiBase = import.meta.env.VITE_API_URL as string;

const Profile = () => {
  const { t, lang, setLang } = useI18n();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Email + verification state
  const [email, setEmail] = useState('');
  const [emailVerified, setEmailVerified] = useState<boolean>(false);
  const [editEmail, setEditEmail] = useState<boolean>(false);
  const [emailCode, setEmailCode] = useState('');
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [resendSecs, setResendSecs] = useState<number>(0);

  const [editFirst, setEditFirst] = useState(false);
  const [editLast, setEditLast] = useState(false);
  const [editUsername, setEditUsername] = useState(false);
  const [editPhone, setEditPhone] = useState(false);
  const [editImage, setEditImage] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  // Change password state
  const [pwStep, setPwStep] = useState<'verify' | 'new'>('verify');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState<string | null>(null);

  // Track the most recently edited field to show inline actions near it
  const [lastEdited, setLastEdited] = useState<'first' | 'last' | 'username' | 'phone' | 'image' | null>(null);

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
        setEmail(p.email || '');
        setEmailVerified(Boolean(p.email_verified));
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
  const inlineVisible = hasEdits && lastEdited !== null;

  // Change password actions
  async function verifyOldPassword() {
    setPwError(null); setPwSuccess(null);
    if (!oldPassword) { setPwError('Enter your current password'); return; }
    const token = localStorage.getItem('token');
    if (!token) { setPwError('Not authenticated'); return; }
    try {
      setPwBusy(true);
      const r = await fetch(`${apiBase}/api/profile/password/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ oldPassword })
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || 'Old password is incorrect');
      setPwStep('new');
      setPwSuccess('Old password verified');
    } catch (e: any) {
      setPwError(e?.message || 'Failed to verify password');
    } finally { setPwBusy(false); }
  }

  async function changePassword() {
    setPwError(null); setPwSuccess(null);
    if (!newPassword || !confirmPassword) { setPwError('Fill in all fields'); return; }
    if (newPassword !== confirmPassword) { setPwError('Passwords do not match'); return; }
    const token = localStorage.getItem('token');
    if (!token) { setPwError('Not authenticated'); return; }
    try {
      setPwBusy(true);
      const r = await fetch(`${apiBase}/api/profile/password/change`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ oldPassword, newPassword })
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || 'Failed to change password');
      setPwSuccess('Password changed successfully');
      setOldPassword(''); setNewPassword(''); setConfirmPassword(''); setPwStep('verify');
    } catch (e: any) {
      setPwError(e?.message || 'Failed to change password');
    } finally { setPwBusy(false); }
  }

  // Email actions
  async function saveEmail() {
    setError(null); setSuccess(null);
    const token = localStorage.getItem('token');
    if (!token) { setError('Not authenticated'); return; }
    if (!/^\S+@\S+\.\S+$/.test(email)) { setError('Enter a valid email'); return; }
    try {
      const r = await fetch(`${apiBase}/api/profile/email`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email })
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || 'Failed to save email');
      setEditEmail(false);
      setEmailVerified(Boolean(j?.email_verified ?? false));
      setSuccess('Email saved');
    } catch (e: any) {
      setError(e?.message || 'Failed to save email');
    }
  }

  async function sendVerificationCode() {
    setError(null); setSuccess(null);
    const token = localStorage.getItem('token');
    if (!token) { setError('Not authenticated'); return; }
    if (!/^\S+@\S+\.\S+$/.test(email)) { setError('Enter a valid email first'); return; }
    try {
      setSendingCode(true);
      const r = await fetch(`${apiBase}/api/profile/email/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email })
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || 'Failed to send verification code');
      setSuccess('Verification code sent');
      setResendSecs(60);
    } catch (e: any) {
      setError(e?.message || 'Failed to send code');
    } finally {
      setSendingCode(false);
    }
  }

  async function verifyCode() {
    setError(null); setSuccess(null);
    const token = localStorage.getItem('token');
    if (!token) { setError('Not authenticated'); return; }
    if (!emailCode.trim()) { setError('Enter the verification code'); return; }
    try {
      setVerifyingCode(true);
      const r = await fetch(`${apiBase}/api/profile/email/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code: emailCode })
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || 'Invalid or expired code');
      setEmailVerified(true);
      setEmailCode('');
      setSuccess('Email verified');
    } catch (e: any) {
      setError(e?.message || 'Failed to verify code');
    } finally {
      setVerifyingCode(false);
    }
  }

  // Resend cooldown timer
  useEffect(() => {
    if (resendSecs <= 0) return;
    const id = setInterval(() => setResendSecs((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [resendSecs]);

  // Verify via link token in URL: ?email_verify_token=...
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('email_verify_token');
    if (!token) return;
    (async () => {
      try {
        const auth = localStorage.getItem('token');
        if (!auth) return;
        const r = await fetch(`${apiBase}/api/profile/email/verify-link`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth}` },
          body: JSON.stringify({ token })
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j?.error || 'Failed to verify email');
        setEmailVerified(true);
        setSuccess('Email verified');
      } catch (e: any) {
        setError(e?.message || 'Email verification failed');
      } finally {
        // remove token from URL
        navigate('/profile', { replace: true });
      }
    })();
  }, [location.search, navigate]);

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
        <div className="mb-8 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-charcoal">{t('profile.title')}</h1>
            <p className="text-gray-600 mt-2">{t('profile.subtitle')}</p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">{t('common.language')}</label>
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as any)}
              className="border rounded px-2 py-1 text-sm"
            >
              <option value="en">{t('lang.english')}</option>
              <option value="rw">{t('lang.kinyarwanda')}</option>
            </select>
          </div>
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Profile Image Section */}
              <div className="lg:col-span-1">
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                  <h3 className="text-lg font-semibold text-charcoal mb-4">{t('profile.photo.title')}</h3>
                  
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
                          <span className="text-xs mt-1">{t('profile.photo.noImage')}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col space-y-3 w-full">
                      {!editImage ? (
                        <button 
                          type="button" 
                          onClick={() => { setEditImage(true); setLastEdited('image'); }}
                          className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium text-sm"
                        >
                          {t('profile.photo.change')}
                        </button>
                      ) : (
                        <>
                          <button 
                            type="button" 
                            onClick={onPickFile}
                            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium text-sm"
                          >
                            {t('profile.photo.chooseFile')}
                          </button>
                          <input ref={fileRef} type="file" accept="image/*" onChange={onFileChange} className="hidden" />
                          
                          <div className="mt-3">
                            <label className="block text-sm font-medium text-charcoal mb-2">{t('profile.photo.orUrl')}</label>
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
                            {t('profile.cancel')}
                          </button>
                          {lastEdited === 'image' && (
                            <div className="mt-3">
                              <button
                                type="submit"
                                disabled={loading}
                                className={`px-4 py-2 rounded-lg text-sm font-medium ${loading ? 'bg-amber-400 cursor-not-allowed text-white' : 'bg-amber-600 hover:bg-amber-700 text-white'}`}
                              >
                                {t('profile.saveChanges')}
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Profile Details Section (move this up so password/email appear below) */}
              <div className="lg:col-span-3">
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                  <h3 className="text-lg font-semibold text-charcoal mb-6">{t('profile.personalInfo')}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-sm font-medium text-charcoal">{t('profile.firstName')}</label>
                        <button 
                          type="button" 
                          onClick={() => setEditFirst(v => { const nv = !v; if (nv) setLastEdited('first'); return nv; })}
                          className="text-xs text-amber-600 hover:text-amber-700 font-medium"
                        >
                          {editFirst ? t('profile.cancel') : t('profile.edit')}
                        </button>
                      </div>
                      {editFirst ? (
                        <>
                          <input
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                            value={firstName}
                            onChange={e => setFirstName(e.target.value)}
                            placeholder={t('profile.placeholder.firstName')}
                          />
                          {lastEdited === 'first' && (
                            <div className="mt-2">
                              <button
                                type="submit"
                                disabled={loading}
                                className={`px-4 py-2 rounded-lg text-sm font-medium ${loading ? 'bg-amber-400 cursor-not-allowed text-white' : 'bg-amber-600 hover:bg-amber-700 text-white'}`}
                              >
                                {t('profile.saveChanges')}
                              </button>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="w-full px-3 py-2 rounded-lg text-charcoal">
                          {firstName || '-'}
                        </div>
                      )}
                    </div>

                    {/* Last Name */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-sm font-medium text-charcoal">{t('profile.lastName')}</label>
                        <button 
                          type="button" 
                          onClick={() => setEditLast(v => { const nv = !v; if (nv) setLastEdited('last'); return nv; })}
                          className="text-xs text-amber-600 hover:text-amber-700 font-medium"
                        >
                          {editLast ? t('profile.cancel') : t('profile.edit')}
                        </button>
                      </div>
                      {editLast ? (
                        <>
                          <input
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                            value={lastName}
                            onChange={e => setLastName(e.target.value)}
                            placeholder={t('profile.placeholder.lastName')}
                          />
                          {lastEdited === 'last' && (
                            <div className="mt-2">
                              <button
                                type="submit"
                                disabled={loading}
                                className={`px-4 py-2 rounded-lg text-sm font-medium ${loading ? 'bg-amber-400 cursor-not-allowed text-white' : 'bg-amber-600 hover:bg-amber-700 text-white'}`}
                              >
                                {t('profile.saveChanges')}
                              </button>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="w-full px-3 py-2 rounded-lg text-charcoal">
                          {lastName || '-'}
                        </div>
                      )}
                    </div>

                    {/* Username */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-sm font-medium text-charcoal">{t('profile.username')}</label>
                        <button 
                          type="button" 
                          onClick={() => setEditUsername(v => { const nv = !v; if (nv) setLastEdited('username'); return nv; })}
                          className="text-xs text-amber-600 hover:text-amber-700 font-medium"
                        >
                          {editUsername ? t('profile.cancel') : t('profile.edit')}
                        </button>
                      </div>
                      {editUsername ? (
                        <>
                          <input
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            placeholder={t('profile.placeholder.username')}
                          />
                          {lastEdited === 'username' && (
                            <div className="mt-2">
                              <button
                                type="submit"
                                disabled={loading}
                                className={`px-4 py-2 rounded-lg text-sm font-medium ${loading ? 'bg-amber-400 cursor-not-allowed text-white' : 'bg-amber-600 hover:bg-amber-700 text-white'}`}
                              >
                                {t('profile.saveChanges')}
                              </button>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="w-full px-3 py-2 rounded-lg text-charcoal">
                          {username || '-'}
                        </div>
                      )}
                    </div>

                    {/* Phone Number */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-sm font-medium text-charcoal">{t('profile.phoneNumber')}</label>
                        <button 
                          type="button" 
                          onClick={() => setEditPhone(v => { const nv = !v; if (nv) setLastEdited('phone'); return nv; })}
                          className="text-xs text-amber-600 hover:text-amber-700 font-medium"
                        >
                          {editPhone ? t('profile.cancel') : t('profile.edit')}
                        </button>
                      </div>
                      {editPhone ? (
                        <>
                          <input
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                            value={phone}
                            onChange={e => setPhone(e.target.value)}
                            placeholder={t('profile.placeholder.phone')}
                          />
                          {lastEdited === 'phone' && (
                            <div className="mt-2">
                              <button
                                type="submit"
                                disabled={loading}
                                className={`px-4 py-2 rounded-lg text-sm font-medium ${loading ? 'bg-amber-400 cursor-not-allowed text-white' : 'bg-amber-600 hover:bg-amber-700 text-white'}`}
                              >
                                {t('profile.saveChanges')}
                              </button>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="w-full px-3 py-2 rounded-lg text-charcoal">
                          {phone || '-'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Change Password Card (moved below Personal Information) */}
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 lg:col-span-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-charcoal">{t('profile.changePassword.title')}</h3>
                    <p className="text-sm text-gray-600 mt-1">{t('profile.changePassword.subtitle')}</p>
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  {pwError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{pwError}</div>
                  )}
                  {pwSuccess && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm">{pwSuccess}</div>
                  )}
                  {pwStep === 'verify' ? (
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-charcoal">{t('profile.password.current')}</label>
                      <input
                        type="password"
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        value={oldPassword}
                        onChange={e => setOldPassword(e.target.value)}
                        placeholder={t('profile.password.placeholder.current')}
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={verifyOldPassword}
                          disabled={pwBusy || !oldPassword}
                          className={`px-4 py-2 rounded-lg text-sm font-medium ${pwBusy || !oldPassword ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-amber-600 hover:bg-amber-700 text-white'}`}
                        >
                          {pwBusy ? t('profile.password.verifying') : t('profile.password.verify')}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setOldPassword(''); setPwError(null); setPwSuccess(null); }}
                          className="px-4 py-2 rounded-lg bg-gray-100 text-charcoal hover:bg-gray-200 text-sm font-medium"
                        >
                          {t('profile.clear')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-charcoal">{t('profile.password.new')}</label>
                        <input
                          type="password"
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          placeholder={t('profile.password.placeholder.new')}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-charcoal">{t('profile.password.confirm')}</label>
                        <input
                          type="password"
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                          value={confirmPassword}
                          onChange={e => setConfirmPassword(e.target.value)}
                          placeholder={t('profile.password.placeholder.confirm')}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={changePassword}
                          disabled={pwBusy || !newPassword || !confirmPassword}
                          className={`px-4 py-2 rounded-lg text-sm font-medium ${pwBusy || !newPassword || !confirmPassword ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-amber-600 hover:bg-amber-700 text-white'}`}
                        >
                          {pwBusy ? t('profile.password.saving') : t('profile.password.change')}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setPwStep('verify'); setNewPassword(''); setConfirmPassword(''); setPwError(null); setPwSuccess(null); }}
                          className="px-4 py-2 rounded-lg bg-gray-100 text-charcoal hover:bg-gray-200 text-sm font-medium"
                        >
                          {t('profile.back')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Account Email Card (moved below Personal Information) */}
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 lg:col-span-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-charcoal">{t('profile.email.title')}</h3>
                    <p className="text-sm text-gray-600 mt-1">{t('profile.email.subtitle')}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${emailVerified ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                    {emailVerified ? t('profile.verified') : t('profile.unverified')}
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  {editEmail ? (
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        className="flex-1 px-3 py-2 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder={t('profile.email.placeholder')}
                        type="email"
                      />
                      <button
                        type="button"
                        onClick={saveEmail}
                        className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium"
                      >
                        {t('profile.email.save')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditEmail(false)}
                        className="px-4 py-2 rounded-lg bg-gray-100 text-charcoal hover:bg-gray-200 text-sm font-medium"
                      >
                        {t('profile.cancel')}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-3">
                      <div className="w-full px-3 py-2 rounded-lg text-charcoal bg-white border border-gray-200">
                        {email || '-'}
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditEmail(true)}
                        className="shrink-0 px-4 py-2 rounded-lg bg-white text-amber-700 border border-amber-200 hover:bg-amber-50 text-sm font-medium"
                      >
                        {email ? t('profile.email.edit') : t('profile.email.add')}
                      </button>
                    </div>
                  )}

                  {!emailVerified && (
                    <div className="space-y-2">
                      <div className="flex flex-col sm:flex-row gap-2">
                        <button
                          type="button"
                          onClick={sendVerificationCode}
                          disabled={sendingCode || resendSecs > 0 || !email}
                          className={`px-4 py-2 rounded-lg text-sm font-medium border ${sendingCode || resendSecs > 0 || !email ? 'bg-gray-100 text-gray-500 border-gray-200 cursor-not-allowed' : 'bg-white text-amber-700 border-amber-200 hover:bg-amber-50'}`}
                        >
                          {resendSecs > 0 ? t('profile.email.resendIn', { secs: resendSecs }) : t('profile.email.sendCode')}
                        </button>
                        <div className="flex-1 flex items-stretch gap-2">
                          <input
                            className="flex-1 px-3 py-2 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                            value={emailCode}
                            onChange={e => setEmailCode(e.target.value)}
                            placeholder={t('profile.email.codePlaceholder')}
                          />
                          <button
                            type="button"
                            onClick={verifyCode}
                            disabled={verifyingCode || !emailCode.trim()}
                            className={`px-4 py-2 rounded-lg text-sm font-medium ${verifyingCode || !emailCode.trim() ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-amber-600 hover:bg-amber-700 text-white'}`}
                          >
                            {verifyingCode ? t('profile.email.verifying') : t('profile.email.verify')}
                          </button>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">{t('profile.email.tip')}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
              {hasEdits && !inlineVisible && (
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
                      setLastEdited(null);
                    }}
                    className="px-6 py-2 bg-gray-100 text-charcoal rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  >
                    {t('profile.cancel')}
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
                        <span>{t('profile.password.saving')}</span>
                      </div>
                    ) : (
                      t('profile.saveChanges')
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