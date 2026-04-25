import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    const url = isLogin
      ? 'https://curalink-ai-tagr.onrender.com/api/auth/login'
      : 'https://curalink-ai-tagr.onrender.com/api/auth/signup';
    const body = isLogin
      ? { email: form.email, password: form.password }
      : { name: form.name, email: form.email, password: form.password };
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Something went wrong'); return; }
      login(data.token, data.user);
    } catch {
      setError('Connection error. Make sure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center p-5">
      <div className="bg-[#111827] border border-blue-900/30 rounded-2xl p-10 w-full max-w-md">

        {/* Logo */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-teal-400 flex items-center justify-center">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <span className="text-2xl text-white font-serif">
            Cura<span className="text-blue-400">link</span>
          </span>
        </div>

        <p className="text-sm text-slate-500 mb-7">
          {isLogin ? 'Welcome back' : 'Create your account'}
        </p>

        {/* Form */}
        <div className="flex flex-col gap-4">
          {!isLogin && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Full Name</label>
              <input
                name="name"
                placeholder="John Smith"
                value={form.name}
                onChange={update}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                className="bg-[#1a2235] border border-blue-900/20 rounded-lg px-3.5 py-2.5 text-sm text-white outline-none focus:border-blue-500 placeholder-slate-600 transition-colors"
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Email</label>
            <input
              name="email"
              type="email"
              placeholder="john@example.com"
              value={form.email}
              onChange={update}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              className="bg-[#1a2235] border border-blue-900/20 rounded-lg px-3.5 py-2.5 text-sm text-white outline-none focus:border-blue-500 placeholder-slate-600 transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Password</label>
            <input
              name="password"
              type="password"
              placeholder="Min 6 characters"
              value={form.password}
              onChange={update}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              className="bg-[#1a2235] border border-blue-900/20 rounded-lg px-3.5 py-2.5 text-sm text-white outline-none focus:border-blue-500 placeholder-slate-600 transition-colors"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-400 disabled:bg-[#1e2d45] disabled:text-slate-500 text-white rounded-lg py-3 text-sm font-medium transition-colors mt-1 cursor-pointer"
          >
            {loading ? 'Please wait...' : isLogin ? 'Login' : 'Create Account'}
          </button>
        </div>

        <p className="text-center text-sm text-slate-500 mt-5">
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <span
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
            className="text-blue-400 cursor-pointer hover:text-blue-300 font-medium"
          >
            {isLogin ? 'Sign up' : 'Login'}
          </span>
        </p>

        <p className="text-center text-xs text-slate-600 mt-4">
          Not a substitute for professional medical advice.
        </p>
      </div>
    </div>
  );
}