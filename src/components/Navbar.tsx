import { useState } from 'react';
import { Gift, Users, LogOut, Menu, X, Sun, Moon } from 'lucide-react';
import { ViewMode } from '../types';

interface NavbarProps {
  username: string;
  currentView: ViewMode;
  onNavigate: (view: ViewMode) => void;
  onLogout: () => void;
  isDark: boolean;
  onToggleDark: () => void;
}

export default function Navbar({ username, currentView, onNavigate, onLogout, isDark, onToggleDark }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems: { view: ViewMode; label: string; icon: typeof Gift }[] = [
    { view: 'my-wishlist', label: 'My Wishlist', icon: Gift },
    { view: 'community', label: "Everyone's Lists", icon: Users },
  ];

  return (
    <nav className="sticky top-0 z-40 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-black/80 backdrop-blur-xl">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <button
            onClick={() => onNavigate('my-wishlist')}
            className="flex items-center gap-2.5 font-bold text-lg text-black dark:text-white hover:text-black dark:hover:text-white transition-colors"
          >
            <div className="rounded-xl bg-primary-800 dark:bg-primary-200 p-1.5">
              <Gift className="h-5 w-5 text-primary-50 dark:text-primary-900" />
            </div>
            Wishlist
          </button>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map(({ view, label, icon: Icon }) => (
              <button
                key={view}
                onClick={() => onNavigate(view)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all ${ currentView === view ? 'bg-primary-800 dark:bg-primary-200 text-primary-50 dark:text-primary-900 shadow-sm' : 'text-zinc-600 dark:text-zinc-400 hover:bg-primary-100 dark:hover:bg-primary-800 hover:text-primary-800 dark:hover:text-primary-200' }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>

          {/* User Info, Dark Toggle & Logout */}
          <div className="hidden md:flex items-center gap-2">
            {/* Dark mode toggle */}
            <button
              onClick={onToggleDark}
              className="rounded-xl p-2 text-zinc-500 dark:text-zinc-400 hover:bg-primary-100 dark:hover:bg-primary-800 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            <div className="flex items-center gap-2 rounded-xl bg-primary-100 dark:bg-primary-800 px-3 py-1.5">
              <div className="h-6 w-6 rounded-full bg-primary-400 flex items-center justify-center text-xs font-bold text-primary-50 uppercase">
                {username[0]}
              </div>
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{username}</span>
            </div>
            <button
              onClick={onLogout}
              className="rounded-xl p-2 text-zinc-500 dark:text-zinc-400 hover:bg-primary-100 dark:hover:bg-primary-800 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
              title="Log out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden rounded-xl p-2 text-zinc-600 dark:text-zinc-400 hover:bg-primary-100 dark:hover:bg-primary-800"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black px-4 pb-4 pt-2">
          <div className="flex flex-col gap-1">
            {navItems.map(({ view, label, icon: Icon }) => (
              <button
                key={view}
                onClick={() => {
                  onNavigate(view);
                  setMobileOpen(false);
                }}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${ currentView === view ? 'bg-primary-800 dark:bg-primary-200 text-primary-50 dark:text-primary-900' : 'text-zinc-600 dark:text-zinc-400 hover:bg-primary-100 dark:hover:bg-primary-800' }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-zinc-200 dark:border-zinc-800 pt-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-primary-400 flex items-center justify-center text-xs font-bold text-primary-50 uppercase">
                {username[0]}
              </div>
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{username}</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={onToggleDark}
                className="rounded-xl p-2 text-zinc-500 dark:text-zinc-400 hover:bg-primary-100 dark:hover:bg-primary-800"
                title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <button
                onClick={onLogout}
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400 hover:bg-primary-100 dark:hover:bg-primary-800"
              >
                <LogOut className="h-4 w-4" />
                Log out
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
