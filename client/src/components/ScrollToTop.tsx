import { useLayoutEffect, useEffect } from 'react';
import { useLocation } from 'react-router';

/**
 * Ensures that whenever a route or tab changes, the scroll position
 * is immediately reset to the top of the page.
 */
export function ScrollToTop() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    // Disable browser default scroll restoration so it doesn't preserve previous page scroll
    if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  useLayoutEffect(() => {
    const resetScroll = () => {
      window.scrollTo(0, 0);
      if (document.documentElement) {
        document.documentElement.scrollTop = 0;
      }
      if (document.body) {
        document.body.scrollTop = 0;
      }
    };

    // Immediate synchronous reset before paint
    resetScroll();

    // Secondary reset on next animation frame to override any layout recalculations
    const rafId = requestAnimationFrame(() => {
      resetScroll();
    });

    // Fallback safety for any asynchronous component mounting
    const timeoutId = setTimeout(resetScroll, 50);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timeoutId);
    };
  }, [pathname, search]);

  return null;
}
