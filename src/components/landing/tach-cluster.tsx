"use client";

import { useEffect, useRef, useState } from "react";
import { StatusBadge } from "@/components/status-badge";

const IDLE = 850;
const MAX = 8_000;
const REDLINE = 7_000;
// The rev limiter cuts fuel here and drops back, so a held throttle bounces.
const LIMIT = 7_600;
const CUT_TO = 7_250;

// Gauge geometry: 0 rpm at -135 degrees, 8,000 at +135, 0 degrees straight up.
const CX = 160;
const CY = 160;
const R = 132;
const angleOf = (rpm: number) => -135 + (Math.min(rpm, MAX) / MAX) * 270;
const point = (r: number, deg: number) => {
  const rad = (deg * Math.PI) / 180;
  return [CX + r * Math.sin(rad), CY - r * Math.cos(rad)] as const;
};
function arc(r: number, fromRpm: number, toRpm: number) {
  const a = angleOf(fromRpm);
  const b = angleOf(toRpm);
  const [x1, y1] = point(r, a);
  const [x2, y2] = point(r, b);
  return `M ${x1} ${y1} A ${r} ${r} 0 ${b - a > 180 ? 1 : 0} 1 ${x2} ${y2}`;
}

const TICKS = Array.from({ length: MAX / 250 + 1 }, (_, i) => i * 250);

