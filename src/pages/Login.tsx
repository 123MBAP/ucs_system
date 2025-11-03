import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const apiBase = import.meta.env.VITE_API_URL as string;

// Color constants
const colors = {
  primary: '#D97706',
  primaryHover: '#B45309',
  accent: '#15803D',
  accentHover: '#166534',
  background: '#1E1E1E',
  cardBg: 'rgba(255, 255, 255, 0.05)',
  border: 'rgba(255, 255, 255, 0.1)',
  text: '#FFFFFF',
  textLight: '#9CA3AF',
  error: '#DC2626',
  success: '#15803D'
};

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

  // UI Components
  const PrimaryButton = ({ children, onClick, disabled = false, loading = false, type = 'button', className = '' }: { 
    children: React.ReactNode; 
    onClick?: () => void; 
    disabled?: boolean;
    loading?: boolean;
    type?: 'button' | 'submit';
    className?: string;
  }) => (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`px-4 py-3 rounded-lg font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2 ${className}`}
      style={{ 
        backgroundColor: disabled ? '#6B7280' : colors.primary,
        cursor: disabled ? 'not-allowed' : 'pointer'
      }}
      onMouseOver={(e) => {
        if (!disabled && !loading) {
          e.currentTarget.style.backgroundColor = colors.primaryHover;
        }
      }}
      onMouseOut={(e) => {
        if (!disabled && !loading) {
          e.currentTarget.style.backgroundColor = colors.primary;
        }
      }}
    >
      {loading && (
        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
      )}
      {children}
    </button>
  );

  const AccentButton = ({ children, onClick, disabled = false, type = 'button', className = '' }: { 
    children: React.ReactNode; 
    onClick?: () => void; 
    disabled?: boolean;
    type?: 'button' | 'submit';
    className?: string;
  }) => (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-3 rounded-lg font-semibold text-white transition-all duration-200 ${className}`}
      style={{ 
        backgroundColor: disabled ? '#6B7280' : colors.accent,
        cursor: disabled ? 'not-allowed' : 'pointer'
      }}
      onMouseOver={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = colors.accentHover;
        }
      }}
      onMouseOut={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = colors.accent;
        }
      }}
    >
      {children}
    </button>
  );

  const OutlineButton = ({ children, onClick, disabled = false, className = '' }: { 
    children: React.ReactNode; 
    onClick?: () => void; 
    disabled?: boolean;
    className?: string;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-3 rounded-lg font-semibold border transition-all duration-200 ${className}`}
      style={{ 
        color: colors.text,
        borderColor: colors.border,
        backgroundColor: 'transparent',
        cursor: disabled ? 'not-allowed' : 'pointer'
      }}
      onMouseOver={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
        }
      }}
      onMouseOut={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = 'transparent';
        }
      }}
    >
      {children}
    </button>
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: colors.background }}>
      {/* Background Decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full blur-3xl" style={{ backgroundColor: `${colors.primary}15` }}></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full blur-3xl" style={{ backgroundColor: `${colors.accent}15` }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-3xl" style={{ backgroundColor: `${colors.primary}10` }}></div>
      </div>

      <div className="relative w-full max-w-md">
        {/* Login Card */}
        <div className="rounded-2xl border p-8 shadow-2xl" style={{ backgroundColor: colors.cardBg, borderColor: colors.border }}>
          {/* Logo */}
          <div className="text-center mb-8">
            <div 
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl shadow-lg mb-4"
              style={{ backgroundColor: colors.primary }}
            >
              <span className="text-white font-bold text-xl">UCS</span>
            </div>
            <h1 className="text-3xl font-bold mb-2" style={{ color: colors.text }}>
              Welcome Back
            </h1>
            <p style={{ color: colors.textLight }}>Sign in to your UCS account</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="p-4 rounded-lg border" style={{ backgroundColor: '#FEF2F2', borderColor: colors.error }}>
                <div className="flex items-center space-x-2" style={{ color: colors.error }}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-medium">{error}</span>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                  Username or Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="w-5 h-5" style={{ color: colors.textLight }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <input
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className="block w-full pl-10 pr-4 py-3 rounded-lg border focus:outline-none focus:ring-2 backdrop-blur-sm transition-all duration-200"
                    style={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      borderColor: colors.border,
                      color: colors.text
                    }}
                    placeholder="Enter your username or email"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="w-5 h-5" style={{ color: colors.textLight }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-4 py-3 rounded-lg border focus:outline-none focus:ring-2 backdrop-blur-sm transition-all duration-200"
                    style={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      borderColor: colors.border,
                      color: colors.text
                    }}
                    placeholder="Enter your password"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <PrimaryButton
                type="submit"
                disabled={loading}
                loading={loading}
                className="flex-1 py-3"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </PrimaryButton>
            </div>

            <div className="text-center">
              <button 
                type="button" 
                onClick={() => setShowReset(true)}
                className="text-sm font-medium transition-colors duration-200 hover:underline"
                style={{ color: colors.textLight }}
              >
                Forgot your password?
              </button>
            </div>
          </form>

          {/* Reset Password Modal */}
          {showReset && (
            <div className="absolute inset-0 rounded-2xl flex items-center justify-center p-6" style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}>
              <div className="rounded-2xl p-6 w-full border shadow-2xl" style={{ backgroundColor: colors.cardBg, borderColor: colors.border }}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold" style={{ color: colors.text }}>Reset Password</h3>
                  <button 
                    onClick={() => setShowReset(false)}
                    className="p-1 rounded-lg transition-colors duration-200 hover:bg-white/10"
                    style={{ color: colors.text }}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <form onSubmit={handleReset} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                      Email Address
                    </label>
                    <input
                      value={resetEmail}
                      onChange={e => setResetEmail(e.target.value)}
                      className="block w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2"
                      style={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        borderColor: colors.border,
                        color: colors.text
                      }}
                      placeholder="Enter your email address"
                      type="email"
                    />
                  </div>
                  
                  <div className="flex items-center space-x-3 pt-2">
                    <AccentButton
                      type="submit"
                      className="flex-1 py-3"
                    >
                      Send Reset Link
                    </AccentButton>
                    <OutlineButton
                      onClick={() => setShowReset(false)}
                      className="flex-1 py-3"
                    >
                      Cancel
                    </OutlineButton>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Footer Note */}
        <div className="text-center mt-6">
          <p className="text-sm" style={{ color: colors.textLight }}>
            © 2024 UCS Company. Secure Management System
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;