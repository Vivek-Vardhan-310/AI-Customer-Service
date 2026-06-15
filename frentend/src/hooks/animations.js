import { useState, useEffect, useRef } from 'react';

// useInView returns a ref and a boolean that flips true when element enters viewport
export function useInView(options = {}) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      const [entry] = entries;
      if (entry.isIntersecting) {
        setInView(true);
        obs.disconnect();
      }
    }, options);
    obs.observe(el);
    return () => obs.disconnect();
  }, [ref.current]);

  return [ref, inView];
}

// useRafCount animates a number from 0 -> target using requestAnimationFrame
export function useRafCount(target = 0, duration = 1200) {
  const [value, setValue] = useState(0);
  const rafRef = useRef(null);
  const startRef = useRef(null);
  const lastTargetRef = useRef(target);

  useEffect(() => {
    // If target hasn't changed, do nothing
    if (lastTargetRef.current === target) return;
    lastTargetRef.current = target;

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    startRef.current = null;

    const step = (ts) => {
      if (!startRef.current) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const progress = Math.min(1, elapsed / duration);
      const current = Math.round(progress * target);
      setValue(current);
      if (progress < 1) rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration]);

  return value;
}
