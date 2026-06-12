"use client";

import NumberFlow, { NumberFlowGroup } from "@number-flow/react";
import { useEffect, useState } from "react";

type Parts = { days: number; hours: number; minutes: number; seconds: number };

function partsUntil(target: number): Parts | null {
  const diff = target - Date.now();
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor(diff / 3_600_000) % 24,
    minutes: Math.floor(diff / 60_000) % 60,
    seconds: Math.floor(diff / 1_000) % 60,
  };
}

const TWO_DIGITS = { minimumIntegerDigits: 2 } as const;

export default function ClosedCountdown({ target }: { target: string }) {
  const targetMs = new Date(target).getTime();
  // Start null so server and first client render match (avoids hydration mismatch).
  const [parts, setParts] = useState<Parts | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const tick = () => {
      const next = partsUntil(targetMs);
      if (next) {
        setParts(next);
      } else {
        setDone(true);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetMs]);

  if (done) {
    return <p className="lab-mono text-2xl">SCHOOL&apos;S OUT! 🎉</p>;
  }

  if (!parts) {
    // Pre-hydration placeholder, same footprint as the live clock.
    return (
      <div className="flex items-start justify-center gap-4 sm:gap-6">
        {["DAYS", "HRS", "MIN", "SEC"].map((label) => (
          <div key={label} className="flex flex-col items-center gap-1">
            <span className="lab-mono text-3xl tabular-nums sm:text-4xl">--</span>
            <span className="lab-label">{label}</span>
          </div>
        ))}
      </div>
    );
  }

  const units: Array<{
    label: string;
    value: number;
    // Tens digit caps at 5 for base-60 units so rolls feel like a real clock.
    digits?: { 1: { max: number } };
    accent?: boolean;
  }> = [
    { label: "DAYS", value: parts.days },
    { label: "HRS", value: parts.hours, digits: { 1: { max: 2 } } },
    { label: "MIN", value: parts.minutes, digits: { 1: { max: 5 } } },
    { label: "SEC", value: parts.seconds, digits: { 1: { max: 5 } }, accent: true },
  ];

  return (
    <NumberFlowGroup>
      <div className="flex items-start justify-center gap-4 sm:gap-6">
        {units.map(({ label, value, digits, accent }) => (
          <div key={label} className="flex flex-col items-center gap-1">
            <NumberFlow
              value={value}
              trend={-1}
              digits={digits}
              format={TWO_DIGITS}
              className={`lab-mono text-3xl sm:text-4xl ${
                accent ? "text-[var(--color-reagent-deep)]" : ""
              }`}
            />
            <span className="lab-label">{label}</span>
          </div>
        ))}
      </div>
    </NumberFlowGroup>
  );
}
