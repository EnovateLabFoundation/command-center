/**
 * useIntersectionObserver
 *
 * Tracks whether an element is visible in the viewport.
 * Used to defer rendering of expensive charts until they scroll into view.
 *
 * Usage:
 *   const [ref, isVisible] = useIntersectionObserver<HTMLDivElement>();
 *   return (
 *     <div ref={ref}>
 *       {isVisible && <MyExpensiveChart />}
 *     </div>
 *   );
 *
 * Options:
 *   threshold  — fraction of element that must be visible (default: 0.1)
 *   rootMargin — margin around root (default: '0px')
 *   once       — stop observing after first intersection (default: true)
 */

import { useRef, useState, useEffect, useCallback } from 'react';

interface Options {
  threshold?:  number;
  rootMargin?: string;
  /** If true, once visible stays visible forever (default: true) */
  once?:       boolean;
}

export function useIntersectionObserver<T extends Element>(
  options: Options = {}
): [React.RefCallback<T>, boolean] {
  const {
    threshold  = 0.1,
    rootMargin = '0px',
    once       = true,
  } = options;

  const [isVisible, setIsVisible] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const elementRef  = useRef<T | null>(null);

  const cleanup = useCallback(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
  }, []);

  const ref = useCallback(
    (node: T | null) => {
      cleanup();
      elementRef.current = node;

      if (!node) return;

      observerRef.current = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            if (once) cleanup();
          } else if (!once) {
            setIsVisible(false);
          }
        },
        { threshold, rootMargin }
      );

      observerRef.current.observe(node);
    },
    [cleanup, threshold, rootMargin, once]
  );

  useEffect(() => cleanup, [cleanup]);

  return [ref, isVisible];
}
