interface Segment {
  label: string;
  value: number;
  color: string;
}

export function DonutChart({ segments, size = 148 }: { segments: Segment[]; size?: number }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const radius = size / 2 - 14;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let offset = 0;
  const arcs = segments.map((s) => {
    const fraction = total === 0 ? 0 : s.value / total;
    const length = fraction * circumference;
    const dasharray = `${length} ${circumference - length}`;
    const dashoffset = -offset;
    offset += length;
    return { ...s, dasharray, dashoffset, fraction };
  });

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={center} cy={center} r={radius} fill="none" stroke="var(--neutral-bg)" strokeWidth={14} />
        {total === 0 ? null : (
          <g transform={`rotate(-90 ${center} ${center})`}>
            {arcs.map((a) =>
              a.value === 0 ? null : (
                <circle
                  key={a.label}
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="none"
                  stroke={a.color}
                  strokeWidth={14}
                  strokeDasharray={a.dasharray}
                  strokeDashoffset={a.dashoffset}
                  strokeLinecap="butt"
                >
                  <title>
                    {a.label}: {a.value} ({Math.round(a.fraction * 100)}%)
                  </title>
                </circle>
              )
            )}
          </g>
        )}
        <text x={center} y={center - 3} textAnchor="middle" fontSize="19" fontWeight="800" fill="var(--text)">
          {total}
        </text>
        <text x={center} y={center + 15} textAnchor="middle" fontSize="10.5" fill="var(--text-faint)">
          total
        </text>
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {segments.map((s) => (
          <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
            <span style={{ width: 9, height: 9, borderRadius: 3, background: s.color, flexShrink: 0 }} />
            <span className="muted" style={{ minWidth: 64 }}>
              {s.label}
            </span>
            <strong>{s.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
