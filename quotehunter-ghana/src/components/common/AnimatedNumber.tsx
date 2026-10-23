import React, { useEffect, useRef, useState } from 'react';

/** Counts up to a number when it first appears and whenever it changes. Non-numbers are shown as they are. */
export const AnimatedNumber: React.FC<{ value: number | string; duration?: number }> = ({ value, duration = 900 }) => {
  const target = typeof value === 'number' ? value : NaN;
  const [shown, setShown] = useState<number>(Number.isFinite(target) ? 0 : 0);
  const from = useRef(0);

  useEffect(() => {
    if (!Number.isFinite(target)) return;
    const start = performance.now();
    const begin = from.current;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = begin + (target - begin) * eased;
      setShown(current);
      from.current = current;
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  if (!Number.isFinite(target)) return <>{value}</>;
  return <>{Math.round(shown).toLocaleString('en-GH')}</>;
};
