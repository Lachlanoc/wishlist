import { useState } from 'react';
import { Gift, LogIn, UserPlus, Eye, EyeOff, Loader2 } from 'lucide-react';
import pb from '../lib/pocketbase';

interface AuthModalProps {
  onAuthenticated: () => void;
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export default function AuthModal({ onAuthenticated, addToast }: AuthModalProps) {
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (tab === 'signup') {
        if (password !== passwordConfirm) {
          setError('Passwords do not match');
          setLoading(false);
          return;
        }
        if (password.length < 4) {
          setError('Password must be at least 4 characters');
          setLoading(false);
          return;
        }
        // Create user account
        await pb.collection('users').create({
          username,
          password,
          passwordConfirm,
        });
        // Auto-login after signup
        await pb.collection('users').authWithPassword(username, password);
        addToast('Account created! Welcome aboard 🎉', 'success');
      } else {
        await pb.collection('users').authWithPassword(username, password);
        addToast(`Welcome back, ${username}!`, 'success');
      }
      onAuthenticated();
    } catch (err: any) {
      let message = 'Authentication failed';
      if (err?.response?.data) {
        const data = err.response.data;
        if (data.username?.message) message = `Name: ${data.username.message}`;
        else if (data.password?.message) message = `Password: ${data.password.message}`;
        else if (data.passwordConfirm?.message) message = `Confirm Password: ${data.passwordConfirm.message}`;
        else if (err.response.message) message = err.response.message;
      } else if (err?.message) {
        message = err.message;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary-100 via-primary-50 to-primary-100 dark:from-primary-950 dark:via-primary-900 dark:to-primary-950">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center rounded-2xl bg-primary-800 dark:bg-primary-100 p-3 mb-4 shadow-lg">
            <Gift className="h-8 w-8 text-primary-50 dark:text-primary-900" />
          </div>
          <h1 className="text-3xl font-bold text-black dark:text-white">Wishlist</h1>
          <p className="mt-2 text-zinc-500 dark:text-zinc-400">Tell people what you actually want</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-primary-50/50 dark:bg-primary-900/30 shadow-xl overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-zinc-200 dark:border-zinc-800">
            <button
              onClick={() => { setTab('login'); setError(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-semibold transition-colors ${ tab === 'login' ? 'text-black dark:text-white border-b-2 border-primary-800 dark:border-primary-100 bg-primary-50/50 dark:bg-primary-800/50' : 'text-primary-400 hover:text-primary-600 dark:text-primary-500 dark:hover:text-primary-300' }`}
            >
              <LogIn className="h-4 w-4" />
              Log In
            </button>
            <button
              onClick={() => { setTab('signup'); setError(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-semibold transition-colors ${ tab === 'signup' ? 'text-black dark:text-white border-b-2 border-primary-800 dark:border-primary-100 bg-primary-50/50 dark:bg-primary-800/50' : 'text-primary-400 hover:text-primary-600 dark:text-primary-500 dark:hover:text-primary-300' }`}
            >
              <UserPlus className="h-4 w-4" />
              Sign Up
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Name</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                minLength={3}
                autoComplete="username"
                placeholder="Enter your name"
                className="w-full rounded-xl border border-primary-300 dark:border-zinc-800 bg-primary-50/50 dark:bg-primary-800 px-4 py-3 text-sm text-black dark:text-white placeholder:text-primary-400 dark:placeholder:text-primary-500 focus:border-primary-500 dark:focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:focus:ring-primary-400/20 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={4}
                  autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                  placeholder="At least 4 characters"
                  className="w-full rounded-xl border border-primary-300 dark:border-zinc-800 bg-primary-50/50 dark:bg-primary-800 px-4 py-3 pr-11 text-sm text-black dark:text-white placeholder:text-primary-400 dark:placeholder:text-primary-500 focus:border-primary-500 dark:focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:focus:ring-primary-400/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-primary-600 dark:hover:text-zinc-200"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {tab === 'signup' && (
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Confirm Password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  required
                  minLength={4}
                  autoComplete="new-password"
                  placeholder="Re-enter your password"
                  className="w-full rounded-xl border border-primary-300 dark:border-zinc-800 bg-primary-50/50 dark:bg-primary-800 px-4 py-3 text-sm text-black dark:text-white placeholder:text-primary-400 dark:placeholder:text-primary-500 focus:border-primary-500 dark:focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:focus:ring-primary-400/20 transition-all"
                />
              </div>
            )}

            {error && (
              <div className="rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 px-4 py-3 text-sm text-red-700 dark:text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary-800 dark:bg-primary-100 px-4 py-3.5 text-sm font-semibold text-primary-50 dark:text-primary-900 shadow-md hover:bg-primary-900 dark:hover:bg-primary-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {tab === 'login' ? 'Logging in…' : 'Creating account…'}
                </>
              ) : (
                <>
                  {tab === 'login' ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                  {tab === 'login' ? 'Log In' : 'Create Account'}
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-zinc-500 dark:text-primary-500 mt-6">
          I can reset your password if you forget it...
        </p>
      </div>
    </div>
  );
}
