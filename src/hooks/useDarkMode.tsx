import { useState, useEffect, useCallback } from 'react';

function getInitialTheme(): boolean {
  if (typeof window === 'undefined') return false;
  const stored = localStorage.getItem('wishlist-dark-mode');
  if (stored !== null) return stored === 'true';
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function useDarkMode() {
  const [isDark, setIsDark] = useState(getInitialTheme);

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('wishlist-dark-mode', String(isDark));
  }, [isDark]);

  const toggle = useCallback(() => setIsDark((prev) => !prev), []);

  return { isDark, toggle };
}