// Shift lights: when each one comes on, and its color.
const LIGHTS = [
  [5_000, "bg-done"],
  [5_400, "bg-done"],
  [5_800, "bg-done"],
  [6_200, "bg-due"],
  [6_600, "bg-due"],
  [7_000, "bg-due"],
  [7_300, "bg-redline"],
  [7_500, "bg-redline"],
] as const;

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// The hero's gauge: sweeps to the redline and back on load like an ignition
// self-test, then revs while you hold it down.
export function TachCluster() {
  const [rpm, setRpm] = useState(0);
  const [onLimiter, setOnLimiter] = useState(false);
  const [flash, setFlash] = useState(false);
  const throttle = useRef(false);
  const rpmRef = useRef(0);
  const frame = useRef<number | null>(null);
  const sweep = useRef<{ start: number } | null>(null);

  const set = (v: number) => {
    rpmRef.current = v;
    setRpm(v);
  };

  function run() {
    if (frame.current != null) return;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      let next = rpmRef.current;

      if (sweep.current && !throttle.current) {
        // Up to the redline in 600ms, back down to idle by 1.3s.
        const t = now - sweep.current.start;
        if (t < 0) next = 0;
        else if (t < 600) next = MAX * (1 - (1 - t / 600) ** 3);
        else if (t < 700) next = MAX;
        else if (t < 1300) next = MAX - (MAX - IDLE) * (1 - (1 - (t - 700) / 600) ** 2);
        else {
          next = IDLE;
          sweep.current = null;
        }
      } else if (throttle.current) {
        sweep.current = null;
        next += (8_400 - next) * 2.4 * dt;
        if (next >= LIMIT) next = CUT_TO;
      } else {
        next += (IDLE - next) * 3.2 * dt;
      }

      set(next);
      setOnLimiter(throttle.current && next >= 7_200);
      const settled = !throttle.current && !sweep.current && Math.abs(next - IDLE) < 3;
      if (settled) {
        set(IDLE);
        frame.current = null;
        return;
      }
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  }

  useEffect(() => {
    if (reducedMotion()) {
      rpmRef.current = IDLE;
      requestAnimationFrame(() => setRpm(IDLE));
    } else {
      sweep.current = { start: performance.now() + 250 };
      run();
    }
    return () => {
      if (frame.current != null) cancelAnimationFrame(frame.current);
      frame.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Shift lights blink twice a second on the limiter, slow enough to be safe
  // for photosensitive viewers. Steady red with reduced motion.
  useEffect(() => {
    if (!onLimiter || reducedMotion()) return;
    const id = setInterval(() => setFlash((f) => !f), 250);
    return () => {
      clearInterval(id);
      setFlash(false);
    };
  }, [onLimiter]);

  function press(on: boolean) {
    throttle.current = on;
    if (on) run();
  }

  const shown = Math.round(rpm / 50) * 50;

  return (
    <div className="relative mx-auto w-full max-w-[26rem] rounded-2xl border border-graphite bg-panel p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-steel">Track toy, 2011 BMW M3</p>
        <div className="flex gap-1" aria-hidden>
          {LIGHTS.map(([at, tone], i) => {
            const lit = onLimiter ? !flash : rpm >= at;
            return (
              <span
                key={i}
                className={`h-2.5 w-2.5 rounded-full transition-opacity duration-100 ${onLimiter ? "bg-redline" : tone} ${lit ? "opacity-100" : "opacity-15"}`}
              />
            );
          })}
        </div>
      </div>

      <button
        type="button"
        aria-label="Rev the engine. Press and hold."
        onPointerDown={(e) => {
          // Keeps revving if the finger drifts off the gauge.
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch {}
          press(true);
        }}
        onPointerUp={() => press(false)}
        onPointerCancel={() => press(false)}
        onLostPointerCapture={() => press(false)}
        onKeyDown={(e) => {
          if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            press(true);
          }
        }}
        onKeyUp={(e) => {
          if (e.key === " " || e.key === "Enter") press(false);
        }}
        onBlur={() => press(false)}
        onContextMenu={(e) => e.preventDefault()}
        className="group mt-2 block w-full cursor-pointer touch-none rounded-xl select-none [-webkit-touch-callout:none]"
      >
        <svg viewBox="0 0 320 290" className="w-full" aria-hidden>
          <path d={arc(R, 0, MAX)} className="stroke-graphite" strokeWidth={6} fill="none" />
          <path d={arc(R, REDLINE, MAX)} className="stroke-redline" strokeWidth={6} fill="none" />
          {/* Lit trace behind the needle, like a backlit sweep. */}
          <path
            d={arc(R - 12, 0, Math.max(rpm, 1))}
            className={rpm >= REDLINE ? "stroke-redline/50" : "stroke-chalk/15"}
            strokeWidth={10}
            fill="none"
          />
          {TICKS.map((v) => {
            const major = v % 1000 === 0;
            const deg = angleOf(v);
            const [x1, y1] = point(R - (major ? 22 : 12), deg);
            const [x2, y2] = point(R - 4, deg);
            return (
              <line
                key={v}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                className={v >= REDLINE ? "stroke-redline" : major ? "stroke-chalk" : "stroke-steel/60"}
                strokeWidth={major ? 3 : 1.5}
                strokeLinecap="round"
              />
            );
          })}
          {TICKS.filter((v) => v % 1000 === 0).map((v) => {
            const [x, y] = point(R - 40, angleOf(v));
            return (
              <text
                key={v}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="central"
                className={`readout text-[22px] ${v >= REDLINE ? "fill-redline" : "fill-chalk"}`}
              >
                {v / 1000}
              </text>
            );
          })}
          <text x={CX} y={CY - 46} textAnchor="middle" className="fill-steel text-[13px] font-normal">
            × 1000 r/min
          </text>
          <g
            style={{ transform: `rotate(${angleOf(rpm)}deg)`, transformOrigin: `${CX}px ${CY}px` }}
          >
            <line
              x1={CX}
              y1={CY + 18}
              x2={CX}
              y2={CY - R + 14}
              className="stroke-redline"
              strokeWidth={4}
              strokeLinecap="round"
            />
          </g>
          <circle cx={CX} cy={CY} r={11} className="fill-carbon stroke-graphite" strokeWidth={3} />
          <text x={CX} y={CY + 62} textAnchor="middle" className="readout fill-chalk text-[40px]">
            {shown.toLocaleString("en-US")}
          </text>
          <text x={CX} y={CY + 84} textAnchor="middle" className="fill-steel text-[13px] font-normal">
            rpm
          </text>
        </svg>
      </button>

      <div className="mt-1 flex flex-wrap items-end justify-between gap-x-4 gap-y-3 border-t border-rule pt-4">
        <div>
          <p className="readout text-2xl leading-none">
            48,210 <span className="font-sans text-xs text-steel">mi</span>
          </p>
          <p className="mt-2">
            <StatusBadge status="due_soon" label="Oil change in 410 mi" />
          </p>
        </div>
        <p className="text-sm text-steel" aria-live="polite">
          {onLimiter ? "On the limiter. Let it breathe." : "Press and hold to rev"}
        </p>
      </div>
    </div>
  );
}
