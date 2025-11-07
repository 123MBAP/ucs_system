import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function VerifyEmail() {
  const location = useLocation();
  const navigate = useNavigate();
  const API_BASE = (import.meta as any).env?.VITE_API_URL as string;
  const [status, setStatus] = useState<'idle'|'working'|'ok'|'error'>('idle');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    async function run() {
      setStatus('working');
      try {
        const params = new URLSearchParams(location.search);
        const code = params.get('code');
        const email = params.get('email');
        const token = localStorage.getItem('token');
        if (!code) {
          setStatus('error');
          setMessage('Missing verification code.');
          return;
        }
        if (!API_BASE) {
          setStatus('error');
          setMessage('API base URL is not configured.');
          return;
        }
        if (!token) {
          setStatus('error');
          setMessage('Please login first, then click the verification link again.');
          return;
        }
        const res = await fetch(`${API_BASE}/api/profile/email/verify-code`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ code })
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({} as any));
          setStatus('error');
          setMessage(j?.error || 'Verification failed.');
          return;
        }
        setStatus('ok');
        setMessage('Email verified successfully.');
        // Optionally update localStorage user.email_verified
        try {
          const stored = localStorage.getItem('user');
          if (stored) {
            const u = JSON.parse(stored);
            u.email = email || u.email;
            u.email_verified = true;
            localStorage.setItem('user', JSON.stringify(u));
          }
        } catch {}
        setTimeout(() => navigate('/profile'), 1200);
      } catch (e: any) {
        setStatus('error');
        setMessage(e?.message || 'Unexpected error.');
      }
    }
    run();
  }, [location.search, API_BASE, navigate]);

  return (
    <div className="p-6 max-w-xl mx-auto">
      {status === 'working' && (
        <div className="text-sm text-gray-700">Verifying your email, please wait...</div>
      )}
      {status !== 'working' && (
        <div className={status === 'ok' ? 'text-green-600' : 'text-red-600'}>{message}</div>
      )}
    </div>
  );
}
