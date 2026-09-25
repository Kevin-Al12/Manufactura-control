import { useEffect, useRef, useState } from "react";
import type { DailyStat } from "../types";
import { formatDay } from "../format";

const DAY_LABELS = ["D", "L", "M", "M", "J", "V", "S"];
const PAD_TOP = 8;
const PAD_BOTTOM = 24;
const PAD_LEFT = 28;

function niceMax(n: number): number {
  if (n <= 4) return 4;
  const pow = Math.pow(10, Math.floor(Math.log10(n)));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * pow * 4 >= n) ?? 10;
  return step * pow * 4;
}

export function TrendChart({ data, height = 200 }: { data: DailyStat[]; height?: number }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(560);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(280, entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const max = niceMax(Math.max(1, ...data.map((d) => d.sent + d.failed)));
  const plotH = height - PAD_TOP - PAD_BOTTOM;
  const plotW = width - PAD_LEFT;
  const slot = plotW / data.length;
  const barW = Math.max(6, Math.min(22, slot * 0.5));
  const y = (v: number) => PAD_TOP + plotH - (v / max) * plotH;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(max * f));

  const hovered = hover !== null ? data[hover] : null;
  const tooltipX = hover !== null ? PAD_LEFT + hover * slot + slot / 2 : 0;

  return (
    <div className="trend" ref={wrapRef} style={{ height }} onMouseLeave={() => setHover(null)}>
      <svg width={width} height={height} role="img" aria-label="Notificaciones por día">
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={PAD_LEFT}
              x2={width}
              y1={y(t)}
              y2={y(t)}
              stroke="var(--border)"
              strokeDasharray={t === 0 ? undefined : "2 4"}
            />
            <text
              x={PAD_LEFT - 8}
              y={y(t) + 3.5}
              textAnchor="end"
              fontSize="10.5"
              fill="var(--text-faint)"
              fontFamily="var(--font-mono)"
            >
              {t}
            </text>
          </g>
        ))}

        {data.map((d, i) => {
          const x = PAD_LEFT + i * slot + (slot - barW) / 2;
          const sentTop = y(d.sent);
          const failedTop = y(d.sent + d.failed);
          const dim = hover !== null && hover !== i;
          const date = new Date(d.date + "T00:00:00Z");
          const isLast = i === data.length - 1;
          return (
            <g key={d.date} opacity={dim ? 0.35 : 1} style={{ transition: "opacity 0.15s ease" }}>
              <rect
                x={PAD_LEFT + i * slot}
                y={PAD_TOP}
                width={slot}
                height={plotH}
                fill={hover === i ? "var(--surface-hover)" : "transparent"}
                rx={4}
                onMouseEnter={() => setHover(i)}
              />
              {d.sent > 0 && (
                <rect
                  x={x}
                  y={sentTop}
                  width={barW}
                  height={Math.max(2, y(0) - sentTop)}
                  rx={2}
                  fill="var(--chart-bar)"
                  pointerEvents="none"
                />
              )}
              {d.failed > 0 && (
                <rect
                  x={x}
                  y={failedTop}
                  width={barW}
                  height={Math.max(2, sentTop - failedTop - 1.5)}
                  rx={2}
                  fill="var(--danger)"
                  pointerEvents="none"
                />
              )}
              {d.sent === 0 && d.failed === 0 && (
                <rect
                  x={x}
                  y={y(0) - 2}
                  width={barW}
                  height={2}
                  rx={1}
                  fill="var(--chart-bar-muted)"
                  pointerEvents="none"
                />
              )}
              <text
                x={x + barW / 2}
                y={height - 6}
                textAnchor="middle"
                fontSize="10.5"
                fontWeight={isLast ? 600 : 400}
                fill={isLast ? "var(--text)" : "var(--text-faint)"}
                pointerEvents="none"
              >
                {DAY_LABELS[date.getUTCDay()]}
              </text>
            </g>
          );
        })}
      </svg>

      {hovered && (
        <div className="trend-tooltip" style={{ left: tooltipX, top: y(hovered.sent + hovered.failed) - 6 }}>
          <div className="t-date">{formatDay(hovered.date)}</div>
          <div className="t-row">
            <span>Enviadas</span>
            <strong>{hovered.sent}</strong>
          </div>
          <div className="t-row">
            <span>Fallidas</span>
            <strong>{hovered.failed}</strong>
          </div>
        </div>
      )}
    </div>
  );
}
