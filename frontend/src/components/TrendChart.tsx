import type { DailyStat } from "../types";

const DAY_LABELS = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];

export function TrendChart({ data, height = 180 }: { data: DailyStat[]; height?: number }) {
  const totals = data.map((d) => d.sent + d.failed);
  const max = Math.max(1, ...totals);
  const width = Math.max(360, data.length * 34);
  const barWidth = 16;
  const chartHeight = height - 28;

  return (
    <div style={{ overflowX: "auto" }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {[0, 0.5, 1].map((f) => (
          <line
            key={f}
            x1={0}
            x2={width}
            y1={chartHeight - chartHeight * f}
            y2={chartHeight - chartHeight * f}
            stroke="var(--border)"
            strokeDasharray="3 4"
          />
        ))}
        {data.map((d, i) => {
          const x = i * (width / data.length) + (width / data.length - barWidth) / 2;
          const sentH = (d.sent / max) * chartHeight;
          const failedH = (d.failed / max) * chartHeight;
          const date = new Date(d.date + "T00:00:00Z");
          const isToday = i === data.length - 1;
          return (
            <g key={d.date}>
              {d.failed > 0 && (
                <rect
                  x={x}
                  y={chartHeight - sentH - failedH}
                  width={barWidth}
                  height={failedH}
                  rx={3}
                  fill="var(--danger)"
                  opacity={0.85}
                >
                  <title>
                    {d.date}: {d.failed} fallida(s)
                  </title>
                </rect>
              )}
              <rect
                x={x}
                y={chartHeight - sentH}
                width={barWidth}
                height={Math.max(sentH, d.sent > 0 ? 2 : 0)}
                rx={3}
                fill={isToday ? "var(--primary)" : "var(--info)"}
                opacity={isToday ? 1 : 0.85}
              >
                <title>
                  {d.date}: {d.sent} enviada(s)
                </title>
              </rect>
              <text
                x={x + barWidth / 2}
                y={height - 6}
                textAnchor="middle"
                fontSize="10"
                fill="var(--text-faint)"
              >
                {DAY_LABELS[date.getUTCDay()]}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
