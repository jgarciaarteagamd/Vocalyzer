import { useEffect, useRef } from "react";
import type { MicRecorder } from "@/lib/voice/recorder";

/** Live microphone level bar (−60 … 0 dBFS). Updates via rAF without React re-renders. */
export function LevelMeter({ recorder, label }: { recorder: MicRecorder | null; label: string }) {
  const barRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!recorder) return;
    let level = -90;
    let raf = 0;
    const off = recorder.onLevel((db) => {
      level = Math.max(db, level - 1.5); // fast attack, slow release
    });
    const tick = () => {
      const el = barRef.current;
      if (el) {
        const pct = Math.max(0, Math.min(100, ((level + 60) / 60) * 100));
        el.style.width = `${pct}%`;
        el.style.backgroundColor = level > -3 ? "#ef4444" : level > -12 ? "#eab308" : "#22c55e";
      }
      level -= 0.6;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      off();
      cancelAnimationFrame(raf);
    };
  }, [recorder]);
  return (
    <div aria-label={label} title={label}>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <div ref={barRef} className="h-full w-0 rounded-full transition-[width] duration-75" />
      </div>
    </div>
  );
}
