"use client";

import { useState } from "react";

/** Validated categorical slots 1 and 2 (blue, orange) of the reference palette. */
export const SERIES = ["#2a78d6", "#eb6834"] as const;

export type Series = { name: string; values: (number | null)[] };

/**
 * A line chart of percentages over half-years, 0–100 on one axis, with a dashed line at the 50 % floor.
 * Hovering (or touching) a half-year shows a crosshair and every series' value. Time runs left to right
 * in both languages.
 */
export function LineChart({
  labels,
  series,
  locale,
  floorLabel,
}: {
  labels: string[];
  series: Series[];
  /** Intl locale for the percentages on the axis and in the tooltip. */
  locale: string;
  floorLabel: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const format = (n: number) => new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1 }).format(n / 100);
  const W = 640;
  const H = 240;
  const pad = { l: 36, r: 16, t: 12, b: 40 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const x = (i: number) => pad.l + (labels.length < 2 ? iw / 2 : (i / (labels.length - 1)) * iw);
  const y = (v: number) => pad.t + ih - (v / 100) * ih;
  const step = labels.length < 2 ? iw : iw / (labels.length - 1);

  return (
    <div className="relative" dir="ltr">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={series.map((s) => s.name).join(", ")}>
        {[0, 25, 50, 75, 100].map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke="#e2e8f0" strokeWidth={1} strokeDasharray={v === 50 ? "4 4" : undefined} />
            <text x={pad.l - 6} y={y(v)} textAnchor="end" dominantBaseline="middle" fontSize={11} fill="#64748b">
              {format(v)}
            </text>
          </g>
        ))}
        <text x={W - pad.r} y={y(50) - 5} textAnchor="end" fontSize={10} fill="#64748b">{floorLabel}</text>
        {labels.map((l, i) => (
          // Labels may have two lines ("1404" over "1st half"); the end ones align inward to stay inside.
          <text key={i} x={x(i)} y={H - 24} textAnchor={labels.length > 1 && i === 0 ? "start" : labels.length > 1 && i === labels.length - 1 ? "end" : "middle"} fontSize={11} fill="#64748b">
            {l.split("\n").map((line, k) => (
              <tspan key={k} x={x(i)} dy={k === 0 ? 0 : 14}>
                {line}
              </tspan>
            ))}
          </text>
        ))}
        {hover != null && <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={pad.t + ih} stroke="#94a3b8" strokeWidth={1} />}
        {series.map((s, si) => {
          const pts = s.values.map((v, i) => (v == null ? null : [x(i), y(v)] as const));
          const d = pts.reduce((acc, p, i) => (p ? `${acc}${acc && pts[i - 1] ? "L" : "M"}${p[0]},${p[1]}` : acc), "");
          return (
            <g key={s.name}>
              <path d={d} fill="none" stroke={SERIES[si]} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              {pts.map((p, i) =>
                p ? <circle key={i} cx={p[0]} cy={p[1]} r={hover === i ? 5 : 4} fill={SERIES[si]} stroke="#fff" strokeWidth={2} /> : null,
              )}
            </g>
          );
        })}
        {labels.map((_, i) => (
          <rect
            key={i}
            x={x(i) - step / 2}
            y={pad.t}
            width={step}
            height={ih}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            onTouchStart={() => setHover(i)}
          />
        ))}
      </svg>
      {hover != null && (
        <div
          className="pointer-events-none absolute top-2 z-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs shadow-md"
          style={{ left: `${(x(hover) / W) * 100}%`, transform: `translateX(${hover > labels.length / 2 ? "-105%" : "5%"})` }}
        >
          <p className="mb-1 font-medium text-slate-700">{labels[hover].replace("\n", " · ")}</p>
          {series.map((s, si) => (
            <p key={s.name} className="flex items-center gap-2 text-slate-700">
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: SERIES[si] }} />
              <span>{s.name}</span>
              <span className="ms-auto ps-3 font-medium">{s.values[hover] == null ? "—" : format(s.values[hover]!)}</span>
            </p>
          ))}
        </div>
      )}
      {series.length > 1 && (
        <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-600">
          {series.map((s, si) => (
            <span key={s.name} className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-4" style={{ background: SERIES[si] }} />
              {s.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** Horizontal bars, one per row, on a 0–100 scale; hovering a row shows its details. */
export function BarList({ rows }: { rows: { label: string; value: number; text: string; detail?: string }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  return (
    <ul className="space-y-2">
      {rows.map((r, i) => (
        <li
          key={r.label}
          className="relative grid grid-cols-[minmax(6rem,10rem)_1fr_auto] items-center gap-3 text-sm"
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(null)}
        >
          <span className="truncate text-slate-700">{r.label}</span>
          <span className="h-4 rounded-e bg-slate-100">
            <span className="block h-full rounded-e" style={{ width: `${Math.max(0, Math.min(100, r.value))}%`, background: SERIES[0], opacity: hover == null || hover === i ? 1 : 0.5 }} />
          </span>
          <span className="w-16 text-end font-medium text-slate-800">{r.text}</span>
          {hover === i && r.detail && (
            <span className="absolute -top-8 start-1/3 z-10 whitespace-nowrap rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 shadow-md">
              {r.detail}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
