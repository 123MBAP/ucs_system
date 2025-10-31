import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const apiBase = import.meta.env.VITE_API_URL as string;

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [showReset, setShowReset] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Login failed');
      }
      localStorage.setItem('token', data.token);
      // Optionally store user info
      localStorage.setItem('user', JSON.stringify(data.user));
      // Notify app of auth change so sidebar appears immediately
      window.dispatchEvent(new Event('auth-changed'));
      setUsername(''); setPassword('');
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (!resetEmail.trim()) {
      alert('Enter your email to reset password.');
      return;
    }
    console.log('Password reset for', resetEmail);
    alert('Password reset link sent (mock).');
    setResetEmail(''); setShowReset(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white p-8 rounded-md shadow">
        <h2 className="text-2xl font-bold mb-4">Sign in to your account</h2>
        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="p-2 rounded bg-red-50 text-red-700 border border-red-200 text-sm">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700">Username or email</label>
            <input value={username} onChange={e => setUsername(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required />
          </div>
          <div className="flex items-center justify-between">
            <button type="submit" disabled={loading} className={`px-4 py-2 text-white rounded-md ${loading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'}`}>{loading ? 'Signing in…' : 'Sign in'}</button>
            <button type="button" onClick={() => setShowReset(true)} className="text-sm text-blue-600">Forgot password?</button>
          </div>
        </form>

        {showReset && (
          <div className="mt-6 border-t pt-4">
            <h3 className="text-lg font-medium mb-2">Reset password</h3>
            <form onSubmit={handleReset} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input value={resetEmail} onChange={e => setResetEmail(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
              </div>
              <div className="flex items-center space-x-2">
                <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-md">Send reset link</button>
                <button type="button" onClick={() => setShowReset(false)} className="px-4 py-2 bg-gray-200 rounded-md">Cancel</button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
