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
      localStorage.setItem('user', JSON.stringify(data.user));
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4">
      {/* Background Decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md">
        {/* Login Card */}
        <div className="bg-white/10 backdrop-blur-md rounded-3xl shadow-2xl border border-white/20 p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg mb-4">
              <span className="text-white font-bold text-xl">UCS</span>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
              Welcome Back
            </h1>
            <p className="text-blue-100/80 mt-2">Sign in to your UCS account</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="p-4 rounded-2xl bg-red-500/20 border border-red-500/30 backdrop-blur-sm">
                <div className="flex items-center space-x-2 text-red-200">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-medium">{error}</span>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-blue-100 mb-2">
                  Username or Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <input
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className="block w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-blue-300/60 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent backdrop-blur-sm transition-all duration-200"
                    placeholder="Enter your username or email"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-blue-100 mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-blue-300/60 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent backdrop-blur-sm transition-all duration-200"
                    placeholder="Enter your password"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <button
                type="submit"
                disabled={loading}
                className={`relative flex-1 py-3 px-4 rounded-2xl font-semibold transition-all duration-200 ${
                  loading 
                    ? 'bg-blue-400 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-blue-500/25'
                }`}
              >
                {loading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span className="text-white">Signing in...</span>
                  </div>
                ) : (
                  <span className="text-white">Sign in</span>
                )}
              </button>
            </div>

            <div className="text-center">
              <button 
                type="button" 
                onClick={() => setShowReset(true)}
                className="text-blue-200/80 hover:text-white text-sm font-medium transition-colors duration-200"
              >
                Forgot your password?
              </button>
            </div>
          </form>

          {/* Reset Password Modal */}
          {showReset && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm rounded-3xl flex items-center justify-center p-6">
              <div className="bg-slate-800/90 backdrop-blur-md rounded-2xl p-6 w-full border border-white/10 shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Reset Password</h3>
                  <button 
                    onClick={() => setShowReset(false)}
                    className="p-1 hover:bg-white/10 rounded-lg transition-colors duration-200"
                  >
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <form onSubmit={handleReset} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-blue-100 mb-2">
                      Email Address
                    </label>
                    <input
                      value={resetEmail}
                      onChange={e => setResetEmail(e.target.value)}
                      className="block w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-blue-300/60 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent backdrop-blur-sm"
                      placeholder="Enter your email address"
                      type="email"
                    />
                  </div>
                  
                  <div className="flex items-center space-x-3 pt-2">
                    <button
                      type="submit"
                      className="flex-1 py-3 bg-gradient-to-r from-green-600 to-cyan-600 hover:from-green-700 hover:to-cyan-700 text-white rounded-2xl font-semibold transition-all duration-200 shadow-lg hover:shadow-green-500/25"
                    >
                      Send Reset Link
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowReset(false)}
                      className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-semibold transition-all duration-200 border border-white/10"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Footer Note */}
        <div className="text-center mt-6">
          <p className="text-blue-200/60 text-sm">
            © 2024 UCS Company. Secure Management System
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;