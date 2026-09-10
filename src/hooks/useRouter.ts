import { useState, useEffect, useCallback, useRef } from 'react';
import type { ViewMode, AppRoute } from '../types';

/**
 * Parses the current window.location.hash into an AppRoute object.
 */
export function parseRouteFromHash(hashStr: string): AppRoute {
  // Strip leading '#' or '#/'
  const cleaned = hashStr.replace(/^#\/?/, '').trim();

  if (!cleaned || cleaned === 'my-wishlist') {
    return { view: 'my-wishlist' };
  }

  if (cleaned === 'community') {
    return { view: 'community' };
  }

  if (cleaned.startsWith('friends/') || cleaned.startsWith('friend/')) {
    const parts = cleaned.split('/');
    const friendId = parts[1]?.trim();
    if (friendId) {
      return { view: 'friend-wishlist', friendId };
    }
  }

  // Fallback to my-wishlist for any unrecognized route
  return { view: 'my-wishlist' };
}

/**
 * Converts a view and optional friendId into a canonical hash URL.
 */
export function buildHash(view: ViewMode, friendId?: string): string {
  switch (view) {
    case 'community':
      return '#/community';
    case 'friend-wishlist':
      return friendId ? `#/friends/${encodeURIComponent(friendId)}` : '#/community';
    case 'my-wishlist':
    default:
      return '#/';
  }
}

export function useRouter() {
  const [route, setRoute] = useState<AppRoute>(() => {
    if (typeof window !== 'undefined') {
      return parseRouteFromHash(window.location.hash);
    }
    return { view: 'my-wishlist' };
  });

  // Track the number of internal navigations in this session
  const navCountRef = useRef(0);

  // Modal history tracking
  const modalCloseCallbackRef = useRef<(() => void) | null>(null);
  const isModalInHistoryRef = useRef(false);

  // Sync state on hashchange / popstate
  const syncRoute = useCallback(() => {
    const newRoute = parseRouteFromHash(window.location.hash);
    setRoute((prev) => {
      if (prev.view === newRoute.view && prev.friendId === newRoute.friendId) {
        return prev;
      }
      return newRoute;
    });
  }, []);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // Check if a modal was active and has now been popped
      if (isModalInHistoryRef.current && !event.state?.modalOpen) {
        isModalInHistoryRef.current = false;
        if (modalCloseCallbackRef.current) {
          modalCloseCallbackRef.current();
          modalCloseCallbackRef.current = null;
        }
      }

      syncRoute();
    };

    const handleHashChange = () => {
      syncRoute();
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handleHashChange);

    // If initial load had no hash, normalize it to #/ cleanly without adding history
    if (!window.location.hash || window.location.hash === '#') {
      window.history.replaceState(null, '', '#/');
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [syncRoute]);

  /**
   * Navigate to a view, updating hash and browser history.
   */
  const navigate = useCallback(
    (view: ViewMode, friendId?: string, options?: { replace?: boolean }) => {
      const targetHash = buildHash(view, friendId);

      if (window.location.hash === targetHash) {
        return;
      }

      if (options?.replace) {
        window.location.replace(targetHash);
      } else {
        navCountRef.current += 1;
        window.location.hash = targetHash;
      }
    },
    []
  );

  /**
   * Go back in browser history if internal history exists;
   * otherwise fallback to navigating to fallbackView.
   */
  const goBack = useCallback(
    (fallbackView: ViewMode = 'community') => {
      if (navCountRef.current > 0) {
        window.history.back();
      } else {
        navigate(fallbackView, undefined, { replace: true });
      }
    },
    [navigate]
  );

  /**
   * Push a modal state onto history so browser Back / mobile swipe closes the modal.
   */
  const openModalWithHistory = useCallback((onClose: () => void) => {
    modalCloseCallbackRef.current = onClose;
    isModalInHistoryRef.current = true;
    window.history.pushState({ modalOpen: true }, '', window.location.hash || '#/');
  }, []);

  /**
   * Close a modal that was opened with openModalWithHistory.
   * Pops the history entry if modal was still recorded in history.
   */
  const closeModalWithHistory = useCallback(() => {
    if (isModalInHistoryRef.current) {
      isModalInHistoryRef.current = false;
      modalCloseCallbackRef.current = null;
      window.history.back();
    }
  }, []);

  return {
    route,
    navigate,
    goBack,
    openModalWithHistory,
    closeModalWithHistory,
    hasInternalHistory: navCountRef.current > 0,
  };
}
