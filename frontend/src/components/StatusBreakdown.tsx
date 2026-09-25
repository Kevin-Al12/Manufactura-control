import { formatNumber } from "../format";

interface Segment {
  label: string;
  value: number;
  color: string;
}

// Distribución por estado como barra apilada + lista: se lee más rápido
// que una dona cuando un estado domina (lo normal: casi todo "Enviada").
export function StatusBreakdown({ segments }: { segments: Segment[] }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const pct = (v: number) => (total === 0 ? 0 : (v / total) * 100);

  return (
    <div>
      <div className="breakdown-total">
        <strong>{formatNumber(total)}</strong>
        <span>notificaciones</span>
      </div>
      <div className="stack-bar" role="img" aria-label="Distribución por estado">
        {segments
          .filter((s) => s.value > 0)
          .map((s) => (
            <span key={s.label} style={{ flexGrow: s.value, background: s.color }} title={`${s.label}: ${s.value}`} />
          ))}
      </div>
      <ul className="breakdown-list">
        {segments.map((s) => (
          <li key={s.label}>
            <span className="swatch" style={{ background: s.color }} />
            <span className="label">{s.label}</span>
            <span className="value">{formatNumber(s.value)}</span>
            <span className="pct">{pct(s.value).toFixed(pct(s.value) > 0 && pct(s.value) < 1 ? 1 : 0)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
