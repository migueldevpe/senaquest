import { memo, useEffect, useRef } from 'react';
interface SmoothTimerProps {
  timerKey: string;
  duration: number;
  seconds: number;
  deadline?: number;
  caption: string;
}
/** A animação do compositor é reiniciada uma vez por prazo; nunca a cada segundo. */
export const SmoothTimer = memo(function SmoothTimer({
  timerKey,
  duration,
  seconds,
  deadline,
  caption,
}: SmoothTimerProps) {
  const fill = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = fill.current;
    if (!element) return;
    // Nunca enviar NaN, Infinity ou duração negativa à Web Animations API.
    const safeDuration = Number.isFinite(duration) && duration > 0 ? duration * 1000 : 0;
    const rawRemaining = deadline == null ? safeDuration : deadline - performance.now();
    const remaining = Number.isFinite(rawRemaining) ? Math.max(0, rawRemaining) : 0;
    const initial = safeDuration > 0 ? Math.min(1, remaining / safeDuration) : 0;
    if (remaining === 0) {
      element.style.transform = 'scaleX(0)';
      return;
    }
    element.style.transform = `scaleX(${initial})`;
    const animation = element.animate(
      [{ transform: `scaleX(${initial})` }, { transform: 'scaleX(0)' }],
      { duration: remaining, fill: 'forwards', easing: 'linear' },
    );
    return () => animation.cancel();
  }, [timerKey, duration, deadline]);
  return (
    <div className="visible-timer" aria-live="off">
      <div className="timer-caption">
        <span>⏱ {caption}</span>
        <strong>{seconds} s</strong>
      </div>
      <div className="timer-track">
        <div
          ref={fill}
          className="timer-fill"
          style={{ animation: 'none', transform: 'scaleX(1)' }}
        />
      </div>
    </div>
  );
});
