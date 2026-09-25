import { IconAlert, IconBox, IconCheck, IconLogo } from "./icons";

// Feed ilustrativo (no son datos reales): muestra de un vistazo qué hace
// el producto — un evento de planta que termina en un aviso a la persona
// correcta.
const SAMPLE_FEED = [
  {
    icon: <IconAlert width={14} height={14} />,
    hot: true,
    title: "Falla en Inyectora-1",
    meta: "Avisado a Supervisión · Moldeo",
    time: "14:32",
  },
  {
    icon: <IconCheck width={14} height={14} />,
    hot: false,
    title: "Lote OT-2041 listo",
    meta: "Avisado a Calidad · 3 personas",
    time: "14:18",
  },
  {
    icon: <IconBox width={14} height={14} />,
    hot: false,
    title: "Stock bajo: Resina PP",
    meta: "Orden de compra generada",
    time: "13:57",
  },
];

export function AuthBrandPanel() {
  return (
    <div className="auth-brand-panel">
      <div className="mark">
        <span className="brand-mark">
          <IconLogo width={15} height={15} />
        </span>
        Control Operativo
      </div>

      <div className="pitch">
        <div className="eyebrow">Notificaciones para planta</div>
        <h2>Que nadie se entere del lote listo por un pasillo.</h2>
        <p>Definís el evento y quién debe enterarse. El sistema avisa solo, sin duplicados, y deja todo auditado.</p>

        <div className="feed" aria-hidden="true">
          <div className="feed-head">
            <span>Hoy, en planta</span>
            <span className="live">Ejemplo</span>
          </div>
          {SAMPLE_FEED.map((row) => (
            <div className="feed-row" key={row.title}>
              <span className={`ico${row.hot ? " hot" : ""}`}>{row.icon}</span>
              <span className="txt">
                <strong>{row.title}</strong>
                <span>{row.meta}</span>
              </span>
              <span className="time">{row.time}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="footnote">
        <span>© {new Date().getFullYear()} Control Operativo</span>
        <span>Multi-empresa · Datos aislados por tenant</span>
      </div>
    </div>
  );
}
